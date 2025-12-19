/**
 * 数据库适配器基础接口和抽象类
 */

import type { DatabaseAdapter, DatabaseConfig } from '../types.ts';

/**
 * 基础适配器抽象类
 * 提供通用的适配器功能
 */
export abstract class BaseAdapter implements DatabaseAdapter {
  protected config: DatabaseConfig | null = null;
  protected connected: boolean = false;

  /**
   * 连接数据库（由子类实现）
   */
  abstract connect(config: DatabaseConfig): Promise<void>;

  /**
   * 执行查询（由子类实现）
   * SQL 数据库: query(sql: string, params?: any[]): Promise<any[]>
   * MongoDB: query(collection: string, filter?: any, options?: any): Promise<any[]>
   */
  abstract query(sqlOrCollection: string, paramsOrFilter?: any[] | any, options?: any): Promise<any[]>;

  /**
   * 执行更新/插入/删除（由子类实现）
   * SQL 数据库: execute(sql: string, params?: any[]): Promise<any>
   * MongoDB: execute(operation: string, collection: string, data: any): Promise<any>
   */
  abstract execute(sqlOrOperation: string, paramsOrCollection?: any[] | string, data?: any): Promise<any>;

  /**
   * 执行事务（由子类实现）
   */
  abstract transaction<T>(callback: (db: DatabaseAdapter) => Promise<T>): Promise<T>;

  /**
   * 关闭连接（由子类实现）
   */
  abstract close(): Promise<void>;

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 验证配置
   */
  protected validateConfig(config: DatabaseConfig): void {
    if (!config.type) {
      throw new Error('Database type is required');
    }

    if (config.type === 'sqlite') {
      if (!config.connection.path) {
        throw new Error('SQLite database path is required');
      }
    } else {
      if (!config.connection.host || !config.connection.database) {
        throw new Error('Database host and database name are required');
      }
    }
  }
}

