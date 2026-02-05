/**
 * @dreamer/middleware 集成
 *
 * 初始化中间件链、注册全局/路径中间件、提供 registerMiddleware 等 API。
 * 内置插件事件中间件（emitOnRequest、emitOnResponse 等）。
 *
 * @module
 */

import {
  createMiddlewareChain,
  type Middleware,
  type MiddlewareChain,
  type MiddlewareContext,
} from "@dreamer/middleware";
import type { HttpContext } from "@dreamer/server";
import type { ServiceContainer } from "@dreamer/service";
import type { AppConfig } from "../types/app.ts";
import { emitOnError, emitOnRequest, emitOnResponse } from "./plugin-events.ts";

/**
 * 待注册到 HTTP 服务器的中间件项
 *
 * 用于在 init 时同步到 server，包含中间件函数、匹配条件与名称。
 *
 * @example
 * ```ts
 * const reg: ServerMiddlewareRegistration = {
 *   middleware: (ctx, next) => next(),
 *   name: "my-middleware",
 * };
 * ```
 */
export interface ServerMiddlewareRegistration {
  middleware: Middleware<MiddlewareContext>;
  condition?: unknown;
  name?: string;
}

/**
 * 初始化中间件系统
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns 中间件链实例
 *
 * @example
 * ```ts
 * const chain = initializeMiddleware(container, config);
 * chain.use(requestLogger);
 * ```
 */
export function initializeMiddleware(
  container: ServiceContainer,
  _config: AppConfig,
): MiddlewareChain<MiddlewareContext> {
  // 创建中间件链实例
  const middlewareChain = createMiddlewareChain<MiddlewareContext>();

  // 将中间件链注册到服务容器
  container.registerSingleton("middlewareChain", () => middlewareChain);

  // 待同步到 HTTP 服务器的中间件列表（registerMiddleware 时追加，init 时应用到 server）
  container.registerSingleton(
    "serverMiddlewares",
    (): ServerMiddlewareRegistration[] => [],
  );

  return middlewareChain;
}

/**
 * 获取中间件链实例
 *
 * @param container 服务容器
 * @returns 中间件链实例
 *
 * @example
 * ```ts
 * const chain = getMiddlewareChain(container);
 * chain.use(myMiddleware);
 * ```
 */
export function getMiddlewareChain(
  container: ServiceContainer,
): MiddlewareChain<MiddlewareContext> {
  return container.get<MiddlewareChain<MiddlewareContext>>("middlewareChain");
}

/**
 * 获取待同步到 HTTP 服务器的中间件列表
 *
 * @param container 服务容器
 * @returns 中间件注册项数组
 *
 * @example
 * ```ts
 * const list = getServerMiddlewares(container);
 * for (const { middleware } of list) { ... }
 * ```
 */
export function getServerMiddlewares(
  container: ServiceContainer,
): ServerMiddlewareRegistration[] {
  return container.get<ServerMiddlewareRegistration[]>("serverMiddlewares");
}

/**
 * 注册中间件
 *
 * @param container 服务容器
 * @param middleware 中间件函数
 * @param condition 匹配条件（可选）
 * @param name 中间件名称（可选）
 * @returns void
 *
 * @example
 * ```ts
 * registerMiddleware(container, (ctx, next) => next(), undefined, "logger");
 * ```
 */
export function registerMiddleware(
  container: ServiceContainer,
  middleware: Middleware<MiddlewareContext>,
  condition?: unknown,
  name?: string,
): void {
  const chain = getMiddlewareChain(container);
  chain.use(middleware, condition as never, name);
  // 同步到待注册列表，init 时会应用到 HTTP server
  getServerMiddlewares(container).push({ middleware, condition, name });
}

// ============================================================================
// 内置中间件
// ============================================================================

/**
 * 创建插件事件中间件
 *
 * 在 HTTP 请求处理过程中触发插件的 onRequest、onResponse 和 onError 事件
 * 让插件可以感知每个 HTTP 请求的生命周期
 *
 * @param container 服务容器
 * @returns 中间件函数
 *
 * @example
 * ```typescript
 * // 框架内部自动注册
 * const middleware = pluginEventsMiddleware(container);
 * server.use(middleware);
 *
 * // 插件可以响应请求事件
 * const loggerPlugin: Plugin = {
 *   name: "logger",
 *   onRequest(ctx) {
 *     console.log(`请求: ${ctx.request.method} ${ctx.request.url}`);
 *   },
 *   onResponse(ctx) {
 *     console.log(`响应: ${ctx.response?.status}`);
 *   },
 *   onError(error, ctx) {
 *     console.error(`错误: ${error.message}`);
 *   },
 * };
 * ```
 */
export function pluginEventsMiddleware(
  container: ServiceContainer,
): Middleware<HttpContext> {
  return async (ctx: HttpContext, next: () => Promise<void>): Promise<void> => {
    // 触发 onRequest 事件（请求处理前）；若插件返回 Response 则短路后续中间件
    const response = await emitOnRequest(container, ctx);
    if (response) {
      ctx.response = response;
      return;
    }

    try {
      // 执行后续中间件
      await next();
    } catch (error) {
      // 触发 onError 事件（请求处理出错时）
      const errorResponse = await emitOnError(
        container,
        error instanceof Error ? error : new Error(String(error)),
        ctx,
      );

      // 如果插件返回了错误响应，设置到上下文
      if (errorResponse) {
        ctx.response = errorResponse;
      } else {
        // 没有插件处理错误，继续抛出
        throw error;
      }
    }

    // 触发 onResponse 事件（请求处理完成后）
    await emitOnResponse(container, ctx);
  };
}
