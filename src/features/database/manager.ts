/**
 * 数据库管理器
 * 管理多个数据库连接
 */

import { BaseManager } from "../../core/base-manager.ts";
import type { IService } from "../../core/iservice.ts";
import type { DatabaseAdapter, DatabaseConfig, DatabaseType } from "./types.ts";
import { PostgreSQLAdapter } from "./adapters/postgresql.ts";
import { MongoDBAdapter } from "./adapters/mongodb.ts";
import { initDatabaseFromConfig } from "./init-database.ts";
import { setDatabaseManager } from "./access.ts";

/**
 * 连接状态信息
 */
export interface ConnectionStatus {
  /** 连接名称 */
  name: string;
  /** 数据库类型 */
  type: DatabaseType;
  /** 是否已连接 */
  connected: boolean;
  /** 连接配置中的主机地址 */
  host?: string;
  /** 连接配置中的数据库名 */
  database?: string;
}

/**
 * 数据库管理器类
 */
export class DatabaseManager extends BaseManager implements IService {
  private adapters: Map<string, DatabaseAdapter> = new Map();

  /**
   * 构造函数
   */
  constructor() {
    super("DatabaseManager");
  }

  /**
   * 初始化数据库管理器
   * 自动从配置文件加载数据库配置并连接
   */
  protected override async onInitialize(): Promise<void> {
    try {
      setDatabaseManager(this);
      // 自动从配置文件加载配置并连接数据库
      await initDatabaseFromConfig();
      // console.log("数据库初始化完成...");
    } catch (error) {
      console.error("数据库初始化出错:", error);
    }
  }

  /**
   * 销毁管理器
   * 关闭所有数据库连接
   */
  protected override async onDestroy(): Promise<void> {
    await this.closeAll();
    // console.log("数据库服务销毁完成...");
  }

  /**
   * 连接数据库
   * @param name 连接名称（默认为 'default'）
   * @param config 数据库配置
   * @returns 连接状态信息
   */
  async connect(
    name: string = "default",
    config: DatabaseConfig,
  ): Promise<ConnectionStatus> {
    const adapter = this.createAdapter(config.type);
    await adapter.connect(config);
    this.adapters.set(name, adapter);

    // 返回连接状态
    return {
      name,
      type: config.type,
      connected: adapter.isConnected(),
      host: config.connection.host,
      database: config.connection.database,
    };
  }

  /**
   * 获取数据库连接
   * @param name 连接名称（默认为 'default'）
   * @returns 数据库适配器实例
   */
  getConnection(name: string = "default"): DatabaseAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(
        `Database connection "${name}" not found. Please connect first.`,
      );
    }
    return adapter;
  }

  /**
   * 创建适配器实例
   * @param type 数据库类型
   * @returns 数据库适配器实例
   */
  private createAdapter(type: DatabaseType): DatabaseAdapter {
    switch (type) {
      case "postgresql":
        return new PostgreSQLAdapter();
      case "mongodb":
        return new MongoDBAdapter();
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  /**
   * 关闭指定连接
   * @param name 连接名称（如果不提供，则关闭所有连接）
   */
  async close(name?: string): Promise<void> {
    if (name) {
      const adapter = this.adapters.get(name);
      if (adapter) {
        await adapter.close();
        this.adapters.delete(name);
      }
    } else {
      await this.closeAll();
    }
  }

  /**
   * 关闭所有连接
   */
  async closeAll(): Promise<void> {
    for (const [_name, adapter] of this.adapters) {
      adapter.close();
    }
    this.adapters.clear();
  }

  /**
   * 检查连接是否存在
   * @param name 连接名称
   * @returns 是否存在
   */
  hasConnection(name: string = "default"): boolean {
    return this.adapters.has(name);
  }

  /**
   * 获取所有连接名称
   * @returns 连接名称数组
   */
  getConnectionNames(): string[] {
    return Array.from(this.adapters.keys());
  }
}
