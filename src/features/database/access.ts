/**
 * 数据库访问辅助模块
 * 提供全局数据库访问接口，用于在 load 函数和 API 路由中访问数据库
 */

import { DatabaseManager } from "./manager.ts";
import type { DatabaseAdapter, DatabaseConfig } from "./types.ts";

/**
 * 全局数据库管理器实例
 */
let dbManager: DatabaseManager | null = null;

/**
 * 自动初始化数据库的 Promise（用于避免重复初始化）
 */
let autoInitPromise: Promise<void> | null = null;

/**
 * 数据库配置加载器回调函数类型
 * 用于从框架配置中获取数据库配置
 */
type DatabaseConfigLoader = () => Promise<DatabaseConfig | null>;

/**
 * 全局数据库配置加载器
 * 由框架在启动时设置，用于自动初始化数据库
 */
let configLoader: DatabaseConfigLoader | null = null;

/**
 * 设置数据库配置加载器
 * 框架在启动时调用此函数，设置配置加载器回调
 *
 * @param loader 配置加载器回调函数，返回数据库配置或 null
 *
 * @example
 * ```typescript
 * import { setDatabaseConfigLoader } from '@dreamer/dweb/database';
 *
 * // 在框架启动时设置配置加载器
 * setDatabaseConfigLoader(async () => {
 *   const { config } = await loadConfig();
 *   return config.database || null;
 * });
 * ```
 */
export function setDatabaseConfigLoader(loader: DatabaseConfigLoader): void {
  configLoader = loader;
}

/**
 * 设置数据库管理器实例（内部使用，用于向后兼容）
 * 框架在初始化数据库时调用此函数，设置全局数据库管理器实例
 *
 * @param manager 数据库管理器实例
 */
export function setDatabaseManager(manager: DatabaseManager): void {
  dbManager = manager;
}

/**
 * 初始化数据库连接
 * @param config 数据库配置
 * @param connectionName 连接名称（默认为 'default'）
 * @returns 连接状态信息
 */
export async function initDatabase(
  config: DatabaseConfig,
  connectionName: string = "default",
): Promise<import("./manager.ts").ConnectionStatus> {
  if (!dbManager) {
    dbManager = new DatabaseManager();
  }

  return await dbManager.connect(connectionName, config);
}

/**
 * 自动从配置加载器获取配置并初始化数据库
 * @param connectionName 连接名称（默认为 'default'）
 */
async function autoInitDatabase(
  connectionName: string = "default",
): Promise<void> {
  // 如果已经有初始化任务在进行，等待它完成
  if (autoInitPromise) {
    await autoInitPromise;
    return;
  }

  // 创建新的初始化任务
  const initTask = (async () => {
    try {
      // 如果没有设置配置加载器，抛出错误
      if (!configLoader) {
        throw new Error(
          "Database config loader not set. Please call setDatabaseConfigLoader() first or call initDatabase() manually.",
        );
      }

      // 调用配置加载器获取数据库配置
      const config = await configLoader();

      // 如果配置加载器返回了配置，则初始化
      if (config) {
        await initDatabase(config, connectionName);
      } else {
        throw new Error(
          "Database not configured. Please add database configuration in dweb.config.ts or call initDatabase() manually.",
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to auto-initialize database: ${message}`,
      );
    } finally {
      // 清除 Promise，允许下次重新尝试
      autoInitPromise = null;
    }
  })();

  // 保存 Promise 并等待完成
  autoInitPromise = initTask;
  await initTask;
}

/**
 * 获取数据库连接（异步版本，支持自动初始化）
 * @param connectionName 连接名称（默认为 'default'）
 * @returns 数据库适配器实例
 * @throws {Error} 如果数据库未初始化且无法自动初始化
 */
export async function getDatabaseAsync(
  connectionName: string = "default",
): Promise<DatabaseAdapter> {
  // 如果数据库未初始化，尝试自动初始化
  if (!dbManager) {
    await autoInitDatabase(connectionName);
  }

  if (!dbManager) {
    throw new Error(
      "Database not initialized. Please call initDatabase() first or configure database in dweb.config.ts",
    );
  }

  return dbManager.getConnection(connectionName);
}

/**
 * 获取数据库连接（同步版本，如果未初始化会抛出错误）
 * @param connectionName 连接名称（默认为 'default'）
 * @returns 数据库适配器实例
 * @throws {Error} 如果数据库未初始化
 */
export function getDatabase(
  connectionName: string = "default",
): DatabaseAdapter {
  if (!dbManager) {
    throw new Error(
      "Database not initialized. Please call initDatabase() first or configure database in dweb.config.ts. For automatic initialization, use getDatabaseAsync() instead.",
    );
  }

  return dbManager.getConnection(connectionName);
}

/**
 * 获取数据库管理器实例
 * @returns 数据库管理器实例
 * @throws {Error} 如果数据库未初始化
 */
export function getDatabaseManager(): DatabaseManager {
  if (!dbManager) {
    throw new Error(
      "Database not initialized. Please call initDatabase() first or configure database in dweb.config.ts",
    );
  }

  return dbManager;
}

/**
 * 检查数据库是否已初始化
 * @returns 是否已初始化
 */
export function isDatabaseInitialized(): boolean {
  return dbManager !== null;
}

/**
 * 关闭所有数据库连接
 */
export async function closeDatabase(): Promise<void> {
  if (dbManager) {
    await dbManager.closeAll();
    dbManager = null;
  }
}
