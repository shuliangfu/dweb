/**
 * SQL 查询构建器
 * 用于 SQLite、PostgreSQL、MySQL
 */

import type { DatabaseAdapter } from '../types.ts';

/**
 * SQL 查询构建器类
 * 提供链式调用的 SQL 查询构建 API
 */
export class SQLQueryBuilder {
  private adapter: DatabaseAdapter;
  private query: string = '';
  private params: any[] = [];
  private table: string = '';

  /**
   * 构造函数
   * @param adapter 数据库适配器实例
   */
  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  /**
   * 选择字段
   * @param columns 要查询的字段数组
   * @returns 查询构建器实例（支持链式调用）
   */
  select(columns: string[]): this {
    this.query = `SELECT ${columns.join(', ')}`;
    return this;
  }

  /**
   * 指定表名
   * @param table 表名
   * @returns 查询构建器实例（支持链式调用）
   */
  from(table: string): this {
    this.table = table;
    this.query += ` FROM ${table}`;
    return this;
  }

  /**
   * 添加 WHERE 条件
   * @param condition WHERE 条件字符串（支持占位符 ?）
   * @param params 参数数组（用于占位符替换）
   * @returns 查询构建器实例（支持链式调用）
   */
  where(condition: string, params?: any[]): this {
    if (this.query.includes('WHERE')) {
      this.query += ` AND ${condition}`;
    } else {
      this.query += ` WHERE ${condition}`;
    }
    if (params) {
      this.params.push(...params);
    }
    return this;
  }

  /**
   * 添加 OR WHERE 条件
   * @param condition WHERE 条件字符串
   * @param params 参数数组
   * @returns 查询构建器实例（支持链式调用）
   */
  orWhere(condition: string, params?: any[]): this {
    if (this.query.includes('WHERE')) {
      this.query += ` OR ${condition}`;
    } else {
      this.query += ` WHERE ${condition}`;
    }
    if (params) {
      this.params.push(...params);
    }
    return this;
  }

  /**
   * 添加 JOIN 子句
   * @param table 要连接的表名
   * @param condition JOIN 条件
   * @param type JOIN 类型（INNER、LEFT、RIGHT、FULL）
   * @returns 查询构建器实例（支持链式调用）
   */
  join(table: string, condition: string, type: string = 'INNER'): this {
    this.query += ` ${type} JOIN ${table} ON ${condition}`;
    return this;
  }

  /**
   * 添加 LEFT JOIN
   */
  leftJoin(table: string, condition: string): this {
    return this.join(table, condition, 'LEFT');
  }

  /**
   * 添加 RIGHT JOIN
   */
  rightJoin(table: string, condition: string): this {
    return this.join(table, condition, 'RIGHT');
  }

  /**
   * 添加排序
   * @param column 排序列
   * @param direction 排序方向（ASC 或 DESC）
   * @returns 查询构建器实例（支持链式调用）
   */
  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    if (this.query.includes('ORDER BY')) {
      this.query += `, ${column} ${direction}`;
    } else {
      this.query += ` ORDER BY ${column} ${direction}`;
    }
    return this;
  }

  /**
   * 添加限制数量
   * @param count 限制的记录数
   * @returns 查询构建器实例（支持链式调用）
   */
  limit(count: number): this {
    this.query += ` LIMIT ${count}`;
    return this;
  }

  /**
   * 添加偏移量
   * @param count 偏移的记录数
   * @returns 查询构建器实例（支持链式调用）
   */
  offset(count: number): this {
    this.query += ` OFFSET ${count}`;
    return this;
  }

  /**
   * 插入数据
   * @param table 表名
   * @param data 要插入的数据对象
   * @returns 查询构建器实例（支持链式调用）
   */
  insert(table: string, data: Record<string, any>): this {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => '?').join(', ');
    this.query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    this.params = values;
    this.table = table;
    return this;
  }

  /**
   * 更新数据
   * @param table 表名
   * @param data 要更新的数据对象
   * @returns 查询构建器实例（支持链式调用）
   */
  update(table: string, data: Record<string, any>): this {
    const setClause = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    this.query = `UPDATE ${table} SET ${setClause}`;
    this.params = Object.values(data);
    this.table = table;
    return this;
  }

  /**
   * 删除数据
   * @param table 表名
   * @returns 查询构建器实例（支持链式调用）
   */
  delete(table: string): this {
    this.query = `DELETE FROM ${table}`;
    this.table = table;
    return this;
  }

  /**
   * 执行查询并返回所有结果
   * @returns 查询结果数组
   */
  async execute<T = any>(): Promise<T[]> {
    return await this.adapter.query(this.query, this.params) as T[];
  }

  /**
   * 执行查询并返回第一条结果
   * @returns 查询结果或 null
   */
  async executeOne<T = any>(): Promise<T | null> {
    const results = await this.execute<T>();
    return results[0] || null;
  }

  /**
   * 执行更新/插入/删除操作
   * @returns 执行结果（包含影响行数等信息）
   */
  async executeUpdate(): Promise<any> {
    return await this.adapter.execute(this.query, this.params);
  }

  /**
   * 获取构建的 SQL 语句（用于调试）
   * @returns SQL 语句字符串
   */
  toSQL(): string {
    return this.query;
  }

  /**
   * 获取参数数组（用于调试）
   * @returns 参数数组
   */
  getParams(): any[] {
    return this.params;
  }
}

