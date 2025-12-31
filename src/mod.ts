/**
 * DWeb 框架主入口
 * 导出框架的核心 API
 */

// 导出类型
export type {
  ApiContext,
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
} from "./common/types/index.ts";

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
export {
  type CacheAdapter,
  type CacheOptions,
  FileCacheAdapter,
  LRUCache,
  MemoryCacheAdapter,
  RedisCacheAdapter,
} from "./core/cache/mod.ts";

// 导出配置管理
export {
  defineConfig,
  isMultiAppMode,
  loadConfig,
  mergeConfig,
  normalizeRouteConfig,
} from "./core/config.ts";

// 导出 API 路由处理
export { handleApiRoute, loadApiRoute } from "./core/api-route.ts";

// 导出内置中间件（从 middleware/mod.ts 统一导出）
export * from "./middleware/mod.ts";

// 导出内置插件
export * from "./plugins/mod.ts";

// 导出扩展系统
export * from "./common/extensions/mod.ts";
export * from "./common/utils/mod.ts";
export * from "./common/constants.ts";

// 导出功能模块
export { CookieManager } from "./features/cookie.ts";
export { SessionManager } from "./features/session.ts";

// 导出统一的日志工具（便捷访问）
export { logger } from "./server/utils/logger.ts";

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
} from "./common/errors/index.ts";

// 导出 WebSocket 相关 API
export * from "./features/websocket/mod.ts";

// 导出 GraphQL 相关 API
export * from "./features/graphql/mod.ts";

// 导出其他功能模块
export * from "./features/env.ts";
export * from "./features/shutdown.ts";
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
  type PerformanceMetrics as MonitorPerformanceMetrics,
  type RequestMetrics,
  setMonitor,
} from "./features/monitoring.ts";
export { startDevServer } from "./server/dev.ts";
export { startProdServer } from "./server/prod.ts";

// 导出控制台工具
export * from "./server/console/mod.ts";

// 导出数据库工具
export * from "./features/database/mod.ts";

// 导出任务队列
export * from "./features/queue/mod.ts";

// 导入 Application 用于 createApp 函数
import { Application } from "./core/application.ts";

/**
 * 创建应用实例
 * 这是一个便捷函数，用于创建新的 Application 实例
 *
 * @returns 新的 Application 实例
 *
 * @example
 * ```ts
 * import { createApp, cors } from '@dreamer/dweb';
 *
 * const app = createApp();
 * app.use(cors());
 *
 * export default app;
 * ```
 */
export function createApp(): Application {
  return new Application();
}
