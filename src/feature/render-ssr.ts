/**
 * SSR 渲染处理
 *
 * 职责：
 * - 动态加载页面组件
 * - 加载布局组件
 * - 调用 @dreamer/render 进行 SSR 渲染
 * - 插件事件由 pluginEventsMiddleware 自动触发
 * - 返回 HTML 响应
 */

import type { SSROptions } from "@dreamer/render";
import type { RouteMatch, Router } from "@dreamer/router";
import type { ServiceContainer } from "@dreamer/service";
import type { HttpContext } from "@dreamer/server";
import { getConfig } from "../core/config.ts";
import { getLogger } from "../utils/logger.ts";
import { getEnv } from "../core/runtime-adapter.ts";
import { replaceAssetPathsInHtml } from "../utils/asset-manifest.ts";
import { sanitizeRequestParams } from "../utils/sanitize.ts";
import { $t } from "../utils/i18n.ts";
import { loadRouteModule } from "./load-route-module.ts";
import { getRender } from "./render.ts";

/** load 结果短期缓存 TTL（毫秒），减轻重 I/O 的重复请求 */
const LOAD_CACHE_TTL_MS = 1000;

/** load 缓存条目 */
interface LoadCacheEntry {
  value: Record<string, unknown>;
  expiresAt: number;
}

/** 生成 load 缓存 key（URL + params 序列化） */
function getLoadCacheKey(
  url: string,
  params: Record<string, string> | undefined,
): string {
  try {
    return `${url}|${JSON.stringify(params ?? {})}`;
  } catch {
    return "";
  }
}

/**
 * 转义 style 内容中的 </ 避免提前闭合 style 标签
 */
function escapeHtmlInStyle(css: string): string {
  return css.replace(/<\//g, "\\3C /");
}

/**
 * 创建 SSR 渲染处理器
 *
 * 动态加载页面与布局组件，调用 @dreamer/render 进行服务端渲染，返回 HTML 响应。
 *
 * @param container 服务容器
 * @param router 路由实例
 * @returns SSR 渲染回调函数（接收 ctx、match，返回 Response 或 null）
 */
export function createRendererSSR(
  container: ServiceContainer,
  router: Router,
): (ctx: HttpContext, match: RouteMatch) => Promise<Response | null> {
  // 获取渲染服务与配置
  const renderService = getRender(container);
  const config = getConfig(container);
  /** load 结果短期缓存（URL + params → 1 秒内复用，减轻重 I/O） */
  const loadCache = new Map<string, LoadCacheEntry>();
  const renderConfig = (config.render || {}) as {
    engine?: "react" | "preact";
  };
  const engine = renderConfig.engine ?? "preact";

  return async (
    ctx: HttpContext,
    match: RouteMatch,
  ): Promise<Response | null> => {
    try {
      // 只处理非 API 路由
      if (match.isApi) {
        return null;
      }

      // 收集路由 CSS（page + app + layout 中的 import "*.css"），用于 SSR 注入 head
      const routeCss: string[] = [];
      const cssCollector = (css: string) => routeCss.push(css);

      // 并行加载页面、App、Layout 组件（支持 .ts/.tsx）
      const appPath = router.getSpecialFile("_app");
      const layoutPath = router.getSpecialFile("_layout");
      const loadOpts = {
        cssCollector,
        logger: container.has("logger") ? getLogger(container) : undefined,
      };
      const [pageModule, appModule, layoutModule] = await Promise.all([
        loadRouteModule(match.route.fullPath, loadOpts),
        appPath ? loadRouteModule(appPath, loadOpts) : Promise.resolve(null),
        layoutPath
          ? loadRouteModule(layoutPath, loadOpts)
          : Promise.resolve(null),
      ]);

      if (!pageModule) {
        return null;
      }

      // 获取页面组件（支持 default export 或 named export）
      const PageComponent = pageModule.default ?? pageModule.Page;
      if (!PageComponent) {
        return null;
      }

      const AppComponent = appModule?.default ?? appModule?.App ?? null;
      const LayoutComponent = layoutModule?.default ?? layoutModule?.Layout ??
        null;

      // 准备页面属性（params/query 做安全过滤，防止原型污染等）
      const pageProps: Record<string, unknown> = {
        params: sanitizeRequestParams(match.params),
        query: sanitizeRequestParams(match.query),
      };

      // 调用 load 函数获取服务端数据（若存在），带短期缓存减轻重 I/O
      if (typeof pageModule.load === "function") {
        const url = ctx.url?.href || ctx.path;
        const cacheKey = getLoadCacheKey(url, match.params);
        const now = Date.now();
        let serverData: Record<string, unknown> | null = null;

        if (cacheKey) {
          const entry = loadCache.get(cacheKey);
          if (entry && entry.expiresAt > now) {
            serverData = entry.value;
          } else if (entry) {
            loadCache.delete(cacheKey);
          }
        }

        if (serverData === null) {
          serverData = (await pageModule.load({
            url,
            params: match.params,
            request: ctx.request,
          })) as Record<string, unknown> | null;
          if (serverData && cacheKey) {
            loadCache.set(cacheKey, {
              value: serverData,
              expiresAt: now + LOAD_CACHE_TTL_MS,
            });
            // 懒清理：超过 200 条时移除过期项，避免内存无限增长
            if (loadCache.size > 200) {
              for (const [k, v] of loadCache) {
                if (v.expiresAt <= now) loadCache.delete(k);
              }
            }
          }
        }

        if (serverData) {
          Object.assign(pageProps, serverData);
        }
      }

      // 构建布局数组（从外到内：App -> Layout -> Page）
      const layouts: Array<
        { component: unknown; props?: Record<string, unknown> }
      > = [];

      // App 组件作为最外层布局
      if (AppComponent) {
        layouts.push({ component: AppComponent });
      }

      // Layout 组件作为中间层布局
      if (LayoutComponent) {
        layouts.push({ component: LayoutComponent });
      }

      // 调用 SSR 渲染（engine 从 config 读取）
      const ssrOptions: SSROptions = {
        engine,
        component: PageComponent,
        props: pageProps,
        layouts,
        loadContext: {
          url: ctx.url.href || ctx.path,
          params: match.params,
          request: ctx.request,
        },
      };
      const result = await renderService.renderSSR(ssrOptions);

      // 注入路由 CSS 到 </head> 前
      let html = result.html;
      if (routeCss.length > 0 && html.includes("</head>")) {
        const styleTags = routeCss
          .map((c) =>
            `<style data-dweb-route-css>${escapeHtmlInStyle(c)}</style>`
          )
          .join("");
        html = html.replace("</head>", `${styleTags}</head>`);
      }

      // 生产模式下用 asset-manifest.json 替换 SSR HTML 中的资源路径
      const isDev =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || "prod") === "dev";
      if (!isDev) {
        html = await replaceAssetPathsInHtml(html, config);
      }

      // 返回 HTML 响应（开发模式禁用缓存，确保 HMR 刷新后拿到最新内容）
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...(isDev
            ? { "Cache-Control": "no-cache, no-store, must-revalidate" }
            : {}),
        },
      });
    } catch (error) {
      console.error($t("log.ssrError"), error);

      // 尝试加载 _error 进行错误处理（支持 .tsx）
      const errorPath = router.getSpecialFile("_error");
      if (errorPath) {
        try {
          const errorModule = await loadRouteModule(errorPath, {
            logger: container.has("logger") ? getLogger(container) : undefined,
          });
          const ErrorComponent = errorModule?.default ?? errorModule?.Error;
          if (ErrorComponent) {
            const errSsrOptions: SSROptions = {
              engine,
              component: ErrorComponent,
              props: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              },
            };
            const result = await renderService.renderSSR(errSsrOptions);
            const isDev =
              (getEnv("DENO_ENV") || getEnv("BUN_ENV") || "prod") === "dev";
            return new Response(result.html, {
              status: 500,
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                ...(isDev
                  ? { "Cache-Control": "no-cache, no-store, must-revalidate" }
                  : {}),
              },
            });
          }
        } catch {
          // 错误页面也加载失败，使用默认错误响应
        }
      }

      // 默认错误响应
      const isDev =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || "prod") === "dev";
      return new Response(
        `<!DOCTYPE html><html><head><title>500 Error</title></head><body><h1>Internal Server Error</h1><p>${
          error instanceof Error ? error.message : String(error)
        }</p></body></html>`,
        {
          status: 500,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            ...(isDev
              ? { "Cache-Control": "no-cache, no-store, must-revalidate" }
              : {}),
          },
        },
      );
    }
  };
}
