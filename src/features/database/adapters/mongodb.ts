/**
 * MongoDB 数据库适配器
 */

import { type Db, MongoClient, type MongoClientOptions } from "@mongodb";
import {
  BaseAdapter,
  type HealthCheckResult,
  type PoolStatus,
} from "./base.ts";
import type { DatabaseAdapter, DatabaseConfig } from "../types.ts";

/**
 * MongoDB 适配器实现
 * 注意：MongoDB 使用文档数据库，query 和 execute 方法的语义与 SQL 数据库不同
 */
export class MongoDBAdapter extends BaseAdapter {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  /**
   * 连接 MongoDB 数据库
   * @param retryCount 重试次数（内部使用）
   */
  async connect(config: DatabaseConfig, retryCount: number = 0): Promise<void> {
    const mongoOptions = config.mongoOptions as
      | (typeof config.mongoOptions & {
        maxRetries?: number;
        retryDelay?: number;
      })
      | undefined;
    const maxRetries = mongoOptions?.maxRetries || 3;
    const retryDelay = mongoOptions?.retryDelay || 1000;

    try {
      this.validateConfig(config);
      this.config = config;

      const { host, port, database, username, password, authSource } =
        config.connection;

      // 构建连接 URL
      let url: string;
      if (username && password) {
        url = `mongodb://${username}:${password}@${host || "localhost"}:${
          port || 27017
        }/${database || ""}`;
        if (authSource) {
          url += `?authSource=${authSource}`;
        }
      } else {
        url = `mongodb://${host || "localhost"}:${port || 27017}/${
          database || ""
        }`;
      }

      // 连接选项
      const clientOptions: any = {
        // 默认选项
        serverSelectionTimeoutMS: mongoOptions?.timeoutMS || 30000,
      };

      if (mongoOptions?.authSource) {
        clientOptions.authSource = mongoOptions.authSource;
      }

      if (mongoOptions?.replicaSet) {
        clientOptions.replicaSet = mongoOptions.replicaSet;
      }

      if (mongoOptions?.maxPoolSize) {
        clientOptions.maxPoolSize = mongoOptions.maxPoolSize;
      }

      if (mongoOptions?.minPoolSize) {
        clientOptions.minPoolSize = mongoOptions.minPoolSize;
      }

      this.client = new MongoClient(url, clientOptions);

      await this.client.connect();
      this.db = this.client.db(database);
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
   * 执行查询（MongoDB 使用集合和查询对象）
   * @param collection 集合名称
   * @param filter 查询过滤器（可选）
   * @param options 查询选项（可选）
   */
  async query(
    collection: string,
    filter: any = {},
    options: any = {},
  ): Promise<any[]> {
    await this.ensureConnection();
    if (!this.db) {
      throw new Error("Database not connected");
    }

    const startTime = Date.now();
    const sql = `db.${collection}.find(${JSON.stringify(filter)}, ${
      JSON.stringify(options)
    })`;

    try {
      const result = await this.db.collection(collection).find(filter, options)
        .toArray();
      const duration = Date.now() - startTime;

      // 记录查询日志
      if (this.queryLogger) {
        await this.queryLogger.log("query", sql, [filter, options], duration);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      // 记录错误日志
      if (this.queryLogger) {
        await this.queryLogger.log(
          "query",
          sql,
          [filter, options],
          duration,
          error as Error,
        );
      }

      throw new Error(`MongoDB query error: ${message}`);
    }
  }

  /**
   * 执行操作（插入、更新、删除）
   * @param operation 操作类型：'insert', 'insertMany', 'update', 'updateMany', 'delete', 'deleteMany'
   * @param collection 集合名称（作为第二个参数）
   * @param data 操作数据（作为第三个参数）
   */
  async execute(
    operation: string,
    collection?: string | any[],
    data?: any,
  ): Promise<any> {
    await this.ensureConnection();
    if (!this.db) {
      throw new Error("Database not connected");
    }

    // MongoDB 适配器需要 collection 和 data 参数
    if (typeof collection !== "string") {
      throw new Error(
        "MongoDB execute requires collection name as second parameter",
      );
    }
    if (data === undefined) {
      throw new Error("MongoDB execute requires data as third parameter");
    }

    const startTime = Date.now();
    const sql = `db.${collection}.${operation}(${JSON.stringify(data)})`;

    try {
      const coll = this.db.collection(collection);
      let result: any;

      switch (operation) {
        case "insert":
          result = await coll.insertOne(data);
          break;
        case "insertMany":
          result = await coll.insertMany(data);
          break;
        case "update":
          result = await coll.updateOne(data.filter, { $set: data.update });
          break;
        case "updateMany":
          result = await coll.updateMany(data.filter, { $set: data.update });
          break;
        case "delete":
          result = await coll.deleteOne(data.filter);
          break;
        case "deleteMany":
          result = await coll.deleteMany(data.filter);
          break;
        default:
          throw new Error(`Unknown MongoDB operation: ${operation}`);
      }

      const duration = Date.now() - startTime;

      // 记录执行日志
      if (this.queryLogger) {
        await this.queryLogger.log("execute", sql, [data], duration);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      // 记录错误日志
      if (this.queryLogger) {
        await this.queryLogger.log(
          "execute",
          sql,
          [data],
          duration,
          error as Error,
        );
      }

      throw new Error(`MongoDB execute error: ${message}`);
    }
  }

  /**
   * 执行事务（MongoDB 4.0+ 支持）
   */
  async transaction<T>(
    callback: (db: DatabaseAdapter) => Promise<T>,
  ): Promise<T> {
    if (!this.client) {
      throw new Error("Database not connected");
    }

    const session = this.client.startSession();
    try {
      return await session.withTransaction(async () => {
        return await callback(this);
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * 获取数据库实例（用于直接操作 MongoDB）
   */
  getDatabase(): Db | null {
    return this.db;
  }

  /**
   * 获取连接池状态
   */
  getPoolStatus(): Promise<PoolStatus> {
    if (!this.client) {
      return Promise.resolve({
        total: 0,
        active: 0,
        idle: 0,
        waiting: 0,
      });
    }

    // MongoDB 连接池信息
    const topology = (this.client as any).topology;
    if (topology && topology.s) {
      const servers = topology.s.servers || new Map();
      let total = 0;
      let active = 0;
      let idle = 0;

      for (const server of servers.values()) {
        const pool = server.s?.pool;
        if (pool) {
          total += pool.totalConnectionCount || 0;
          active += pool.availableConnectionCount || 0;
          idle += (pool.totalConnectionCount || 0) -
            (pool.availableConnectionCount || 0);
        }
      }

      return Promise.resolve({
        total,
        active,
        idle,
        waiting: 0, // MongoDB 不直接提供等待连接数
      });
    }

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
      if (!this.db) {
        return {
          healthy: false,
          error: "Database not connected",
          timestamp: new Date(),
        };
      }

      // 执行 ping 操作
      await this.db.admin().ping();
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
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.connected = false;
    }
  }
}
