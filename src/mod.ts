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

/**
 * 框架主类，整合服务、中间件、插件、路由、渲染等，提供 start/stop/shutdown 等生命周期
 */
export { App } from "./core/app.ts";

/**
 * 框架版本号（从 deno.json 读取）
 */
export { DWEB_VERSION } from "./utils/version.ts";

/**
 * 类型定义：
 * - AppConfig: 应用配置接口，包含 name、server、router、render、plugins 等
 * - AppLifecycleHook: App 生命周期钩子函数类型
 * - AppMiddleware: App 中间件类型，与 @dreamer/middleware 的 Middleware 一致
 * - AppPlugin: App 插件类型，需提供 name 及可选钩子（onInit、onRequest 等）
 * - AppStage: App 生命周期阶段（uninitialized、init、start、stop、error、build 等）
 * - DatabaseAppConfig: 数据库应用配置，支持 default 与 connections
 * - IApp: App 类接口，定义 use、registerPlugin、on、start、stop、shutdown 等
 * - SocketConfig: 实时通信配置（Socket.IO 或 WebSocket 的 discriminated union）
 * - SocketIOConfig: Socket.IO 配置（path、allowCORS、pingTimeout 等）
 * - SocketType: 实时通信类型（socketio | websocket）
 * - WebSocketConfig: WebSocket 配置（path、pingTimeout、pingInterval 等）
 * - AppLanguage: 框架支持的语言（zh-CN、en-US、ja-JP、ko-KR、es-ES、pt-BR、id-ID、de-DE、fr-FR）
 */
export type {
  AppConfig,
  AppLanguage,
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

/**
 * 路由中间件上下文类型（HttpContext 的别名）
 *
 * 供 routes/_middleware.ts 等使用，包含 request、response、path 等请求信息。
 *
 * @example
 * ```ts
 * export default async function middleware(ctx: Context, next: Next) {
 *   console.log(ctx.path);
 *   await next();
 * }
 * ```
 */
export type { HttpContext as Context } from "@dreamer/server";

/**
 * load() 上下文类型（LoadContext）、API 上下文（ApiContext）等，
 * 供 routes 中 _layout/页面 load、api 路由使用。
 */
export type { ApiContext, LoadContext } from "./types/context.ts";

/**
 * 中间件 next 函数类型
 *
 * 调用以执行后续中间件，在路由中间件中必须调用 next() 才能继续处理请求。
 *
 * @returns 无返回值（Promise 用于异步流程控制）
 *
 * @example
 * ```ts
 * // 在 routes/_middleware.ts 中使用
 * export default async function middleware(ctx: Context, next: Next) {
 *   // 前置逻辑
 *   await next(); // 必须调用以继续处理
 *   // 后置逻辑
 * }
 * ```
 */
export type Next = () => Promise<void>;

/**
 * 配置模块：
 * - getConfig: 获取完整框架配置对象（AppConfig）
 * - getConfigManager: 获取配置管理器实例（支持 envPrefix、热重载）
 * - getConfigValue: 按点号路径获取配置值（如 "server.port"）
 * - getParams: 获取业务配置对象（来自 config/params.ts）
 * - getParamValue: 按点号路径获取业务配置值（如 "api.timeout"）
 * - initializeConfigManager: 初始化配置管理器，加载 main.ts、params.ts 并合并
 */
export {
  getConfig,
  getConfigManager,
  getConfigValue,
  getParams,
  getParamValue,
  initializeConfigManager,
} from "./core/config.ts";

/**
 * 数据库模块：
 * - connectDatabases: 连接所有配置的数据库
 * - disconnectDatabases: 断开所有数据库连接
 * - getDatabaseManager: 获取数据库管理器实例
 * - getDatabaseStatus: 获取数据库连接状态
 * - initializeDatabase: 初始化数据库管理器
 */
export {
  connectDatabases,
  disconnectDatabases,
  getDatabaseManager,
  getDatabaseStatus,
  initializeDatabase,
} from "./core/database.ts";

/**
 * 生命周期模块：
 * - getLifecycleManager: 获取生命周期管理器实例
 * - initializeLifecycle: 初始化生命周期管理器
 * - registerLifecycleHook: 注册生命周期钩子
 */
export {
  getLifecycleManager,
  initializeLifecycle,
  registerLifecycleHook,
} from "./core/lifecycle.ts";

/**
 * 中间件模块：
 * - getMiddlewareChain: 获取中间件链实例
 * - initializeMiddleware: 初始化中间件系统
 * - pluginEventsMiddleware: 插件事件中间件（触发 onRequest、onResponse 等）
 * - registerMiddleware: 注册中间件
 */
export {
  createHealthCheckMiddleware,
  getMiddlewareChain,
  initializeMiddleware,
  pluginEventsMiddleware,
  registerMiddleware,
} from "./core/middleware.ts";

/**
 * 插件模块：
 * - getPluginManager: 获取插件管理器实例
 * - initializePlugin: 初始化插件系统
 * - registerPlugin: 注册插件
 */
export {
  getPluginManager,
  initializePlugin,
  registerPlugin,
} from "./core/plugin.ts";

/**
 * 服务容器模块：
 * - getServiceContainer: 获取服务容器实例
 * - initializeServiceContainer: 初始化服务容器
 */
export {
  getServiceContainer,
  initializeServiceContainer,
} from "./core/service.ts";

/**
 * 日志模块：
 * - getLogger: 获取 Logger 实例
 * - initializeLogger: 初始化 Logger
 */
export { getLogger, initializeLogger } from "./utils/logger.ts";

/**
 * 国际化 / 语言：
 * - $tr: 框架专用翻译函数（与用户 $t 隔离），各模块通过 import $tr 使用
 * - getDefaultAppLanguage: 按环境变量检测默认语言，回退 en-US（供 config/main.ts 的 language 使用）
 * - detectLocale: 从环境变量检测 locale（LANGUAGE / LC_ALL / LANG）
 */
export { $tr, detectLocale, getDefaultAppLanguage } from "./utils/i18n.ts";

/**
 * 统一错误处理（支持 i18n）：
 * - createDwebError: 创建 DwebError 实例（不抛出）
 * - DEFAULT_ERROR_MESSAGES: 默认错误消息映射（i18n 未接入时的回退）
 * - DwebError: 统一错误类，包含 code、messageKey、params、details
 * - DwebErrorCode: 错误码枚举（DWEB_E01～E33）
 * - getDwebErrorTranslator: 获取当前错误翻译器
 * - isDwebError: 类型守卫，判断是否为 DwebError
 * - setDwebErrorTranslator: 注册错误消息翻译器（接入 i18n）
 * - throwDwebError: 抛出 DwebError（支持 params 插值）
 */
export {
  createDwebError,
  DEFAULT_ERROR_MESSAGES,
  DwebError,
  DwebErrorCode,
  getDwebErrorTranslator,
  isDwebError,
  setDwebErrorTranslator,
  throwDwebError,
} from "./utils/errors.ts";

/**
 * 错误处理类型：
 * - DwebErrorCodeType: 错误码字符串字面量类型
 * - DwebErrorParams: 错误消息插值参数类型
 * - DwebErrorTranslator: 错误翻译函数类型
 */
export type {
  DwebErrorCodeType,
  DwebErrorParams,
  DwebErrorTranslator,
} from "./utils/errors.ts";

/**
 * 插件事件：
 * - emitOnBuild: 触发 onBuild 插件事件
 * - emitOnBuildComplete: 触发 onBuildComplete 插件事件
 * - emitOnError: 触发 onError 插件事件
 * - emitOnHealthCheck: 触发 onHealthCheck 插件事件
 * - emitOnHotReload: 触发 onHotReload 插件事件
 * - emitOnInit: 触发 onInit 插件事件
 * - emitOnRequest: 触发 onRequest 插件事件
 * - emitOnResponse: 触发 onResponse 插件事件
 * - emitOnRoute: 触发 onRoute 插件事件
 * - emitOnShutdown: 触发 onShutdown 插件事件
 * - emitOnStart: 触发 onStart 插件事件
 * - emitOnStop: 触发 onStop 插件事件
 * - pluginEvents: 统一命名空间，推荐通过此对象调用以保持单一入口
 */
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
  pluginEvents,
} from "./core/plugin-events.ts";

/**
 * 插件事件类型：
 * - HealthStatus: 健康检查状态类型
 * - RouteDefinition: 路由定义类型
 */
export type { HealthStatus, RouteDefinition } from "./core/plugin-events.ts";

/**
 * 构建模块：
 * - getBuild: 获取构建器实例
 * - initializeBuild: 初始化构建功能
 */
export { getBuild, initializeBuild } from "./feature/build.ts";

/**
 * CSR 渲染：
 * - createRendererCSR: 创建 CSR 渲染器
 * - RenderCSROptions: CSR 渲染器选项类型
 */
export { createRendererCSR } from "./feature/render-csr.ts";
export type { RenderCSROptions } from "./feature/render-csr.ts";

/**
 * Hybrid 渲染：
 * - createRendererHybrid: 创建 Hybrid 渲染器
 * - RenderHybridOptions: Hybrid 渲染器选项类型
 */
export { createRendererHybrid } from "./feature/render-hybrid.ts";
export type { RenderHybridOptions } from "./feature/render-hybrid.ts";

/**
 * SSG 渲染：
 * - createRendererSSG: 创建 SSG 渲染器
 * - RenderSSGOptions: SSG 渲染器选项类型
 */
export { createRendererSSG } from "./feature/render-ssg.ts";
export type { RenderSSGOptions } from "./feature/render-ssg.ts";

/**
 * SSR 渲染：
 * - createRendererSSR: 创建 SSR 渲染器
 */
export { createRendererSSR } from "./feature/render-ssr.ts";

/**
 * 渲染模块：
 * - getRender: 获取渲染器实例
 * - initializeRender: 初始化渲染功能
 */
export { getRender, initializeRender } from "./feature/render.ts";

/**
 * 路由模块：
 * - getRouter: 获取路由实例
 * - initializeRouter: 初始化路由
 */
export { getRouter, initializeRouter } from "./feature/router.ts";

/**
 * HTTP 服务器模块：
 * - getServer: 获取 HTTP 服务器实例
 * - initializeServer: 初始化 HTTP 服务器
 * - startServer: 启动 HTTP 服务器
 * - stopServer: 停止 HTTP 服务器
 */
export {
  getServer,
  initializeServer,
  startServer,
  stopServer,
} from "./feature/server.ts";

/**
 * Socket.IO 模块：
 * - getSocketIoPath: 获取 Socket.IO 路径
 * - getSocketIoServer: 获取 Socket.IO 服务器实例
 * - initializeSocketIo: 初始化 Socket.IO
 */
export {
  getSocketIoPath,
  getSocketIoServer,
  initializeSocketIo,
} from "./feature/socket-io.ts";

/**
 * WebSocket 模块：
 * - createWebSocketMiddleware: 创建 WebSocket 中间件
 * - getWebSocketPath: 获取 WebSocket 路径
 * - getWebSocketServer: 获取 WebSocket 服务器实例
 * - initializeWebSocket: 初始化 WebSocket
 */
export {
  createWebSocketMiddleware,
  getWebSocketPath,
  getWebSocketServer,
  initializeWebSocket,
} from "./feature/websocket.ts";

/**
 * CLI 工具（按需从 jsr:@dreamer/dweb/feature/command 导入）：
 * - Command: 扩展的命令类，含 App 实例
 * - CommandHandler: 命令执行函数类型
 * - output、prompt、table、confirm 等从 @dreamer/console 重导出
 *
 * @example
 * ```ts
 * import { Command, output, prompt } from "jsr:@dreamer/dweb/feature/command";
 * ```
 */
export { Command, type CommandHandler } from "./feature/command.ts";
