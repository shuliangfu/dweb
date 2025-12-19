/**
 * 数据库管理器
 * 管理多个数据库连接
 */

import type { DatabaseAdapter, DatabaseConfig, DatabaseType } from './types.ts';
import { PostgreSQLAdapter } from './adapters/postgresql.ts';
import { MongoDBAdapter } from './adapters/mongodb.ts';
// SQLiteAdapter 和 MySQLAdapter 使用 https:// 导入，JSR 不支持，使用动态导入

/**
 * 数据库管理器类
 */
export class DatabaseManager {
  private adapters: Map<string, DatabaseAdapter> = new Map();

  /**
   * 连接数据库
   * @param name 连接名称（默认为 'default'）
   * @param config 数据库配置
   */
  async connect(name: string = 'default', config: DatabaseConfig): Promise<void> {
    const adapter = await this.createAdapter(config.type);
    await adapter.connect(config);
    this.adapters.set(name, adapter);
  }

  /**
   * 获取数据库连接
   * @param name 连接名称（默认为 'default'）
   * @returns 数据库适配器实例
   */
  getConnection(name: string = 'default'): DatabaseAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Database connection "${name}" not found. Please connect first.`);
    }
    return adapter;
  }

  /**
   * 创建适配器实例
   * @param type 数据库类型
   * @returns 数据库适配器实例
   */
  private async createAdapter(type: DatabaseType): Promise<DatabaseAdapter> {
    switch (type) {
      case 'sqlite': {
        // 动态导入 SQLite 适配器（使用 https:// 导入，JSR 不支持）
        // 注意：在 JSR 发布时，此文件可能被排除，需要从适配器文件直接导入
        try {
          const { SQLiteAdapter } = await import('./adapters/sqlite.ts');
          return new SQLiteAdapter();
        } catch (error) {
          throw new Error(
            `SQLite adapter not available. This may be because the package was published to JSR. ` +
            `Please import SQLiteAdapter directly: import { SQLiteAdapter } from '@dreamer/dweb/features/database/adapters/sqlite';`
          );
        }
      }
      case 'postgresql':
        return new PostgreSQLAdapter();
      case 'mysql': {
        // 动态导入 MySQL 适配器（使用 https:// 导入，JSR 不支持）
        // 注意：在 JSR 发布时，此文件可能被排除，需要从适配器文件直接导入
        try {
          const { MySQLAdapter } = await import('./adapters/mysql.ts');
          return new MySQLAdapter();
        } catch (error) {
          throw new Error(
            `MySQL adapter not available. This may be because the package was published to JSR. ` +
            `Please import MySQLAdapter directly: import { MySQLAdapter } from '@dreamer/dweb/features/database/adapters/mysql';`
          );
        }
      }
      case 'mongodb':
        return new MongoDBAdapter();
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  /**
   * 关闭指定连接
   * @param name 连接名称（如果不提供，则关闭所有连接）
   */
  async close(name?: string): Promise<void> {
    if (name) {
      const adapter = this.adapters.get(name);
      if (adapter) {
        await adapter.close();
        this.adapters.delete(name);
      }
    } else {
      await this.closeAll();
    }
  }

  /**
   * 关闭所有连接
   */
  async closeAll(): Promise<void> {
    for (const [name, adapter] of this.adapters) {
      await adapter.close();
    }
    this.adapters.clear();
  }

  /**
   * 检查连接是否存在
   * @param name 连接名称
   * @returns 是否存在
   */
  hasConnection(name: string = 'default'): boolean {
    return this.adapters.has(name);
  }

  /**
   * 获取所有连接名称
   * @returns 连接名称数组
   */
  getConnectionNames(): string[] {
    return Array.from(this.adapters.keys());
  }
}

