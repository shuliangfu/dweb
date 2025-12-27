/**
 * DWeb 框架主入口
 * 导出框架的核心 API
 */

// 导出类型
export type {
  ApiRoute,
  AppConfig,
  BuildConfig,
  ComponentChild,
  ComponentChildren,
  CookieConfig,
  CookieOptions,
  DevConfig,
  DWebConfig,
  LayoutProps,
  LoadContext,
  Middleware,
  MiddlewareConfig,
  PageProps,
  Plugin,
  Request,
  Response,
  RouteConfig,
  ServerConfig,
  Session,
  SessionConfig,
} from "./types/index.ts";

// 导出核心类
export { Server } from "./core/server.ts";
export { Router } from "./core/router.ts";
export { MiddlewareManager } from "./core/middleware.ts";
export { PluginManager } from "./core/plugin.ts";
export { Application } from "./core/application.ts";
export { ApplicationContext } from "./core/application-context.ts";
export { ConfigManager } from "./core/config-manager.ts";
export {
  type ServiceConfig,
  ServiceContainer,
  ServiceLifetime,
} from "./core/service-container.ts";
export { LifecycleManager, LifecyclePhase } from "./core/lifecycle-manager.ts";
export { RenderAdapterManager } from "./core/render/manager.ts";
export { PreactRenderAdapter } from "./core/render/preact.ts";
export { ReactRenderAdapter } from "./core/render/react.ts";
export { Vue3RenderAdapter } from "./core/render/vue3.ts";
export type {
  RenderAdapter,
  RenderEngine,
  VNode,
} from "./core/render/adapter.ts";

// 导出配置管理
import {
  isMultiAppMode,
  loadConfig,
  mergeConfig,
  normalizeRouteConfig,
} from "./core/config.ts";

export { isMultiAppMode, loadConfig, mergeConfig, normalizeRouteConfig };

// 导出 API 路由处理
export { handleApiRoute, loadApiRoute } from "./core/api-route.ts";

// 导出内置中间件（从 middleware/mod.ts 统一导出）
export * from "./middleware/mod.ts";

// 导出内置插件
export * from "./plugins/mod.ts";

// 导出扩展系统
export * from "./extensions/mod.ts";

// 导出功能模块
export { CookieManager } from "./features/cookie.ts";
export { SessionManager } from "./features/session.ts";

// 导出统一的日志工具（便捷访问）
export { logger } from "./utils/logger.ts";

// 导出错误类
export {
  ApiError,
  BuildError,
  ConfigError,
  DWebError,
  formatError,
  getErrorMessage,
  getErrorStatusCode,
  logError,
  RenderError,
  RouteError,
} from "./utils/error.ts";

// 导出 WebSocket 相关 API
export {
  getWebSocketServer,
  initWebSocket,
  isWebSocketInitialized,
  WebSocketClient,
  type WebSocketClientConfig,
  type WebSocketClientEventType,
  type WebSocketClientHandlers,
  type WebSocketClientState,
  type WebSocketConfig,
  type WebSocketConnection,
  type WebSocketHandlers,
  type WebSocketMessage,
  type WebSocketMessageType,
  WebSocketServer,
  type WebSocketStats,
} from "./features/websocket/mod.ts";
// 导出 GraphQL 相关 API
export {
  executeQuery,
  type GraphQLArgument,
  type GraphQLConfig,
  type GraphQLContext,
  type GraphQLError,
  type GraphQLField,
  type GraphQLInfo,
  type GraphQLRequest,
  type GraphQLResolver,
  type GraphQLResponse,
  type GraphQLScalarType,
  type GraphQLSchema,
  GraphQLServer,
  type GraphQLType,
  type ParsedField,
  type ParsedQuery,
  parseQuery,
  validateQuery,
} from "./features/graphql/mod.ts";
export {
  env,
  envBool,
  envFloat,
  envInt,
  getAllEnv,
  initEnv,
  validateEnv,
} from "./features/env.ts";
export {
  gracefulShutdown,
  isShuttingDownState,
  registerShutdownHandler,
  setupSignalHandlers,
  unregisterShutdownHandler,
} from "./features/shutdown.ts";
export {
  getLogger,
  type LogEntry,
  type LogFormatter,
  Logger,
  type LoggerOptions,
  LogLevel,
  type LogRotationConfig,
  type LogTarget,
  setLogger,
} from "./features/logger.ts";
export {
  type ErrorMetrics,
  getMonitor,
  Monitor,
  type MonitoringOptions,
  type PerformanceMetrics,
  type RequestMetrics,
  setMonitor,
} from "./features/monitoring.ts";
export { startDevServer } from "./features/dev.ts";
export { startProdServer } from "./features/prod.ts";

// 导出控制台工具
export * from "./console/mod.ts";

// 导出数据库工具
export * from "./features/database/mod.ts";
