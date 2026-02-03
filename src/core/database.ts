/**
 * @dreamer/database 集成
 *
 * 职责：
 * - 初始化数据库管理器
 * - 管理数据库连接
 * - 提供数据库访问接口
 *
 * 功能：
 * - 创建 DatabaseManager 实例
 * - 注册数据库连接
 * - 管理连接生命周期
 * - 支持多数据库连接
 */

import {
  type DatabaseConfig,
  DatabaseManager,
  type DatabaseManagerOptions,
} from "@dreamer/database";
import type { ServiceContainer } from "@dreamer/service";
import type { AppConfig } from "../types/app.ts";
import { getLogger } from "../utils/logger.ts";

/**
 * 数据库配置接口
 *
 * 支持单个连接或多个命名连接
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
 * 初始化数据库管理器
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns 数据库管理器实例
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
 * 根据配置连接所有配置的数据库
 *
 * @param container 服务容器
 * @param config 应用配置
 */
export async function connectDatabases(
  container: ServiceContainer,
  config: AppConfig,
): Promise<void> {
  const dbConfig = (config.database || {}) as DatabaseAppConfig;
  const manager = getDatabaseManager(container);
  const logger = getLogger(container);

  // 连接默认数据库
  if (dbConfig.default) {
    try {
      await manager.connect("default", dbConfig.default);
      logger.info("数据库连接成功: default");
    } catch (error) {
      logger.error("数据库连接失败: default", error);
      throw error;
    }
  }

  // 连接命名数据库
  if (dbConfig.connections) {
    for (const [name, connConfig] of Object.entries(dbConfig.connections)) {
      try {
        await manager.connect(name, connConfig);
        logger.info(`数据库连接成功: ${name}`);
      } catch (error) {
        logger.error(`数据库连接失败: ${name}`, error);
        throw error;
      }
    }
  }
}

/**
 * 断开所有数据库连接
 *
 * @param container 服务容器
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
