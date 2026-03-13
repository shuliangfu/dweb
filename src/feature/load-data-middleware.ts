/**
 * Load 数据接口中间件
 *
 * 客户端页面切换时请求 GET /_dweb_data?path=/pathname 获取该路由 load() 的返回数据，
 * 服务端根据 path 匹配路由、执行 load()，返回 JSON，供客户端渲染时注入到页面组件。
 */

import type { HttpContext } from "@dreamer/server";
import type { SessionData } from "@dreamer/session";
import type { Router } from "@dreamer/router";
import type { ServiceContainer } from "@dreamer/service";
import type { AppConfig } from "../types/app.ts";
import { createLoadContext, createServerResponse } from "../types/context.ts";
import { getLogger } from "../utils/logger.ts";
import { sanitizeRequestParams } from "../utils/sanitize.ts";
import { DWEB_DATA_PATH } from "../utils/constants.ts";
import { loadRouteModule } from "./load-route-module.ts";

/** 数据接口路径（与客户端 fetch 一致），统一从 constants 导出便于引用 */
export { DWEB_DATA_PATH };

/**
 * 创建 Load 数据接口中间件
 *
 * 仅处理 GET 请求且 pathname 为 /_dweb_data 的请求：
 * - 从 query 读取 path（要加载的路由 pathname，如 /users/123）
 * - 匹配路由，加载页面模块，执行 load()
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
  const loadOpts = {
    logger: container.has("logger") ? getLogger(container) : undefined,
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
          headers: { "Content-Type": "application/json" },
        });
        return;
      }

      const fullPath = (match.route as { fullPath?: string }).fullPath;
      if (!fullPath) {
        ctx.response = new Response(
          JSON.stringify({ error: "no_route_path" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
        return;
      }

      const url = pathname +
        (Object.keys(queryFromUrl).length
          ? "?" + new URLSearchParams(queryFromUrl).toString()
          : "");
      const loadContext = createLoadContext({
        request: ctx.request,
        url,
        params: match.params ?? {},
        query: queryFromUrl,
        session: (ctx as { session?: SessionData }).session,
        response: createServerResponse(),
      });

      // 客户端导航时也返回 layoutData：对该路径的 layout 链执行 load，与首屏行为一致
      const layoutPaths =
        (router as { getLayoutPathsForPath?(path: string): string[] })
          .getLayoutPathsForPath?.(match.route.path) ?? [];
      const layoutPropsList: Array<Record<string, unknown>> = [];
      if (layoutPaths.length > 0) {
        const layoutModulesRaw = await Promise.all(
          layoutPaths.map((p: string) => loadRouteModule(p, loadOpts)),
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

      const pageModule = await loadRouteModule(fullPath, loadOpts);
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

      ctx.response = new Response(JSON.stringify(pageProps), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      getLogger(container).error("[dweb] load-data error", pathname, err);
      ctx.response = new Response(
        JSON.stringify({
          error: "load_failed",
          message: err instanceof Error ? err.message : String(err),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  };
}
