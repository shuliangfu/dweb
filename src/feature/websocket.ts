/**
 * @dreamer/websocket 集成（挂载到同一 HTTP 服务器）
 *
 * 当 AppConfig.socket 存在且 type 为 websocket 时，创建 WebSocket 服务并挂载到当前 HTTP 服务器，
 * 与主站共用端口。导出 initializeWebSocket、getWebSocketServer、getWebSocketPath。
 *
 * @module
 */

import type { HttpContext } from "@dreamer/server";
import type { ServiceContainer } from "@dreamer/service";
import { Server } from "@dreamer/websocket";
import type { AppConfig, SocketConfig } from "../types/app.ts";
import { getLogger } from "../utils/logger.ts";

/** 容器中 WebSocket 服务实例的 key */
const WEBSOCKET_SERVER_KEY = "websocketServer";
/** 容器中 WebSocket 路径的 key */
const WEBSOCKET_PATH_KEY = "websocketPath";

/**
 * 初始化 WebSocket 服务（挂载模式，不占用独立端口）
 *
 * 仅当 config.socket 存在且 type 为 websocket 时执行：创建 Server、写入容器，供中间件委托请求。
 * 不调用 server.listen()，由框架在同一 HTTP 服务器上通过中间件转发请求。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns 若已启用则返回 WebSocket 路径（如 "/ws"），否则返回 undefined
 *
 * @example
 * ```ts
 * const path = initializeWebSocket(container, {
 *   socket: { type: "websocket", path: "/ws" },
 * });
 * if (path) app.use(createWebSocketMiddleware(container));
 * ```
 */
export function initializeWebSocket(
  container: ServiceContainer,
  config: AppConfig,
): string | undefined {
  const socketConfig = config.socket as SocketConfig | undefined;
  if (!socketConfig || socketConfig.type !== "websocket") {
    return undefined;
  }

  const path = (socketConfig.path ?? "/ws").replace(/\/?$/, "") || "/ws";
  const logger = socketConfig.logger ?? getLogger(container);
  const ws = new Server({
    path,
    logger,
    debug: socketConfig.debug ?? false,
    pingTimeout: socketConfig.pingTimeout ?? 60000,
    pingInterval: socketConfig.pingInterval ?? 30000,
    ...socketConfig,
  });

  container.registerSingleton(WEBSOCKET_SERVER_KEY, () => ws);
  container.registerSingleton(WEBSOCKET_PATH_KEY, () => path);
  return path;
}

/**
 * 获取已初始化的 WebSocket 服务实例
 *
 * @param container 服务容器
 * @returns WebSocket Server
 * @throws {Error} 未配置 WebSocket 时抛出错误
 *
 * @example
 * ```ts
 * const ws = getWebSocketServer(container);
 * ws.on("connection", (conn) => { ... });
 * ```
 */
export function getWebSocketServer(container: ServiceContainer): Server {
  if (!container.has(WEBSOCKET_SERVER_KEY)) {
    throw new Error(
      "WebSocket 未配置，请在 AppConfig 中设置 socket: { type: 'websocket', ... }",
    );
  }
  return container.get<Server>(WEBSOCKET_SERVER_KEY);
}

/**
 * 获取 WebSocket 挂载路径
 *
 * @param container 服务容器
 * @returns 路径前缀（如 "/ws"），未配置时返回 undefined
 *
 * @example
 * ```ts
 * const path = getWebSocketPath(container);
 * if (path) console.log("WebSocket at", path);
 * ```
 */
export function getWebSocketPath(
  container: ServiceContainer,
): string | undefined {
  if (!container.has(WEBSOCKET_PATH_KEY)) {
    return undefined;
  }
  return container.get<string>(WEBSOCKET_PATH_KEY);
}

/**
 * 创建 WebSocket 委托中间件
 *
 * 仅当请求路径以 websocketPath 开头时执行：将 request 交给 WebSocket 处理并设置 ctx.response。
 *
 * @param container 服务容器
 * @returns 中间件函数
 *
 * @example
 * ```ts
 * app.use(createWebSocketMiddleware(container));
 * ```
 */
export function createWebSocketMiddleware(
  container: ServiceContainer,
): (ctx: HttpContext, next: () => Promise<void>) => Promise<void> {
  return async (ctx: HttpContext, next: () => Promise<void>): Promise<void> => {
    const path = getWebSocketPath(container);
    if (!path || !ctx.path.startsWith(path)) {
      await next();
      return;
    }
    const ws = getWebSocketServer(container);
    ctx.response = await ws.handleRequest(ctx.request);
  };
}
