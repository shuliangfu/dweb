/**
 * ORM/ODM 模块入口
 * 导出 SQL 和 MongoDB 模型基类
 */

export { SQLModel } from './sql-model.ts';
export type { WhereCondition } from './sql-model.ts';

export { MongoModel } from './mongo-model.ts';
export type { MongoWhereCondition } from './mongo-model.ts';

