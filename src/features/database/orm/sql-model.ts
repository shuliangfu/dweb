/**
 * SQL 模型基类
 * 提供 ORM 功能，支持对象条件查询和字段选择
 */

import type { DatabaseAdapter } from '../types.ts';

/**
 * 查询条件类型
 * 支持对象形式的查询条件，包括操作符
 */
export type WhereCondition = {
  [key: string]: any | {
    $gt?: any;
    $lt?: any;
    $gte?: any;
    $lte?: any;
    $ne?: any;
    $in?: any[];
    $like?: string;
  };
};

/**
 * 字段类型
 * 
 * - string: 字符串类型
 * - number: 数字类型（整数或浮点数）
 * - bigint: 大整数类型
 * - decimal: 精确小数类型（用于货币等需要精确计算的场景）
 * - boolean: 布尔类型
 * - date: 日期时间类型
 * - timestamp: 时间戳类型（数字）
 * - array: 数组类型
 * - object: 对象类型
 * - json: JSON 类型（与 object 类似，但更明确）
 * - enum: 枚举类型
 * - uuid: UUID 类型
 * - text: 长文本类型
 * - binary: 二进制数据类型
 * - any: 任意类型
 */
export type FieldType = 
  | 'string' 
  | 'number' 
  | 'bigint' 
  | 'decimal' 
  | 'boolean' 
  | 'date' 
  | 'timestamp' 
  | 'array' 
  | 'object' 
  | 'json' 
  | 'enum' 
  | 'uuid' 
  | 'text' 
  | 'binary' 
  | 'any';

/**
 * 验证规则
 */
export interface ValidationRule {
  required?: boolean; // 必填
  type?: FieldType; // 类型
  min?: number; // 最小值（数字）或最小长度（字符串）
  max?: number; // 最大值（数字）或最大长度（字符串）
  length?: number; // 固定长度（字符串）
  pattern?: RegExp | string; // 正则表达式
  enum?: any[]; // 枚举值
  custom?: (value: any) => boolean | string; // 自定义验证函数，返回 true 或错误信息
  message?: string; // 自定义错误信息
}

/**
 * 字段定义
 */
export interface FieldDefinition {
  type: FieldType;
  enum?: any[]; // 枚举值（当 type 为 'enum' 时使用）
  default?: any; // 默认值
  validate?: ValidationRule; // 验证规则
  get?: (value: any) => any; // Getter 函数
  set?: (value: any) => any; // Setter 函数
}

/**
 * 模型字段定义
 */
export type ModelSchema = {
  [fieldName: string]: FieldDefinition;
};

/**
 * 验证错误
 */
export class ValidationError extends Error {
  field: string;
  
  constructor(
    field: string,
    message: string,
  ) {
    super(`Validation failed for field "${field}": ${message}`);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * SQL 模型基类
 * 所有 SQL 数据库模型都应该继承此类
 */
export abstract class SQLModel {
  /**
   * 表名（子类必须定义）
   */
  static tableName: string;

  /**
   * 主键字段名（默认为 'id'）
   */
  static primaryKey: string = 'id';

  /**
   * 数据库适配器实例（子类需要设置）
   */
  static adapter: DatabaseAdapter | null = null;

  /**
   * 实例数据
   */
  [key: string]: any;

  /**
   * 设置数据库适配器
   * @param adapter 数据库适配器实例
   */
  static setAdapter(adapter: DatabaseAdapter): void {
    this.adapter = adapter;
  }

  /**
   * 将查询条件对象转换为 SQL WHERE 子句
   * @param condition 查询条件对象
   * @returns SQL WHERE 子句和参数数组
   */
  private static buildWhereClause(condition: WhereCondition | number | string): { where: string; params: any[] } {
    // 如果是数字或字符串，作为主键查询
    if (typeof condition === 'number' || typeof condition === 'string') {
      return {
        where: `${this.primaryKey} = ?`,
        params: [condition],
      };
    }

    // 如果是对象，构建 WHERE 子句
    const conditions: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(condition)) {
      if (value === null || value === undefined) {
        conditions.push(`${key} IS NULL`);
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // 处理操作符
        if (value.$gt !== undefined) {
          conditions.push(`${key} > ?`);
          params.push(value.$gt);
        }
        if (value.$lt !== undefined) {
          conditions.push(`${key} < ?`);
          params.push(value.$lt);
        }
        if (value.$gte !== undefined) {
          conditions.push(`${key} >= ?`);
          params.push(value.$gte);
        }
        if (value.$lte !== undefined) {
          conditions.push(`${key} <= ?`);
          params.push(value.$lte);
        }
        if (value.$ne !== undefined) {
          conditions.push(`${key} != ?`);
          params.push(value.$ne);
        }
        if (value.$in !== undefined && Array.isArray(value.$in)) {
          const placeholders = value.$in.map(() => '?').join(', ');
          conditions.push(`${key} IN (${placeholders})`);
          params.push(...value.$in);
        }
        if (value.$like !== undefined) {
          conditions.push(`${key} LIKE ?`);
          params.push(value.$like);
        }
      } else {
        // 普通等值条件
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    }

    return {
      where: conditions.length > 0 ? conditions.join(' AND ') : '1=1',
      params,
    };
  }

  /**
   * 查找单条记录
   * @param condition 查询条件（可以是 ID、条件对象）
   * @param fields 要查询的字段数组（可选）
   * @returns 模型实例或 null
   * 
   * @example
   * const user = await User.find(1);
   * const user = await User.find({ id: 1 });
   * const user = await User.find({ email: 'user@example.com' });
   * const user = await User.find(1, ['id', 'name', 'email']);
   */
  static async find<T extends typeof SQLModel>(
    this: T,
    condition: WhereCondition | number | string,
    fields?: string[],
  ): Promise<InstanceType<T> | null> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const { where, params } = this.buildWhereClause(condition);
    const columns = fields && fields.length > 0 ? fields.join(', ') : '*';

    const sql = `SELECT ${columns} FROM ${this.tableName} WHERE ${where} LIMIT 1`;
    const results = await this.adapter.query(sql, params);

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
   * @param fields 要查询的字段数组（可选）
   * @returns 模型实例数组
   * 
   * @example
   * const users = await User.findAll();
   * const users = await User.findAll({ age: 25 });
   * const users = await User.findAll({ age: { $gt: 18 } });
   * const users = await User.findAll({}, ['id', 'name', 'email']);
   */
  static async findAll<T extends typeof SQLModel>(
    this: T,
    condition: WhereCondition = {},
    fields?: string[],
  ): Promise<InstanceType<T>[]> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const { where, params } = this.buildWhereClause(condition);
    const columns = fields && fields.length > 0 ? fields.join(', ') : '*';

    const sql = `SELECT ${columns} FROM ${this.tableName} WHERE ${where}`;
    const results = await this.adapter.query(sql, params);

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
  static async create<T extends typeof SQLModel>(
    this: T,
    data: Record<string, any>,
  ): Promise<InstanceType<T>> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');

    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    await this.adapter.execute(sql, values);

    // 获取插入的 ID（如果支持）
    let insertedId: any = null;
    try {
      const result = await this.adapter.query(`SELECT last_insert_rowid() as id`, []);
      if (result.length > 0) {
        insertedId = result[0].id;
      }
    } catch {
      // 某些数据库可能不支持 last_insert_rowid，忽略错误
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
    return instance as InstanceType<T>;
  }

  /**
   * 更新记录
   * @param condition 查询条件（可以是 ID、条件对象）
   * @param data 要更新的数据对象
   * @returns 更新的记录数
   * 
   * @example
   * await User.update(1, { name: 'lisi' });
   * await User.update({ id: 1 }, { name: 'lisi' });
   * await User.update({ email: 'user@example.com' }, { name: 'lisi' });
   */
  static async update(
    condition: WhereCondition | number | string,
    data: Record<string, any>,
  ): Promise<number> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const { where, params: whereParams } = this.buildWhereClause(condition);
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${where}`;
    const result = await this.adapter.execute(sql, [...values, ...whereParams]);

    // 返回影响的行数（如果适配器支持）
    if (typeof result === 'number') {
      return result;
    }
    // 某些适配器可能返回对象，尝试获取 affectedRows
    if (result && typeof result === 'object' && 'affectedRows' in result) {
      return (result as any).affectedRows || 0;
    }
    return 0;
  }

  /**
   * 删除记录
   * @param condition 查询条件（可以是 ID、条件对象）
   * @returns 删除的记录数
   * 
   * @example
   * await User.delete(1);
   * await User.delete({ id: 1 });
   * await User.delete({ email: 'user@example.com' });
   */
  static async delete(
    condition: WhereCondition | number | string,
  ): Promise<number> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const { where, params } = this.buildWhereClause(condition);
    const sql = `DELETE FROM ${this.tableName} WHERE ${where}`;
    const result = await this.adapter.execute(sql, params);

    // 返回影响的行数（如果适配器支持）
    if (typeof result === 'number') {
      return result;
    }
    // 某些适配器可能返回对象，尝试获取 affectedRows
    if (result && typeof result === 'object' && 'affectedRows' in result) {
      return (result as any).affectedRows || 0;
    }
    return 0;
  }

  /**
   * 保存当前实例（插入或更新）
   * @returns 保存后的实例
   */
  async save<T extends SQLModel>(this: T): Promise<T> {
    const Model = this.constructor as typeof SQLModel;
    if (!Model.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const primaryKey = (Model.constructor as any).primaryKey || 'id';
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
  async delete<T extends SQLModel>(this: T): Promise<boolean> {
    const Model = this.constructor as typeof SQLModel;
    if (!Model.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const primaryKey = (Model.constructor as any).primaryKey || 'id';
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
   * @param fields 要查询的字段数组（可选）
   * @returns 模型实例或 null
   * 
   * @example
   * const user = await User.findOne(1);
   * const user = await User.findOne({ email: 'user@example.com' });
   */
  static async findOne<T extends typeof SQLModel>(
    this: T,
    condition: WhereCondition | number | string,
    fields?: string[],
  ): Promise<InstanceType<T> | null> {
    return await this.find(condition, fields);
  }

  /**
   * 通过主键 ID 查找记录
   * @param id 主键值
   * @param fields 要查询的字段数组（可选）
   * @returns 模型实例或 null
   * 
   * @example
   * const user = await User.findById(1);
   * const user = await User.findById(1, ['id', 'name', 'email']);
   */
  static async findById<T extends typeof SQLModel>(
    this: T,
    id: number | string,
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
    condition: WhereCondition | number | string,
    data: Record<string, any>,
  ): Promise<number> {
    // updateMany 和 update 在 SQL 中逻辑相同，都是 UPDATE ... WHERE
    return await this.update(condition, data);
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
    condition: WhereCondition | number | string,
  ): Promise<number> {
    // deleteMany 和 delete 在 SQL 中逻辑相同，都是 DELETE ... WHERE
    return await this.delete(condition);
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
    condition: WhereCondition = {},
  ): Promise<number> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const { where, params } = this.buildWhereClause(condition);
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${where}`;
    const results = await this.adapter.query(sql, params);

    if (results.length > 0) {
      return parseInt(results[0].count) || 0;
    }
    return 0;
  }

  /**
   * 检查记录是否存在
   * @param condition 查询条件（可以是 ID、条件对象）
   * @returns 是否存在
   * 
   * @example
   * const exists = await User.exists(1);
   * const exists = await User.exists({ email: 'user@example.com' });
   */
  static async exists(
    condition: WhereCondition | number | string,
  ): Promise<boolean> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const { where, params } = this.buildWhereClause(condition);
    const sql = `SELECT EXISTS(SELECT 1 FROM ${this.tableName} WHERE ${where}) as exists`;
    const results = await this.adapter.query(sql, params);

    if (results.length > 0) {
      // 不同数据库可能返回不同的布尔值表示方式
      const exists = results[0].exists;
      return exists === true || exists === 1 || exists === '1' || exists === 't';
    }
    return false;
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
  static async createMany<T extends typeof SQLModel>(
    this: T,
    dataArray: Record<string, any>[],
  ): Promise<InstanceType<T>[]> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    if (dataArray.length === 0) {
      return [];
    }

    // 获取所有数据的键（假设所有对象有相同的键）
    const keys = Object.keys(dataArray[0]);
    const placeholders = keys.map(() => '?').join(', ');
    
    // 构建批量插入 SQL
    const valuesList = dataArray.map(() => `(${placeholders})`).join(', ');
    const allValues = dataArray.flatMap(data => keys.map(key => data[key]));

    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES ${valuesList}`;
    await this.adapter.execute(sql, allValues);

    // 尝试获取最后插入的 ID（如果支持）
    // 注意：批量插入时，不同数据库获取 ID 的方式不同
    // 这里简化处理，重新查询所有记录
    // 实际应用中可能需要根据业务逻辑优化
    try {
      // 如果有主键且是自增的，尝试获取插入的 ID 范围
      // 这里简化处理，返回包含插入数据的实例数组
      return dataArray.map((data) => {
        const instance = new (this as any)();
        Object.assign(instance, data);
        return instance as InstanceType<T>;
      });
    } catch {
      // 如果获取失败，返回包含插入数据的实例数组
      return dataArray.map((data) => {
        const instance = new (this as any)();
        Object.assign(instance, data);
        return instance as InstanceType<T>;
      });
    }
  }

  /**
   * 分页查询
   * @param condition 查询条件（可选）
   * @param page 页码（从 1 开始）
   * @param pageSize 每页数量
   * @param fields 要查询的字段数组（可选）
   * @returns 分页结果对象，包含 data（数据数组）、total（总记录数）、page、pageSize、totalPages
   * 
   * @example
   * const result = await User.paginate({ status: 'active' }, 1, 10);
   * console.log(result.data); // 数据数组
   * console.log(result.total); // 总记录数
   * console.log(result.totalPages); // 总页数
   */
  static async paginate<T extends typeof SQLModel>(
    this: T,
    condition: WhereCondition = {},
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

    // 确保页码和每页数量有效
    page = Math.max(1, Math.floor(page));
    pageSize = Math.max(1, Math.floor(pageSize));

    // 计算偏移量
    const offset = (page - 1) * pageSize;

    // 统计总数
    const total = await this.count(condition);

    // 构建查询 SQL
    const { where, params } = this.buildWhereClause(condition);
    const columns = fields && fields.length > 0 ? fields.join(', ') : '*';
    const sql = `SELECT ${columns} FROM ${this.tableName} WHERE ${where} LIMIT ? OFFSET ?`;

    const results = await this.adapter.query(sql, [...params, pageSize, offset]);

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
   * await User.increment(1, 'views', 1);
   * await User.increment({ status: 'active' }, 'score', 10);
   */
  static async increment(
    condition: WhereCondition | number | string,
    field: string,
    amount: number = 1,
  ): Promise<number> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const { where, params } = this.buildWhereClause(condition);
    const sql = `UPDATE ${this.tableName} SET ${field} = ${field} + ? WHERE ${where}`;
    const result = await this.adapter.execute(sql, [amount, ...params]);

    if (typeof result === 'number') {
      return result;
    }
    if (result && typeof result === 'object' && 'affectedRows' in result) {
      return (result as any).affectedRows || 0;
    }
    return 0;
  }

  /**
   * 减少字段值
   * @param condition 查询条件（可以是 ID、条件对象）
   * @param field 要减少的字段名
   * @param amount 减少的数量（默认为 1）
   * @returns 更新的记录数
   * 
   * @example
   * await User.decrement(1, 'views', 1);
   * await User.decrement({ status: 'active' }, 'score', 10);
   */
  static async decrement(
    condition: WhereCondition | number | string,
    field: string,
    amount: number = 1,
  ): Promise<number> {
    return await this.increment(condition, field, -amount);
  }

  /**
   * 更新或插入记录（如果不存在则插入，存在则更新）
   * 注意：不同数据库的语法不同，这里使用通用方式实现
   * PostgreSQL: INSERT ... ON CONFLICT ... DO UPDATE
   * MySQL: INSERT ... ON DUPLICATE KEY UPDATE
   * SQLite: INSERT ... ON CONFLICT ... DO UPDATE
   * 
   * @param condition 查询条件（用于判断是否存在，通常包含唯一键）
   * @param data 要更新或插入的数据对象
   * @returns 更新后的模型实例
   * 
   * @example
   * const user = await User.upsert(
   *   { email: 'user@example.com' },
   *   { name: 'John', email: 'user@example.com', age: 25 }
   * );
   */
  static async upsert<T extends typeof SQLModel>(
    this: T,
    condition: WhereCondition,
    data: Record<string, any>,
  ): Promise<InstanceType<T>> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    // 先尝试查找是否存在
    const existing = await this.find(condition);
    
    if (existing) {
      // 如果存在，更新
      await this.update(condition, data);
      // 重新查询获取更新后的记录
      const updated = await this.find(condition);
      if (updated) {
        return updated as InstanceType<T>;
      }
    }

    // 如果不存在，插入
    return await this.create(data);
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
    condition: WhereCondition = {},
  ): Promise<any[]> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const { where, params } = this.buildWhereClause(condition);
    const sql = `SELECT DISTINCT ${field} FROM ${this.tableName} WHERE ${where}`;
    const results = await this.adapter.query(sql, params);

    return results.map((row: any) => row[field]).filter((value: any) => value !== null && value !== undefined);
  }

  /**
   * 关联查询：属于（多对一关系）
   * 例如：Post belongsTo User（一个帖子属于一个用户）
   * @param RelatedModel 关联的模型类
   * @param foreignKey 外键字段名（当前模型中的字段）
   * @param localKey 关联模型的主键字段名（默认为关联模型的 primaryKey）
   * @returns 关联的模型实例或 null
   * 
   * @example
   * class Post extends SQLModel {
   *   static tableName = 'posts';
   *   async user() {
   *     return await this.belongsTo(User, 'user_id', 'id');
   *   }
   * }
   * const post = await Post.find(1);
   * const user = await post.user();
   */
  async belongsTo<T extends typeof SQLModel>(
    RelatedModel: T,
    foreignKey: string,
    localKey?: string,
  ): Promise<InstanceType<T> | null> {
    const Model = this.constructor as typeof SQLModel;
    if (!Model.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const relatedKey = localKey || RelatedModel.primaryKey;
    const foreignValue = (this as any)[foreignKey];

    if (!foreignValue) {
      return null;
    }

    return await RelatedModel.find({ [relatedKey]: foreignValue });
  }

  /**
   * 关联查询：有一个（一对一关系）
   * 例如：User hasOne Profile（一个用户有一个资料）
   * @param RelatedModel 关联的模型类
   * @param foreignKey 外键字段名（关联模型中的字段）
   * @param localKey 当前模型的主键字段名（默认为当前模型的 primaryKey）
   * @returns 关联的模型实例或 null
   * 
   * @example
   * class User extends SQLModel {
   *   static tableName = 'users';
   *   async profile() {
   *     return await this.hasOne(Profile, 'user_id', 'id');
   *   }
   * }
   * const user = await User.find(1);
   * const profile = await user.profile();
   */
  async hasOne<T extends typeof SQLModel>(
    RelatedModel: T,
    foreignKey: string,
    localKey?: string,
  ): Promise<InstanceType<T> | null> {
    const Model = this.constructor as typeof SQLModel;
    if (!Model.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const localKeyValue = localKey || Model.primaryKey;
    const localValue = (this as any)[localKeyValue];

    if (!localValue) {
      return null;
    }

    return await RelatedModel.find({ [foreignKey]: localValue });
  }

  /**
   * 关联查询：有多个（一对多关系）
   * 例如：User hasMany Posts（一个用户有多个帖子）
   * @param RelatedModel 关联的模型类
   * @param foreignKey 外键字段名（关联模型中的字段）
   * @param localKey 当前模型的主键字段名（默认为当前模型的 primaryKey）
   * @returns 关联的模型实例数组
   * 
   * @example
   * class User extends SQLModel {
   *   static tableName = 'users';
   *   async posts() {
   *     return await this.hasMany(Post, 'user_id', 'id');
   *   }
   * }
   * const user = await User.find(1);
   * const posts = await user.posts();
   */
  async hasMany<T extends typeof SQLModel>(
    RelatedModel: T,
    foreignKey: string,
    localKey?: string,
  ): Promise<InstanceType<T>[]> {
    const Model = this.constructor as typeof SQLModel;
    if (!Model.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    const localKeyValue = localKey || Model.primaryKey;
    const localValue = (this as any)[localKeyValue];

    if (!localValue) {
      return [];
    }

    return await RelatedModel.findAll({ [foreignKey]: localValue });
  }
}

