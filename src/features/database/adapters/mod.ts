/**
 * 数据库适配器模块入口
 * 
 * 注意：SQLiteAdapter 和 MySQLAdapter 使用 https:// 导入，JSR 不支持
 * 如果需要使用这些适配器，请直接从适配器文件导入：
 * import { SQLiteAdapter } from '@dreamer/dweb/features/database/adapters/sqlite';
 * import { MySQLAdapter } from '@dreamer/dweb/features/database/adapters/mysql';
 */

export { BaseAdapter } from './base.ts';
// export { SQLiteAdapter } from './sqlite.ts';  // 使用 https:// 导入，JSR 不支持
export { PostgreSQLAdapter } from './postgresql.ts';
// export { MySQLAdapter } from './mysql.ts';  // 使用 https:// 导入，JSR 不支持
export { MongoDBAdapter } from './mongodb.ts';

