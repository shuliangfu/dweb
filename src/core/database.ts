/**
 * @dreamer/database 集成
 *
 * 初始化数据库管理器（DatabaseManager），管理多数据库连接与生命周期，
 * 提供 connectDatabases、getDatabaseManager 等 API。
 *
 * @module
 */

import {
  type DatabaseConfig,
  DatabaseManager,
  type DatabaseManagerOptions,
  MongoModel,
  QueryLogger,
  type QueryLoggerConfig,
  SQLModel,
} from "@dreamer/database";
import type { ServiceContainer } from "@dreamer/service";
import type { AppConfig } from "../types/app.ts";
import { $t } from "../utils/i18n.ts";
import { getLogger } from "../utils/logger.ts";

/**
 * 数据库应用配置接口
 *
 * 支持默认连接、多个命名连接及管理器选项。
 *
 * @example
 * ```ts
 * const dbConfig: DatabaseAppConfig = {
 *   default: { driver: "sqlite", database: "./data.db" },
 *   connections: { read: { driver: "postgres", host: "localhost" } },
 * };
 * ```
 */
export interface DatabaseAppConfig {
  /** 默认连接配置 */
  default?: DatabaseConfig;
  /** 命名连接配置（如 { "readonly": {...}, "write": {...} }） */
  connections?: Record<string, DatabaseConfig>;
  /** 数据库管理器选项 */
  managerOptions?: DatabaseManagerOptions;
  /**
   * 查询日志配置（可选）
   * 为 true 时使用默认配置并传入 t 翻译；为对象时合并 t 翻译
   */
  queryLogger?: QueryLoggerConfig | boolean;
}

/**
 * 初始化数据库管理器
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns 数据库管理器实例
 *
 * @example
 * ```ts
 * const manager = initializeDatabase(container, { database: { default: {...} } });
 * ```
 */
export function initializeDatabase(
  container: ServiceContainer,
  config: AppConfig,
): DatabaseManager {
  // 从配置中获取数据库配置
  const dbConfig = (config.database || {}) as DatabaseAppConfig;

  // 创建数据库管理器
  const manager = new DatabaseManager(dbConfig.managerOptions);

  // 设置服务容器（自动注册到容器）
  manager.setContainer(container);

  return manager;
}

/**
 * 获取数据库管理器实例
 *
 * @param container 服务容器
 * @param name 管理器名称（可选，默认为 "default"）
 * @returns 数据库管理器实例
 *
 * @example
 * ```ts
 * const db = getDatabaseManager(container);
 * const conn = db.getConnection("default");
 * ```
 */
export function getDatabaseManager(
  container: ServiceContainer,
  name?: string,
): DatabaseManager {
  const serviceName = name && name !== "default"
    ? `databaseManager:${name}`
    : "databaseManager";
  return container.get<DatabaseManager>(serviceName);
}

/**
 * 连接数据库
 *
 * 根据配置连接所有配置的数据库。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns Promise<void>
 *
 * @example
 * ```ts
 * await connectDatabases(container, config);
 * ```
 */
export async function connectDatabases(
  container: ServiceContainer,
  config: AppConfig,
): Promise<void> {
  const dbConfig = (config.database || {}) as DatabaseAppConfig;
  const manager = getDatabaseManager(container);
  const logger = getLogger(container);

  // 设置 Model 的翻译函数，使验证错误等文案支持 i18n
  const translate = (
    key: string,
    params?: Record<string, string | number | boolean>,
  ) => {
    const r = $t(key, params);
    return (r != null && r !== key) ? r : undefined;
  };
  SQLModel.translate = translate;
  MongoModel.translate = translate;

  // 创建带 t 翻译的 QueryLogger（当启用 queryLogger 时）
  // 传入 logger 时使用该 logger，不传则使用 QueryLogger 自带的 createLogger
  const createQueryLoggerWithT = (): QueryLogger | undefined => {
    if (!dbConfig.queryLogger) return undefined;
    const baseConfig: QueryLoggerConfig =
      typeof dbConfig.queryLogger === "boolean" ? {} : dbConfig.queryLogger;
    return new QueryLogger({
      ...baseConfig,
      logger: baseConfig.logger ?? logger,
      t: (key: string, params?: Record<string, string | number | boolean>) => {
        const r = $t(key, params);
        return (r != null && r !== key) ? r : undefined;
      },
    });
  };

  // 连接默认数据库（传入 t 供 MongoDB 适配器等使用）
  if (dbConfig.default) {
    try {
      const connConfig = {
        ...dbConfig.default,
        t: dbConfig.default.t ?? translate,
      } as DatabaseConfig;
      await manager.connect("default", connConfig);
      const ql = createQueryLoggerWithT();
      if (ql) {
        manager.getConnection("default").setQueryLogger(ql);
      }
      logger.info($t("log.dbConnected", { name: "default" }));
    } catch (error) {
      logger.error($t("log.dbConnectFailed", { name: "default" }), error);
      throw error;
    }
  }

  // 连接命名数据库（传入 t 供 MongoDB 适配器等使用）
  if (dbConfig.connections) {
    for (const [name, connConfig] of Object.entries(dbConfig.connections)) {
      try {
        const configWithT = {
          ...connConfig,
          t: connConfig.t ?? translate,
        } as DatabaseConfig;
        await manager.connect(name, configWithT);
        const ql = createQueryLoggerWithT();
        if (ql) {
          manager.getConnection(name).setQueryLogger(ql);
        }
        logger.info($t("log.dbConnected", { name }));
      } catch (error) {
        logger.error($t("log.dbConnectFailed", { name }), error);
        throw error;
      }
    }
  }
}

/**
 * 断开所有数据库连接
 *
 * @param container 服务容器
 * @returns Promise<void>
 *
 * @example
 * ```ts
 * await disconnectDatabases(container);
 * ```
 */
export async function disconnectDatabases(
  container: ServiceContainer,
): Promise<void> {
  try {
    const manager = getDatabaseManager(container);
    await manager.closeAll();
  } catch {
    // 管理器可能未初始化，忽略错误
  }
}

/**
 * 获取数据库连接状态
 *
 * @param container 服务容器
 * @returns 连接名称列表
 *
 * @example
 * ```ts
 * const names = getDatabaseStatus(container);
 * console.log("已连接:", names);
 * ```
 */
export function getDatabaseStatus(
  container: ServiceContainer,
): string[] {
  try {
    const manager = getDatabaseManager(container);
    return manager.getConnectionNames();
  } catch {
    return [];
  }
}
