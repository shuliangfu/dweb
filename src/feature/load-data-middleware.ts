/**
 * Load 数据接口中间件
 *
 * 客户端页面切换时请求 GET /_dweb_data?path=/pathname 获取该路由 load() 的返回数据，
 * 服务端根据 path 匹配路由、执行 load()，返回 JSON，供客户端渲染时注入到页面组件。
 */

import {
  generateRouteMetaTagsWithoutTitle,
  generateRouteTitleTag,
  type Metadata,
  resolveMetadata,
} from "@dreamer/render";
import type { Router } from "@dreamer/router";
import { type HttpContext, snapshotMatchedRoute } from "@dreamer/server";
import type { ServiceContainer } from "@dreamer/service";
import type { SessionData } from "@dreamer/session";
import { cwd, dirname, resolve } from "../core/runtime-adapter.ts";
import type { AppConfig, IApp } from "../types/app.ts";
import {
  createLoadContext,
  createServerResponse,
  requestFromHttpContext,
} from "../types/context.ts";
import {
  DATA_ENDPOINT_CACHE_CONTROL,
  DWEB_DATA_PATH,
} from "../utils/constants.ts";
import { getLogger } from "../utils/logger.ts";
import { resolveRouterRoutesDirPath } from "../utils/path.ts";
import { sanitizeRequestParams } from "../utils/sanitize.ts";
import { createJsonErrorBody } from "../utils/security.ts";
import { loadRouteModule } from "./load-route-module.ts";

/** `/__data` JSON 响应公共头：禁止缓存 load 个性化数据 */
const DATA_JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": DATA_ENDPOINT_CACHE_CONTROL,
} as const;

/** 数据接口路径（与客户端 fetch 一致），统一从 constants 导出便于引用 */
export { DWEB_DATA_PATH };

/**
 * 创建 Load 数据接口中间件
 *
 * 仅处理 GET 请求且 pathname 为 /_dweb_data 的请求：
 * - 从 query 读取 path（要加载的路由 pathname，如 /users/123）
 * - 匹配路由，加载页面模块，执行 load()（原生动态 `import`，与 SSR 路由加载一致）
 * - 返回 { params, query, ...loadResult } 的 JSON
 *
 * 错误与状态码约定：
 * - 路由未匹配或路由无 fullPath：返回 404 JSON（{ error: "not_found" } 或 "no_route_path"）
 * - load() 抛错或其它异常：返回 500 JSON（{ error: "load_failed", message }），不静默吞错
 *
 * @param container 服务容器
 * @param router 路由实例
 * @param config 应用配置
 * @returns 中间件函数
 */
export function createLoadDataMiddleware(
  container: ServiceContainer,
  router: Router,
  _config: AppConfig,
): (ctx: HttpContext, next: () => Promise<void>) => Promise<void> {
  const app = container.get<IApp>("app");
  const renderCfg = (_config.render || {}) as {
    engine?: "react" | "preact" | "view";
  };
  const routerCfg = (_config.router || {}) as { routesDir?: string };
  const routesDirRaw = routerCfg.routesDir ?? "./src/routes";
  const routesDirPath = resolveRouterRoutesDirPath(cwd(), routesDirRaw);
  /**
   * 从 routes 目录推导应用根目录（用于把 router 的相对 `fullPath` 稳定转为绝对路径）。
   *
   * 背景：Bun 测试并发时其它套件可能 `chdir()`，若把 `src/routes/index.tsx` 这类相对路径
   * 直接交给 `loadRouteModule`，会偶发按“错误 cwd”解析，触发
   * `Path must be in project` 与 load-data 断言失败。
   */
  const appRootPath = (() => {
    const normalized = routesDirPath.replace(/\\/g, "/");
    const srcMarkerIdx = normalized.lastIndexOf("/src/");
    if (srcMarkerIdx >= 0) {
      return normalized.slice(0, srcMarkerIdx);
    }
    if (normalized.endsWith("/src")) {
      return normalized.slice(0, -4);
    }
    return resolve(routesDirPath, "..");
  })();
  /**
   * 将 router 产出的路由文件路径规范为绝对路径：
   * - 绝对路径：原样返回；
   * - 相对路径：按 appRootPath 解析，避免依赖全局 cwd。
   */
  const toAbsoluteRoutePath = (routePath: string): string => {
    if (routePath.startsWith("file://")) {
      return routePath;
    }
    if (routePath.startsWith("/") || routePath.match(/^[A-Za-z]:/)) {
      return routePath;
    }
    return resolve(appRootPath, routePath);
  };
  /** 数据接口只需执行模块的 `load()`，与常规路由加载相同（原生动态 import） */
  const loadOpts = {
    logger: container.has("logger") ? getLogger(container) : undefined,
    engine: renderCfg.engine,
    routesDirPath,
  };

  return async (ctx: HttpContext, next: () => Promise<void>): Promise<void> => {
    if (
      ctx.path !== DWEB_DATA_PATH ||
      (ctx.method || "GET").toUpperCase() !== "GET"
    ) {
      await next();
      return;
    }

    const pathname = ctx.url?.searchParams?.get("path") || "/";
    const queryFromUrl: Record<string, string> = {};
    if (ctx.url?.searchParams) {
      for (const [k, v] of ctx.url.searchParams) {
        if (k !== "path" && v) queryFromUrl[k] = v;
      }
    }

    try {
      const match = await router.match(pathname, { method: "GET" });
      if (!match || match.isApi) {
        ctx.response = new Response(JSON.stringify({ error: "not_found" }), {
          status: 404,
          headers: DATA_JSON_HEADERS,
        });
        return;
      }

      const fullPath = (match.route as { fullPath?: string }).fullPath;
      if (!fullPath) {
        ctx.response = new Response(
          JSON.stringify({ error: "no_route_path" }),
          {
            status: 404,
            headers: DATA_JSON_HEADERS,
          },
        );
        return;
      }

      const url = pathname +
        (Object.keys(queryFromUrl).length
          ? "?" + new URLSearchParams(queryFromUrl).toString()
          : "");
      const loadContext = createLoadContext({
        app,
        container,
        req: requestFromHttpContext(ctx),
        url,
        params: match.params ?? {},
        query: queryFromUrl,
        session: (ctx as { session?: SessionData }).session,
        res: createServerResponse(),
        matchedRoute: snapshotMatchedRoute(match.route),
      });

      // 客户端导航时也返回 layoutData：对该路径的 layout 链执行 load，与首屏行为一致
      const layoutPaths =
        (router as { getLayoutPathsForPath?(path: string): string[] })
          .getLayoutPathsForPath?.(match.route.path) ?? [];
      const layoutPropsList: Array<Record<string, unknown>> = [];
      if (layoutPaths.length > 0) {
        const layoutModulesRaw = await Promise.all(
          layoutPaths.map((p: string) => {
            const absLayoutPath = toAbsoluteRoutePath(p);
            return loadRouteModule(absLayoutPath, {
              ...loadOpts,
              // 使用当前绝对文件路径的目录作为 routesDirPath，避免 Windows 8.3/长路径混用误判
              routesDirPath: dirname(absLayoutPath),
            });
          }),
        );
        const inheritBreakIndex = layoutModulesRaw.findIndex(
          (m: unknown) =>
            m && (m as Record<string, unknown>).inheritLayout === false,
        );
        const modulesToUse = inheritBreakIndex >= 0
          ? layoutModulesRaw.slice(inheritBreakIndex)
          : layoutModulesRaw;
        for (const mod of modulesToUse as Array<Record<string, unknown>>) {
          if (!mod || typeof mod.load !== "function") {
            layoutPropsList.push({});
            continue;
          }
          const raw = await mod.load(loadContext);
          if (raw instanceof Response) {
            ctx.response = raw;
            return;
          }
          const data = (raw as Record<string, unknown> | null) ?? {};
          layoutPropsList.push({ data });
        }
      }

      const absPagePath = toAbsoluteRoutePath(fullPath);
      const pageModule = await loadRouteModule(absPagePath, {
        ...loadOpts,
        // 使用当前绝对文件路径的目录作为 routesDirPath，避免 Windows 8.3/长路径混用误判
        routesDirPath: dirname(absPagePath),
      });
      const pageProps: Record<string, unknown> = {
        params: sanitizeRequestParams(match.params),
        query: sanitizeRequestParams(queryFromUrl),
      };
      if (layoutPropsList.length > 0) {
        pageProps.layoutData = layoutPropsList;
      }

      if (pageModule && typeof pageModule.load === "function") {
        const raw = await pageModule.load(loadContext);
        if (raw instanceof Response) {
          ctx.response = raw;
          return;
        }
        const serverData = raw as Record<string, unknown> | null;
        if (serverData) pageProps.data = serverData;
      }

      /**
       * 客户端路由切换时 `/__data` 仅返回 load() 会导致 `<title>` / meta 不更新。
       * 与 SSR/hybrid 一致：解析页面模块的 `metadata`，一并序列化供浏览器写入 head。
       */
      if (pageModule) {
        const metadataExport = (pageModule as Record<string, unknown>).metadata;
        if (metadataExport !== undefined && metadataExport !== null) {
          try {
            const resolved = await resolveMetadata(
              metadataExport as Parameters<typeof resolveMetadata>[0],
              loadContext as Parameters<typeof resolveMetadata>[1],
            );
            if (resolved && Object.keys(resolved as object).length > 0) {
              pageProps.metadata = resolved;
              /** 与 SSR 分两针注入一致：meta 块与 `<title>` 分开，避免 `<title>` 夹在 meta 中间 */
              pageProps.metadataTagsHtml = generateRouteMetaTagsWithoutTitle(
                resolved as Metadata,
              );
              pageProps.metadataTitleHtml = generateRouteTitleTag(
                resolved as Metadata,
              );
            }
          } catch (e) {
            getLogger(container).warn(
              "[dweb] metadata resolve skipped for load-data",
              pathname,
              e,
            );
          }
        }
      }

      ctx.response = new Response(JSON.stringify(pageProps), {
        status: 200,
        headers: DATA_JSON_HEADERS,
      });
    } catch (err) {
      getLogger(container).error("[dweb] load-data error", pathname, err);
      ctx.response = new Response(
        JSON.stringify(createJsonErrorBody("load_failed", err)),
        { status: 500, headers: DATA_JSON_HEADERS },
      );
    }
  };
}
