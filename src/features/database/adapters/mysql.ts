/**
 * MySQL 数据库适配器
 */

import { Client } from '@mysql';
import { BaseAdapter } from './base.ts';
import type { DatabaseConfig, DatabaseAdapter } from '../types.ts';

/**
 * MySQL 适配器实现
 */
export class MySQLAdapter extends BaseAdapter {
  private client: Client | null = null;

  /**
   * 连接 MySQL 数据库
   */
  async connect(config: DatabaseConfig): Promise<void> {
    this.validateConfig(config);
    this.config = config;

    const { host, port, database, username, password } = config.connection;

    this.client = await new Client().connect({
      hostname: host || 'localhost',
      port: port || 3306,
      db: database || '',
      username: username || '',
      password: password || '',
    });

    this.connected = true;
  }

  /**
   * 执行查询
   */
  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.client.query(sql, params);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MySQL query error: ${message}`);
    }
  }

  /**
   * 执行更新/插入/删除
   */
  async execute(sql: string, params: any[] = []): Promise<any> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.client.execute(sql, params);
      return {
        affectedRows: result.affectedRows || 0,
        insertId: result.lastInsertId || 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MySQL execute error: ${message}`);
    }
  }

  /**
   * 执行事务
   */
  async transaction<T>(callback: (db: DatabaseAdapter) => Promise<T>): Promise<T> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    try {
      await this.client.execute('START TRANSACTION');
      const result = await callback(this);
      await this.client.execute('COMMIT');
      return result;
    } catch (error) {
      await this.client.execute('ROLLBACK');
      throw error;
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.connected = false;
    }
  }
}

