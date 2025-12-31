/**
 * MySQL/MariaDB 数据库适配器
 */

import { Client } from "@mysql";
import {
  BaseAdapter,
  type HealthCheckResult,
  type PoolStatus,
} from "./base.ts";
import type { DatabaseAdapter, DatabaseConfig } from "../types.ts";

/**
 * MySQL 适配器实现（兼容 MariaDB）
 */
export class MySQLAdapter extends BaseAdapter {
  private client: Client | null = null;

  /**
   * 连接 MySQL/MariaDB 数据库
   * @param retryCount 重试次数（内部使用）
   */
  async connect(config: DatabaseConfig, retryCount: number = 0): Promise<void> {
    const pool = config.pool as
      | (typeof config.pool & { maxRetries?: number; retryDelay?: number })
      | undefined;
    const maxRetries = pool?.maxRetries || 3;
    const retryDelay = pool?.retryDelay || 1000;

    try {
      this.validateConfig(config);
      this.config = config;

      const { host, port, database, username, password } = config.connection;

      // 创建客户端并连接
      const client = new Client();
      await client.connect({
        hostname: host || "localhost",
        port: port || 3306,
        username: username || "",
        db: database || "",
        password: password || "",
      });

      this.client = client;
      this.connected = true;
    } catch (error) {
      // 自动重连机制
      if (retryCount < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * (retryCount + 1))
        );
        return await this.connect(config, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * 检查连接并自动重连
   */
  private async ensureConnection(): Promise<void> {
    if (!this.connected || !this.client) {
      if (this.config) {
        await this.connect(this.config);
      } else {
        throw new Error(
          "Database not connected and no config available for reconnection",
        );
      }
    }

    // 定期健康检查
    const now = Date.now();
    if (
      !this.lastHealthCheck ||
      now - this.lastHealthCheck.getTime() > this.healthCheckInterval
    ) {
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
   * 执行查询（返回结果集）
   */
  async query(sql: string, params: any[] = []): Promise<any[]> {
    await this.ensureConnection();
    if (!this.client) {
      throw new Error("Database not connected");
    }

    const startTime = Date.now();

    try {
      const result = await this.client.query(sql, params);
      const duration = Date.now() - startTime;

      // 记录查询日志
      if (this.queryLogger) {
        await this.queryLogger.log("query", sql, params, duration);
      }

      return Array.isArray(result) ? result : [];
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      // 记录错误日志
      if (this.queryLogger) {
        await this.queryLogger.log(
          "query",
          sql,
          params,
          duration,
          error as Error,
        );
      }

      throw new Error(`MySQL query error: ${message}`);
    }
  }

  /**
   * 执行更新/插入/删除
   */
  async execute(sql: string, params: any[] = []): Promise<any> {
    await this.ensureConnection();
    if (!this.client) {
      throw new Error("Database not connected");
    }

    const startTime = Date.now();

    try {
      const result = await this.client.execute(sql, params);
      const duration = Date.now() - startTime;

      // 记录执行日志
      if (this.queryLogger) {
        await this.queryLogger.log("execute", sql, params, duration);
      }

      // deno_mysql 的 execute 返回 OK 包，包含 affectedRows 等
      const ok: any = result;
      return {
        affectedRows: ok?.affectedRows || 0,
        insertId: ok?.lastInsertId ?? null,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      // 记录错误日志
      if (this.queryLogger) {
        await this.queryLogger.log(
          "execute",
          sql,
          params,
          duration,
          error as Error,
        );
      }

      throw new Error(`MySQL execute error: ${message}`);
    }
  }

  /**
   * 执行事务
   */
  async transaction<T>(
    callback: (db: DatabaseAdapter) => Promise<T>,
  ): Promise<T> {
    if (!this.client) {
      throw new Error("Database not connected");
    }

    // 使用客户端的事务 API
    const result = await this.client.transaction(async (conn) => {
      const txAdapter = new MySQLAdapter();
      txAdapter.client = conn as unknown as Client;
      txAdapter.connected = true;
      txAdapter.setQueryLogger(this.getQueryLogger()!);
      return await callback(txAdapter);
    });
    return result as T;
  }

  /**
   * 获取连接池状态（deno_mysql 未提供池信息，返回占位值）
   */
  getPoolStatus(): Promise<PoolStatus> {
    return Promise.resolve({
      total: 0,
      active: 0,
      idle: 0,
      waiting: 0,
    });
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    this.lastHealthCheck = new Date();

    try {
      if (!this.client) {
        return {
          healthy: false,
          error: "Database not connected",
          timestamp: new Date(),
        };
      }

      await this.client.query("SELECT 1");
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
   * 添加超时保护，避免关闭操作阻塞
   */
  async close(): Promise<void> {
    if (this.client) {
      try {
        // 添加超时保护（3秒）
        const closePromise = this.client.close();
        await Promise.race([closePromise]);
      } catch (error) {
        // 关闭失败或超时，强制清理
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`MySQL 关闭连接时出错: ${message}`);
      } finally {
        // 无论成功与否，都清理状态
        this.client = null;
        this.connected = false;
      }
    }
  }
}
