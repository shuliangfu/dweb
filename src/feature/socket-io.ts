/**
 * @dreamer/socket-io 集成（挂载到同一 HTTP 服务器）
 *
 * 当 AppConfig.socket 存在且 adapter 为 socketio 时，创建 Socket.IO 服务并挂载到当前 HTTP 服务器，
 * 与主站共用端口。导出 initializeSocketIo、getSocketIoServer、getSocketIoPath。
 *
 * @module
 */

import {
  createSocketIOContext,
  type SocketContext,
  type SocketIOSocket,
} from "@dreamer/plugin";
import type { HttpContext } from "@dreamer/server";
import type { ServiceContainer } from "@dreamer/service";
import { Server, type ServerOptions } from "@dreamer/socket-io";
import {
  type AppConfig,
  isSocketIOAdapter,
  type SocketConfig,
} from "../types/app.ts";
import { resolveSocketIoCorsOptions } from "../utils/cors-resolve.ts";
import { DwebErrorCode, throwDwebError } from "../utils/errors.ts";
import { getLogger } from "../utils/logger.ts";

/** Socket 连接/断开时的插件回调（由框架传入） */
export interface SocketPluginHandlers {
  /** 连接建立时调用 */
  onConnection?: (ctx: SocketContext) => Promise<void> | void;
  /** 连接关闭时调用 */
  onDisconnect?: (ctx: SocketContext) => Promise<void> | void;
}

/** 容器中 Socket.IO 服务实例的 key */
const SOCKET_IO_SERVER_KEY = "socketIoServer";
/** 容器中 Socket.IO 路径的 key */
const SOCKET_IO_PATH_KEY = "socketIoPath";

/**
 * 初始化 Socket.IO 服务（挂载模式，不占用独立端口）
 *
 * 仅当 config.socket 存在且 adapter 为 socketio 时执行：创建 Server、写入容器，供中间件委托请求。
 * 不调用 server.listen()，由框架在同一 HTTP 服务器上通过中间件转发请求。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @param handlers 可选，连接/断开时的回调（框架传入以触发插件 onSocket、onSocketClose）
 * @returns 若已启用则返回 Socket.IO 路径（如 "/socket.io/"），否则返回 undefined
 *
 * @example
 * ```ts
 * const path = initializeSocketIo(container, config, {
 *   onConnection: (ctx) => pluginEvents.emitOnSocket(container, ctx),
 *   onDisconnect: (ctx) => pluginEvents.emitOnSocketClose(container, ctx),
 * });
 * if (path) app.use(createSocketIoMiddleware(container));
 * ```
 */
export function initializeSocketIo(
  container: ServiceContainer,
  config: AppConfig,
  handlers?: SocketPluginHandlers,
): string | undefined {
  const socketConfig = config.socket as SocketConfig | undefined;
  if (!socketConfig || !isSocketIOAdapter(socketConfig.adapter)) {
    return undefined;
  }

  // 支持 config 嵌套，也兼容扁平结构（config 未提供时使用顶层字段）
  const impl = socketConfig.config ?? socketConfig;
  const path = (impl.path ?? "/socket.io/").replace(/\/?$/, "/");
  const logger = impl.logger ?? socketConfig.logger ?? getLogger(container);
  // 排除 adapter、config，避免与 @dreamer/socket-io ServerOptions 冲突
  const { adapter: _adapter, config: _config, ...socketRest } = socketConfig;
  const lang: "en-US" | "zh-CN" | undefined =
    (impl as { lang?: "en-US" | "zh-CN" }).lang ??
      (config.language === "zh-CN" || config.language === "en-US"
        ? config.language
        : undefined);
  const implCorsFields = impl as {
    cors?: ServerOptions["cors"];
    allowCORS?: boolean;
  };
  const restCorsFields = socketRest as {
    cors?: ServerOptions["cors"];
    allowCORS?: boolean;
  };
  const socketCors = implCorsFields.cors ?? restCorsFields.cors;
  const resolvedCors = resolveSocketIoCorsOptions(
    config.cors,
    socketCors,
    implCorsFields.allowCORS ?? restCorsFields.allowCORS,
  );
  const serverOptions: ServerOptions = {
    ...socketRest,
    ...(socketConfig.config ?? {}),
    path,
    logger,
    lang,
    ...(resolvedCors != null ? { cors: resolvedCors } : {}),
    // 不传 port/host，挂载到主站
  };
  const io = new Server(serverOptions);

  // 若传入插件回调，在 connection/disconnect 时触发
  if (handlers?.onConnection || handlers?.onDisconnect) {
    io.on("connection", (socket) => {
      // @dreamer/socket-io 的 nsp 为 string，plugin 的 createSocketIOContext 已兼容
      const ctx = createSocketIOContext(socket as unknown as SocketIOSocket);
      handlers.onConnection?.(ctx);
      socket.on("disconnect", () => {
        handlers.onDisconnect?.(ctx);
      });
    });
  }

  container.registerSingleton(SOCKET_IO_SERVER_KEY, () => io);
  container.registerSingleton(SOCKET_IO_PATH_KEY, () => path);
  return path;
}

/**
 * 获取已初始化的 Socket.IO 服务实例
 *
 * @param container 服务容器
 * @returns Socket.IO Server
 * @throws {Error} 未配置 Socket.IO 时抛出错误
 *
 * @example
 * ```ts
 * const io = getSocketIoServer(container);
 * io.on("connection", (socket) => { ... });
 * ```
 */
export function getSocketIoServer(container: ServiceContainer): Server {
  if (!container.has(SOCKET_IO_SERVER_KEY)) {
    throwDwebError(DwebErrorCode.SOCKET_IO_NOT_CONFIGURED);
  }
  return container.get<Server>(SOCKET_IO_SERVER_KEY);
}

/**
 * 获取 Socket.IO 挂载路径
 *
 * @param container 服务容器
 * @returns 路径前缀（如 "/socket.io/"），未配置时返回 undefined
 *
 * @example
 * ```ts
 * const path = getSocketIoPath(container);
 * if (path) console.log("Socket.IO at", path);
 * ```
 */
export function getSocketIoPath(
  container: ServiceContainer,
): string | undefined {
  if (!container.has(SOCKET_IO_PATH_KEY)) {
    return undefined;
  }
  return container.get<string>(SOCKET_IO_PATH_KEY);
}

/**
 * 创建 Socket.IO 委托中间件
 *
 * 仅当请求路径以 socketIoPath 开头时执行：将 request 交给 Socket.IO 处理并设置 ctx.response。
 *
 * @param container 服务容器
 * @returns 中间件函数
 *
 * @example
 * ```ts
 * app.use(createSocketIoMiddleware(container));
 * ```
 */
export function createSocketIoMiddleware(
  container: ServiceContainer,
): (ctx: HttpContext, next: () => Promise<void>) => Promise<void> {
  return async (ctx: HttpContext, next: () => Promise<void>): Promise<void> => {
    const path = getSocketIoPath(container);
    if (!path || !ctx.path.startsWith(path)) {
      await next();
      return;
    }
    const io = getSocketIoServer(container);
    ctx.response = await io.handleIncomingRequest(ctx.request);
  };
}
