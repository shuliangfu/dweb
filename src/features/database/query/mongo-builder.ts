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
   * 执行查询并返回所有结果
   * @returns 查询结果数组
   */
  async execute<T = any>(): Promise<T[]> {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }
    // MongoDB 适配器的 query 方法签名：query(collection: string, filter?: any, options?: any)
    return await (this.adapter as any).query(this.collection, this.filter, this.options) as T[];
  }

  /**
   * 执行查询并返回第一条结果
   * @returns 查询结果或 null
   */
  async executeOne<T = any>(): Promise<T | null> {
    this.options.limit = 1;
    const results = await this.execute<T>();
    return results[0] || null;
  }

  /**
   * 插入单个文档
   * @param data 要插入的文档数据
   * @returns 插入结果
   */
  async insert(data: any): Promise<any> {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }
    return await (this.adapter as any).execute('insert', this.collection, data);
  }

  /**
   * 插入多个文档
   * @param data 要插入的文档数组
   * @returns 插入结果
   */
  async insertMany(data: any[]): Promise<any> {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }
    return await (this.adapter as any).execute('insertMany', this.collection, data);
  }

  /**
   * 更新单个文档
   * @param update 要更新的数据对象
   * @returns 更新结果
   */
  async update(update: any): Promise<any> {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }
    return await (this.adapter as any).execute('update', this.collection, {
      filter: this.filter,
      update,
    });
  }

  /**
   * 更新多个文档
   * @param update 要更新的数据对象
   * @returns 更新结果
   */
  async updateMany(update: any): Promise<any> {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }
    return await (this.adapter as any).execute('updateMany', this.collection, {
      filter: this.filter,
      update,
    });
  }

  /**
   * 删除单个文档
   * @returns 删除结果
   */
  async delete(): Promise<any> {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }
    return await (this.adapter as any).execute('delete', this.collection, {
      filter: this.filter,
    });
  }

  /**
   * 删除多个文档
   * @returns 删除结果
   */
  async deleteMany(): Promise<any> {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }
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

