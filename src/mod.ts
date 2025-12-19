/**
 * DWeb 框架主入口
 * 导出框架的核心 API
 */

// 导出类型
export type {
  Request,
  Response,
  CookieOptions,
  Session,
  Middleware,
  MiddlewareConfig,
  Plugin,
  RouteConfig,
  ServerConfig,
  CookieConfig,
  SessionConfig,
  DevConfig,
  BuildConfig,
  AppConfig,
  DWebConfig,
  LoadContext,
  PageProps,
} from './types/index.ts';

// 导出核心类
export { Server } from './core/server.ts';
export { Router } from './core/router.ts';
export { MiddlewareManager } from './core/middleware.ts';
export { PluginManager } from './core/plugin.ts';

// 导出配置管理
import { loadConfig, isMultiAppMode, normalizeRouteConfig, mergeConfig } from './core/config.ts';

export { loadConfig, isMultiAppMode, normalizeRouteConfig, mergeConfig };

// 导出 API 路由处理
export { loadApiRoute, handleApiRoute } from './core/api-route.ts';

// 导出内置中间件（从 middleware/mod.ts 统一导出）
export * from './middleware/mod.ts';

// 导出内置插件
export * from './plugins/mod.ts';

// 导出功能模块
export { CookieManager } from './features/cookie.ts';
export { SessionManager } from './features/session.ts';

// 导出错误类
export {
  DWebError,
  ConfigError,
  RouteError,
  RenderError,
  ApiError,
  BuildError,
  formatError,
  logError,
  getErrorStatusCode,
  getErrorMessage,
} from './utils/error.ts';

// 导出数据库相关 API
export {
  DatabaseManager,
  SQLiteAdapter,
  PostgreSQLAdapter,
  MySQLAdapter,
  MongoDBAdapter,
  BaseAdapter,
  type DatabaseConfig,
  type DatabaseType,
  type DatabaseAdapter,
} from './features/database/mod.ts';
export { env, envInt, envFloat, envBool, getAllEnv, validateEnv, initEnv } from './features/env.ts';
export {
  registerShutdownHandler,
  unregisterShutdownHandler,
  gracefulShutdown,
  setupSignalHandlers,
  isShuttingDownState,
} from './features/shutdown.ts';
export {
  Logger,
  LogLevel,
  getLogger,
  setLogger,
  type LoggerOptions,
  type LogEntry,
  type LogFormatter,
  type LogTarget,
  type LogRotationConfig,
} from './features/logger.ts';
export {
  Monitor,
  getMonitor,
  setMonitor,
  type MonitoringOptions,
  type RequestMetrics,
  type PerformanceMetrics,
  type ErrorMetrics,
} from './features/monitoring.ts';
export { startDevServer } from './features/dev.ts';
export { startProdServer } from './features/prod.ts';

// 导入核心类用于创建应用
import { Server } from './core/server.ts';
import { MiddlewareManager } from './core/middleware.ts';
import { PluginManager } from './core/plugin.ts';
import type { Middleware, MiddlewareConfig, Plugin } from './types/index.ts';

/**
 * 应用实例接口
 */
export interface App {
  server: Server;
  middleware: MiddlewareManager;
  plugins: PluginManager;
  use: (middleware: Middleware | MiddlewareConfig) => void;
  plugin: (plugin: Plugin | { name: string; config?: Record<string, unknown> }) => void;
}

/**
 * 创建应用实例（单应用模式）
 */
export function createApp(): App {
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
    plugin: (plugin: Plugin | { name: string; config?: Record<string, unknown> }) => {
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

