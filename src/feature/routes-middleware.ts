/**
 * 嵌套路由中间件（routes/_middleware.ts 链式执行）
 *
 * 与嵌套 _layout 一致：按 pathname 从根到子目录依次加载并执行各层 _middleware.ts。
 * 例如访问 /hs-admin 时会依次执行 routes/_middleware.ts → routes/hs-admin/_middleware.ts。
 */

import type { Middleware, MiddlewareContext } from "@dreamer/middleware";
import type { Router } from "@dreamer/router";
import type { HttpContext } from "@dreamer/server";
import type { ServiceContainer } from "@dreamer/service";
import { getRouter } from "./router.ts";

/** 路由中间件函数：可返回 Response 以短路后续链 */
type RouteMiddlewareFn = (
  ctx: MiddlewareContext,
  next: () => Promise<void>,
) => Promise<void | Response>;

/**
 * 从 Router 扫描结果加载指定 pathname 对应的嵌套中间件函数列表（从外到内）
 *
 * @param router 已 scan 的路由实例
 * @param pathname 请求路径
 * @returns 中间件函数数组
 */
async function loadNestedRouteMiddlewares(
  router: Router,
  pathname: string,
): Promise<RouteMiddlewareFn[]> {
  const middlewarePaths = router.getMiddlewarePathsForPath(pathname);
  const middlewares: RouteMiddlewareFn[] = [];

  for (const filePath of middlewarePaths) {
    try {
      const module = await router.loadModule(filePath);
      if (module.default && typeof module.default === "function") {
        middlewares.push(module.default as RouteMiddlewareFn);
      }
      if (module.middleware && typeof module.middleware === "function") {
        middlewares.push(module.middleware as RouteMiddlewareFn);
      }
    } catch {
      // 单层加载失败时跳过，不影响其余层
    }
  }

  return middlewares;
}

/**
 * 创建嵌套路由中间件执行器
 *
 * 在 HTTP 中间件链中按 pathname 链式执行 routes 下各层 _middleware.ts；
 * 若某层返回 Response 实例则写入 ctx.response 并停止后续中间件。
 *
 * @param container 服务容器（运行时从中获取 Router）
 * @returns 注册到 HTTP 服务器的中间件函数
 */
export function createNestedRoutesMiddleware(
  container: ServiceContainer,
): Middleware<HttpContext> {
  return async (
    ctx: HttpContext,
    next: () => Promise<void>,
  ): Promise<void> => {
    let router: Router;
    try {
      router = getRouter(container);
    } catch {
      // Router 尚未初始化（如 build 阶段），直接放行
      await next();
      return;
    }

    const pathname = ctx.path ||
      new URL(ctx.request.url).pathname;
    const middlewares = await loadNestedRouteMiddlewares(router, pathname);

    if (middlewares.length === 0) {
      await next();
      return;
    }

    let index = 0;

    /**
     * 执行当前层及后续嵌套中间件；全部完成后调用 HTTP 链 next()
     */
    const runNestedChain = async (): Promise<void> => {
      if (ctx.response) {
        return;
      }

      if (index >= middlewares.length) {
        await next();
        return;
      }

      const middleware = middlewares[index++];
      const result = await middleware(ctx as MiddlewareContext, runNestedChain);

      // 兼容 return Response.redirect(...) 等短路写法
      if (result instanceof Response) {
        ctx.response = result;
      }
    };

    await runNestedChain();
  };
}
