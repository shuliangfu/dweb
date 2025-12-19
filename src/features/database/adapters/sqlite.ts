/**
 * SQLite 数据库适配器
 */

import { DB } from 'https://deno.land/x/sqlite@v3.7.3/mod.ts';
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
      for (const row of this.db.query(sql, params)) {
        const obj: any = {};
        const columns = row.columns();
        for (let i = 0; i < row.length; i++) {
          obj[columns[i]] = row[i];
        }
        results.push(obj);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`SQLite query error: ${message}`);
    }
    return results;
  }

  /**
   * 执行更新/插入/删除
   */
  async execute(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      this.db.execute(sql, params);
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

