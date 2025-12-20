/**
 * PostgreSQL 数据库适配器
 */

import postgres from '@postgres';
import { BaseAdapter, type PoolStatus, type HealthCheckResult } from './base.ts';
import type { DatabaseConfig, DatabaseAdapter } from '../types.ts';

/**
 * PostgreSQL 适配器实现
 */
export class PostgreSQLAdapter extends BaseAdapter {
	private sql: ReturnType<typeof postgres> | null = null;
	
	// 

  /**
   * 连接 PostgreSQL 数据库
   * @param retryCount 重试次数（内部使用）
   */
  async connect(config: DatabaseConfig, retryCount: number = 0): Promise<void> {
    const pool = config.pool as (typeof config.pool & { maxRetries?: number; retryDelay?: number }) | undefined;
    const maxRetries = pool?.maxRetries || 3;
    const retryDelay = pool?.retryDelay || 1000;

    try {
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
    } catch (error) {
      // 自动重连机制
      if (retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (retryCount + 1)));
        return await this.connect(config, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * 检查连接并自动重连
   */
  private async ensureConnection(): Promise<void> {
    if (!this.connected || !this.sql) {
      if (this.config) {
        await this.connect(this.config);
      } else {
        throw new Error('Database not connected and no config available for reconnection');
      }
    }

    // 定期健康检查
    const now = Date.now();
    if (!this.lastHealthCheck || now - this.lastHealthCheck.getTime() > this.healthCheckInterval) {
      const health = await this.healthCheck();
      if (!health.healthy) {
        // 连接不健康，尝试重连
        if (this.config) {
          await this.connect(this.config);
        }
      }
    }
  }

  /**
   * 执行查询
   */
  async query(sql: string, params: any[] = []): Promise<any[]> {
    await this.ensureConnection();
    if (!this.sql) {
      throw new Error('Database not connected');
    }

    const startTime = Date.now();

    try {
      // postgres 库使用模板字符串语法，但我们也支持参数化查询
      // 对于参数化查询，使用 unsafe 方法
      const result = await this.sql.unsafe(sql, params);
      const duration = Date.now() - startTime;

      // 记录查询日志
      if (this.queryLogger) {
        await this.queryLogger.log('query', sql, params, duration);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      // 记录错误日志
      if (this.queryLogger) {
        await this.queryLogger.log('query', sql, params, duration, error as Error);
      }

      throw new Error(`PostgreSQL query error: ${message}`);
    }
  }

  /**
   * 执行更新/插入/删除
   */
  async execute(sql: string, params: any[] = []): Promise<any> {
    await this.ensureConnection();
    if (!this.sql) {
      throw new Error('Database not connected');
    }

    const startTime = Date.now();

    try {
      const result = await this.sql.unsafe(sql, params);
      const duration = Date.now() - startTime;

      // 记录执行日志
      if (this.queryLogger) {
        await this.queryLogger.log('execute', sql, params, duration);
      }

      return {
        affectedRows: result.count || 0,
        rows: result,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      // 记录错误日志
      if (this.queryLogger) {
        await this.queryLogger.log('execute', sql, params, duration, error as Error);
      }

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
   * 获取连接池状态
   */
  async getPoolStatus(): Promise<PoolStatus> {
    if (!this.sql) {
      return {
        total: 0,
        active: 0,
        idle: 0,
        waiting: 0,
      };
    }

    // postgres 库的连接池信息
    const pool = (this.sql as any).options?.pool;
    if (pool) {
      return {
        total: pool.totalCount || 0,
        active: pool.usedCount || 0,
        idle: (pool.totalCount || 0) - (pool.usedCount || 0),
        waiting: pool.waitingCount || 0,
      };
    }

    // 尝试从连接池获取统计信息
    try {
      const result = await this.sql`SELECT * FROM pg_stat_activity WHERE datname = current_database()`;
      const active = result.length || 0;

      return {
        total: active,
        active,
        idle: 0,
        waiting: 0,
      };
    } catch {
      return {
        total: 0,
        active: 0,
        idle: 0,
        waiting: 0,
      };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    this.lastHealthCheck = new Date();

    try {
      if (!this.sql) {
        return {
          healthy: false,
          error: 'Database not connected',
          timestamp: new Date(),
        };
      }

      // 执行简单查询
      await this.sql`SELECT 1`;
      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
        timestamp: new Date(),
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      return {
        healthy: false,
        latency,
        error: message,
        timestamp: new Date(),
      };
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

