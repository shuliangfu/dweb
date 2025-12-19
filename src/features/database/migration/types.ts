/**
 * 迁移管理类型定义
 */

import type { DatabaseAdapter } from '../types.ts';

/**
 * 迁移接口
 * 所有迁移类都必须实现此接口
 */
export interface Migration {
  /**
   * 迁移名称（用于标识）
   */
  name: string;

  /**
   * 执行迁移（升级）
   * @param db 数据库适配器实例
   */
  up(db: DatabaseAdapter): Promise<void>;

  /**
   * 回滚迁移（降级）
   * @param db 数据库适配器实例
   */
  down(db: DatabaseAdapter): Promise<void>;
}

/**
 * 迁移状态
 */
export interface MigrationStatus {
  /**
   * 迁移名称
   */
  name: string;

  /**
   * 迁移文件路径
   */
  file: string;

  /**
   * 是否已执行
   */
  executed: boolean;

  /**
   * 执行时间（如果已执行）
   */
  executedAt?: Date;

  /**
   * 批次号（用于分组）
   */
  batch?: number;
}

/**
 * 迁移管理器配置
 */
export interface MigrationConfig {
  /**
   * 迁移文件目录
   */
  migrationsDir: string;

  /**
   * 迁移历史表名（SQL 数据库）
   */
  historyTableName?: string;

  /**
   * 迁移历史集合名（MongoDB）
   */
  historyCollectionName?: string;

  /**
   * 数据库适配器实例
   */
  adapter: DatabaseAdapter;
}

