/**
 * MongoDB 模型基类
 * 提供 ODM 功能，支持对象条件查询和字段投影
 */

import type { DatabaseAdapter } from '../types.ts';
import type { MongoDBAdapter } from '../adapters/mongodb.ts';

/**
 * 查询条件类型
 * 支持对象形式的查询条件，包括 MongoDB 操作符
 */
export type MongoWhereCondition = {
  [key: string]: any | {
    $gt?: any;
    $lt?: any;
    $gte?: any;
    $lte?: any;
    $ne?: any;
    $in?: any[];
    $nin?: any[];
    $exists?: boolean;
    $regex?: string | RegExp;
    $options?: string;
  };
};

/**
 * MongoDB 模型基类
 * 所有 MongoDB 模型都应该继承此类
 */
export abstract class MongoModel {
  /**
   * 集合名称（子类必须定义）
   */
  static collectionName: string;

  /**
   * 主键字段名（默认为 '_id'）
   */
  static primaryKey: string = '_id';

  /**
   * 数据库适配器实例（子类需要设置，必须是 MongoDBAdapter）
   */
  static adapter: DatabaseAdapter | null = null;

  /**
   * 实例数据
   */
  [key: string]: any;

  /**
   * 设置数据库适配器
   * @param adapter 数据库适配器实例（必须是 MongoDBAdapter）
   */
  static setAdapter(adapter: DatabaseAdapter): void {
    this.adapter = adapter;
  }

  /**
   * 构建字段投影对象（用于 MongoDB 的字段选择）
   * @param fields 要查询的字段数组
   * @returns MongoDB 投影对象
   */
  private static buildProjection(fields?: string[]): any {
    if (!fields || fields.length === 0) {
      return {};
    }

    const projection: any = {};
    for (const field of fields) {
      projection[field] = 1;
    }
    return projection;
  }

  /**
   * 查找单条记录
   * @param condition 查询条件（可以是 ID、条件对象）
   * @param fields 要查询的字段数组（可选，用于字段投影）
   * @returns 模型实例或 null
   * 
   * @example
   * const user = await User.find('507f1f77bcf86cd799439011');
   * const user = await User.find({ _id: '507f1f77bcf86cd799439011' });
   * const user = await User.find({ email: 'user@example.com' });
   * const user = await User.find('507f1f77bcf86cd799439011', ['_id', 'name', 'email']);
   */
  static async find<T extends typeof MongoModel>(
    this: T,
    condition: MongoWhereCondition | string,
    fields?: string[],
  ): Promise<InstanceType<T> | null> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    // 如果是字符串，作为主键查询
    if (typeof condition === 'string') {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    const projection = this.buildProjection(fields);
    const options: any = { limit: 1 };
    if (Object.keys(projection).length > 0) {
      options.projection = projection;
    }

    const results = await adapter.query(this.collectionName, filter, options);

    if (results.length === 0) {
      return null;
    }

    const instance = new (this as any)();
    Object.assign(instance, results[0]);
    return instance as InstanceType<T>;
  }

  /**
   * 查找多条记录
   * @param condition 查询条件对象（可选，不提供则查询所有）
   * @param fields 要查询的字段数组（可选，用于字段投影）
   * @returns 模型实例数组
   * 
   * @example
   * const users = await User.findAll();
   * const users = await User.findAll({ age: 25 });
   * const users = await User.findAll({ age: { $gt: 18 } });
   * const users = await User.findAll({}, ['_id', 'name', 'email']);
   */
  static async findAll<T extends typeof MongoModel>(
    this: T,
    condition: MongoWhereCondition = {},
    fields?: string[],
  ): Promise<InstanceType<T>[]> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    const projection = this.buildProjection(fields);
    const options: any = {};
    if (Object.keys(projection).length > 0) {
      options.projection = projection;
    }

    const results = await adapter.query(this.collectionName, condition, options);

    return results.map((row: any) => {
      const instance = new (this as any)();
      Object.assign(instance, row);
      return instance as InstanceType<T>;
    });
  }

  /**
   * 创建新记录
   * @param data 要插入的数据对象
   * @returns 创建的模型实例
   * 
   * @example
   * const user = await User.create({ name: 'John', email: 'john@example.com' });
   */
  static async create<T extends typeof MongoModel>(
    this: T,
    data: Record<string, any>,
  ): Promise<InstanceType<T>> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    const result = await adapter.execute('insert', this.collectionName, data);

    // MongoDB insert 返回结果包含 insertedId
    let insertedId: any = null;
    if (result && typeof result === 'object') {
      if ('insertedId' in result) {
        insertedId = (result as any).insertedId;
      } else if ('_id' in data) {
        insertedId = data._id;
      }
    }

    // 如果插入成功且有 ID，重新查询获取完整记录
    if (insertedId) {
      const instance = await this.find(insertedId);
      if (instance) {
        return instance as InstanceType<T>;
      }
    }

    // 否则返回包含插入数据的实例
    const instance = new (this as any)();
    Object.assign(instance, data);
    if (insertedId) {
      instance[this.primaryKey] = insertedId;
    }
    return instance as InstanceType<T>;
  }

  /**
   * 更新记录
   * @param condition 查询条件（可以是 ID、条件对象）
   * @param data 要更新的数据对象
   * @returns 更新的记录数
   * 
   * @example
   * await User.update('507f1f77bcf86cd799439011', { name: 'lisi' });
   * await User.update({ _id: '507f1f77bcf86cd799439011' }, { name: 'lisi' });
   * await User.update({ email: 'user@example.com' }, { name: 'lisi' });
   */
  static async update(
    condition: MongoWhereCondition | string,
    data: Record<string, any>,
  ): Promise<number> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    // 如果是字符串，作为主键查询
    if (typeof condition === 'string') {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    const result = await adapter.execute('update', this.collectionName, {
      filter,
      update: { $set: data },
    });

    // MongoDB update 返回结果包含 modifiedCount
    if (result && typeof result === 'object' && 'modifiedCount' in result) {
      return (result as any).modifiedCount || 0;
    }
    return 0;
  }

  /**
   * 删除记录
   * @param condition 查询条件（可以是 ID、条件对象）
   * @returns 删除的记录数
   * 
   * @example
   * await User.delete('507f1f77bcf86cd799439011');
   * await User.delete({ _id: '507f1f77bcf86cd799439011' });
   * await User.delete({ email: 'user@example.com' });
   */
  static async delete(
    condition: MongoWhereCondition | string,
  ): Promise<number> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    // 如果是字符串，作为主键查询
    if (typeof condition === 'string') {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    const result = await adapter.execute('delete', this.collectionName, {
      filter,
    });

    // MongoDB delete 返回结果包含 deletedCount
    if (result && typeof result === 'object' && 'deletedCount' in result) {
      return (result as any).deletedCount || 0;
    }
    return 0;
  }

  /**
   * 保存当前实例（插入或更新）
   * @returns 保存后的实例
   */
  async save<T extends MongoModel>(this: T): Promise<T> {
    const Model = this.constructor as typeof MongoModel;
    if (!Model.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const primaryKey = (Model.constructor as any).primaryKey || '_id';
    const id = (this as any)[primaryKey];

    if (id) {
      // 更新现有记录
      await Model.update(id, this);
      return this;
    } else {
      // 插入新记录
      const instance = await Model.create(this);
      Object.assign(this, instance);
      return this;
    }
  }

  /**
   * 删除当前实例
   * @returns 是否删除成功
   */
  async delete<T extends MongoModel>(this: T): Promise<boolean> {
    const Model = this.constructor as typeof MongoModel;
    if (!Model.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const primaryKey = (Model.constructor as any).primaryKey || '_id';
    const id = (this as any)[primaryKey];

    if (!id) {
      throw new Error('Cannot delete instance without primary key');
    }

    const deleted = await Model.delete(id);
    return deleted > 0;
  }
}

