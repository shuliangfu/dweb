/**
 * @dreamer/websocket 集成（挂载到同一 HTTP 服务器）
 *
 * 当 AppConfig.socket 存在且 adapter 为 websocket 时，创建 WebSocket 服务并挂载到当前 HTTP 服务器，
 * 与主站共用端口。导出 initializeWebSocket、getWebSocketServer、getWebSocketPath。
 *
 * @module
 */

import { createWebSocketContext, type SocketContext } from "@dreamer/plugin";
import type { HttpContext } from "@dreamer/server";
import type { ServiceContainer } from "@dreamer/service";
import { Server } from "@dreamer/websocket";
import type { AppConfig, SocketConfig } from "../types/app.ts";
import { DwebErrorCode, throwDwebError } from "../utils/errors.ts";
import { getLogger } from "../utils/logger.ts";

/** Socket 连接/断开时的插件回调（由框架传入） */
export interface SocketPluginHandlers {
  /** 连接建立时调用 */
  onConnection?: (ctx: SocketContext) => Promise<void> | void;
  /** 连接关闭时调用 */
  onDisconnect?: (ctx: SocketContext) => Promise<void> | void;
}

/** 容器中 WebSocket 服务实例的 key */
const WEBSOCKET_SERVER_KEY = "websocketServer";
/** 容器中 WebSocket 路径的 key */
const WEBSOCKET_PATH_KEY = "websocketPath";

/**
 * 初始化 WebSocket 服务（挂载模式，不占用独立端口）
 *
 * 仅当 config.socket 存在且 adapter 为 websocket 时执行：创建 Server、写入容器，供中间件委托请求。
 * 不调用 server.listen()，由框架在同一 HTTP 服务器上通过中间件转发请求。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @param handlers 可选，连接/断开时的回调（框架传入以触发插件 onSocket、onSocketClose）
 * @returns 若已启用则返回 WebSocket 路径（如 "/ws"），否则返回 undefined
 *
 * @example
 * ```ts
 * const path = initializeWebSocket(container, config, {
 *   onConnection: (ctx) => pluginEvents.emitOnSocket(container, ctx),
 *   onDisconnect: (ctx) => pluginEvents.emitOnSocketClose(container, ctx),
 * });
 * if (path) app.use(createWebSocketMiddleware(container));
 * ```
 */
export function initializeWebSocket(
  container: ServiceContainer,
  config: AppConfig,
  handlers?: SocketPluginHandlers,
): string | undefined {
  const socketConfig = config.socket as SocketConfig | undefined;
  if (!socketConfig || socketConfig.adapter !== "websocket") {
    return undefined;
  }

  // 支持 config 嵌套，也兼容扁平结构（config 未提供时使用顶层字段）
  const impl = socketConfig.config ?? socketConfig;
  const path = (impl.path ?? "/ws").replace(/\/?$/, "") || "/ws";
  const logger = impl.logger ?? socketConfig.logger ?? getLogger(container);
  // 排除 adapter、config，避免与 @dreamer/websocket ServerOptions 冲突
  const { adapter: _adapter, config: _config, ...socketRest } = socketConfig;
  const lang: "en-US" | "zh-CN" | undefined =
    (impl as { lang?: "en-US" | "zh-CN" }).lang ??
      (config.language === "zh-CN" || config.language === "en-US"
        ? config.language
        : undefined);
  const ws = new Server({
    ...socketRest,
    ...(socketConfig.config ?? {}),
    path,
    logger,
    debug: impl.debug ?? false,
    pingTimeout: impl.pingTimeout ?? 60000,
    pingInterval: impl.pingInterval ?? 30000,
    lang,
  });

  // 若传入插件回调，在 connection/disconnect 时触发
  if (handlers?.onConnection || handlers?.onDisconnect) {
    ws.on("connection", (socket) => {
      const request = new Request(socket.handshake.url, {
        headers: socket.handshake.headers,
      });
      const ctx = createWebSocketContext(
        socket.getRawSocket(),
        request,
        socket.id,
      );
      handlers.onConnection?.(ctx);
      socket.on("disconnect", () => {
        handlers.onDisconnect?.(ctx);
      });
    });
  }

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
    throwDwebError(DwebErrorCode.WEBSOCKET_NOT_CONFIGURED);
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
