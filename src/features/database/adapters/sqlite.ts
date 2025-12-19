/**
 * SQLite 数据库适配器
 */

import { DB } from '@sqlite';
import { BaseAdapter } from './base.ts';
import type { DatabaseConfig, DatabaseAdapter } from '../types.ts';

/**
 * SQLite 适配器实现
 */
export class SQLiteAdapter extends BaseAdapter {
  private db: DB | null = null;

  /**
   * 连接 SQLite 数据库
   */
  async connect(config: DatabaseConfig): Promise<void> {
    this.validateConfig(config);
    this.config = config;

    const path = config.connection.path || 'database.sqlite';
    this.db = new DB(path);
    this.connected = true;
  }

  /**
   * 执行查询
   */
  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const results: any[] = [];
    try {
      // SQLite 的 query 方法返回 Row[] 数组
      // 使用 queryEntries 方法可以直接获取对象数组（带列名）
      const rows = this.db.queryEntries(sql, params);
      return rows;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`SQLite query error: ${message}`);
    }
  }

  /**
   * 执行更新/插入/删除
   */
  async execute(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      // SQLite 的 execute 方法只接受 SQL 字符串，参数需要通过 query 方法传递
      if (params.length > 0) {
        // 对于带参数的 SQL，使用 query 方法执行
        this.db.query(sql, params);
      } else {
        // 对于不带参数的 SQL，使用 execute 方法
        this.db.execute(sql);
      }
      return {
        affectedRows: this.db.changes,
        lastInsertRowId: this.db.lastInsertRowId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`SQLite execute error: ${message}`);
    }
  }

  /**
   * 执行事务
   */
  async transaction<T>(callback: (db: DatabaseAdapter) => Promise<T>): Promise<T> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      this.db.execute('BEGIN');
      const result = await callback(this);
      this.db.execute('COMMIT');
      return result;
    } catch (error) {
      this.db.execute('ROLLBACK');
      throw error;
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.connected = false;
    }
  }
}

