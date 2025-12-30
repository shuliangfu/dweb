/**
 * 主题切换插件
 * 支持深色/浅色主题切换，自动检测系统主题
 */

import type { Plugin, Request, Response } from "../../common/types/index.ts";
import type { ThemeMode, ThemePluginOptions } from "./types.ts";
import { minifyJavaScript } from "../../server/utils/minify.ts";
import { compileWithEsbuild } from "../../server/utils/module.ts";

// 缓存编译后的客户端脚本
let cachedClientScript: string | null = null;

/**
 * 编译客户端主题脚本
 */
async function compileClientScript(): Promise<string> {
  if (cachedClientScript) {
    return cachedClientScript;
  }

  try {
    // 内联浏览器端脚本内容，避免生产环境无法读取文件的问题
    const browserScriptContent = `/// <reference lib="dom" />
/**
 * 主题切换客户端脚本
 * 在浏览器中运行的主题管理代码
 */

interface ThemeConfig {
  storageKey: string;
  defaultTheme: "light" | "dark" | "auto";
  transition?: boolean;
}

interface ThemeManager {
  storageKey: string;
  defaultTheme: "light" | "dark" | "auto";
  getSystemTheme(): "light" | "dark";
  getTheme(): "light" | "dark" | "auto";
  getActualTheme(): "light" | "dark";
  setTheme(theme: "light" | "dark" | "auto"): void;
  applyTheme(theme: "light" | "dark" | "auto"): void;
  init(): void;
  toggleTheme(): "dark" | "light";
  switchTheme(theme: "light" | "dark" | "auto"): "light" | "dark" | "auto";
}

/**
 * Store 接口（从 store 插件）
 */
interface Store {
  getState(): Record<string, unknown>;
  setState(
    updater: (prev: Record<string, unknown>) => Record<string, unknown>,
  ): void;
  subscribe(listener: (state: Record<string, unknown>) => void): () => void;
  unsubscribe(listener: (state: Record<string, unknown>) => void): void;
  reset(): void;
}

/**
 * 创建主题管理器
 */
function createThemeManager(config: ThemeConfig): ThemeManager {
  return {
    storageKey: config.storageKey,
    defaultTheme: config.defaultTheme,

    // 获取系统主题
    getSystemTheme(): "light" | "dark" {
      if (typeof globalThis !== "undefined" && globalThis.matchMedia) {
        return globalThis.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
      return "light";
    },

    // 获取当前主题
    getTheme(): "light" | "dark" | "auto" {
      if (typeof globalThis === "undefined") return this.defaultTheme;
      const stored = localStorage.getItem(this.storageKey);
      if (stored === "dark" || stored === "light" || stored === "auto") {
        return stored;
      }
      return this.defaultTheme;
    },

    // 获取实际主题（处理 auto 模式）
    getActualTheme(): "light" | "dark" {
      const theme = this.getTheme();
      if (theme === "auto") {
        return this.getSystemTheme();
      }
      return theme;
    },

    // 设置主题
    setTheme(theme: "light" | "dark" | "auto"): void {
      if (typeof globalThis === "undefined") {
        return;
      }
      localStorage.setItem(this.storageKey, theme);
      this.applyTheme(theme);

      // 触发自定义事件
      const actualTheme = this.getActualTheme();
      globalThis.dispatchEvent(
        new CustomEvent("themechange", {
          detail: { theme, actualTheme },
        }),
      );
    },

    // 应用主题
    applyTheme(theme: "light" | "dark" | "auto"): void {
      if (typeof document === "undefined") {
        return;
      }
      const actualTheme = theme === "auto" ? this.getSystemTheme() : theme;

      // 在 html 元素上设置 class（用于 Tailwind CSS dark mode）
      if (document.documentElement) {
        const htmlElement = document.documentElement;

        // 移除旧的 dark/light class
        htmlElement.classList.remove("dark", "light");
        // 添加新的主题 class
        if (actualTheme === "dark") {
          htmlElement.classList.add("dark");
        } else {
          htmlElement.classList.add("light");
        }
      }

      // 更新主题 store（如果存在）
      // 使用全局 store 来更新主题状态
      if (typeof globalThis !== "undefined" && (globalThis as any).__STORE__) {
        const store = (globalThis as any).__STORE__ as Store;
        const currentState = store.getState();
        const themeState = (currentState.theme as {
          mode?: "light" | "dark" | "auto";
          value?: "light" | "dark";
        }) || {};
        const currentTheme = this.getTheme();
        store.setState((prev) => ({
          ...prev,
          theme: {
            ...themeState,
            mode: currentTheme,
            value: actualTheme,
          },
        }));
      }
    },

    // 初始化
    init(): void {
      const theme = this.getTheme();
      this.applyTheme(theme);

      // 监听系统主题变化
      if (typeof globalThis !== "undefined" && globalThis.matchMedia) {
        globalThis
          .matchMedia("(prefers-color-scheme: dark)")
          .addEventListener("change", (_e) => {
            if (this.getTheme() === "auto") {
              this.applyTheme("auto");
              // 触发主题变化事件
              globalThis.dispatchEvent(
                new CustomEvent("themechange", {
                  detail: {
                    theme: "auto",
                    actualTheme: this.getActualTheme(),
                  },
                }),
              );
            }
          });
      }
    },

    // 切换主题（仅在 dark 和 light 之间切换）
    toggleTheme(): "dark" | "light" {
      const current = this.getTheme();
      // 如果当前是 auto，切换到 dark；否则在 dark 和 light 之间切换
      const next = current === "dark" ? "light" : "dark";
      this.setTheme(next);
      return next;
    },

    // 切换到指定主题
    switchTheme(theme: "light" | "dark" | "auto"): "light" | "dark" | "auto" {
      if (theme === "dark" || theme === "light" || theme === "auto") {
        this.setTheme(theme);
        return theme;
      }
      return this.getTheme();
    },
  };
}

/**
 * 初始化主题系统
 * 暴露到全局，供内联脚本调用
 */
function initTheme(config: ThemeConfig): void {
  // 创建主题管理器
  const themeManager = createThemeManager(config);

  // 当主题变化时，更新全局 store 的值
  globalThis.addEventListener(
    "themechange",
    ((event: CustomEvent) => {
      if (event.detail && event.detail.actualTheme) {
        // 更新全局 store 中的主题状态
        if (
          typeof globalThis !== "undefined" && (globalThis as any).__STORE__
        ) {
          const store = (globalThis as any).__STORE__ as Store;
          const currentState = store.getState();
          const themeState = (currentState.theme as {
            mode?: "light" | "dark" | "auto";
            value?: "light" | "dark";
          }) || {};
          const currentTheme = themeManager.getTheme();
          store.setState((prev) => ({
            ...prev,
            theme: {
              ...themeState,
              mode: currentTheme,
              value: event.detail.actualTheme,
            },
          }));
        }
      }
    }) as EventListener,
  );

  // 暴露到全局
  (globalThis as any).__THEME_MANAGER__ = themeManager;
  (globalThis as any).setTheme = (theme: "light" | "dark" | "auto") => {
    return themeManager.setTheme(theme);
  };
  (globalThis as any).getTheme = () => {
    return themeManager.getTheme();
  };
  (globalThis as any).getActualTheme = () => {
    return themeManager.getActualTheme();
  };
  (globalThis as any).toggleTheme = () => {
    return themeManager.toggleTheme();
  };
  (globalThis as any).switchTheme = (theme: "light" | "dark" | "auto") => {
    return themeManager.switchTheme(theme);
  };

  // 初始化函数
  const init = () => {
    themeManager.init();
    // 初始化全局 store 中的主题状态
    const currentTheme = themeManager.getTheme();
    const actualTheme = themeManager.getActualTheme();
    if (typeof globalThis !== "undefined" && (globalThis as any).__STORE__) {
      const store = (globalThis as any).__STORE__ as Store;
      const currentState = store.getState();
      const themeState = (currentState.theme as {
        mode?: "light" | "dark" | "auto";
        value?: "light" | "dark";
      }) || {};
      store.setState((prev) => ({
        ...prev,
        theme: {
          ...themeState,
          mode: currentTheme,
          value: actualTheme,
        },
      }));
    }
  };

  // 初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
    }

  // 注意：过渡效果的 style 标签由服务端注入，不需要在客户端创建
}

// 暴露到全局，供内联脚本调用
if (typeof globalThis !== "undefined") {
  (globalThis as any).initTheme = initTheme;
}
`;
    // 虚拟路径，用于错误报告
    const browserScriptPath = "browser.ts";
    // 使用 esbuild 编译 TypeScript 为 JavaScript
    const compiledCode = await compileWithEsbuild(
      browserScriptContent,
      browserScriptPath,
    );

    // 压缩代码
    const minifiedCode = await minifyJavaScript(compiledCode);
    cachedClientScript = minifiedCode;

    return minifiedCode;
  } catch (error) {
    console.error("[Theme Plugin] 编译客户端脚本失败:", error);
    if (error instanceof Error) {
      console.error("[Theme Plugin] 错误详情:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    // 如果编译失败，返回空字符串
    return "";
  }
}

/**
 * 生成主题初始化脚本（包含配置）
 */
function generateInitScript(options: {
  storageKey?: string;
  defaultTheme?: "light" | "dark" | "auto";
  transition?: boolean;
}): string {
  return `initTheme(${
    JSON.stringify({
      storageKey: options.storageKey || "theme",
      defaultTheme: options.defaultTheme || "auto",
      transition: options.transition !== false,
    })
  });`;
}

/**
 * 注入主题 class 到 HTML
 * 使用 Tailwind CSS 的 dark mode 方式：在 html 元素上添加 dark/light class
 */
function injectThemeAttribute(html: string, theme: ThemeMode): string {
  let result = html;

  // 获取实际主题（如果是 auto，需要检测系统主题，但服务端无法检测，默认使用 light）
  const actualTheme = theme === "auto" ? "light" : theme;
  const themeClass = actualTheme === "dark" ? "dark" : "light";

  // 在 html 元素上注入 class（用于 Tailwind CSS dark mode）
  if (result.includes("<html")) {
    // 先移除旧的 dark/light class 和 data-theme 属性
    result = result.replace(/<html([^>]*?)>/i, (_match, attrs) => {
      // 移除 data-theme 属性
      let newAttrs = attrs.replace(/\s+data-theme=["'][^"']*["']/gi, "");

      // 处理 class 属性
      const classMatch = newAttrs.match(/\s+class=["']([^"']*?)["']/i);
      if (classMatch) {
        // 移除旧的 dark/light class，保留其他 class
        const existingClasses = classMatch[1]
          .split(/\s+/)
          .filter((c: string) => c && c !== "dark" && c !== "light")
          .join(" ")
          .trim();
        const finalClasses = existingClasses
          ? `${existingClasses} ${themeClass}`
          : themeClass;
        // 替换 class 属性
        newAttrs = newAttrs.replace(
          /\s+class=["'][^"']*["']/i,
          ` class="${finalClasses}"`,
        );
      } else {
        // 如果没有 class 属性，添加一个
        newAttrs = `${newAttrs} class="${themeClass}"`;
      }

      return `<html${newAttrs}>`;
    });
  }

  return result;
}

/**
 * 创建主题切换插件
 */
export function theme(options: ThemePluginOptions = {}): Plugin {
  const defaultTheme = options.defaultTheme || "auto";

  return {
    name: "theme",
    config: options as unknown as Record<string, unknown>,

    /**
     * 响应处理钩子 - 注入主题脚本和属性
     * 注意：使用 onResponse 而不是 onRequest，因为 res.body 在 onRequest 时可能还未设置
     */
    onResponse: async (_req: Request, res: Response) => {
      // 只处理 HTML 响应
      if (!res.body || typeof res.body !== "string") {
        return;
      }

      const contentType = res.headers.get("Content-Type") || "";
      if (!contentType.includes("text/html")) {
        return;
      }

      if (options.injectScript !== false) {
        try {
          const html = res.body as string;

          // 注入主题属性
          let newHtml = injectThemeAttribute(html, defaultTheme);

          // 注入主题脚本（在 </head> 之前）
          if (newHtml.includes("</head>")) {
            // 编译客户端脚本
            const clientScript = await compileClientScript();
            if (!clientScript) {
              console.warn("[Theme Plugin] 客户端脚本编译失败，跳过注入");
              return;
            }

            // 生成初始化脚本
            const initScript = generateInitScript({
              storageKey: options.storageKey,
              defaultTheme: options.defaultTheme,
              transition: options.transition,
            });

            // 组合完整的脚本
            const fullScript = `${clientScript}\n${initScript}`;

            // 如果有过渡效果，添加样式（插入到现有的 style 标签中，或创建新的 style 标签）
            if (options.transition !== false) {
              const transitionCss =
                `* { transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease; }`;

              // 查找 head 中的 style 标签
              const styleMatch = newHtml.match(
                /<style[^>]*>([\s\S]*?)<\/style>/gi,
              );

              if (styleMatch && styleMatch.length > 0) {
                // 如果存在 style 标签，将 CSS 插入到最后一个 style 标签的内容中
                const lastStyleTag = styleMatch[styleMatch.length - 1];
                const lastStyleIndex = newHtml.lastIndexOf(lastStyleTag);

                // 提取 style 标签的内容（不包含标签本身）
                const styleContentMatch = lastStyleTag.match(
                  /<style[^>]*>([\s\S]*?)<\/style>/i,
                );
                if (styleContentMatch) {
                  const existingContent = styleContentMatch[1];
                  const styleTagStart = lastStyleTag.substring(
                    0,
                    lastStyleTag.indexOf(">") + 1,
                  );
                  const styleTagEnd = "</style>";

                  // 检查是否已经包含过渡样式（避免重复）
                  if (
                    !existingContent.includes("transition: background-color")
                  ) {
                    const newStyleContent = styleTagStart + existingContent +
                      "\n" + transitionCss + styleTagEnd;
                    newHtml = newHtml.slice(0, lastStyleIndex) +
                      newStyleContent +
                      newHtml.slice(lastStyleIndex + lastStyleTag.length);
                  }
                }
              } else {
                // 如果不存在 style 标签，创建新的 style 标签
                const styleTag = `<style>${transitionCss}</style>`;

                // 查找 link[rel="stylesheet"]，在其后插入
                const linkMatch = newHtml.match(
                  /<link[^>]*rel=["']stylesheet["'][^>]*>/gi,
                );

                if (linkMatch && linkMatch.length > 0) {
                  // 在最后一个 link[rel="stylesheet"] 后插入
                  const lastLinkIndex = newHtml.lastIndexOf(
                    linkMatch[linkMatch.length - 1],
                  );
                  const insertIndex = lastLinkIndex +
                    linkMatch[linkMatch.length - 1].length;
                  newHtml = newHtml.slice(0, insertIndex) +
                    `\n${styleTag}` +
                    newHtml.slice(insertIndex);
                } else if (newHtml.includes("</head>")) {
                  // 如果没有找到 link，在 </head> 之前插入
                  newHtml = newHtml.replace("</head>", `${styleTag}\n</head>`);
                } else if (newHtml.includes("<head>")) {
                  // 如果没有 </head>，在 <head> 后插入
                  newHtml = newHtml.replace("<head>", `<head>\n${styleTag}`);
                }
              }
            }

            // 注入 script 标签（在 </head> 之前）
            const scriptTag =
              `<script data-type="dweb-theme">${fullScript}</script>`;
            const lastHeadIndex = newHtml.lastIndexOf("</head>");
            if (lastHeadIndex !== -1) {
              newHtml = newHtml.slice(0, lastHeadIndex) +
                `${scriptTag}\n` +
                newHtml.slice(lastHeadIndex);
            } else {
              // 如果没有找到 </head>，尝试在 <head> 后插入
              if (newHtml.includes("<head>")) {
                newHtml = newHtml.replace(
                  "<head>",
                  `<head>\n${scriptTag}`,
                );
              }
            }
          }

          res.body = newHtml;
        } catch (error) {
          console.error("[Theme Plugin] 注入主题脚本时出错:", error);
          if (error instanceof Error) {
            console.error("[Theme Plugin] 错误堆栈:", error.stack);
          }
        }
      }
    },
  };
}

// 导出类型
export type { ThemeConfig, ThemeMode, ThemePluginOptions } from "./types.ts";
