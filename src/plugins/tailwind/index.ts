/**
 * Tailwind CSS 插件
 * 支持 Tailwind CSS v3 和 v4
 * 参考 Fresh 框架的实现方式
 */

import type {
  AppConfig,
  AppLike,
  Plugin,
  Request,
  Response,
} from "../../types/index.ts";
import type { TailwindPluginOptions } from "./types.ts";
import { findTailwindConfigFile } from "./utils.ts";
import { processCSSV3 } from "./v3.ts";
import { processCSSV4 } from "./v4.ts";
import * as path from "@std/path";
import { isPathSafe } from "../../utils/security.ts";

/**
 * 处理 CSS 文件
 * @param cssContent CSS 内容
 * @param filePath CSS 文件路径
 * @param version Tailwind 版本
 * @param isProduction 是否为生产环境
 * @param options 插件选项
 * @returns 处理后的 CSS 内容和 source map
 */
/**
 * 处理 CSS 文件（根据版本调用对应的处理方法）
 * @param cssContent CSS 内容
 * @param filePath CSS 文件路径
 * @param version Tailwind 版本
 * @param isProduction 是否为生产环境
 * @param options 插件选项
 * @returns 处理后的 CSS 内容和 source map
 */
async function processCSS(
  cssContent: string,
  filePath: string,
  version: "v3" | "v4",
  isProduction: boolean,
  options: TailwindPluginOptions,
): Promise<{ content: string; map?: string }> {
  // 查找 Tailwind 配置文件
  const configPath = await findTailwindConfigFile(Deno.cwd());

  // 根据版本调用对应的处理方法
  if (version === "v3") {
    return await processCSSV3(
      cssContent,
      filePath,
      configPath,
      isProduction,
      options,
    );
  } else {
    return await processCSSV4(
      cssContent,
      filePath,
      configPath,
      isProduction,
      options,
    );
  }
}

/**
 * 在生产环境中注入 CSS link 标签到 HTML 响应
 * @param res 响应对象
 * @param cssPath CSS 文件路径（相对于静态资源目录）
 * @param staticPrefix 静态资源 URL 前缀（如果有）
 * @param staticDir 静态资源目录名（用于检测路径是否已包含目录前缀）
 */
function injectCSSLink(
  res: Response,
  cssPath: string,
  staticPrefix: string,
): void {
  // 只处理 HTML 响应
  if (!res.body || typeof res.body !== "string") {
    return;
  }

  const contentType = res.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) {
    return;
  }

  try {
    const html = res.body as string;

    // 获取 CSS 文件名
    const filename = path.basename(cssPath);

    // 构建 CSS 文件 URL
    const cssUrl = path.join(staticPrefix, filename);

    const linkTag = `<link rel="stylesheet" href="${cssUrl}" />`;

    // 检查 <head> 中是否有 <link> 标签（CSS 文件）
    const linkRegex = /<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/i;
    const linkMatch = html.match(linkRegex);

    if (linkMatch && linkMatch.index !== undefined) {
      // 如果找到 <link> 标签，在它之前插入新的 link 标签
      const linkIndex = linkMatch.index;
      res.body = html.slice(0, linkIndex) + `  ${linkTag}\n  ` +
        html.slice(linkIndex);
    } else if (html.includes("</head>")) {
      // 如果没有 <link> 标签，但有 </head>，在 </head> 前面注入
      // 注意：需要找到最后一个 </head>，因为插件可能已经在 </head> 之前注入了脚本
      const lastHeadIndex = html.lastIndexOf("</head>");
      if (lastHeadIndex !== -1) {
        res.body = html.slice(0, lastHeadIndex) + `  ${linkTag}\n` +
          html.slice(lastHeadIndex);
      } else {
        // 如果 lastIndexOf 失败（不应该发生），使用 replace 作为后备
        res.body = html.replace("</head>", `  ${linkTag}\n</head>`);
      }
    } else if (html.includes("<head>")) {
      // 如果没有 </head>，但有 <head>，则在 <head> 后面注入
      res.body = html.replace("<head>", `<head>\n  ${linkTag}`);
    } else {
      // 如果没有 <head>，则在 <html> 后面添加 <head> 和 link
      if (html.includes("<html>")) {
        res.body = html.replace(
          "<html>",
          `<html>\n  <head>\n    ${linkTag}\n  </head>`,
        );
      } else {
        // 如果连 <html> 都没有，在开头添加
        res.body = `<head>\n  ${linkTag}\n</head>\n${html}`;
      }
    }
  } catch (error) {
    console.error("[Prod Server] 注入 CSS link 时出错:", error);
    // 出错时不修改响应
  }
}

/**
 * 创建 Tailwind CSS 插件
 * @param options 插件选项
 * @returns 插件对象
 */
export function tailwind(options: TailwindPluginOptions = {}): Plugin {
  const version = options.version || "v4";

  // CSS 文件缓存（开发环境）
  const cssCache = new Map<
    string,
    { content: string; map?: string; timestamp: number }
  >();

  // 环境标志（在 onInit 中从 app.isProduction 获取）
  let isProduction = false;
  let staticPrefix = "/";
  let staticDir = "assets";

  return {
    name: "tailwind",
    config: options as Record<string, unknown>,

    /**
     * 初始化钩子
     * 从 app.isProduction 获取环境信息
     */
    onInit(app: AppLike, config: AppConfig) {
      // 从 app 中获取环境标志
      isProduction = (app.isProduction as boolean) ?? false;
      staticDir = config.static?.dir || "assets";
      staticPrefix = config.static?.prefix || "/" + staticDir;
    },

    /**
     * 请求处理钩子（拦截 /assets/tailwind.css 请求，返回编译后的 CSS）
     * 在开发环境中，实时编译 CSS 并返回
     */
    async onRequest(req: Request, res: Response) {
      // 构建 CSS 文件 URL（基于配置的 cssPath 和 staticPrefix）
      const cssPath = options.cssPath || "tailwind.css";
      const cssFileName = path.basename(cssPath);
      const cssUrl = path.join(staticPrefix, cssFileName).replace(/\\/g, "/");

      // 检查请求路径是否匹配 CSS URL
      const url = new URL(req.url);
      if (url.pathname !== cssUrl) {
        // 不是 CSS 请求，继续处理
        return;
      }

      // 如果没有配置 cssPath，跳过处理
      if (!options.cssPath) {
        return;
      }

      try {
        // 获取 CSS 文件路径
        const filePath = options.cssPath.startsWith("/")
          ? options.cssPath.slice(1)
          : options.cssPath;

        // 安全检查：确保文件路径在当前工作目录内（防止路径遍历攻击）
        const cwd = Deno.cwd();
        if (!isPathSafe(filePath, cwd)) {
          // 路径不安全，返回 404
          res.status = 404;
          res.text("Not Found");
          return;
        }

        // 检查文件是否存在
        let fileContent: string;
        let fileStat: Deno.FileInfo;

        try {
          fileContent = await Deno.readTextFile(filePath);
          fileStat = await Deno.stat(filePath);
        } catch {
          // 文件不存在，返回 404
          res.status = 404;
          res.text("Not Found");
          return;
        }

        console.log({ isProduction });

        // 检查缓存（开发环境）
        let compiledCSS: string | null = "";
        if (isProduction) {
          // 生产环境：直接处理（不使用缓存）
          const processed = await processCSS(
            fileContent,
            filePath,
            version,
            isProduction,
            options,
          );
          // compiledCSS = processed.content;
        } else {
          // 开发环境：使用缓存（缓存有效期 1 秒）
          const cacheKey = filePath;
          const cached = cssCache.get(cacheKey);
          const fileModified = fileStat.mtime?.getTime() || 0;

          const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
          const shouldUseCache = cached &&
            cached.timestamp >= fileModified &&
            cacheAge < 1000; // 缓存有效期 1 秒

          if (shouldUseCache) {
            // 使用缓存
            compiledCSS = cached.content;
          } else {
            // 处理 CSS
            const processed = await processCSS(
              fileContent,
              filePath,
              version,
              false,
              options,
            );

            // 更新缓存
            cssCache.set(cacheKey, {
              content: processed.content,
              map: processed.map,
              timestamp: Date.now(),
            });

            compiledCSS = processed.content;
          }
        }

        // 返回 CSS
        res.status = 200;
        res.setHeader("Content-Type", "text/css; charset=utf-8");
        res.setHeader(
          "Cache-Control",
          isProduction ? "public, max-age=31536000" : "no-cache",
        );
        res.text(compiledCSS);
      } catch (error) {
        console.error("[Tailwind Plugin] 处理 CSS 请求时出错:", error);
        res.status = 500;
        res.text("Internal Server Error");
      }
    },

    /**
     * 响应处理钩子（在 HTML 中注入 CSS link 标签）
     * 当 TS/TSX 路由返回 HTML 响应时，注入 <link rel="stylesheet" href="/assets/tailwind.css"> 标签
     */
    onResponse(_req: Request, res: Response) {
      // 只处理 HTML 响应
      if (!res.body || typeof res.body !== "string") {
        return;
      }

      const contentType = res.headers.get("Content-Type") || "";
      if (!contentType.includes("text/html")) {
        return;
      }

      // 如果没有配置 cssPath，跳过处理
      if (!options.cssPath) {
        return;
      }

      try {
        // 获取 CSS 文件路径
        const cssPath = options.cssPath.startsWith("/")
          ? options.cssPath.slice(1)
          : options.cssPath;

        // 注入 CSS link 标签到 HTML
        injectCSSLink(res, cssPath, staticPrefix);
      } catch (error) {
        console.error("[Tailwind Plugin] 注入 CSS link 时出错:", error);
        // 出错时不修改响应，让原始响应返回
      }
    },

    /**
     * 构建时钩子（生产环境编译）
     */
    async onBuild(buildConfig: { outDir?: string; staticDir?: string }) {
      const isProduction = true;
      const outDir = buildConfig.outDir || "dist";
      // staticDir 从构建配置中获取，如果没有则默认为 'assets'
      // 注意：buildConfig 可能包含 staticDir（向后兼容）或从 config.static?.dir 获取
      const staticDir = buildConfig.staticDir || "assets";

      console.log(`🎨 [Tailwind ${version}] 开始编译 CSS 文件...`);

      try {
        // 获取 CSS 文件路径
        let cssFile: string | undefined;

        // 如果配置了 cssPath，使用该文件
        if (options.cssPath) {
          const cssPath = options.cssPath.startsWith("/")
            ? options.cssPath.slice(1)
            : options.cssPath;
          try {
            const stat = await Deno.stat(cssPath);
            if (stat.isFile) {
              cssFile = cssPath;
            }
          } catch {
            // 文件不存在，跳过
          }
        }

        // 如果找到了 CSS 文件，进行处理
        if (cssFile) {
          try {
            const cssContent = await Deno.readTextFile(cssFile);

            // 处理 CSS
            const processed = await processCSS(
              cssContent,
              cssFile,
              version,
              isProduction,
              options,
            );

            // 计算输出路径
            // 注意：如果 cssFile 就是 staticDir 下的文件（如 assets/tailwind.css），
            // path.relative 可能会返回相对路径，需要特殊处理
            let relativePath: string;
            if (
              cssFile.startsWith(staticDir + "/") ||
              cssFile.startsWith(staticDir + "\\")
            ) {
              // 如果 cssFile 在 staticDir 目录下，直接提取相对路径
              relativePath = cssFile.slice(staticDir.length + 1);
            } else {
              // 否则使用 path.relative 计算相对路径
              relativePath = path.relative(staticDir, cssFile);
            }
            const outPath = path.join(outDir, staticDir, relativePath);

            // 确保输出目录存在
            await Deno.mkdir(path.dirname(outPath), { recursive: true });

            // 写入处理后的 CSS
            await Deno.writeTextFile(outPath, processed.content);
            // 如果有 source map，也写入
            if (processed.map) {
              await Deno.writeTextFile(`${outPath}.map`, processed.map);
            }

            console.log(
              `   ✅ [Tailwind ${version}] CSS 编译完成: ${cssFile}`,
            );
          } catch (error) {
            console.error(
              `❌ [Tailwind ${version}] 编译失败: ${cssFile}`,
              error,
            );
          }
        } else {
          console.warn(
            `⚠️  [Tailwind ${version}] 未找到 CSS 文件，跳过编译`,
          );
        }
      } catch (error) {
        console.error(`❌ [Tailwind ${version}] 构建时出错:`, error);
      }
    },
  };
}

// 导出类型
export type { AutoprefixerOptions, TailwindPluginOptions } from "./types.ts";
