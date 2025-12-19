/**
 * MongoDB 查询构建器
 * 用于 MongoDB 文档数据库
 */

import type { DatabaseAdapter } from '../types.ts';
import type { MongoDBAdapter } from '../adapters/mongodb.ts';

/**
 * MongoDB 查询构建器类
 * 提供链式调用的 MongoDB 查询构建 API
 */
export class MongoQueryBuilder {
  private adapter: MongoDBAdapter;
  private collection: string = '';
  private filter: any = {};
  private options: any = {};

  /**
   * 构造函数
   * @param adapter 数据库适配器实例（必须是 MongoDBAdapter）
   */
  constructor(adapter: DatabaseAdapter) {
    // 类型断言：MongoDB 查询构建器只能用于 MongoDBAdapter
    this.adapter = adapter as MongoDBAdapter;
  }

  /**
   * 指定集合名称
   * @param collection 集合名称
   * @returns 查询构建器实例（支持链式调用）
   */
  from(collection: string): this {
    this.collection = collection;
    return this;
  }

  /**
   * 设置查询过滤器
   * @param filter 查询过滤器对象
   * @returns 查询构建器实例（支持链式调用）
   */
  find(filter: any): this {
    this.filter = filter;
    return this;
  }

  /**
   * 添加等于条件
   * @param field 字段名
   * @param value 值
   * @returns 查询构建器实例（支持链式调用）
   */
  eq(field: string, value: any): this {
    this.filter[field] = value;
    return this;
  }

  /**
   * 添加大于条件
   * @param field 字段名
   * @param value 值
   * @returns 查询构建器实例（支持链式调用）
   */
  gt(field: string, value: any): this {
    if (!this.filter[field]) {
      this.filter[field] = {};
    }
    this.filter[field].$gt = value;
    return this;
  }

  /**
   * 添加小于条件
   * @param field 字段名
   * @param value 值
   * @returns 查询构建器实例（支持链式调用）
   */
  lt(field: string, value: any): this {
    if (!this.filter[field]) {
      this.filter[field] = {};
    }
    this.filter[field].$lt = value;
    return this;
  }

  /**
   * 添加大于等于条件
   * @param field 字段名
   * @param value 值
   * @returns 查询构建器实例（支持链式调用）
   */
  gte(field: string, value: any): this {
    if (!this.filter[field]) {
      this.filter[field] = {};
    }
    this.filter[field].$gte = value;
    return this;
  }

  /**
   * 添加小于等于条件
   * @param field 字段名
   * @param value 值
   * @returns 查询构建器实例（支持链式调用）
   */
  lte(field: string, value: any): this {
    if (!this.filter[field]) {
      this.filter[field] = {};
    }
    this.filter[field].$lte = value;
    return this;
  }

  /**
   * 添加不等于条件
   * @param field 字段名
   * @param value 值
   * @returns 查询构建器实例（支持链式调用）
   */
  ne(field: string, value: any): this {
    if (!this.filter[field]) {
      this.filter[field] = {};
    }
    this.filter[field].$ne = value;
    return this;
  }

  /**
   * 添加 IN 条件
   * @param field 字段名
   * @param values 值数组
   * @returns 查询构建器实例（支持链式调用）
   */
  in(field: string, values: any[]): this {
    if (!this.filter[field]) {
      this.filter[field] = {};
    }
    this.filter[field].$in = values;
    return this;
  }

  /**
   * 添加排序
   * @param sort 排序对象，例如 { field: 1 } 或 { field: -1 }
   * @returns 查询构建器实例（支持链式调用）
   */
  sort(sort: any): this {
    this.options.sort = sort;
    return this;
  }

  /**
   * 添加限制数量
   * @param count 限制的记录数
   * @returns 查询构建器实例（支持链式调用）
   */
  limit(count: number): this {
    this.options.limit = count;
    return this;
  }

  /**
   * 添加偏移量
   * @param count 偏移的记录数
   * @returns 查询构建器实例（支持链式调用）
   */
  skip(count: number): this {
    this.options.skip = count;
    return this;
  }

  /**
   * 获取执行器对象，支持链式调用 insert、update、delete 等方法
   * @returns 执行器对象
   * 
   * @example
   * // 插入
   * await builder.from('users').execute().insert({ name: 'John' });
   * 
   * // 更新
   * await builder.from('users').find({ id: 1 }).execute().update({ name: 'Jane' });
   * 
   * // 删除
   * await builder.from('users').find({ id: 1 }).execute().delete();
   */
  execute(): MongoExecutor {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }
    return new MongoExecutor(this.adapter, this.collection, this.filter);
  }

  /**
   * 执行查询并返回所有结果
   * @returns 查询结果数组
   * 
   * @example
   * const users = await builder.from('users').find({ age: { $gt: 18 } }).query();
   */
  async query<T = any>(): Promise<T[]> {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }
    return await (this.adapter as any).query(this.collection, this.filter, this.options) as T[];
  }

  /**
   * 执行查询并返回第一条结果
   * @returns 查询结果或 null
   * 
   * @example
   * const user = await builder.from('users').find({ id: 1 }).queryOne();
   */
  async queryOne<T = any>(): Promise<T | null> {
    this.options.limit = 1;
    const results = await this.query<T>();
    return results[0] || null;
  }
}

/**
 * MongoDB 执行器类
 * 提供 insert、update、delete 等操作的链式调用
 */
class MongoExecutor {
  private adapter: MongoDBAdapter;
  private collection: string;
  private filter: any;

  constructor(adapter: MongoDBAdapter, collection: string, filter: any) {
    this.adapter = adapter;
    this.collection = collection;
    this.filter = filter;
  }

  /**
   * 插入单个文档
   * @param data 要插入的文档数据
   * @returns 插入结果
   * 
   * @example
   * await builder.from('users').execute().insert({ name: 'John', age: 25 });
   */
  async insert(data: any): Promise<any> {
    return await (this.adapter as any).execute('insert', this.collection, data);
  }

  /**
   * 插入多个文档
   * @param data 要插入的文档数组
   * @returns 插入结果
   * 
   * @example
   * await builder.from('users').execute().insertMany([{ name: 'John' }, { name: 'Jane' }]);
   */
  async insertMany(data: any[]): Promise<any> {
    return await (this.adapter as any).execute('insertMany', this.collection, data);
  }

  /**
   * 更新单个文档（基于当前过滤器）
   * @param update 要更新的数据对象
   * @returns 更新结果
   * 
   * @example
   * await builder.from('users').find({ id: 1 }).execute().update({ name: 'Jane' });
   */
  async update(update: any): Promise<any> {
    return await (this.adapter as any).execute('update', this.collection, {
      filter: this.filter,
      update,
    });
  }

  /**
   * 更新多个文档（基于当前过滤器）
   * @param update 要更新的数据对象
   * @returns 更新结果
   * 
   * @example
   * await builder.from('users').find({ status: 'active' }).execute().updateMany({ status: 'inactive' });
   */
  async updateMany(update: any): Promise<any> {
    return await (this.adapter as any).execute('updateMany', this.collection, {
      filter: this.filter,
      update,
    });
  }

  /**
   * 删除单个文档（基于当前过滤器）
   * @returns 删除结果
   * 
   * @example
   * await builder.from('users').find({ id: 1 }).execute().delete();
   */
  async delete(): Promise<any> {
    return await (this.adapter as any).execute('delete', this.collection, {
      filter: this.filter,
    });
  }

  /**
   * 删除多个文档（基于当前过滤器）
   * @returns 删除结果
   * 
   * @example
   * await builder.from('users').find({ status: 'deleted' }).execute().deleteMany();
   */
  async deleteMany(): Promise<any> {
    return await (this.adapter as any).execute('deleteMany', this.collection, {
      filter: this.filter,
    });
  }

  /**
   * 获取查询过滤器（用于调试）
   * @returns 过滤器对象
   */
  getFilter(): any {
    return this.filter;
  }

  /**
   * 获取查询选项（用于调试）
   * @returns 选项对象
   */
  getOptions(): any {
    return this.options;
  }
}

