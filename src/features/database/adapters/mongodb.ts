/**
 * MongoDB 数据库适配器
 */

import { MongoClient, type Db, type MongoClientOptions } from '@mongodb';
import { BaseAdapter } from './base.ts';
import type { DatabaseConfig, DatabaseAdapter } from '../types.ts';

/**
 * MongoDB 适配器实现
 * 注意：MongoDB 使用文档数据库，query 和 execute 方法的语义与 SQL 数据库不同
 */
export class MongoDBAdapter extends BaseAdapter {
  private client: MongoClient | null = null;
  private db: Db | null = null;

  /**
   * 连接 MongoDB 数据库
   */
  async connect(config: DatabaseConfig): Promise<void> {
    this.validateConfig(config);
    this.config = config;

    const { host, port, database, username, password, authSource } = config.connection;

    // 构建连接 URL
    let url: string;
    if (username && password) {
      url = `mongodb://${username}:${password}@${host || 'localhost'}:${port || 27017}/${database || ''}`;
      if (authSource) {
        url += `?authSource=${authSource}`;
      }
    } else {
      url = `mongodb://${host || 'localhost'}:${port || 27017}/${database || ''}`;
    }

    // 创建 MongoDB 客户端
    const clientOptions: MongoClientOptions = {
      maxPoolSize: config.mongoOptions?.maxPoolSize || 10,
      minPoolSize: config.mongoOptions?.minPoolSize || 1,
      serverSelectionTimeoutMS: config.mongoOptions?.serverSelectionTimeoutMS || 5000,
    };
    this.client = new MongoClient(url, clientOptions);

    await this.client.connect();
    this.db = this.client.db(database);
    this.connected = true;
  }

  /**
   * 执行查询（MongoDB 使用集合和查询对象）
   * @param collection 集合名称
   * @param filter 查询过滤器（可选）
   * @param options 查询选项（可选）
   */
  async query(collection: string, filter: any = {}, options: any = {}): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.db.collection(collection).find(filter, options).toArray();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB query error: ${message}`);
    }
  }

  /**
   * 执行操作（插入、更新、删除）
   * @param operation 操作类型：'insert', 'insertMany', 'update', 'updateMany', 'delete', 'deleteMany'
   * @param collection 集合名称（作为第二个参数）
   * @param data 操作数据（作为第三个参数）
   */
  async execute(operation: string, collection?: string | any[], data?: any): Promise<any> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    // MongoDB 适配器需要 collection 和 data 参数
    if (typeof collection !== 'string') {
      throw new Error('MongoDB execute requires collection name as second parameter');
    }
    if (data === undefined) {
      throw new Error('MongoDB execute requires data as third parameter');
    }

    try {
      const coll = this.db.collection(collection);

      switch (operation) {
        case 'insert':
          return await coll.insertOne(data);
        case 'insertMany':
          return await coll.insertMany(data);
        case 'update':
          return await coll.updateOne(data.filter, { $set: data.update });
        case 'updateMany':
          return await coll.updateMany(data.filter, { $set: data.update });
        case 'delete':
          return await coll.deleteOne(data.filter);
        case 'deleteMany':
          return await coll.deleteMany(data.filter);
        default:
          throw new Error(`Unknown MongoDB operation: ${operation}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB execute error: ${message}`);
    }
  }

  /**
   * 执行事务（MongoDB 4.0+ 支持）
   */
  async transaction<T>(callback: (db: DatabaseAdapter) => Promise<T>): Promise<T> {
    if (!this.client) {
      throw new Error('Database not connected');
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

