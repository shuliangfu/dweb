/**
 * 数据库访问辅助模块
 * 提供全局数据库访问接口，用于在 load 函数和 API 路由中访问数据库
 */

import { DatabaseManager } from './manager.ts';
import type { DatabaseAdapter, DatabaseConfig } from './types.ts';

/**
 * 全局数据库管理器实例
 */
let dbManager: DatabaseManager | null = null;

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
 * 获取数据库连接
 * @param connectionName 连接名称（默认为 'default'）
 * @returns 数据库适配器实例
 * @throws {Error} 如果数据库未初始化
 */
export function getDatabase(connectionName: string = 'default'): DatabaseAdapter {
  if (!dbManager) {
    throw new Error(
      'Database not initialized. Please call initDatabase() first or configure database in dweb.config.ts',
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

