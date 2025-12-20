/**
 * 数据库适配器基础接口和抽象类
 */

import type { DatabaseAdapter, DatabaseConfig } from '../types.ts';
import type { QueryLogger } from '../logger/query-logger.ts';

/**
 * 连接池状态
 */
export interface PoolStatus {
  /**
   * 总连接数
   */
  total: number;
  /**
   * 活跃连接数
   */
  active: number;
  /**
   * 空闲连接数
   */
  idle: number;
  /**
   * 等待连接数
   */
  waiting: number;
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  /**
   * 是否健康
   */
  healthy: boolean;
  /**
   * 响应时间（毫秒）
   */
  latency?: number;
  /**
   * 错误信息
   */
  error?: string;
  /**
   * 时间戳
   */
  timestamp: Date;
}

/**
 * 基础适配器抽象类
 * 提供通用的适配器功能
 */
export abstract class BaseAdapter implements DatabaseAdapter {
  protected config: DatabaseConfig | null = null;
  protected connected: boolean = false;
  protected lastHealthCheck: Date | null = null;
  protected healthCheckInterval: number = 30000; // 30 秒
  protected queryLogger: QueryLogger | null = null;

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

    if (!config.connection.host || !config.connection.database) {
      throw new Error('Database host and database name are required');
    }
  }

  /**
   * 获取连接池状态（由子类实现）
   */
  abstract getPoolStatus(): Promise<PoolStatus>;

  /**
   * 健康检查（由子类实现）
   */
  abstract healthCheck(): Promise<HealthCheckResult>;

  /**
   * 获取最后一次健康检查时间
   */
  getLastHealthCheck(): Date | null {
    return this.lastHealthCheck;
  }

  /**
   * 设置健康检查间隔
   */
  setHealthCheckInterval(interval: number): void {
    this.healthCheckInterval = interval;
  }

  /**
   * 设置查询日志记录器
   */
  setQueryLogger(logger: QueryLogger): void {
    this.queryLogger = logger;
  }

  /**
   * 获取查询日志记录器
   */
  getQueryLogger(): QueryLogger | null {
    return this.queryLogger;
  }
}

