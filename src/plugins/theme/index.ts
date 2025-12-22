/**
 * 主题切换插件
 * 支持深色/浅色主题切换，自动检测系统主题
 */

import type { Plugin, Request, Response } from "../../types/index.ts";
import type { ThemeMode, ThemePluginOptions } from "./types.ts";
import { minifyJavaScript } from "../../utils/minify.ts";
import { compileWithEsbuild } from "../../utils/module.ts";
import * as path from "@std/path";

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
    // 读取浏览器端脚本文件
    const browserScriptPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      "browser.ts",
    );
    const browserScriptContent = await Deno.readTextFile(browserScriptPath);

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
  return `initTheme(${JSON.stringify({
    storageKey: options.storageKey || "theme",
    defaultTheme: options.defaultTheme || "auto",
    transition: options.transition !== false,
  })});`;
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

            // 如果有过渡效果，添加 style 标签
            const styleTag = (options.transition !== false)
              ? `<style>* { transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease; }</style>`
              : "";

            const scriptTag = `<script data-type="theme">${fullScript}</script>${styleTag}`;

            // 使用 lastIndexOf 确保在最后一个 </head> 之前注入
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
