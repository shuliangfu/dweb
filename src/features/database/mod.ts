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

// 查询构建器、ORM/ODM、迁移管理将在后续阶段实现
// export { SQLQueryBuilder, MongoQueryBuilder } from './query/mod.ts';
// export { SQLModel, MongoModel } from './orm/mod.ts';
// export { MigrationManager, type Migration } from './migration/mod.ts';

