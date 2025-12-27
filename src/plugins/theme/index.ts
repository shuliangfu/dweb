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
 * 读取文件内容（支持本地文件和 JSR 包）
 * @param relativePath 相对于当前文件的路径
 * @returns 文件内容
 */
async function readFileContent(relativePath: string): Promise<string> {
  const currentUrl = new URL(import.meta.url);

  // 如果是 HTTP/HTTPS URL（JSR 包），使用 fetch
  if (currentUrl.protocol === "http:" || currentUrl.protocol === "https:") {
    // 构建 JSR URL：将当前文件的 URL 替换为相对路径的文件
    const currentPath = currentUrl.pathname;
    const currentDir = currentPath.substring(0, currentPath.lastIndexOf("/"));
    const targetPath = `${currentDir}/${relativePath}`;

    // 构建完整的 JSR URL
    const baseUrl = currentUrl.origin;
    const fullUrl = `${baseUrl}${targetPath}`;

    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(`无法从 JSR 包读取文件: ${fullUrl} (${response.status})`);
    }
    return await response.text();
  } else {
    // 本地文件系统，使用 Deno.readTextFile
    const browserScriptPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      relativePath,
    );
    return await Deno.readTextFile(browserScriptPath);
  }
}

/**
 * 编译客户端主题脚本
 */
async function compileClientScript(): Promise<string> {
  if (cachedClientScript) {
    return cachedClientScript;
  }

  try {
    // 读取浏览器端脚本文件（支持本地文件和 JSR 包）
    const browserScriptContent = await readFileContent("browser.ts");

    // 获取文件路径用于 esbuild（用于错误报告）
    const currentUrl = new URL(import.meta.url);
    let browserScriptPath: string;
    if (currentUrl.protocol === "http:" || currentUrl.protocol === "https:") {
      // JSR 包：使用 URL 作为路径标识
      const currentPath = currentUrl.pathname;
      const currentDir = currentPath.substring(0, currentPath.lastIndexOf("/"));
      browserScriptPath = `${currentUrl.origin}${currentDir}/browser.ts`;
    } else {
      // 本地文件系统
      browserScriptPath = path.join(
        path.dirname(new URL(import.meta.url).pathname),
        "browser.ts",
      );
    }

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
