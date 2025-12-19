/**
 * 数据库功能模块入口
 * 导出所有数据库相关的公共 API
 */

// 导出管理器
export { DatabaseManager } from './manager.ts';

// 导出类型
export type {
  DatabaseConfig,
  DatabaseType,
  DatabaseAdapter,
} from './types.ts';

// 导出适配器
export {
  SQLiteAdapter,
  PostgreSQLAdapter,
  MySQLAdapter,
  MongoDBAdapter,
  BaseAdapter,
} from './adapters/mod.ts';

// 导出查询构建器
export {
  SQLQueryBuilder,
  MongoQueryBuilder,
} from './query/mod.ts';

// 导出 ORM/ODM 模型
export {
  SQLModel,
  MongoModel,
  type WhereCondition,
  type MongoWhereCondition,
} from './orm/mod.ts';

// 导出迁移管理
export {
  MigrationManager,
  type Migration,
  type MigrationConfig,
  type MigrationStatus,
} from './migration/mod.ts';

// 导出数据库访问辅助函数
export {
  initDatabase,
  getDatabase,
  getDatabaseManager,
  isDatabaseInitialized,
  closeDatabase,
} from './access.ts';

