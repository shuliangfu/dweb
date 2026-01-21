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
} from "../../common/types/index.ts";
import type { TailwindPluginOptions } from "./types.ts";
import { findTailwindConfigFile } from "./utils.ts";
import { processCSSV3 } from "./v3.ts";
import { processCSSV4 } from "./v4.ts";
import * as path from "@std/path";
import { isPathSafe } from "../../server/utils/security.ts";
import { HashCalculator } from "../../server/build/hash-calculator.ts";

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
  // 如果用户显式指定了 configPath，使用它；否则自动查找
  let configPath: string | null = null;
  if (options.configPath) {
    // 用户显式指定的配置文件路径
    const absoluteConfigPath = path.isAbsolute(options.configPath)
      ? options.configPath
      : path.resolve(Deno.cwd(), options.configPath);
    configPath = absoluteConfigPath;
  } else {
    // 自动查找配置文件
    configPath = await findTailwindConfigFile(Deno.cwd());
  }

  // 使用 PostCSS 处理
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
 * 加载 CSS hash 映射文件（运行时使用）
 * 从构建输出目录读取 css-manifest.json
 */
async function loadCSSHashMap(): Promise<void> {
  try {
    // 尝试从多个可能的位置读取 manifest 文件
    const possiblePaths = [
      path.join(Deno.cwd(), ".dist", "css-manifest.json"),
      path.join(Deno.cwd(), "dist", "css-manifest.json"),
      path.join(Deno.cwd(), "css-manifest.json"),
    ];

    for (const manifestPath of possiblePaths) {
      try {
        const content = await Deno.readTextFile(manifestPath);
        const manifest = JSON.parse(content) as Record<string, string>;

        // 将 manifest 数据加载到 Map 中
        cssHashMap.clear();
        for (const [original, hashed] of Object.entries(manifest)) {
          cssHashMap.set(original, hashed);
        }

        console.log(
          `   ✅ [Tailwind] 已加载 CSS hash 映射: ${
            Object.keys(manifest).length
          } 个文件`,
        );
        return;
      } catch {
        // 文件不存在，继续尝试下一个路径
        continue;
      }
    }

    // 如果所有路径都失败，使用空映射（开发环境或未构建）
    cssHashMap.clear();
  } catch (error) {
    console.warn(`   ⚠️  [Tailwind] 加载 CSS hash 映射失败:`, error);
    cssHashMap.clear();
  }
}

/**
 * 保存 CSS hash 映射文件（构建时使用）
 * @param originalFileName 原始文件名（例如：style.css）
 * @param hashedFileName hash 化的文件名（例如：style.abc123.css）
 * @param outDir 输出目录
 */
async function saveCSSHashMap(
  originalFileName: string,
  hashedFileName: string,
  outDir: string,
): Promise<void> {
  try {
    const manifestPath = path.join(outDir, "css-manifest.json");

    // 读取现有的 manifest（如果存在）
    let manifest: Record<string, string> = {};
    try {
      const content = await Deno.readTextFile(manifestPath);
      manifest = JSON.parse(content);
    } catch {
      // 文件不存在，使用空对象
    }

    // 更新映射
    manifest[originalFileName] = hashedFileName;

    // 写入文件
    await Deno.writeTextFile(
      manifestPath,
      JSON.stringify(manifest, null, 2),
    );

    console.log(
      `   ✅ [Tailwind] 已保存 CSS hash 映射: ${originalFileName} -> ${hashedFileName}`,
    );
  } catch (error) {
    console.error(`   ❌ [Tailwind] 保存 CSS hash 映射失败:`, error);
  }
}

/**
 * 在开发环境中注入 CSS style 标签到 HTML 响应
 * @param res 响应对象
 * @param cssContent CSS 内容
 * @param cssFileName CSS 文件名（用于匹配和移除对应的 link 标签）
 */
function injectCSSStyle(
  res: Response,
  cssContent: string,
  cssFileName?: string,
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
    let html = res.body as string;

    // 在开发环境下，移除可能存在的 tailwind CSS link 标签（只在 head 中移除）
    if (cssFileName) {
      // 严格提取 head 部分
      const headStartIndex = html.indexOf("<head>");
      const headEndIndex = html.lastIndexOf("</head>");

      // 如果 head 标签存在且有效，只在 head 中移除 link 标签
      if (
        headStartIndex !== -1 && headEndIndex !== -1 &&
        headEndIndex > headStartIndex
      ) {
        // 提取 head 内容
        const headContent = html.slice(
          headStartIndex + 6,
          headEndIndex,
        );

        // 基于文件名精确匹配 link 标签（包括 hash 化的文件名）
        // 匹配文件名（不包含路径），例如：tailwind.css 或 tailwind.abc123.css
        // 转义文件名中的特殊字符用于正则表达式
        const escapedFileName = cssFileName.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );
        const tailwindLinkRegex = new RegExp(
          `<link[^>]*href\\s*=\\s*["'][^"']*${escapedFileName}[^"']*["'][^>]*>`,
          "gi",
        );

        // 只在 head 内容中查找和移除 link 标签
        const newHeadContent = headContent.replace(tailwindLinkRegex, "");

        // 如果 head 内容有变化，更新 HTML
        if (newHeadContent !== headContent) {
          html = html.slice(0, headStartIndex + 6) +
            newHeadContent +
            html.slice(headEndIndex);
        }
      }
    }

    // 将 CSS 内容直接注入到 style 标签中
    // 注意：CSS 内容不需要转义，因为它在 style 标签内是安全的
    const styleTag = `<style>${cssContent}</style>`;

    // 严格确保 style 标签注入到 <head> 内部
    const headStartIndex = html.indexOf("<head>");
    const headEndIndex = html.lastIndexOf("</head>");

    // 确保 head 标签存在且有效
    if (
      headStartIndex !== -1 && headEndIndex !== -1 &&
      headEndIndex > headStartIndex
    ) {
      // 在 </head> 前面注入（确保在 head 内部）
      res.body = html.slice(0, headEndIndex) + `  ${styleTag}\n` +
        html.slice(headEndIndex);
    } else if (html.includes("</head>")) {
      // 如果没有找到有效的 <head>，但有 </head>，在 </head> 之前插入
      res.body = html.replace("</head>", `  ${styleTag}\n</head>`);
    } else if (html.includes("<head>")) {
      // 如果没有 </head>，但有 <head>，则在 <head> 后面注入
      res.body = html.replace("<head>", `<head>\n  ${styleTag}`);
    } else {
      // 如果没有 <head>，则在 <html> 后面添加 <head> 和 style
      if (html.includes("<html>")) {
        res.body = html.replace(
          "<html>",
          `<html>\n  <head>\n    ${styleTag}\n  </head>`,
        );
      } else {
        // 如果连 <html> 都没有，在开头添加
        res.body = `<head>\n  ${styleTag}\n</head>\n${html}`;
      }
    }
  } catch (error) {
    console.error("[Dev Server] 注入 CSS style 时出错:", error);
    // 出错时不修改响应
  }
}

/**
 * 在生产环境中注入 CSS link 标签到 HTML 响应
 * @param res 响应对象
 * @param cssPath CSS 文件路径（相对于静态资源目录）
 * @param staticPrefix 静态资源 URL 前缀（如果有）
 * @param isProduction 是否为生产环境
 * @param cssHashMap CSS hash 映射
 */
function injectCSSLink(
  res: Response,
  cssPath: string,
  staticPrefix: string,
  isProduction: boolean,
  cssHashMap: Map<string, string>,
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
    const originalFilename = path.basename(cssPath);

    // 在生产环境中，尝试使用 hash 化的文件名
    let filename = originalFilename;
    if (isProduction && cssHashMap.has(originalFilename)) {
      filename = cssHashMap.get(originalFilename)!;
    }

    // 构建 CSS 文件 URL
    const cssUrl = path.join(staticPrefix, filename).replace(/\\/g, "/");

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
// CSS hash 文件名映射（全局，用于运行时）
// key: 原始文件名, value: hash 化的文件名
const cssHashMap: Map<string, string> = new Map();

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

    async onInit(app: AppLike, config: AppConfig) {
      // 从 app 中获取环境标志
      isProduction = (app.isProduction as boolean) ?? false;
      staticDir = config.static?.dir || "assets";
      staticPrefix = config.static?.prefix || "/" + staticDir;

      // 在生产环境中，加载 CSS hash 映射文件
      if (isProduction) {
        await loadCSSHashMap();
      }
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

        // 检查缓存（开发环境）
        let compiledCSS: string;
        if (isProduction) {
          // 生产环境：直接处理（不使用缓存）
          const processed = await processCSS(
            fileContent,
            filePath,
            version,
            isProduction,
            options,
          );
          compiledCSS = processed.content;
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
     * 响应处理钩子（在 HTML 中注入 CSS）
     * 开发环境：注入 style 标签（直接内联 CSS 内容）
     * 生产环境：注入 link 标签（引用外部 CSS 文件）
     */
    async onResponse(_req: Request, res: Response) {
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

        if (isProduction) {
          // 生产环境：注入 link 标签
          injectCSSLink(
            res,
            cssPath,
            staticPrefix,
            isProduction,
            cssHashMap,
          );
        } else {
          // 开发环境：读取 CSS 文件并注入 style 标签
          try {
            // 安全检查：确保文件路径在当前工作目录内（防止路径遍历攻击）
            const cwd = Deno.cwd();
            if (!isPathSafe(cssPath, cwd)) {
              // 路径不安全，跳过注入
              return;
            }

            // 读取 CSS 文件内容
            const fileContent = await Deno.readTextFile(cssPath);
            const fileStat = await Deno.stat(cssPath);

            // 检查缓存（开发环境）
            const cacheKey = cssPath;
            const cached = cssCache.get(cacheKey);
            const fileModified = fileStat.mtime?.getTime() || 0;

            const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
            const shouldUseCache = cached &&
              cached.timestamp >= fileModified &&
              cacheAge < 1000; // 缓存有效期 1 秒

            let compiledCSS: string;
            if (shouldUseCache) {
              // 使用缓存
              compiledCSS = cached.content;
            } else {
              // 处理 CSS
              const processed = await processCSS(
                fileContent,
                cssPath,
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

            // 注入 style 标签（传递文件名以便移除对应的 link 标签）
            const cssFileName = path.basename(cssPath);
            injectCSSStyle(res, compiledCSS, cssFileName);
          } catch (error) {
            console.error(
              "[Tailwind Plugin] 开发环境读取 CSS 文件时出错:",
              error,
            );
            // 出错时不修改响应，让原始响应返回
          }
        }
      } catch (error) {
        console.error("[Tailwind Plugin] 注入 CSS 时出错:", error);
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

            // 计算 CSS 内容的 hash
            const hashCalculator = new HashCalculator();
            const hash = await hashCalculator.calculateHash(processed.content);

            // 生成 hash 化的文件名
            // 例如：style.css -> style.abc123.css
            const originalFileName = path.basename(relativePath);
            const ext = path.extname(originalFileName);
            const nameWithoutExt = path.basename(originalFileName, ext);
            const hashedFileName = `${nameWithoutExt}.${hash}${ext}`;
            const hashedRelativePath = path.join(
              path.dirname(relativePath),
              hashedFileName,
            );
            const hashedOutPath = path.join(
              outDir,
              staticDir,
              hashedRelativePath,
            );

            // 确保输出目录存在
            await Deno.mkdir(path.dirname(hashedOutPath), { recursive: true });

            // 写入处理后的 CSS（使用 hash 化的文件名）
            await Deno.writeTextFile(hashedOutPath, processed.content);
            // 如果有 source map，也写入（使用 hash 化的文件名）
            if (processed.map) {
              await Deno.writeTextFile(`${hashedOutPath}.map`, processed.map);
            }

            console.log(
              `   ✅ [Tailwind ${version}] CSS 编译完成: ${cssFile} -> ${hashedFileName}`,
            );

            // 保存 CSS hash 映射到 manifest 文件（用于运行时读取）
            await saveCSSHashMap(originalFileName, hashedFileName, outDir);
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
