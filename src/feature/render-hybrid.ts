/**
 * Hybrid 渲染器
 *
 * 职责：
 * - 服务端渲染完整 HTML（复用 SSR 逻辑）
 * - 注入客户端脚本和路由配置
 * - 注入 hydration 数据（window.__DATA__）
 * - 客户端 hydrate 后接管路由
 *
 * Hybrid 工作流程：
 * 1. 首次请求：服务端 SSR 渲染完整 HTML
 * 2. 客户端加载 _client.js
 * 3. 客户端使用 hydrate() 激活服务端 HTML
 * 4. 后续导航：客户端使用 renderCSR() 渲染（SPA 体验）
 */

import { resolveMetadata, type SSROptions } from "@dreamer/render";
import type { RouteMatch, Router } from "@dreamer/router";
import type { HttpContext } from "@dreamer/server";
import type { SessionData } from "@dreamer/session";
import type { ServiceContainer } from "@dreamer/service";
import { createLoadContext, createServerResponse } from "../types/context.ts";
import { cwd, getEnv, join } from "../core/runtime-adapter.ts";
import type { AppConfig } from "../types/app.ts";
import { replaceAssetPathsInHtml } from "../utils/asset-manifest.ts";
import { $tr } from "../utils/i18n.ts";
import { getLogger } from "../utils/logger.ts";
import { sanitizeRequestParams } from "../utils/sanitize.ts";
import { extractComponentPathFromRouteFile } from "../utils/path.ts";
import { loadRouteModule } from "./load-route-module.ts";
import { getRender } from "./render.ts";
import { hasContainerElementInHtml } from "./render-utils.ts";

/**
 * 转义 style 内容中的 </ 避免提前闭合 style 标签
 */
function escapeHtmlInStyle(css: string): string {
  return css.replace(/<\//g, "\\3C /");
}

/**
 * Hybrid 渲染选项
 *
 * 配置客户端脚本路径、容器 ID、head/body 额外标签等。
 *
 * @example
 * ```ts
 * render: {
 *   mode: "hybrid",
 *   hybrid: {
 *     clientScript: "/_client.js",
 *     containerId: "app",
 *   },
 * }
 * ```
 */
export interface RenderHybridOptions {
  /** 客户端脚本路径（默认："/_client.js"） */
  clientScript?: string;
  /** 挂载容器元素 ID（默认："app"） */
  containerId?: string;
  /** 额外 head 标签 */
  headTags?: string;
  /** 额外 body 标签 */
  bodyTags?: string;
}

/**
 * 创建 Hybrid 渲染器
 *
 * 首屏 SSR 渲染完整 HTML，客户端 hydrate 后接管路由，后续导航使用 CSR。
 *
 * @param container 服务容器
 * @param router 路由实例
 * @param config 应用配置
 * @returns Hybrid 渲染回调函数（接收 ctx、match，返回 Response 或 null）
 *
 * @example
 * ```ts
 * const renderer = createRendererHybrid(container, router, config);
 * const response = await renderer(ctx, match);
 * ```
 */
export function createRendererHybrid(
  container: ServiceContainer,
  router: Router,
  config: AppConfig,
): (ctx: HttpContext, match: RouteMatch) => Promise<Response | null> {
  // 获取渲染服务
  const renderService = getRender(container);

  // 获取 Hybrid 配置
  const renderConfig = (config.render || {}) as {
    debug?: boolean;
    engine?: "react" | "preact" | "view";
    mode?: "ssr" | "csr" | "ssg" | "hybrid";
    hybrid?: RenderHybridOptions;
    csr?: RenderHybridOptions;
  };

  const hybridOptions: RenderHybridOptions = {
    clientScript: "/_client.js",
    containerId: "app",
    ...renderConfig.hybrid,
    ...renderConfig.csr, // 兼容 CSR 配置
  };

  const routerConfig = (config.router || {}) as { routesDir?: string };
  const routesDir = routerConfig.routesDir ?? "./src/routes";
  const routesDirPath = join(cwd(), routesDir);

  // 收集所有路由信息（用于注入到客户端，component 与 ROUTE_LOADERS key 统一格式）
  const clientRoutes = collectClientRoutes(router, routesDirPath);

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

      // 加载页面组件（支持 .ts/.tsx）
      const loadOpts = {
        cssCollector,
        logger: container.has("logger") ? getLogger(container) : undefined,
        engine: renderConfig.engine,
      };
      const pageModule = await loadRouteModule(match.route.fullPath, loadOpts);
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
      let AppComponent: unknown = null;
      if (appPath) {
        const appModule = await loadRouteModule(appPath, loadOpts);
        AppComponent = appModule?.default ?? appModule?.App;
      }

      // 加载 Layout 组件
      let LayoutComponent: unknown = null;
      if (layoutPath) {
        const layoutModule = await loadRouteModule(layoutPath, loadOpts);
        LayoutComponent = layoutModule?.default ?? layoutModule?.Layout;
      }

      // 准备页面属性（params/query 做安全过滤，防止原型污染等）
      const pageProps: Record<string, unknown> = {
        params: sanitizeRequestParams(match.params),
        query: sanitizeRequestParams(match.query),
      };

      const loadContext = createLoadContext({
        request: ctx.request,
        url: ctx.url.href,
        params: match.params ?? {},
        query: match.query ?? {},
        session: (ctx as { session?: SessionData }).session,
        response: createServerResponse(),
      });

      // 调用 load 函数获取服务端数据（如果存在）；若返回 Response 则直接作为响应（服务端跳转等）
      if (typeof pageModule.load === "function") {
        const raw = await pageModule.load(loadContext);
        if (raw instanceof Response) {
          return raw;
        }
        const serverData = raw as Record<string, unknown> | null;
        if (serverData) Object.assign(pageProps, serverData);
      }

      // 构建布局数组（从外到内：App -> Layout -> Page）
      const layouts: Array<
        { component: unknown; props?: Record<string, unknown> }
      > = [];

      // App 组件作为最外层布局（Hybrid 必须，负责渲染 <html><body><div id="app">）
      if (AppComponent) {
        layouts.push({ component: AppComponent });
      } else {
        const msg = appPath
          ? $tr("errors.hybridAppLoadFailed", { path: appPath })
          : $tr("errors.hybridAppNotFound");
        throw new Error($tr("errors.hybridNeedAppComponent", { message: msg }));
      }

      // Layout 组件作为中间层布局
      if (LayoutComponent) {
        layouts.push({ component: LayoutComponent });
      }

      // 从已 import 的路由模块读取 metadata（支持常量对象或方法），解析后交给 render 生成 meta 标签（复用 loadContext）
      let contextData: SSROptions["contextData"];
      const metadataExport = (pageModule as Record<string, unknown>).metadata;
      if (metadataExport !== undefined && metadataExport !== null) {
        const resolved = await resolveMetadata(
          metadataExport as Parameters<typeof resolveMetadata>[0],
          loadContext,
        );
        if (resolved) {
          contextData = { metadata: resolved };
        }
      }

      // 调用 SSR 渲染（debug 支持 config.render.debug 或开发模式）
      const engine = renderConfig.engine || "preact";
      const isDev =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || "prod") === "dev";
      const debugRender = renderConfig.debug === true;

      const result = await renderService.renderSSR({
        engine,
        component: PageComponent,
        props: pageProps,
        layouts,
        loadContext,
        contextData,
        debug: debugRender,
      });

      // 获取渲染的 HTML 内容
      let html = result.html;

      // 生产模式下用 asset-manifest.json 替换 SSR HTML 中的资源路径
      // （服务端从源码加载路由，源码路径未经过构建替换，需运行时替换）
      if (!isDev) {
        html = await replaceAssetPathsInHtml(html, config);
      }

      // 强制要求 _app 必须渲染挂载容器，未找到则抛错（不自动注入）
      const containerId = hybridOptions.containerId ?? "app";
      if (!hasContainerElementInHtml(html, containerId)) {
        const logger = container.has("logger")
          ? getLogger(container)
          : undefined;
        const debugInfo = [
          `appPath=${appPath ?? "undefined"}`,
          `AppComponent=${AppComponent ? "loaded" : "null"}`,
          `layouts.length=${layouts.length}`,
          `html.length=${html?.length ?? 0}`,
          `html.prefix=${JSON.stringify(html?.substring(0, 500) ?? "")}`,
        ].join(", ");
        if (logger) {
          logger.error($tr("log.mountContainerCheckFailed"), debugInfo);
        } else {
          console.error($tr("log.mountContainerCheckFailed"), debugInfo);
        }
        throw new Error(
          $tr("errors.hybridMountContainerRequired", { containerId }),
        );
      }

      // 构建 hydration 数据（component 与 ROUTE_LOADERS key 统一格式，确保 CSR/Hybrid 在 Windows 下 loadPageModule 能正确匹配）
      const rawComponent = match.route.file || match.route.path || "";
      const normalizedComponent = typeof rawComponent === "string"
        ? extractComponentPathFromRouteFile(routesDirPath, rawComponent) ||
          rawComponent.replace(/\\/g, "/").replace(/\.(tsx?|jsx?)$/, "").trim()
        : rawComponent;
      const hydrationData = {
        page: pageProps,
        route: match.route.path,
        params: match.params,
        query: match.query,
        component: normalizedComponent,
      };

      // 构建客户端配置脚本（开发模式启用 HMR 调试：在控制台设置 globalThis.__DWEB_HMR_DEBUG__ = true 可查看详细日志）
      const clientConfigScript = `
<script>
  ${
        debugRender
          ? "globalThis.__DWEB_HMR_DEBUG__ = globalThis.__DWEB_HMR_DEBUG__ ?? true; globalThis.__DWEB_DEBUG__ = globalThis.__DWEB_DEBUG__ ?? true;"
          : ""
      }
  // Hydration 数据
  globalThis.__DATA__ = ${JSON.stringify(hydrationData)};
  // 客户端路由配置
  globalThis.__DWEB_DEV__ = ${isDev};
  globalThis.__DWEB_ROUTES__ = ${JSON.stringify(clientRoutes)};
  globalThis.__DWEB_ENGINE__ = "${engine}";
  globalThis.__DWEB_CONTAINER_ID__ = "${hybridOptions.containerId}";
  globalThis.__DWEB_MODE__ = "hybrid";
</script>
<script type="module" src="${hybridOptions.clientScript}"></script>
${hybridOptions.bodyTags || ""}`;

      // 在 </body> 前注入脚本
      if (html.includes("</body>")) {
        html = html.replace("</body>", `${clientConfigScript}</body>`);
      } else {
        // 如果没有 </body> 标签，追加到末尾
        html += clientConfigScript;
      }

      // 在 </head> 前注入路由 CSS（import "*.css" 提取的内容）及额外 head 标签
      const headInject: string[] = [];
      if (routeCss.length > 0) {
        headInject.push(
          ...routeCss.map((c) =>
            `<style data-dweb-route-css>${escapeHtmlInStyle(c)}</style>`
          ),
        );
      }
      if (hybridOptions.headTags) {
        headInject.push(hybridOptions.headTags);
      }
      if (headInject.length > 0 && html.includes("</head>")) {
        html = html.replace("</head>", `${headInject.join("")}</head>`);
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
      console.error($tr("log.hybridError"), error);

      // 尝试加载 _error.tsx 进行错误处理
      const errorPath = router.getSpecialFile("_error");
      if (errorPath) {
        try {
          const errorModule = await loadRouteModule(errorPath, {
            logger: container.has("logger") ? getLogger(container) : undefined,
          });
          const ErrorComponent = errorModule?.default ?? errorModule?.Error;
          if (ErrorComponent) {
            const result = await renderService.renderSSR({
              engine: renderConfig.engine || "preact",
              component: ErrorComponent,
              props: {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              },
              debug: renderConfig.debug === true,
            });
            return new Response(result.html, {
              status: 500,
              headers: {
                "Content-Type": "text/html; charset=utf-8",
              },
            });
          }
        } catch {
          // 错误页面也加载失败，使用默认错误响应
        }
      }

      // 默认错误响应
      return new Response(
        `<!DOCTYPE html><html><head><title>500 Error</title></head><body><h1>Internal Server Error</h1><p>${
          error instanceof Error ? error.message : String(error)
        }</p></body></html>`,
        {
          status: 500,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        },
      );
    }
  };
}

/**
 * 收集客户端路由信息
 *
 * @param router 路由实例
 * @param routesDirPath routes 目录绝对路径（用于 extractComponentPathFromRouteFile，确保 component 与 ROUTE_LOADERS key 一致）
 * @returns 客户端路由数组
 */
function collectClientRoutes(
  router: Router,
  routesDirPath: string,
): Array<{ path: string; component: string; type: string }> {
  const routes: Array<{ path: string; component: string; type: string }> = [];

  const allRoutes = router.getRoutes?.() || [];

  for (const route of allRoutes) {
    if (route.isApi) continue;

    const raw = route.file || route.path || "";
    const component = extractComponentPathFromRouteFile(routesDirPath, raw) ||
      raw.replace(/\\/g, "/").replace(/\.(tsx?|jsx?)$/, "").trim();
    routes.push({
      path: route.path,
      component,
      type: route.type || "static",
    });
  }

  return routes;
}
