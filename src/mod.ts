/**
 * @dreamer/dweb 框架主入口
 *
 * 导出 App 类、配置、服务、中间件、插件、路由、渲染等公共 API，
 * 提供全栈 Web 应用开发入口。
 *
 * @example
 * ```ts
 * import { App } from "jsr:@dreamer/dweb";
 * const app = new App({ name: "my-app", version: "1.0.0" });
 * await app.start();
 * ```
 *
 * @module
 */

// 导出 App 类与框架版本
export { App } from "./core/app.ts";
export { DWEB_VERSION } from "./utils/version.ts";

// 导出类型定义
export type {
  AppConfig,
  AppLifecycleHook,
  AppMiddleware,
  AppPlugin,
  AppStage,
  DatabaseAppConfig,
  IApp,
  SocketConfig,
  SocketIOConfig,
  SocketType,
  WebSocketConfig,
} from "./types/app.ts";

// 路由中间件类型（供 routes/_middleware.ts 等使用）
export type { HttpContext as Context } from "@dreamer/server";

/**
 * 中间件 next 函数类型
 *
 * 调用以执行后续中间件，在路由中间件中必须调用 next() 才能继续处理请求。
 */
export type Next = () => Promise<void>;

// 导出核心模块（供高级用户使用）
export {
  getBusinessConfig,
  getBusinessConfigValue,
  getConfig,
  getConfigManager,
  getConfigValue,
  getParams,
  getParamValue,
  initializeConfigManager,
} from "./core/config.ts";
export {
  connectDatabases,
  disconnectDatabases,
  getDatabaseManager,
  getDatabaseStatus,
  initializeDatabase,
} from "./core/database.ts";
export {
  getLifecycleManager,
  initializeLifecycle,
  registerLifecycleHook,
} from "./core/lifecycle.ts";
export {
  getMiddlewareChain,
  initializeMiddleware,
  pluginEventsMiddleware,
  registerMiddleware,
} from "./core/middleware.ts";
export {
  getPluginManager,
  initializePlugin,
  registerPlugin,
} from "./core/plugin.ts";
export {
  getServiceContainer,
  initializeServiceContainer,
} from "./core/service.ts";

// 导出工具模块
export { getLogger, initializeLogger } from "./utils/logger.ts";

// 导出插件事件（供高级用户使用）
export {
  emitOnBuild,
  emitOnBuildComplete,
  emitOnError,
  emitOnHealthCheck,
  emitOnHotReload,
  emitOnInit,
  emitOnRequest,
  emitOnResponse,
  emitOnRoute,
  emitOnShutdown,
  emitOnStart,
  emitOnStop,
} from "./core/plugin-events.ts";
export type { HealthStatus, RouteDefinition } from "./core/plugin-events.ts";

// 导出功能模块（供高级用户使用）
export { getBuild, initializeBuild } from "./feature/build.ts";
export { createRendererCSR } from "./feature/render-csr.ts";
export type { RenderCSROptions } from "./feature/render-csr.ts";
export { createRendererHybrid } from "./feature/render-hybrid.ts";
export type { RenderHybridOptions } from "./feature/render-hybrid.ts";
export { createRendererSSG } from "./feature/render-ssg.ts";
export type { RenderSSGOptions } from "./feature/render-ssg.ts";
export { createRendererSSR } from "./feature/render-ssr.ts";
export { getRender, initializeRender } from "./feature/render.ts";
export { getRouter, initializeRouter } from "./feature/router.ts";
export {
  getServer,
  initializeServer,
  startServer,
  stopServer,
} from "./feature/server.ts";
export {
  getSocketIoPath,
  getSocketIoServer,
  initializeSocketIo,
} from "./feature/socket-io.ts";
export {
  createWebSocketMiddleware,
  getWebSocketPath,
  getWebSocketServer,
  initializeWebSocket,
} from "./feature/websocket.ts";

// 导出控制台工具（按需导入）
export * from "./feature/command.ts";
