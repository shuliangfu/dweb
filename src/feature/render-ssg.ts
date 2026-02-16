/**
 * SSG 渲染器（静态站点生成）
 *
 * 职责：
 * - 开发环境：使用 SSR 按需渲染，与 SSR 模式一致
 * - 生产 start：从预渲染目录（默认与 client 输出目录一致，如 dist/client）读取 HTML 并返回
 * - 路径约定与 @dreamer/render 的 renderSSG 输出一致：/ -> index.html，/about -> about.html（扁平）
 *
 * SSG 工作流程：
 * 1. 开发（dev）：不读文件，直接走 SSR 渲染
 * 2. 构建（build）：由 app.build() 调用 renderSSG 生成 HTML 到 client 目录（或 ssg.outputDir）
 * 3. 生产（start）：从 outputDir 读取预渲染 HTML 返回
 */

import type { RouteMatch, Router } from "@dreamer/router";
import type { ServiceContainer } from "@dreamer/service";
import type { HttpContext } from "@dreamer/server";
import {
  cwd,
  exists,
  getEnv,
  join,
  readdir,
  readTextFile,
  resolve,
} from "../core/runtime-adapter.ts";
import type { AppConfig } from "../types/app.ts";
import { getInferredBuildOutputDirs } from "../utils/build-dirs.ts";
import { replaceAssetPathsInHtml } from "../utils/asset-manifest.ts";
import { $t } from "../utils/i18n.ts";
import {
  DEFAULT_PRELOAD_MAX_PAGES,
  DEFAULT_PRELOAD_MAX_SIZE_MB,
} from "../utils/constants.ts";
import { isPathWithinProject } from "../utils/path.ts";
import { createRendererSSR } from "./render-ssr.ts";

/**
 * SSG 渲染选项
 *
 * 配置预渲染输出目录、显式路由列表、动态路由参数展开、可选内存预读等。
 *
 * @example
 * ```ts
 * render: {
 *   mode: "ssg",
 *   ssg: {
 *     outputDir: "dist/client",
 *     routes: ["/", "/about"],
 *     preloadHtml: true,
 *     dynamicRoutes: { "/user/[id]": ["1", "2", "3"] },
 *   },
 * }
 * ```
 */
export interface RenderSSGOptions {
  /** 预渲染 HTML 输出目录（相对于项目根） */
  outputDir?: string;
  /**
   * 显式指定要预渲染的路径列表（含动态路由具体值，如 /user/1、/article/123）
   * 若提供则优先使用，不再仅从静态路由推断；可从数据库读取 ID 后拼接
   */
  routes?: string[];
  /**
   * 小站预读 HTML 到内存（生产 start 时首次请求触发，后续命中缓存）。
   * true 用默认阈值（约 200 页或 10 MB）；或 { maxPages?, maxSizeMb? }。超出则按请求读盘。
   */
  preloadHtml?: boolean | { maxPages?: number; maxSizeMb?: number };
  /**
   * 动态路由按参数展开：键为路由模式（如 /user/[id]），值为参数列表
   * 例：{ "/user/[id]": ["1", "2", "3"] } 会生成 /user/1、/user/2、/user/3
   */
  dynamicRoutes?: Record<string, string[]>;
}

/**
 * 将请求路径转换为预渲染文件在 outputDir 下的相对路径
 * 与 @dreamer/render 的 renderSSG 输出一致（扁平）：/ -> index.html，/about -> about.html
 *
 * @param pathname 请求路径（如 "/"、"/about"）
 * @returns 相对文件路径（如 "index.html"、"about.html"）
 */
function pathnameToFile(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "index.html";
  }
  const clean = pathname.replace(/^\//, "").replace(/\/$/, "") || "index";
  return `${clean}.html`;
}

/**
 * 将预渲染文件名转换为请求路径（pathnameToFile 的反向）
 * 用于 SSG 构建后根据 HTML 文件名注入对应 pathname 的 hydration 数据
 *
 * @param filename 相对文件名（如 "index.html"、"about.html"）
 * @returns 请求路径（如 "/"、"/about"）
 */
export function fileToPathname(filename: string): string {
  const base = filename.replace(/\.html$/i, "").trim();
  if (!base || base === "index") {
    return "/";
  }
  return "/" + base;
}

/**
 * 创建 SSG 渲染器
 *
 * - 开发环境：始终使用 SSR 渲染，不读 dist
 * - 生产 start：从 config.render.ssg.outputDir（默认与 client 目录一致，如 dist/client）读取预渲染 HTML 并返回
 *
 * @param container 服务容器（dev 时用于 SSR，生产时未用于读文件）
 * @param router 路由实例（dev 时用于 SSR）
 * @param config 应用配置
 * @returns SSG 渲染回调函数（接收 ctx、match，返回 Response 或 null）
 *
 * @example
 * ```ts
 * const renderer = createRendererSSG(container, router, config);
 * const response = await renderer(ctx, match);
 * ```
 */
export function createRendererSSG(
  container: ServiceContainer,
  router: Router,
  config: AppConfig,
): (ctx: HttpContext, match: RouteMatch) => Promise<Response | null> {
  const renderConfig = (config.render || {}) as {
    engine?: "react" | "preact" | "view";
    mode?: "ssr" | "csr" | "ssg" | "hybrid";
    ssg?: RenderSSGOptions;
  };

  const outputDir = renderConfig.ssg?.outputDir ??
    getInferredBuildOutputDirs().client;

  const baseDir = join(cwd(), outputDir);
  const preloadOpt = renderConfig.ssg?.preloadHtml;
  const maxPages =
    typeof preloadOpt === "object" && preloadOpt?.maxPages != null
      ? preloadOpt.maxPages
      : DEFAULT_PRELOAD_MAX_PAGES;
  const maxSizeMb =
    typeof preloadOpt === "object" && preloadOpt?.maxSizeMb != null
      ? preloadOpt.maxSizeMb
      : DEFAULT_PRELOAD_MAX_SIZE_MB;
  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  /** 小站预读 HTML 缓存（生产且 preloadHtml 时首次请求填充），Windows 路径用 pathname 作 key 一致 */
  let htmlCache: Map<string, string> | null = null;
  let htmlCachePending: Promise<void> | null = null;

  /** 开发环境下使用 SSR 按需渲染 */
  const ssrRenderer = createRendererSSR(container, router, config);

  return async (
    ctx: HttpContext,
    match: RouteMatch,
  ): Promise<Response | null> => {
    try {
      if (match.isApi) {
        return null;
      }

      const isDev =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || "prod") === "dev";

      // 开发环境：使用 SSR 服务端渲染，不读 dist
      if (isDev) {
        return ssrRenderer(ctx, match);
      }

      const pathname = ctx.url.pathname ?? ctx.path ?? match.route?.path ?? "/";
      const relativePath = pathnameToFile(pathname);
      // 规范化：resolve 消除 pathname 中的 ../ 等，避免 pathname 被篡改时读项目外文件
      const resolvedPath = resolve(baseDir, relativePath);

      // 路径穿越防护：仅允许读取 baseDir 内的文件（Windows 兼容：isPathWithinProject 内部做规范化与大小写处理）
      if (!isPathWithinProject(resolvedPath, baseDir)) {
        return null;
      }

      // 小站预读：首次请求时按配置填充 htmlCache，后续命中则直接返回
      if (
        preloadOpt != null && htmlCache === null && htmlCachePending === null
      ) {
        htmlCachePending = (async () => {
          const cache = new Map<string, string>();
          try {
            const entries = await readdir(baseDir);
            const htmlNames = entries
              .map((
                e,
              ) => (typeof e === "string" ? e : (e as { name: string }).name))
              .filter((name) => name.endsWith(".html"));
            let totalBytes = 0;
            let count = 0;
            for (const name of htmlNames) {
              if (count >= maxPages || totalBytes >= maxSizeBytes) break;
              const p = join(baseDir, name);
              const abs = resolve(p);
              if (!isPathWithinProject(abs, baseDir)) continue;
              try {
                const raw = await readTextFile(p);
                totalBytes += new TextEncoder().encode(raw).length;
                if (totalBytes > maxSizeBytes) break;
                const pathnameKey = fileToPathname(name);
                const html = await replaceAssetPathsInHtml(
                  raw,
                  config,
                  outputDir,
                );
                cache.set(pathnameKey, html);
                count++;
              } catch {
                // 单文件失败跳过
              }
            }
            htmlCache = cache;
          } finally {
            htmlCachePending = null;
          }
        })();
      }
      if (htmlCachePending) await htmlCachePending;
      if (htmlCache != null) {
        const cached = htmlCache.get(pathname);
        if (cached != null) {
          return new Response(cached, {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
      }

      const fileExists = await exists(resolvedPath);
      if (!fileExists) {
        return null;
      }

      let html = await readTextFile(resolvedPath);
      html = await replaceAssetPathsInHtml(html, config, outputDir);
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    } catch (error) {
      console.error($t("log.ssgError"), error);
      const isDev =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || "prod") === "dev";
      const errHeaders: Record<string, string> = {
        "Content-Type": "text/html; charset=utf-8",
      };
      if (isDev) {
        errHeaders["Cache-Control"] = "no-cache, no-store, must-revalidate";
      }
      return new Response(
        `<!DOCTYPE html><html><head><title>500 Error</title></head><body><h1>Internal Server Error</h1><p>${
          error instanceof Error ? error.message : String(error)
        }</p></body></html>`,
        { status: 500, headers: errHeaders },
      );
    }
  };
}
