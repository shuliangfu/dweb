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
  setDatabaseManager,
  SQLModel,
} from "@dreamer/database";
import type { ServiceContainer } from "@dreamer/service";
import type { AppConfig } from "../types/app.ts";
import { $tr } from "../utils/i18n.ts";
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
   * 为 true 时使用默认配置并传入 lang；为对象时合并 lang
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

  // 框架支持多种语言（zh-CN、en-US、ja-JP 等），但 @dreamer/database 仅提供 zh-CN / en-US 文案，其余传 en-US 给数据库层
  const appLang = config.language === "zh-CN" || config.language === "en-US"
    ? config.language
    : "en-US";

  // 设置 Model 的 lang，使验证错误等文案使用 i18n
  (SQLModel as { lang?: "en-US" | "zh-CN" }).lang = appLang;
  (MongoModel as { lang?: "en-US" | "zh-CN" }).lang = appLang;

  // 创建 QueryLogger（当启用 queryLogger 时），传入 lang 用于 i18n
  const createQueryLogger = (): QueryLogger | undefined => {
    if (!dbConfig.queryLogger) return undefined;
    const baseConfig: QueryLoggerConfig =
      typeof dbConfig.queryLogger === "boolean" ? {} : dbConfig.queryLogger;
    return new QueryLogger({
      ...baseConfig,
      logger: baseConfig.logger ?? logger,
      lang: baseConfig.lang ?? appLang,
    });
  };

  // 连接默认数据库（传入 lang）
  if (dbConfig.default) {
    try {
      const connConfig = {
        ...dbConfig.default,
        lang: dbConfig.default.lang ?? appLang,
      };
      await manager.connect("default", connConfig);
      const ql = createQueryLogger();
      if (ql) {
        manager.getConnection("default").setQueryLogger(ql);
      }
      logger.info($tr("log.dbConnected", { name: "default" }));
    } catch (error) {
      logger.error($tr("log.dbConnectFailed", { name: "default" }), error);
      throw error;
    }
  }

  // 连接命名数据库（传入 lang）
  if (dbConfig.connections) {
    for (const [name, connConfig] of Object.entries(dbConfig.connections)) {
      try {
        const configWithLang = {
          ...connConfig,
          lang: connConfig.lang ?? appLang,
        };
        await manager.connect(name, configWithLang);
        const ql = createQueryLogger();
        if (ql) {
          manager.getConnection(name).setQueryLogger(ql);
        }
        logger.info($tr("log.dbConnected", { name }));
      } catch (error) {
        logger.error($tr("log.dbConnectFailed", { name }), error);
        throw error;
      }
    }
  }

  /**
   * 与 `@dreamer/database` 模块级单例对齐：`MongoModel` / `SQLModel` 通过
   * `getDatabaseAsync()` 使用的是 `init-database` 中的全局 `DatabaseManager`，
   * 若不调用 `setDatabaseManager`，框架仅在容器内完成 `connect`，ORM 仍会走
   * `autoInitDatabase` 并报「配置加载器未设置」。
   */
  setDatabaseManager(manager);
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
