/**
 * 数据库访问辅助模块
 * 提供全局数据库访问接口，用于在 load 函数和 API 路由中访问数据库
 */

import { DatabaseManager } from './manager.ts';
import type { DatabaseAdapter, DatabaseConfig } from './types.ts';
import { loadConfig } from '../../core/config.ts';

/**
 * 全局数据库管理器实例
 */
let dbManager: DatabaseManager | null = null;

/**
 * 自动初始化数据库的 Promise（用于避免重复初始化）
 */
let autoInitPromise: Promise<void> | null = null;

/**
 * 初始化数据库连接
 * @param config 数据库配置
 * @param connectionName 连接名称（默认为 'default'）
 */
export async function initDatabase(
  config: DatabaseConfig,
  connectionName: string = 'default',
): Promise<void> {
  if (!dbManager) {
    dbManager = new DatabaseManager();
  }

  await dbManager.connect(connectionName, config);
}

/**
 * 自动从配置文件加载并初始化数据库
 * @param connectionName 连接名称（默认为 'default'）
 */
async function autoInitDatabase(connectionName: string = 'default'): Promise<void> {
  // 如果已经有初始化任务在进行，等待它完成
  if (autoInitPromise) {
    await autoInitPromise;
    return;
  }

  // 创建新的初始化任务
  const initTask = (async () => {
    try {
      // 尝试加载配置文件
      const { config } = await loadConfig();
      
      // 如果配置中有数据库配置，则初始化
      if (config.database) {
        await initDatabase(config.database, connectionName);
      } else {
        throw new Error(
          'Database not configured in dweb.config.ts. Please add database configuration or call initDatabase() manually.',
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to auto-initialize database from config: ${message}`,
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
export async function getDatabaseAsync(connectionName: string = 'default'): Promise<DatabaseAdapter> {
  // 如果数据库未初始化，尝试自动初始化
  if (!dbManager) {
    await autoInitDatabase(connectionName);
  }

  if (!dbManager) {
    throw new Error(
      'Database not initialized. Please call initDatabase() first or configure database in dweb.config.ts',
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
export function getDatabase(connectionName: string = 'default'): DatabaseAdapter {
  if (!dbManager) {
    throw new Error(
      'Database not initialized. Please call initDatabase() first or configure database in dweb.config.ts. For automatic initialization, use getDatabaseAsync() instead.',
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
      'Database not initialized. Please call initDatabase() first or configure database in dweb.config.ts',
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

