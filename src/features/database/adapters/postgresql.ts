/**
 * PostgreSQL 数据库适配器
 */

import postgres from '@postgres';
import { BaseAdapter } from './base.ts';
import type { DatabaseConfig, DatabaseAdapter } from '../types.ts';

/**
 * PostgreSQL 适配器实现
 */
export class PostgreSQLAdapter extends BaseAdapter {
  private sql: ReturnType<typeof postgres> | null = null;

  /**
   * 连接 PostgreSQL 数据库
   */
  async connect(config: DatabaseConfig): Promise<void> {
    this.validateConfig(config);
    this.config = config;

    const { host, port, database, username, password } = config.connection;
    
    // 构建连接字符串
    const connectionString = `postgres://${username || ''}:${password || ''}@${host || 'localhost'}:${port || 5432}/${database || ''}`;
    
    // 创建连接池
    this.sql = postgres(connectionString, {
      max: config.pool?.max || 10,
      idle_timeout: config.pool?.idleTimeout || 30,
    });

    this.connected = true;
  }

  /**
   * 执行查询
   */
  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.sql) {
      throw new Error('Database not connected');
    }

    try {
      // postgres 库使用模板字符串语法，但我们也支持参数化查询
      // 对于参数化查询，使用 unsafe 方法
      const result = await this.sql.unsafe(sql, params);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PostgreSQL query error: ${message}`);
    }
  }

  /**
   * 执行更新/插入/删除
   */
  async execute(sql: string, params: any[] = []): Promise<any> {
    if (!this.sql) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.sql.unsafe(sql, params);
      return {
        affectedRows: result.count || 0,
        rows: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PostgreSQL execute error: ${message}`);
    }
  }

  /**
   * 执行事务
   */
  async transaction<T>(callback: (db: DatabaseAdapter) => Promise<T>): Promise<T> {
    if (!this.sql) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.sql.begin(async (sql) => {
        // 创建一个临时适配器用于事务
        const txAdapter = new PostgreSQLAdapter();
        txAdapter.sql = sql;
        txAdapter.connected = true;
        return await callback(txAdapter);
      });
      return result as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PostgreSQL transaction error: ${message}`);
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    if (this.sql) {
      await this.sql.end();
      this.sql = null;
      this.connected = false;
    }
  }
}

