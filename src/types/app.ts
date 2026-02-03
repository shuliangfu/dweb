/**
 * App 类型定义
 *
 * 职责：
 * - 定义 App 类的类型
 * - 定义应用配置类型
 * - 定义应用生命周期类型
 */

import type { DatabaseConfig, DatabaseManagerOptions } from "@dreamer/database";
import type { BuilderConfig, ServerConfig } from "@dreamer/esbuild";
import type { LifecycleStage } from "@dreamer/lifecycle";
import type { LoggerConfig } from "@dreamer/logger";
import type {
  Middleware,
  MiddlewareCondition,
  MiddlewareContext,
} from "@dreamer/middleware";
import type { Plugin, PluginManagerOptions } from "@dreamer/plugin";
import type { Engine } from "@dreamer/render";
import type { RouterOptions } from "@dreamer/router";
import type { ServerOptions } from "@dreamer/server";
import type { ServiceContainer } from "@dreamer/service";

/**
 * 框架层构建配置
 * 在 BuilderConfig 基础上将 server.entry、server.output 设为可选，未设置时由框架根据执行入口自动推断
 */
export type BuildAppConfig = Omit<BuilderConfig, "server"> & {
  server?: Omit<ServerConfig, "entry" | "output"> & {
    /** 入口文件，不设置时使用当前执行入口（如 src/backend/main.ts） */
    entry?: string;
    /** 输出目录，不设置时按入口目录推断（如 dist/backend）或 dist */
    output?: string;
  };
};

/**
 * 数据库应用配置
 */
export interface DatabaseAppConfig {
  /** 默认连接配置 */
  default?: DatabaseConfig;
  /** 命名连接配置 */
  connections?: Record<string, DatabaseConfig>;
  /** 数据库管理器选项 */
  managerOptions?: DatabaseManagerOptions;
}

/**
 * 应用配置接口
 * 包含所有集成库的配置选项
 */
export interface AppConfig extends Record<string, unknown> {
  /** 应用名称 */
  name?: string;
  /** 应用版本 */
  version?: string;
  /** 配置目录（默认：'./config'） */
  configDirectory?: string;
  /** 环境变量前缀 */
  envPrefix?: string;
  /** 是否启用热重载（默认：开发环境启用） */
  hotReload?: boolean;
  /** 插件管理器配置选项 */
  pluginManagerOptions?: PluginManagerOptions;
  /** 服务器配置 */
  server?: ServerOptions;
  /** 路由配置 */
  router?: RouterOptions;
  /** 渲染配置 */
  render?: {
    /** 模板引擎（react、preact） */
    engine?: Engine;
    /** 渲染模式（ssr、csr、ssg、hybrid） */
    mode?: "ssr" | "csr" | "ssg" | "hybrid";
    /** SSG 配置（mode 为 ssg 时生效） */
    ssg?: {
      outputDir?: string;
      routes?: string[];
      dynamicRoutes?: Record<string, string[]>;
    };
  };
  /** 构建配置（entry/output 可选，由框架推断默认值） */
  build?: BuildAppConfig;
  /** 插件列表（用于注册插件） */
  plugins?: Array<Plugin | string>;
  /** 中间件列表（用于注册中间件） */
  middlewares?: Array<
    | Middleware<MiddlewareContext>
    | string
    | {
      middleware: Middleware<MiddlewareContext> | string;
      condition?: MiddlewareCondition;
      name?: string;
    }
  >;
  /** 日志配置 */
  logger?: LoggerConfig;
  /** 数据库配置 */
  database?: DatabaseAppConfig;
}

/**
 * App 生命周期阶段
 */
export type AppStage = LifecycleStage;

/**
 * App 生命周期钩子函数
 */
export type AppLifecycleHook = () => void | Promise<void>;

/**
 * App 中间件类型
 */
export type AppMiddleware = Middleware;

/**
 * App 插件类型
 */
export type AppPlugin = Plugin;

/**
 * App 类接口
 */
export interface IApp {
  /** 应用名称 */
  readonly name: string;
  /** 应用版本 */
  readonly version: string;
  /** 服务容器 */
  readonly container: ServiceContainer;
  /** 当前生命周期阶段 */
  readonly stage: AppStage;

  /**
   * 注册中间件
   */
  use(
    middleware: AppMiddleware,
    condition?: unknown,
    name?: string,
  ): void;
  use(path: string, middleware: AppMiddleware, name?: string): void;

  /**
   * 注册插件
   */
  registerPlugin(plugin: AppPlugin): void;

  /**
   * 注册生命周期钩子
   */
  on(stage: AppStage, hook: AppLifecycleHook): void;

  /**
   * 启动应用
   */
  start(): Promise<void>;

  /**
   * 停止应用
   */
  stop(): Promise<void>;

  /**
   * 关闭应用
   */
  shutdown(): Promise<void>;
}
