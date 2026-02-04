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
import {
  cwd,
  exists,
  getEnv,
  join,
  readTextFile,
} from "../core/runtime-adapter.ts";
import type { AppConfig } from "../types/app.ts";
import { getInferredBuildOutputDirs } from "../utils/build-dirs.ts";
import { createRendererSSR } from "./render-ssr.ts";

/**
 * SSG 渲染选项
 *
 * 配置预渲染输出目录、显式路由列表、动态路由参数展开等。
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
 * 创建 SSG 渲染器
 *
 * - 开发环境：始终使用 SSR 渲染，不读 dist
 * - 生产 start：从 config.render.ssg.outputDir（默认与 client 目录一致，如 dist/client）读取预渲染 HTML 并返回
 *
 * @param container 服务容器（dev 时用于 SSR，生产时未用于读文件）
 * @param router 路由实例（dev 时用于 SSR）
 * @param config 应用配置
 * @returns SSG 渲染回调函数
 */
export function createRendererSSG(
  container: ServiceContainer,
  router: Router,
  config: AppConfig,
): (
  ctx: { url?: { pathname?: string }; path?: string },
  match: RouteMatch,
) => Promise<Response | null> {
  const renderConfig = (config.render || {}) as {
    engine?: "react" | "preact";
    mode?: "ssr" | "csr" | "ssg" | "hybrid";
    ssg?: RenderSSGOptions;
  };

  const outputDir = renderConfig.ssg?.outputDir ??
    getInferredBuildOutputDirs().client;

  /** 开发环境下使用 SSR 按需渲染 */
  const ssrRenderer = createRendererSSR(container, router);

  return async (
    ctx: { url?: { pathname?: string }; path?: string },
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

      // 生产 start：从 dist 下读取预渲染的 HTML
      const pathname = ctx.url?.pathname ?? ctx.path ?? match.route?.path ??
        "/";
      const relativePath = pathnameToFile(pathname);
      const baseDir = join(cwd(), outputDir);
      const filePath = join(baseDir, relativePath);

      const fileExists = await exists(filePath);
      if (!fileExists) {
        return null;
      }

      const html = await readTextFile(filePath);
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    } catch (error) {
      console.error("SSG 渲染错误:", error);
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
