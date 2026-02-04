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
import { getConfig } from "../core/config.ts";
import { getEnv } from "../core/runtime-adapter.ts";
import { loadRouteModule } from "./load-route-module.ts";
import { getRender } from "./render.ts";

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
): (ctx: any, match: RouteMatch) => Promise<Response | null> {
  // 获取渲染服务与配置
  const renderService = getRender(container);
  const config = getConfig(container);
  const renderConfig = (config.render || {}) as {
    engine?: "react" | "preact";
  };
  const engine = renderConfig.engine ?? "preact";

  return async (ctx: any, match: RouteMatch): Promise<Response | null> => {
    try {
      // 只处理非 API 路由
      if (match.isApi) {
        return null;
      }

      // 加载页面组件（支持 .ts/.tsx）
      const pageModule = await loadRouteModule(match.route.fullPath);
      if (!pageModule) {
        return null;
      }

      // 获取页面组件（支持 default export 或 named export）
      const PageComponent = pageModule.default ?? pageModule.Page;
      if (!PageComponent) {
        return null;
      }

      // 加载特殊文件
      const appPath = router.getSpecialFile("_app");
      const layoutPath = router.getSpecialFile("_layout");

      // 加载 App 组件
      let AppComponent: any = null;
      if (appPath) {
        const appModule = await loadRouteModule(appPath);
        AppComponent = appModule?.default ?? appModule?.App;
      }

      // 加载 Layout 组件
      let LayoutComponent: any = null;
      if (layoutPath) {
        const layoutModule = await loadRouteModule(layoutPath);
        LayoutComponent = layoutModule?.default ?? layoutModule?.Layout;
      }

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
          url: ctx.url?.href || ctx.path,
          params: match.params,
          request: ctx.request,
        },
      };
      const result = await renderService.renderSSR(ssrOptions);

      // 返回 HTML 响应（开发模式禁用缓存，确保 HMR 刷新后拿到最新内容）
      const isDev =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || "prod") === "dev";
      return new Response(result.html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...(isDev
            ? { "Cache-Control": "no-cache, no-store, must-revalidate" }
            : {}),
        },
      });
    } catch (error) {
      console.error("SSR 渲染错误:", error);

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
