/**
 * SSR 渲染处理
 *
 * 职责：
 * - 动态加载页面组件
 * - 加载布局组件
 * - 调用 @dreamer/render 进行 SSR 渲染
 * - 注入 hydration 数据与客户端脚本，支持客户端激活（事件响应）
 * - 插件事件由 pluginEventsMiddleware 自动触发
 * - 返回 HTML 响应
 */

import { resolveMetadata, type SSROptions } from "@dreamer/render";
import type { RouteMatch, Router } from "@dreamer/router";
import type { ServiceContainer } from "@dreamer/service";
import { type HttpContext, snapshotMatchedRoute } from "@dreamer/server";
import type { SessionData } from "@dreamer/session";
import { getConfig } from "../core/config.ts";
import { getLogger } from "../utils/logger.ts";
import { cwd, getEnv } from "../core/runtime-adapter.ts";
import {
  createLoadContext,
  createServerResponse,
  requestFromHttpContext,
} from "../types/context.ts";
import { replaceAssetPathsInHtml } from "../utils/asset-manifest.ts";
import { sanitizeRequestParams } from "../utils/sanitize.ts";
import {
  createDefaultErrorHtml,
  serializeJsonForInlineScript,
} from "../utils/security.ts";
import { $tr } from "../utils/i18n.ts";
import {
  extractComponentPathFromRouteFile,
  resolveRouterRoutesDirPath,
} from "../utils/path.ts";
import {
  collectClientRoutes,
  hasContainerElementInHtml,
} from "./render-utils.ts";
import { loadRouteModule } from "./load-route-module.ts";
import { getRender } from "./render.ts";
import type { AppConfig } from "../types/app.ts";

/** load 结果短期缓存 TTL（毫秒），减轻重 I/O 的重复请求 */
const LOAD_CACHE_TTL_MS = 1000;

/** load 缓存条目 */
/** load 缓存值：仅缓存纯数据对象，不缓存 Response */
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

/** 客户端脚本路径（与 CSR/Hybrid 一致，由中间件提供） */
const SSR_CLIENT_SCRIPT = "/_client.js";
/** 挂载容器 ID（与 _app 内一致） */
const SSR_CONTAINER_ID = "app";

/**
 * 创建 SSR 渲染处理器
 *
 * 动态加载页面与布局组件，调用 @dreamer/render 进行服务端渲染；
 * 注入 __DATA__ 与客户端脚本，支持客户端激活（纯事件响应，不走路由）。
 *
 * @param container 服务容器
 * @param router 路由实例
 * @param config 应用配置（用于注入客户端路由、engine、containerId）
 * @returns SSR 渲染回调函数（接收 ctx、match，返回 Response 或 null）
 */
export function createRendererSSR(
  container: ServiceContainer,
  router: Router,
  config: AppConfig,
): (ctx: HttpContext, match: RouteMatch) => Promise<Response | null> {
  // 获取渲染服务与配置
  const renderService = getRender(container);
  const resolvedConfig = getConfig(container);
  /** load 结果短期缓存（URL + params → 1 秒内复用，减轻重 I/O） */
  const loadCache = new Map<string, LoadCacheEntry>();
  const renderConfig = (resolvedConfig.render || {}) as {
    debug?: boolean;
    engine?: "react" | "preact" | "view";
    ssr?: { hydrate?: boolean };
  };
  const engine = renderConfig.engine ?? "preact";
  const routerConfig = (config.router || {}) as { routesDir?: string };
  const routesDirPath = resolveRouterRoutesDirPath(
    cwd(),
    routerConfig.routesDir ?? "./src/routes",
  );
  const clientRoutes = collectClientRoutes(router, routesDirPath);
  const containerId = SSR_CONTAINER_ID;
  const clientScript = SSR_CLIENT_SCRIPT;

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

      // 并行加载页面、App 与布局链（支持嵌套布局：从根到当前路径的 _layout）
      const appPath = router.getSpecialFile("_app");
      const layoutPaths = router.getLayoutPathsForPath?.(match.route.path) ??
        [];
      const loadOpts = {
        cssCollector,
        logger: container.has("logger") ? getLogger(container) : undefined,
        engine: renderConfig.engine ?? undefined,
        routesDirPath,
      };
      const [pageModule, appModule, ...layoutModulesRaw] = await Promise.all([
        loadRouteModule(match.route.fullPath, loadOpts),
        appPath ? loadRouteModule(appPath, loadOpts) : Promise.resolve(null),
        ...layoutPaths.map((p) => loadRouteModule(p, loadOpts)),
      ]);
      // 若某层 _layout 导出 inheritLayout = false，则不继承其之上的父级 layout，仅保留从该层起的链
      const inheritBreakIndex = layoutModulesRaw.findIndex(
        (m) => m && (m as Record<string, unknown>).inheritLayout === false,
      );
      const layoutModules = inheritBreakIndex >= 0
        ? layoutModulesRaw.slice(inheritBreakIndex)
        : layoutModulesRaw;
      const layoutComponents =
        (layoutModules as Array<Record<string, unknown> | null>)
          .map((m) => m?.default ?? m?.Layout)
          .filter((c): c is NonNullable<typeof c> => c != null);
      if (!pageModule) {
        return null;
      }

      // 获取页面组件（支持 default export 或 named export）
      const PageComponent = pageModule.default ?? pageModule.Page;
      if (!PageComponent) {
        return null;
      }

      const AppComponent = appModule?.default ?? appModule?.App ?? null;

      // 准备页面属性（params/query 做安全过滤，防止原型污染等）
      const pageProps: Record<string, unknown> = {
        params: sanitizeRequestParams(match.params),
        query: sanitizeRequestParams(match.query),
      };

      const url = ctx.url?.href || ctx.path;
      const loadContext = createLoadContext({
        req: requestFromHttpContext(ctx),
        url,
        params: match.params ?? {},
        query: match.query ?? {},
        session: (ctx as { session?: SessionData }).session,
        res: createServerResponse(),
        matchedRoute: snapshotMatchedRoute(match.route),
      });

      // 为每个 _layout 模块调用 load（若存在），并将返回值作为该层 layout 的 props.data
      const layoutPropsList: Array<Record<string, unknown>> = [];
      for (
        const mod of layoutModules as Array<Record<string, unknown> | null>
      ) {
        if (!mod || typeof mod.load !== "function") {
          layoutPropsList.push({});
          continue;
        }
        const raw = await mod.load(loadContext);
        if (raw instanceof Response) {
          return raw;
        }
        const data = (raw as Record<string, unknown> | null) ?? {};
        layoutPropsList.push({ data });
      }

      // 调用 load 函数获取服务端数据（若存在），带短期缓存减轻重 I/O；若返回 Response 则直接作为响应（服务端跳转等）
      if (typeof pageModule.load === "function") {
        const cacheKey = getLoadCacheKey(url, match.params);
        const now = Date.now();
        let serverData: Record<string, unknown> | Response | null = null;

        if (cacheKey) {
          const entry = loadCache.get(cacheKey);
          if (entry && entry.expiresAt > now) {
            serverData = entry.value;
          } else if (entry) {
            loadCache.delete(cacheKey);
          }
        }

        if (serverData === null) {
          const raw = await pageModule.load(loadContext);
          if (raw instanceof Response) {
            return raw;
          }
          serverData = raw as Record<string, unknown> | null;
          if (serverData && cacheKey && !(serverData instanceof Response)) {
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

        if (serverData && !(serverData instanceof Response)) {
          pageProps.data = serverData;
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

      // 布局链作为中间层（从外到内依次包裹），传入各层 load 的返回值作为 props.data
      layoutComponents.forEach((LayoutComponent, i) => {
        layouts.push({
          component: LayoutComponent,
          props: layoutPropsList[i],
        });
      });

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

      // 调用 SSR 渲染（engine 从 config 读取，debug 支持 config.render.debug 或开发模式）
      const isDev = getEnv("RUNTIME_ENV") === "dev";
      const ssrOptions: SSROptions = {
        engine,
        component: PageComponent,
        props: pageProps,
        layouts,
        loadContext,
        contextData,
        debug: renderConfig.debug === true,
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
      if (!isDev) {
        html = await replaceAssetPathsInHtml(html, resolvedConfig);
      }

      // 客户端激活（仅当 render.ssr.hydrate 不为 false 时注入 __DATA__ 与 _client.js）
      const ssrHydrate = renderConfig.ssr?.hydrate !== false;
      if (ssrHydrate) {
        if (!hasContainerElementInHtml(html, containerId)) {
          const logger = container.has("logger")
            ? getLogger(container)
            : undefined;
          if (logger) {
            logger.error(
              $tr("log.ssrMountContainerCheckFailed"),
              `containerId=${containerId}, html.length=${html?.length ?? 0}`,
            );
          }
          throw new Error(
            $tr("errors.hybridMountContainerRequired", { containerId }),
          );
        }
        const rawComponent = match.route.file || match.route.path || "";
        const normalizedComponent = typeof rawComponent === "string"
          ? extractComponentPathFromRouteFile(routesDirPath, rawComponent) ||
            rawComponent.replace(/\\/g, "/").replace(/\.(tsx?|jsx?)$/, "")
              .trim()
          : rawComponent;
        // layoutData 供客户端 hydrate 时注入到各层 Layout 的 props
        /** 实际请求路径（去尾斜杠），供客户端与 location.pathname 比较以决定是否执行 hydrate */
        const hydrationPathname = (ctx.path || "/").replace(/\/$/, "") || "/";
        const hydrationData = {
          page: pageProps,
          route: match.route.path,
          pathname: hydrationPathname,
          params: match.params,
          query: match.query,
          component: normalizedComponent,
          layoutData: layoutPropsList,
        };
        const debugRender = renderConfig.debug === true;
        const routerDebug =
          (resolvedConfig.router as { debug?: boolean } | undefined)
            ?.debug === true;
        const clientConfigScript = `
<script>
  ${debugRender ? "globalThis.__DWEB_DEBUG__ = true;" : ""}
  ${
          routerDebug
            ? "globalThis.__DWEB_ROUTER_DEBUG__ = globalThis.__DWEB_ROUTER_DEBUG__ ?? true;"
            : ""
        }
  globalThis.__DATA__ = ${serializeJsonForInlineScript(hydrationData)};
  globalThis.__DWEB_DEV__ = ${isDev};
  globalThis.__DWEB_ROUTES__ = ${serializeJsonForInlineScript(clientRoutes)};
  globalThis.__DWEB_ENGINE__ = "${engine}";
  globalThis.__DWEB_CONTAINER_ID__ = "${containerId}";
  globalThis.__DWEB_MODE__ = "ssr";
</script>
<script type="module" src="${clientScript}"></script>`;
        if (html.includes("</body>")) {
          html = html.replace("</body>", `${clientConfigScript}</body>`);
        } else {
          html += clientConfigScript;
        }
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
      console.error($tr("log.ssrError"), error);

      // 尝试加载 _error 进行错误处理（支持 .tsx）
      const errorPath = router.getSpecialFile("_error");
      if (errorPath) {
        try {
          const errorModule = await loadRouteModule(errorPath, {
            logger: container.has("logger") ? getLogger(container) : undefined,
            engine: renderConfig.engine ?? undefined,
            routesDirPath,
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
              debug: renderConfig.debug === true,
            };
            const result = await renderService.renderSSR(errSsrOptions);
            const isDev = getEnv("RUNTIME_ENV") === "dev";
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
      const isDev = getEnv("RUNTIME_ENV") === "dev";
      return new Response(
        createDefaultErrorHtml(error),
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
