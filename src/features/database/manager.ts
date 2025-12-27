/**
 * 数据库管理器
 * 管理多个数据库连接
 */

import type { DatabaseAdapter, DatabaseConfig, DatabaseType } from "./types.ts";
import { PostgreSQLAdapter } from "./adapters/postgresql.ts";
import { MongoDBAdapter } from "./adapters/mongodb.ts";

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
  async connect(
    name: string = "default",
    config: DatabaseConfig,
  ): Promise<void> {
    const adapter = this.createAdapter(config.type);
    await adapter.connect(config);
    this.adapters.set(name, adapter);
  }

  /**
   * 获取数据库连接
   * @param name 连接名称（默认为 'default'）
   * @returns 数据库适配器实例
   */
  getConnection(name: string = "default"): DatabaseAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(
        `Database connection "${name}" not found. Please connect first.`,
      );
    }
    return adapter;
  }

  /**
   * 创建适配器实例
   * @param type 数据库类型
   * @returns 数据库适配器实例
   */
  private createAdapter(type: DatabaseType): DatabaseAdapter {
    switch (type) {
      case "postgresql":
        return new PostgreSQLAdapter();
      case "mongodb":
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
    for (const [_name, adapter] of this.adapters) {
      await adapter.close();
    }
    this.adapters.clear();
  }

  /**
   * 检查连接是否存在
   * @param name 连接名称
   * @returns 是否存在
   */
  hasConnection(name: string = "default"): boolean {
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
