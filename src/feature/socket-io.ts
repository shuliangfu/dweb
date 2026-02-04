/**
 * @dreamer/socket-io 集成（挂载到同一 HTTP 服务器）
 *
 * 当 AppConfig.socketIo 存在时，创建 Socket.IO 服务并挂载到当前 HTTP 服务器，
 * 与主站共用端口。导出 initializeSocketIo、getSocketIoServer、getSocketIoPath。
 *
 * @module
 */

import type { HttpContext } from "@dreamer/server";
import type { ServiceContainer } from "@dreamer/service";
import { Server, type ServerOptions } from "@dreamer/socket-io";
import type { AppConfig, SocketIOAppConfig } from "../types/app.ts";
import { getLogger } from "../utils/logger.ts";

/** 容器中 Socket.IO 服务实例的 key */
const SOCKET_IO_SERVER_KEY = "socketIoServer";
/** 容器中 Socket.IO 路径的 key */
const SOCKET_IO_PATH_KEY = "socketIoPath";

/**
 * 初始化 Socket.IO 服务（挂载模式，不占用独立端口）
 *
 * 仅当 config.socketIo 存在时执行：创建 Server、写入容器，供中间件委托请求。
 * 不调用 server.listen()，由框架在同一 HTTP 服务器上通过中间件转发请求。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns 若已启用则返回 Socket.IO 路径，否则返回 undefined
 */
export function initializeSocketIo(
  container: ServiceContainer,
  config: AppConfig,
): string | undefined {
  const socketIoConfig = config.socketIo as SocketIOAppConfig | undefined;
  if (!socketIoConfig) {
    return undefined;
  }

  const path = (socketIoConfig.path ?? "/socket.io/").replace(/\/?$/, "/");
  const logger = socketIoConfig.logger ?? getLogger(container);
  const serverOptions = {
    ...socketIoConfig,
    path,
    logger,
    // 不传 port/host，挂载到主站
  };
  const io = new Server(serverOptions as ServerOptions);

  container.registerSingleton(SOCKET_IO_SERVER_KEY, () => io);
  container.registerSingleton(SOCKET_IO_PATH_KEY, () => path);
  return path;
}

/**
 * 获取已初始化的 Socket.IO 服务实例
 *
 * @param container 服务容器
 * @returns Socket.IO Server，未配置时抛错
 */
export function getSocketIoServer(container: ServiceContainer): Server {
  if (!container.has(SOCKET_IO_SERVER_KEY)) {
    throw new Error("Socket.IO 未配置，请在 AppConfig 中设置 socketIo");
  }
  return container.get<Server>(SOCKET_IO_SERVER_KEY);
}

/**
 * 获取 Socket.IO 挂载路径
 *
 * @param container 服务容器
 * @returns 路径前缀（如 "/socket.io/"），未配置时返回 undefined
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
