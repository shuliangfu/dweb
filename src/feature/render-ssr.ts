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
import { getEnv } from "../core/runtime-adapter.ts";
import { replaceAssetPathsInHtml } from "../utils/asset-manifest.ts";
import { $t } from "../utils/i18n.ts";
import { loadRouteModule } from "./load-route-module.ts";
import { getRender } from "./render.ts";

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
      const [pageModule, appModule, layoutModule] = await Promise.all([
        loadRouteModule(match.route.fullPath, { cssCollector }),
        appPath ? loadRouteModule(appPath, { cssCollector }) : Promise.resolve(null),
        layoutPath ? loadRouteModule(layoutPath, { cssCollector }) : Promise.resolve(null),
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

      // 准备页面属性
      const pageProps: Record<string, any> = {
        params: match.params,
        query: match.query,
      };

      // 调用 load 函数获取服务端数据（如果存在）
      if (typeof pageModule.load === "function") {
        const serverData = await pageModule.load({
          url: ctx.url?.href || ctx.path,
          params: match.params,
          request: ctx.request,
        });
        Object.assign(pageProps, serverData);
      }

      // 构建布局数组（从外到内：App -> Layout -> Page）
      const layouts: Array<
        { component: any; props?: Record<string, unknown> }
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
          .map((c) => `<style data-dweb-route-css>${escapeHtmlInStyle(c)}</style>`)
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
          const errorModule = await loadRouteModule(errorPath);
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
