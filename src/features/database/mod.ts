/**
 * 数据库功能模块入口
 * 导出所有数据库相关的公共 API
 *
 * 所有数据库相关的功能都可以从这个模块导入，无需从子目录导入
 *
 * @example
 * ```typescript
 * import {
 *   // 管理器
 *   DatabaseManager,
 *   // 类型
 *   type DatabaseAdapter,
 *   type DatabaseConfig,
 *   type DatabaseType,
 *   // 适配器
 *   BaseAdapter,
 *   PostgreSQLAdapter,
 *   MongoDBAdapter,
 *   // 查询构建器
 *   SQLQueryBuilder,
 *   MongoQueryBuilder,
 *   // ORM/ODM 模型
 *   SQLModel,
 *   MongoModel,
 *   type WhereCondition,
 *   type MongoWhereCondition,
 *   // 迁移管理
 *   MigrationManager,
 *   type Migration,
 *   type MigrationConfig,
 *   type MigrationStatus,
 *   // 缓存
 *   type CacheAdapter,
 *   MemoryCacheAdapter,
 *   // 查询日志
 *   QueryLogger,
 *   type QueryLogEntry,
 *   type QueryLoggerConfig,
 *   // 索引类型
 *   type IndexDefinition,
 *   type IndexDefinitions,
 *   // 访问函数
 *   getDatabase,
 *   initDatabase,
 *   // 初始化工具
 *   initDatabaseFromConfig,
 * } from '@dreamer/dweb/database';
 * ```
 */

// ==================== 管理器 ====================
export { DatabaseManager } from "./manager.ts";

// ==================== 核心类型 ====================
export type { DatabaseAdapter, DatabaseConfig, DatabaseType } from "./types.ts";

// ==================== 适配器 ====================
// 注意：SQLiteAdapter 和 MySQLAdapter 使用 https:// 导入，JSR 不支持
// 如果需要使用这些适配器，请直接从适配器文件导入：
// import { SQLiteAdapter } from '@dreamer/dweb/database/adapters/sqlite';
// import { MySQLAdapter } from '@dreamer/dweb/database/adapters/mysql';
export {
  BaseAdapter,
  // MySQLAdapter,  // 使用 https:// 导入，JSR 不支持
  MongoDBAdapter,
  // SQLiteAdapter,  // 使用 https:// 导入，JSR 不支持
  PostgreSQLAdapter,
} from "./adapters/mod.ts";

// ==================== 查询构建器 ====================
export { MongoQueryBuilder, SQLQueryBuilder } from "./query/mod.ts";

// ==================== ORM/ODM 模型 ====================
export {
  MongoModel,
  type MongoWhereCondition,
  SQLModel,
  type WhereCondition,
} from "./orm/mod.ts";

// ==================== 迁移管理 ====================
export {
  type Migration,
  type MigrationConfig,
  MigrationManager,
  type MigrationStatus,
} from "./migration/mod.ts";

// ==================== 缓存 ====================
export type { CacheAdapter } from "./cache/mod.ts";
export { MemoryCacheAdapter } from "./cache/mod.ts";

// ==================== 查询日志 ====================
export type { QueryLogEntry, QueryLoggerConfig } from "./logger/mod.ts";
export { QueryLogger } from "./logger/mod.ts";

// ==================== 索引类型 ====================
export type {
  CompoundIndex,
  GeospatialIndex,
  IndexDefinition,
  IndexDefinitions,
  IndexDirection,
  IndexType,
  SingleFieldIndex,
  TextIndex,
} from "./types/index.ts";

// ==================== 数据库访问辅助函数 ====================
export {
  closeDatabase,
  getDatabase,
  getDatabaseAsync,
  getDatabaseManager,
  initDatabase,
  isDatabaseInitialized,
  setDatabaseConfigLoader,
} from "./access.ts";

// ==================== 数据库初始化工具 ====================
export {
  initDatabaseFromConfig,
  setupDatabaseConfigLoader,
} from "./init-database.ts";
