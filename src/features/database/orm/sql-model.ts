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
}

