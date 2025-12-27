/**
 * DWeb 框架主入口
 * 导出框架的核心 API
 */

// 导出类型
export type {
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
export { ServiceContainer, ServiceLifetime } from "./core/service-container.ts";
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

// 导入核心类用于创建应用
import { Server } from "./core/server.ts";
import { MiddlewareManager } from "./core/middleware.ts";
import { PluginManager } from "./core/plugin.ts";
import type { Middleware, MiddlewareConfig, Plugin } from "./types/index.ts";

// 导出控制台工具
export * from "./console/mod.ts";

// 导出数据库工具
export * from "./features/database/mod.ts";

/**
 * 应用实例接口
 */
export interface App {
  server: Server;
  middleware: MiddlewareManager;
  plugins: PluginManager;
  use: (middleware: Middleware | MiddlewareConfig) => void;
  plugin: (
    plugin: Plugin | { name: string; config?: Record<string, unknown> },
  ) => void;
}

/**
 * 创建应用实例（单应用模式）
 * @deprecated 推荐使用 new Application()
 * 此函数保留用于向后兼容
 */
export function createApp(): App {
  // 内部使用 Application 类（但不初始化，保持向后兼容）
  const server = new Server();
  const middlewareManager = new MiddlewareManager();
  const pluginManager = new PluginManager();

  return {
    server,
    middleware: middlewareManager,
    plugins: pluginManager,
    use: (middleware: Middleware | MiddlewareConfig) => {
      middlewareManager.add(middleware);
      // 注意：在开发/生产服务器中，中间件会统一管理，这里不需要直接添加到 server
    },
    plugin: (
      plugin: Plugin | { name: string; config?: Record<string, unknown> },
    ) => {
      pluginManager.register(plugin);
    },
  };
}

/**
 * 多应用管理器接口
 */
export interface AppsManager {
  get: (name: string) => App | undefined;
  set: (name: string, app: App) => void;
  getAll: () => Record<string, App>;
}

/**
 * 创建多应用管理器
 */
export function createApps(): AppsManager {
  const apps = new Map<string, App>();

  return {
    get: (name: string) => apps.get(name),
    set: (name: string, app: App) => apps.set(name, app),
    getAll: () => Object.fromEntries(apps),
  };
}
