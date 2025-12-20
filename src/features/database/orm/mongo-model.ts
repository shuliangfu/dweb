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

  /**
   * 查找单条记录（find 的别名，更符合常见习惯）
   * @param condition 查询条件（可以是 ID、条件对象）
   * @param fields 要查询的字段数组（可选，用于字段投影）
   * @returns 模型实例或 null
   * 
   * @example
   * const user = await User.findOne('507f1f77bcf86cd799439011');
   * const user = await User.findOne({ email: 'user@example.com' });
   */
  static async findOne<T extends typeof MongoModel>(
    this: T,
    condition: MongoWhereCondition | string,
    fields?: string[],
  ): Promise<InstanceType<T> | null> {
    return await this.find(condition, fields);
  }

  /**
   * 通过主键 ID 查找记录
   * @param id 主键值
   * @param fields 要查询的字段数组（可选，用于字段投影）
   * @returns 模型实例或 null
   * 
   * @example
   * const user = await User.findById('507f1f77bcf86cd799439011');
   * const user = await User.findById('507f1f77bcf86cd799439011', ['_id', 'name', 'email']);
   */
  static async findById<T extends typeof MongoModel>(
    this: T,
    id: string,
    fields?: string[],
  ): Promise<InstanceType<T> | null> {
    return await this.find(id, fields);
  }

  /**
   * 批量更新记录
   * @param condition 查询条件（可以是 ID、条件对象）
   * @param data 要更新的数据对象
   * @returns 更新的记录数
   * 
   * @example
   * await User.updateMany({ status: 'active' }, { lastLogin: new Date() });
   * await User.updateMany({ age: { $lt: 18 } }, { isMinor: true });
   */
  static async updateMany(
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

    const result = await adapter.execute('updateMany', this.collectionName, {
      filter,
      update: data,
    });

    // MongoDB updateMany 返回结果包含 modifiedCount
    if (result && typeof result === 'object' && 'modifiedCount' in result) {
      return (result as any).modifiedCount || 0;
    }
    return 0;
  }

  /**
   * 批量删除记录
   * @param condition 查询条件（可以是 ID、条件对象）
   * @returns 删除的记录数
   * 
   * @example
   * await User.deleteMany({ status: 'deleted' });
   * await User.deleteMany({ age: { $lt: 18 } });
   */
  static async deleteMany(
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

    const result = await adapter.execute('deleteMany', this.collectionName, {
      filter,
    });

    // MongoDB deleteMany 返回结果包含 deletedCount
    if (result && typeof result === 'object' && 'deletedCount' in result) {
      return (result as any).deletedCount || 0;
    }
    return 0;
  }

  /**
   * 统计符合条件的记录数量
   * @param condition 查询条件（可选，不提供则统计所有记录）
   * @returns 记录数量
   * 
   * @example
   * const total = await User.count();
   * const activeUsers = await User.count({ status: 'active' });
   * const adults = await User.count({ age: { $gte: 18 } });
   */
  static async count(
    condition: MongoWhereCondition = {},
  ): Promise<number> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    const db = (adapter as any).getDatabase();
    
    if (!db) {
      throw new Error('Database not connected');
    }

    try {
      const count = await db.collection(this.collectionName).countDocuments(condition);
      return count;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB count error: ${message}`);
    }
  }

  /**
   * 检查记录是否存在
   * @param condition 查询条件（可以是 ID、条件对象）
   * @returns 是否存在
   * 
   * @example
   * const exists = await User.exists('507f1f77bcf86cd799439011');
   * const exists = await User.exists({ email: 'user@example.com' });
   */
  static async exists(
    condition: MongoWhereCondition | string,
  ): Promise<boolean> {
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

    const db = (adapter as any).getDatabase();
    
    if (!db) {
      throw new Error('Database not connected');
    }

    try {
      const count = await db.collection(this.collectionName).countDocuments(filter, { limit: 1 });
      return count > 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB exists error: ${message}`);
    }
  }

  /**
   * 批量创建记录
   * @param dataArray 要插入的数据对象数组
   * @returns 创建的模型实例数组
   * 
   * @example
   * const users = await User.createMany([
   *   { name: 'John', email: 'john@example.com' },
   *   { name: 'Jane', email: 'jane@example.com' }
   * ]);
   */
  static async createMany<T extends typeof MongoModel>(
    this: T,
    dataArray: Record<string, any>[],
  ): Promise<InstanceType<T>[]> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    const result = await adapter.execute('insertMany', this.collectionName, dataArray);

    // MongoDB insertMany 返回结果包含 insertedIds
    const insertedIds: any[] = [];
    if (result && typeof result === 'object' && 'insertedIds' in result) {
      insertedIds.push(...Object.values((result as any).insertedIds));
    }

    // 如果有插入的 ID，重新查询获取完整记录
    if (insertedIds.length > 0) {
      const instances = await this.findAll({ [this.primaryKey]: { $in: insertedIds } });
      return instances as InstanceType<T>[];
    }

    // 否则返回包含插入数据的实例数组
    return dataArray.map((data) => {
      const instance = new (this as any)();
      Object.assign(instance, data);
      return instance as InstanceType<T>;
    });
  }

  /**
   * 分页查询
   * @param condition 查询条件（可选）
   * @param page 页码（从 1 开始）
   * @param pageSize 每页数量
   * @param fields 要查询的字段数组（可选，用于字段投影）
   * @returns 分页结果对象，包含 data（数据数组）、total（总记录数）、page、pageSize、totalPages
   * 
   * @example
   * const result = await User.paginate({ status: 'active' }, 1, 10);
   * console.log(result.data); // 数据数组
   * console.log(result.total); // 总记录数
   * console.log(result.totalPages); // 总页数
   */
  static async paginate<T extends typeof MongoModel>(
    this: T,
    condition: MongoWhereCondition = {},
    page: number = 1,
    pageSize: number = 10,
    fields?: string[],
  ): Promise<{
    data: InstanceType<T>[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    const db = (adapter as any).getDatabase();
    
    if (!db) {
      throw new Error('Database not connected');
    }

    // 确保页码和每页数量有效
    page = Math.max(1, Math.floor(page));
    pageSize = Math.max(1, Math.floor(pageSize));

    // 计算跳过数量
    const skip = (page - 1) * pageSize;

    // 统计总数
    const total = await this.count(condition);

    // 构建查询选项
    const projection = this.buildProjection(fields);
    const options: any = {
      skip,
      limit: pageSize,
    };
    if (Object.keys(projection).length > 0) {
      options.projection = projection;
    }

    // 查询数据
    const results = await adapter.query(this.collectionName, condition, options);

    const data = results.map((row: any) => {
      const instance = new (this as any)();
      Object.assign(instance, row);
      return instance as InstanceType<T>;
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 增加字段值
   * @param condition 查询条件（可以是 ID、条件对象）
   * @param field 要增加的字段名
   * @param amount 增加的数量（默认为 1）
   * @returns 更新的记录数
   * 
   * @example
   * await User.increment('507f1f77bcf86cd799439011', 'views', 1);
   * await User.increment({ status: 'active' }, 'score', 10);
   */
  static async increment(
    condition: MongoWhereCondition | string,
    field: string,
    amount: number = 1,
  ): Promise<number> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    if (typeof condition === 'string') {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    const db = (adapter as any).getDatabase();
    if (!db) {
      throw new Error('Database not connected');
    }

    try {
      const result = await db.collection(this.collectionName).updateOne(
        filter,
        { $inc: { [field]: amount } }
      );
      return result.modifiedCount || 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB increment error: ${message}`);
    }
  }

  /**
   * 减少字段值
   * @param condition 查询条件（可以是 ID、条件对象）
   * @param field 要减少的字段名
   * @param amount 减少的数量（默认为 1）
   * @returns 更新的记录数
   * 
   * @example
   * await User.decrement('507f1f77bcf86cd799439011', 'views', 1);
   * await User.decrement({ status: 'active' }, 'score', 10);
   */
  static async decrement(
    condition: MongoWhereCondition | string,
    field: string,
    amount: number = 1,
  ): Promise<number> {
    return await this.increment(condition, field, -amount);
  }

  /**
   * 查找并更新记录
   * @param condition 查询条件（可以是 ID、条件对象）
   * @param data 要更新的数据对象
   * @param options 更新选项（可选，如 { returnDocument: 'after' }）
   * @returns 更新后的模型实例或 null
   * 
   * @example
   * const user = await User.findOneAndUpdate(
   *   '507f1f77bcf86cd799439011',
   *   { name: 'lisi' },
   *   { returnDocument: 'after' }
   * );
   */
  static async findOneAndUpdate<T extends typeof MongoModel>(
    this: T,
    condition: MongoWhereCondition | string,
    data: Record<string, any>,
    options: { returnDocument?: 'before' | 'after' } = { returnDocument: 'after' },
  ): Promise<InstanceType<T> | null> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    if (typeof condition === 'string') {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    const db = (adapter as any).getDatabase();
    if (!db) {
      throw new Error('Database not connected');
    }

    try {
      const result = await db.collection(this.collectionName).findOneAndUpdate(
        filter,
        { $set: data },
        { returnDocument: options.returnDocument || 'after' }
      );

      if (!result) {
        return null;
      }

      const instance = new (this as any)();
      Object.assign(instance, result);
      return instance as InstanceType<T>;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB findOneAndUpdate error: ${message}`);
    }
  }

  /**
   * 查找并删除记录
   * @param condition 查询条件（可以是 ID、条件对象）
   * @returns 删除的模型实例或 null
   * 
   * @example
   * const user = await User.findOneAndDelete('507f1f77bcf86cd799439011');
   * const user = await User.findOneAndDelete({ email: 'user@example.com' });
   */
  static async findOneAndDelete<T extends typeof MongoModel>(
    this: T,
    condition: MongoWhereCondition | string,
  ): Promise<InstanceType<T> | null> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    if (typeof condition === 'string') {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    const db = (adapter as any).getDatabase();
    if (!db) {
      throw new Error('Database not connected');
    }

    try {
      const result = await db.collection(this.collectionName).findOneAndDelete(filter);

      if (!result) {
        return null;
      }

      const instance = new (this as any)();
      Object.assign(instance, result);
      return instance as InstanceType<T>;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB findOneAndDelete error: ${message}`);
    }
  }

  /**
   * 更新或插入记录（如果不存在则插入，存在则更新）
   * @param condition 查询条件（可以是 ID、条件对象）
   * @param data 要更新或插入的数据对象
   * @returns 更新后的模型实例
   * 
   * @example
   * const user = await User.upsert(
   *   { email: 'user@example.com' },
   *   { name: 'John', email: 'user@example.com', age: 25 }
   * );
   */
  static async upsert<T extends typeof MongoModel>(
    this: T,
    condition: MongoWhereCondition | string,
    data: Record<string, any>,
  ): Promise<InstanceType<T>> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    if (typeof condition === 'string') {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    const db = (adapter as any).getDatabase();
    if (!db) {
      throw new Error('Database not connected');
    }

    try {
      const result = await db.collection(this.collectionName).findOneAndUpdate(
        filter,
        { $set: data },
        { upsert: true, returnDocument: 'after' }
      );

      const instance = new (this as any)();
      Object.assign(instance, result);
      return instance as InstanceType<T>;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB upsert error: ${message}`);
    }
  }

  /**
   * 获取字段的唯一值列表
   * @param field 字段名
   * @param condition 查询条件（可选）
   * @returns 唯一值数组
   * 
   * @example
   * const statuses = await User.distinct('status');
   * const emails = await User.distinct('email', { age: { $gte: 18 } });
   */
  static async distinct(
    field: string,
    condition: MongoWhereCondition = {},
  ): Promise<any[]> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    const db = (adapter as any).getDatabase();
    
    if (!db) {
      throw new Error('Database not connected');
    }

    try {
      const values = await db.collection(this.collectionName).distinct(field, condition);
      return values;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB distinct error: ${message}`);
    }
  }

  /**
   * 聚合查询
   * @param pipeline 聚合管道数组
   * @returns 聚合结果数组
   * 
   * @example
   * const result = await User.aggregate([
   *   { $match: { status: 'active' } },
   *   { $group: { _id: '$department', count: { $sum: 1 } } }
   * ]);
   */
  static async aggregate(
    pipeline: any[],
  ): Promise<any[]> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    const db = (adapter as any).getDatabase();
    
    if (!db) {
      throw new Error('Database not connected');
    }

    try {
      const results = await db.collection(this.collectionName).aggregate(pipeline).toArray();
      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB aggregate error: ${message}`);
    }
  }
}

