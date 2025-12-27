/**
 * 数据库支持类型定义
 */

/**
 * 数据库类型
 */
export type DatabaseType = "postgresql" | "mongodb";

/**
 * 数据库连接配置
 */
export interface DatabaseConfig {
  /** 数据库类型 */
  type: DatabaseType;

  /** 连接配置 */
  connection: {
    // PostgreSQL/MongoDB
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;

    // MongoDB 特定
    authSource?: string;
    replicaSet?: string;
  };

  /** 连接池配置（SQL 数据库） */
  pool?: {
    min?: number;
    max?: number;
    idleTimeout?: number;
    maxRetries?: number; // 最大重试次数
    retryDelay?: number; // 重试延迟（毫秒）
  };

  /** MongoDB 特定配置 */
  mongoOptions?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    timeoutMS?: number; // 服务器选择超时时间（毫秒）
    maxRetries?: number; // 最大重试次数
    retryDelay?: number; // 重试延迟（毫秒）
  };
}

/**
 * 数据库适配器接口
 * 所有数据库适配器必须实现此接口
 *
 * 注意：MongoDB 适配器的 query 和 execute 方法签名略有不同
 * - query(collection: string, filter?: any, options?: any): Promise<any[]>
 * - execute(operation: string, collection: string, data: any): Promise<any>
 */
export interface DatabaseAdapter {
  /**
   * 连接数据库
   */
  connect(config: DatabaseConfig): Promise<void>;

  /**
   * 执行查询（返回结果集）
   * SQL 数据库: query(sql: string, params?: any[]): Promise<any[]>
   * MongoDB: query(collection: string, filter?: any, options?: any): Promise<any[]>
   *
   * 注意：第三个参数 options 仅用于 MongoDB
   */
  query(
    sqlOrCollection: string,
    paramsOrFilter?: any[] | any,
    options?: any,
  ): Promise<any[]>;

  /**
   * 执行更新/插入/删除（返回影响行数等信息）
   * SQL 数据库: execute(sql: string, params?: any[]): Promise<any>
   * MongoDB: execute(operation: string, collection: string, data: any): Promise<any>
   */
  execute(
    sqlOrOperation: string,
    paramsOrCollection?: any[] | string,
    data?: any,
  ): Promise<any>;

  /**
   * 执行事务
   */
  transaction<T>(callback: (db: DatabaseAdapter) => Promise<T>): Promise<T>;

  /**
   * 关闭连接
   */
  close(): Promise<void>;

  /**
   * 检查是否已连接
   */
  isConnected(): boolean;
}
