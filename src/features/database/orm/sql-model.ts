/**
 * SQL 模型基类
 * 提供 ORM 功能，支持对象条件查询和字段选择
 */

import type { DatabaseAdapter } from "../types.ts";
import type { IndexDefinitions } from "../types/index.ts";
import type { CacheAdapter } from "../cache/cache-adapter.ts";

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
  | "string"
  | "number"
  | "bigint"
  | "decimal"
  | "boolean"
  | "date"
  | "timestamp"
  | "array"
  | "object"
  | "json"
  | "enum"
  | "uuid"
  | "text"
  | "binary"
  | "any";

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
    this.name = "ValidationError";
    this.field = field;
  }
}

/**
 * 生命周期钩子函数类型
 */
export type LifecycleHook<T = any> = (
  instance: T,
  options?: any,
) => Promise<void> | void;

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
  static primaryKey: string = "id";

  /**
   * 数据库适配器实例（子类需要设置）
   */
  static adapter: DatabaseAdapter | null = null;

  /**
   * 是否启用软删除（默认为 false）
   * 启用后，删除操作会设置 deletedAt 字段而不是真正删除记录
   */
  static softDelete: boolean = false;

  /**
   * 软删除字段名（默认为 'deletedAt'）
   * 可以自定义为 'deleted_at' 等
   */
  static deletedAtField: string = "deletedAt";

  /**
   * 是否自动管理时间戳
   * - false: 不启用时间戳
   * - true: 启用时间戳，使用默认字段名（createdAt, updatedAt）
   * - 对象: 启用时间戳并自定义字段名，例如 { createdAt: 'created_at', updatedAt: 'updated_at' }
   *
   * @example
   * static timestamps = true; // 使用默认字段名
   * static timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' }; // 自定义字段名
   */
  static timestamps: boolean | { createdAt?: string; updatedAt?: string } =
    false;

  /**
   * 生命周期钩子（可选，子类可以重写这些方法）
   *
   * @example
   * static async beforeCreate(instance: User) {
   *   instance.createdAt = new Date();
   * }
   *
   * static async afterCreate(instance: User) {
   *   console.log('User created:', instance);
   * }
   */
  static beforeCreate?: LifecycleHook;
  static afterCreate?: LifecycleHook;
  static beforeUpdate?: LifecycleHook;
  static afterUpdate?: LifecycleHook;
  static beforeDelete?: LifecycleHook;
  static afterDelete?: LifecycleHook;
  static beforeSave?: LifecycleHook;
  static afterSave?: LifecycleHook;
  static beforeValidate?: LifecycleHook;
  static afterValidate?: LifecycleHook;

  /**
   * 查询作用域（可选，子类可以定义常用的查询条件）
   *
   * @example
   * static scopes = {
   *   active: () => ({ status: 'active' }),
   *   published: () => ({ published: true, deletedAt: null }),
   *   recent: () => ({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
   * };
   *
   * // 使用
   * const activeUsers = await User.scope('active').findAll();
   */
  static scopes?: Record<string, () => WhereCondition>;

  /**
   * 虚拟字段（可选，子类可以定义计算属性）
   *
   * @example
   * static virtuals = {
   *   fullName: (instance: User) => `${instance.firstName} ${instance.lastName}`,
   *   isAdult: (instance: User) => instance.age >= 18
   * };
   *
   * // 使用
   * const user = await User.find(1);
   * console.log(user.fullName); // 自动计算
   */
  static virtuals?: Record<string, (instance: any) => any>;

  /**
   * 索引定义（可选，用于定义数据库索引）
   *
   * @example
   * // 单个字段索引
   * static indexes = [
   *   { field: 'email', unique: true },
   *   { field: 'createdAt', direction: -1 }
   * ];
   *
   * // 复合索引
   * static indexes = [
   *   { fields: { userId: 1, createdAt: -1 }, unique: true }
   * ];
   */
  static indexes?: IndexDefinitions;

  /**
   * 实例数据
   */
  [key: string]: any;

  /**
   * 缓存适配器（可选，用于查询结果缓存）
   */
  static cacheAdapter?: CacheAdapter;

  /**
   * 缓存 TTL（秒，默认 3600）
   */
  static cacheTTL: number = 3600;

  /**
   * 设置数据库适配器
   * @param adapter 数据库适配器实例
   */
  static setAdapter(adapter: DatabaseAdapter): void {
    this.adapter = adapter;
  }

  /**
   * 初始化模型
   * 设置数据库适配器（SQL 模型通常不需要创建索引，索引通过迁移管理）
   * 这个方法会自动从全局数据库管理器获取适配器
   * 如果数据库未初始化，会自动尝试从 dweb.config.ts 加载配置并初始化
   *
   * @param connectionName 连接名称（默认为 'default'）
   * @returns Promise<void>
   *
   * @example
   * await User.init(); // 使用默认连接，如果数据库未初始化会自动从配置文件加载
   * await User.init('secondary'); // 使用指定连接
   */
  static async init(connectionName: string = "default"): Promise<void> {
    // 动态导入 getDatabaseAsync 以避免循环依赖
    const { getDatabaseAsync } = await import("../access.ts");

    try {
      // 获取数据库适配器（如果数据库未初始化，会自动尝试从配置文件加载并初始化）
      const adapter = await getDatabaseAsync(connectionName);
      // 设置适配器
      this.setAdapter(adapter);
      // 注意：SQL 模型的索引通常通过迁移管理，不在这里创建
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to initialize model ${this.tableName}: ${message}`,
      );
    }
  }

  /**
   * 确保模型已初始化（懒加载）
   * 如果适配器未设置，自动尝试初始化
   * @param connectionName 连接名称（默认为 'default'）
   */
  private static async ensureInitialized(
    connectionName: string = "default",
  ): Promise<void> {
    if (!this.adapter) {
      await this.init(connectionName);
    }
  }

  /**
   * 将查询条件对象转换为 SQL WHERE 子句
   * @param condition 查询条件对象
   * @returns SQL WHERE 子句和参数数组
   */
  private static buildWhereClause(
    condition: WhereCondition | number | string,
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
  ): { where: string; params: any[] } {
    // 如果是数字或字符串，作为主键查询
    if (typeof condition === "number" || typeof condition === "string") {
      const conditions: string[] = [`${this.primaryKey} = ?`];
      const params: any[] = [condition];

      // 处理软删除
      if (this.softDelete) {
        if (onlyTrashed) {
          conditions.push(`${this.deletedAtField} IS NOT NULL`);
        } else if (!includeTrashed) {
          conditions.push(`${this.deletedAtField} IS NULL`);
        }
      }

      return {
        where: conditions.join(" AND "),
        params,
      };
    }

    // 如果是对象，构建 WHERE 子句
    const conditions: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(condition)) {
      if (value === null || value === undefined) {
        conditions.push(`${key} IS NULL`);
      } else if (typeof value === "object" && !Array.isArray(value)) {
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
          const placeholders = value.$in.map(() => "?").join(", ");
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

    // 处理软删除
    if (this.softDelete) {
      if (onlyTrashed) {
        conditions.push(`${this.deletedAtField} IS NOT NULL`);
      } else if (!includeTrashed) {
        conditions.push(`${this.deletedAtField} IS NULL`);
      }
    }

    return {
      where: conditions.length > 0 ? conditions.join(" AND ") : "1=1",
      params,
    };
  }

  /**
   * 规范化排序参数（支持字符串 asc/desc）
   */
  private static normalizeSort(
    sort?: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc",
  ): Record<string, "ASC" | "DESC"> | undefined {
    if (!sort) return undefined;
    if (typeof sort === "string") {
      const dir = sort.toLowerCase() === "desc" ? "DESC" : "ASC";
      return { [this.primaryKey]: dir };
    }
    const normalized: Record<string, "ASC" | "DESC"> = {};
    for (const [field, dir] of Object.entries(sort)) {
      if (typeof dir === "string") {
        normalized[field] = dir.toLowerCase() === "desc" ? "DESC" : "ASC";
      } else {
        normalized[field] = dir === -1 ? "DESC" : "ASC";
      }
    }
    return normalized;
  }

  /**
   * 构建 ORDER BY 子句内容（不包含关键字）
   */
  private static buildOrderByClause(
    sort?: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc",
  ): string | undefined {
    const normalized = this.normalizeSort(sort);
    if (!normalized) return undefined;
    const parts: string[] = [];
    for (const [field, dir] of Object.entries(normalized)) {
      parts.push(`${field} ${dir}`);
    }
    return parts.join(", ");
  }

  /**
   * 处理字段（应用默认值、类型转换、验证）
   * @param data 原始数据
   * @returns 处理后的数据
   */
  private static processFields(data: Record<string, any>): Record<string, any> {
    const schema = (this as any).schema;
    if (!schema) {
      return data;
    }

    const processed: Record<string, any> = { ...data };

    // 遍历 schema 中定义的字段
    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      const field = fieldDef as FieldDefinition;
      const value = processed[fieldName];

      // 应用默认值
      if (value === undefined && field.default !== undefined) {
        processed[fieldName] = typeof field.default === "function"
          ? field.default()
          : field.default;
      }

      // 类型转换
      if (processed[fieldName] !== undefined) {
        processed[fieldName] = this.convertType(
          processed[fieldName],
          field.type,
          field.enum,
        );
      }

      // Setter
      if (field.set && processed[fieldName] !== undefined) {
        processed[fieldName] = field.set(processed[fieldName]);
      }
    }

    // 验证
    SQLModel.validate.call(this, processed);

    return processed;
  }

  /**
   * 验证数据
   * @param data 要验证的数据
   * @throws ValidationError 验证失败时抛出
   */
  static validate(data: Record<string, any>): void {
    const schema = (this as any).schema;
    if (!schema) {
      return;
    }

    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      const field = fieldDef as FieldDefinition;
      const value = data[fieldName];
      SQLModel.validateField.call(this, fieldName, value, field);
    }
  }

  /**
   * 验证单个字段
   */
  private static validateField(
    fieldName: string,
    value: any,
    fieldDef: FieldDefinition,
  ): void {
    const rule = fieldDef.validate;
    if (!rule) {
      return;
    }

    // 必填验证
    if (
      rule.required && (value === null || value === undefined || value === "")
    ) {
      throw new ValidationError(
        fieldName,
        rule.message || `${fieldName} 是必填字段`,
      );
    }

    // 如果值为空且不是必填，跳过其他验证
    if (value === null || value === undefined || value === "") {
      return;
    }

    // 类型验证
    if (rule.type) {
      const expectedType = rule.type;
      const actualType = typeof value;
      if (expectedType === "array" && !Array.isArray(value)) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} 必须是数组类型`,
        );
      }
      if (
        expectedType === "object" &&
        (actualType !== "object" || Array.isArray(value) || value === null)
      ) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} 必须是对象类型`,
        );
      }
      if (
        expectedType !== "array" && expectedType !== "object" &&
        actualType !== expectedType
      ) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} 必须是 ${expectedType} 类型`,
        );
      }
    }

    // 长度验证（字符串或数组）
    if (rule.length !== undefined) {
      const len = Array.isArray(value) ? value.length : String(value).length;
      if (len !== rule.length) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} 长度必须是 ${rule.length}`,
        );
      }
    }

    // 最小值/最大长度验证
    if (rule.min !== undefined) {
      if (typeof value === "number") {
        if (value < rule.min) {
          throw new ValidationError(
            fieldName,
            rule.message || `${fieldName} 必须大于等于 ${rule.min}`,
          );
        }
      } else {
        const len = Array.isArray(value) ? value.length : String(value).length;
        if (len < rule.min) {
          throw new ValidationError(
            fieldName,
            rule.message || `${fieldName} 长度必须大于等于 ${rule.min}`,
          );
        }
      }
    }

    // 最大值/最大长度验证
    if (rule.max !== undefined) {
      if (typeof value === "number") {
        if (value > rule.max) {
          throw new ValidationError(
            fieldName,
            rule.message || `${fieldName} 必须小于等于 ${rule.max}`,
          );
        }
      } else {
        const len = Array.isArray(value) ? value.length : String(value).length;
        if (len > rule.max) {
          throw new ValidationError(
            fieldName,
            rule.message || `${fieldName} 长度必须小于等于 ${rule.max}`,
          );
        }
      }
    }

    // 正则表达式验证
    if (rule.pattern) {
      const regex = rule.pattern instanceof RegExp
        ? rule.pattern
        : new RegExp(rule.pattern);
      if (!regex.test(String(value))) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} 格式不正确`,
        );
      }
    }

    // 枚举验证
    if (rule.enum && !rule.enum.includes(value)) {
      throw new ValidationError(
        fieldName,
        rule.message || `${fieldName} 必须是以下之一: ${rule.enum.join(", ")}`,
      );
    }

    // 自定义验证
    if (rule.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        throw new ValidationError(
          fieldName,
          rule.message ||
            (typeof result === "string" ? result : `${fieldName} 验证失败`),
        );
      }
    }
  }

  /**
   * 类型转换
   */
  private static convertType(
    value: any,
    type: FieldType,
    enumValues?: any[],
  ): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (type) {
      case "string": {
        return String(value);
      }
      case "number": {
        const num = Number(value);
        return isNaN(num) ? value : num;
      }
      case "boolean": {
        if (typeof value === "boolean") return value;
        if (typeof value === "string") {
          return value.toLowerCase() === "true" || value === "1";
        }
        return Boolean(value);
      }
      case "date": {
        if (value instanceof Date) return value;
        if (typeof value === "string" || typeof value === "number") {
          return new Date(value);
        }
        return value;
      }
      case "array": {
        return Array.isArray(value) ? value : [value];
      }
      case "object": {
        return typeof value === "object" ? value : JSON.parse(String(value));
      }
      case "enum": {
        if (enumValues && enumValues.includes(value)) {
          return value;
        }
        throw new ValidationError(
          "enum",
          `值必须是以下之一: ${enumValues?.join(", ")}`,
        );
      }
      case "bigint": {
        return BigInt(value);
      }
      case "decimal": {
        return parseFloat(String(value));
      }
      case "timestamp": {
        if (value instanceof Date) return value;
        if (typeof value === "string" || typeof value === "number") {
          return new Date(value);
        }
        return value;
      }
      case "uuid": {
        return String(value);
      }
      case "text": {
        return String(value);
      }
      case "binary": {
        return value;
      }
      case "json": {
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return typeof value === "object" ? value : value;
      }
      case "any": {
        return value;
      }
      default: {
        return value;
      }
    }
  }

  /**
   * 查询构建器（支持链式调用，可查找单条或多条记录）
   * @param condition 查询条件（可以是 ID、条件对象）
   * @param fields 要查询的字段数组（可选，用于字段投影）
   * @returns 查询构建器（支持链式调用，也可以直接 await）
   *
   * @example
   * // 直接查询单条记录（向后兼容）
   * const user = await User.find(1);
   * const user = await User.find({ email: 'user@example.com' });
   *
   * // 链式调用查找单条记录
   * const user = await User.find({ status: 'active' }).sort({ createdAt: -1 });
   *
   * // 链式调用查找多条记录
   * const users = await User.find({ status: 'active' }).sort({ createdAt: -1 }).findAll();
   * const users = await User.find({ status: 'active' }).sort({ sort: -1 }).limit(10).findAll();
   */
  static find<T extends typeof SQLModel>(
    this: T,
    condition: WhereCondition | number | string,
    fields?: string[],
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
    options?: {
      sort?: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc";
    },
  ): {
    sort: (
      sort: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc",
    ) => ReturnType<T["find"]>;
    skip: (n: number) => ReturnType<T["find"]>;
    limit: (n: number) => ReturnType<T["find"]>;
    fields: (fields: string[]) => ReturnType<T["find"]>;
    includeTrashed: () => ReturnType<T["find"]>;
    onlyTrashed: () => ReturnType<T["find"]>;
    findAll: () => Promise<InstanceType<T>[]>;
    findOne: () => Promise<InstanceType<T> | null>;
    count: () => Promise<number>;
    exists: () => Promise<boolean>;
    then: (
      onfulfilled?: (value: InstanceType<T> | null) => any,
      onrejected?: (reason: any) => any,
    ) => Promise<any>;
    catch: (onrejected?: (reason: any) => any) => Promise<any>;
    finally: (onfinally?: () => void) => Promise<any>;
  } {
    // 创建查询构建器状态
    const _condition: WhereCondition | number | string = condition;
    let _fields: string[] | undefined = fields;
    let _sort:
      | Record<string, 1 | -1 | "asc" | "desc">
      | "asc"
      | "desc"
      | undefined = options?.sort;
    let _skip: number | undefined;
    let _limit: number | undefined;
    let _includeTrashed = includeTrashed;
    let _onlyTrashed = onlyTrashed;

    // 执行查询单条记录的函数
    const executeFindOne = async (): Promise<InstanceType<T> | null> => {
      // 自动初始化（如果未初始化）
      await this.ensureInitialized();

      if (!this.adapter) {
        throw new Error(
          "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
        );
      }

      const { where, params } = this.buildWhereClause(
        _condition,
        _includeTrashed,
        _onlyTrashed,
      );
      const columns = _fields && _fields.length > 0 ? _fields.join(", ") : "*";
      const orderBy = this.buildOrderByClause(_sort);
      let sql = `SELECT ${columns} FROM ${this.tableName} WHERE ${where}`;
      if (orderBy) {
        sql = `${sql} ORDER BY ${orderBy}`;
      }
      const extraParams: any[] = [];
      if (typeof _limit === "number") {
        sql = `${sql} LIMIT ?`;
        extraParams.push(Math.max(1, Math.floor(_limit)));
      } else {
        sql = `${sql} LIMIT 1`;
      }
      if (typeof _limit === "number" && typeof _skip === "number") {
        sql = `${sql} OFFSET ?`;
        extraParams.push(Math.max(0, Math.floor(_skip)));
      }
      const results = await this.adapter.query(sql, [
        ...params,
        ...extraParams,
      ]);

      if (results.length === 0) {
        return null;
      }

      const instance = new (this as any)();
      Object.assign(instance, results[0]);
      return instance as InstanceType<T>;
    };

    // 执行查询多条的函数
    const executeFindAll = async (): Promise<InstanceType<T>[]> => {
      await this.ensureInitialized();
      if (!this.adapter) {
        throw new Error(
          "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
        );
      }

      const { where, params } = this.buildWhereClause(
        _condition,
        _includeTrashed,
        _onlyTrashed,
      );
      const columns = _fields && _fields.length > 0 ? _fields.join(", ") : "*";
      const orderBy = this.buildOrderByClause(_sort);
      const useLimit = typeof _limit === "number";
      const useSkip = typeof _skip === "number";
      let sql = `SELECT ${columns} FROM ${this.tableName} WHERE ${where}`;
      if (orderBy) {
        sql = `${sql} ORDER BY ${orderBy}`;
      }
      const extraParams: any[] = [];
      if (useLimit) {
        sql = `${sql} LIMIT ?`;
        extraParams.push(Math.max(1, Math.floor(_limit!)));
      }
      if (useLimit && useSkip) {
        sql = `${sql} OFFSET ?`;
        extraParams.push(Math.max(0, Math.floor(_skip!)));
      }
      const results = await this.adapter.query(sql, [
        ...params,
        ...extraParams,
      ]);

      return results.map((row: any) => {
        const instance = new (this as any)();
        Object.assign(instance, row);
        return instance as InstanceType<T>;
      });
    };

    // 创建 Promise（用于直接 await）
    const queryPromise = executeFindOne();

    // 构建查询构建器对象
    const builder = {
      sort: (
        sort: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc",
      ) => {
        _sort = sort;
        return builder;
      },
      skip: (n: number) => {
        _skip = Math.max(0, Math.floor(n));
        return builder;
      },
      limit: (n: number) => {
        _limit = Math.max(1, Math.floor(n));
        return builder;
      },
      fields: (fields: string[]) => {
        _fields = fields;
        return builder;
      },
      includeTrashed: () => {
        _includeTrashed = true;
        _onlyTrashed = false;
        return builder;
      },
      onlyTrashed: () => {
        _onlyTrashed = true;
        _includeTrashed = false;
        return builder;
      },
      findAll: () => executeFindAll(),
      findOne: () => executeFindOne(),
      one: () => executeFindOne(),
      all: () => executeFindAll(),
      count: async (): Promise<number> => {
        await this.ensureInitialized();
        if (!this.adapter) {
          throw new Error(
            "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
          );
        }
        const { where, params } = this.buildWhereClause(
          _condition,
          _includeTrashed,
          _onlyTrashed,
        );
        const sql =
          `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${where}`;
        const results = await this.adapter.query(sql, params);
        if (results.length > 0) {
          return parseInt(results[0].count) || 0;
        }
        return 0;
      },
      exists: async (): Promise<boolean> => {
        await this.ensureInitialized();
        if (!this.adapter) {
          throw new Error(
            "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
          );
        }
        return await this.exists(
          _condition,
          _includeTrashed,
          _onlyTrashed,
        );
      },
      // Promise 接口方法（用于直接 await）
      then: (
        onfulfilled?: (value: InstanceType<T> | null) => any,
        onrejected?: (reason: any) => any,
      ) => queryPromise.then(onfulfilled, onrejected),
      catch: (onrejected?: (reason: any) => any) =>
        queryPromise.catch(onrejected),
      finally: (onfinally?: () => void) => queryPromise.finally(onfinally),
    };

    return builder as any;
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
    options?: {
      sort?: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc";
      skip?: number;
      limit?: number;
    },
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
  ): Promise<InstanceType<T>[]> {
    // 自动初始化（如果未初始化）
    await this.ensureInitialized();

    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
      );
    }

    const { where, params } = this.buildWhereClause(
      condition,
      includeTrashed,
      onlyTrashed,
    );
    const columns = fields && fields.length > 0 ? fields.join(", ") : "*";

    const orderBy = this.buildOrderByClause(options?.sort);
    const useLimit = typeof options?.limit === "number";
    const useSkip = typeof options?.skip === "number";
    let sql = `SELECT ${columns} FROM ${this.tableName} WHERE ${where}`;
    if (orderBy) {
      sql = `${sql} ORDER BY ${orderBy}`;
    }
    if (useLimit) {
      sql = `${sql} LIMIT ?`;
    }
    if (useLimit && useSkip) {
      sql = `${sql} OFFSET ?`;
    }
    const extraParams = [];
    if (useLimit) extraParams.push(Math.max(1, Math.floor(options!.limit!)));
    if (useLimit && useSkip) {
      extraParams.push(Math.max(0, Math.floor(options!.skip!)));
    }
    const results = await this.adapter.query(sql, [...params, ...extraParams]);

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
    // 自动初始化（如果未初始化）
    await this.ensureInitialized();

    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
      );
    }

    // 处理字段（应用默认值、类型转换、验证）
    let processedData = this.processFields(data);

    // 自动时间戳
    if (this.timestamps) {
      const createdAtField = typeof this.timestamps === "object"
        ? (this.timestamps.createdAt || "createdAt")
        : "createdAt";
      const updatedAtField = typeof this.timestamps === "object"
        ? (this.timestamps.updatedAt || "updatedAt")
        : "updatedAt";

      if (!processedData[createdAtField]) {
        processedData[createdAtField] = new Date();
      }
      if (!processedData[updatedAtField]) {
        processedData[updatedAtField] = new Date();
      }
    }

    // 创建临时实例用于钩子
    const tempInstance = new (this as any)();
    Object.assign(tempInstance, processedData);

    // beforeValidate 钩子
    if (this.beforeValidate) {
      await this.beforeValidate(tempInstance);
      processedData = { ...processedData, ...tempInstance };
    }

    // afterValidate 钩子
    if (this.afterValidate) {
      await this.afterValidate(tempInstance);
      processedData = { ...processedData, ...tempInstance };
    }

    // beforeCreate 钩子
    if (this.beforeCreate) {
      await this.beforeCreate(tempInstance);
      processedData = { ...processedData, ...tempInstance };
    }

    // beforeSave 钩子
    if (this.beforeSave) {
      await this.beforeSave(tempInstance);
      processedData = { ...processedData, ...tempInstance };
    }

    const keys = Object.keys(processedData);
    const values = Object.values(processedData);
    const placeholders = keys.map(() => "?").join(", ");

    let sql = `INSERT INTO ${this.tableName} (${
      keys.join(", ")
    }) VALUES (${placeholders})`;
    if ((this.adapter as any)?.config?.type === "postgresql") {
      sql = `${sql} RETURNING ${this.primaryKey}`;
    }
    const execResult = await this.adapter.execute(sql, values);

    let insertedId: any = null;
    if (
      execResult && typeof execResult === "object" && "insertId" in execResult
    ) {
      insertedId = (execResult as any).insertId ?? null;
    }
    if (
      !insertedId && execResult && typeof execResult === "object" &&
      "rows" in execResult
    ) {
      const rows = (execResult as any).rows;
      if (Array.isArray(rows) && rows.length > 0) {
        insertedId = rows[0]?.[this.primaryKey] ?? rows[0]?.id ?? null;
      }
    }
    if (!insertedId) {
      try {
        const result = await this.adapter.query(
          `SELECT last_insert_rowid() as id`,
          [],
        );
        if (result.length > 0) {
          insertedId = result[0].id;
        }
      } catch {
        void 0;
      }
    }

    // 如果插入成功且有 ID，重新查询获取完整记录
    let instance: InstanceType<T>;
    if (insertedId) {
      const found = await this.find(insertedId);
      if (found) {
        instance = found;
      } else {
        instance = new (this as any)();
        Object.assign(instance, processedData);
        (instance as any)[this.primaryKey] = insertedId;
      }
    } else {
      // 否则返回包含插入数据的实例
      instance = new (this as any)();
      Object.assign(instance, processedData);
    }

    // 应用虚拟字段
    if ((this as any).virtuals) {
      const Model = this as any;
      for (const [name, getter] of Object.entries(Model.virtuals)) {
        const getterFn = getter as (instance: any) => any;
        Object.defineProperty(instance, name, {
          get: () => getterFn(instance),
          enumerable: true,
          configurable: true,
        });
      }
    }

    // afterCreate 钩子
    if (this.afterCreate) {
      await this.afterCreate(instance);
    }

    // afterSave 钩子
    if (this.afterSave) {
      await this.afterSave(instance);
    }

    return instance;
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
    // 自动初始化（如果未初始化）
    await this.ensureInitialized();

    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
      );
    }

    // 先查找要更新的记录
    let existingInstance: InstanceType<typeof SQLModel> | null = null;
    if (typeof condition === "number" || typeof condition === "string") {
      existingInstance = await this.find(condition);
    } else {
      const results = await this.findAll(condition);
      existingInstance = results[0] || null;
    }

    if (!existingInstance) {
      return 0;
    }

    // 处理字段（应用默认值、类型转换、验证）
    let processedData = this.processFields(data);

    // 自动时间戳
    if (this.timestamps) {
      const updatedAtField = typeof this.timestamps === "object"
        ? (this.timestamps.updatedAt || "updatedAt")
        : "updatedAt";
      processedData[updatedAtField] = new Date();
    }

    // 创建临时实例用于钩子
    const tempInstance = new (this as any)();
    Object.assign(tempInstance, { ...existingInstance, ...processedData });

    // beforeValidate 钩子
    if (this.beforeValidate) {
      await this.beforeValidate(tempInstance);
      processedData = { ...processedData, ...tempInstance };
    }

    // afterValidate 钩子
    if (this.afterValidate) {
      await this.afterValidate(tempInstance);
      processedData = { ...processedData, ...tempInstance };
    }

    // beforeUpdate 钩子
    if (this.beforeUpdate) {
      await this.beforeUpdate(tempInstance);
      processedData = { ...processedData, ...tempInstance };
    }

    // beforeSave 钩子
    if (this.beforeSave) {
      await this.beforeSave(tempInstance);
      processedData = { ...processedData, ...tempInstance };
    }

    const { where, params: whereParams } = this.buildWhereClause(
      condition,
      false,
      false,
    );
    const keys = Object.keys(processedData);
    const values = Object.values(processedData);
    const setClause = keys.map((key) => `${key} = ?`).join(", ");

    let sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${where}`;
    const isPostgres = (this.adapter as any)?.config?.type === "postgresql";
    if (isPostgres) {
      sql = `${sql} RETURNING *`;
    }
    const result = await this.adapter.execute(sql, [...values, ...whereParams]);

    // 返回影响的行数（如果适配器支持）
    const affectedRows = (typeof result === "number")
      ? result
      : ((result && typeof result === "object" && "affectedRows" in result)
        ? ((result as any).affectedRows || 0)
        : 0);

    if (affectedRows > 0) {
      let updatedInstance: any | null = null;
      if (
        isPostgres && result && typeof result === "object" && "rows" in result
      ) {
        const rows = (result as any).rows as any[];
        if (Array.isArray(rows) && rows.length > 0) {
          const instance = new (this as any)();
          Object.assign(instance, rows[0]);
          updatedInstance = instance;
        }
      } else {
        const instance = new (this as any)();
        Object.assign(instance, existingInstance || {}, processedData);
        updatedInstance = instance;
      }
      if (updatedInstance) {
        if (this.afterUpdate) {
          await this.afterUpdate(updatedInstance);
        }
        if (this.afterSave) {
          await this.afterSave(updatedInstance);
        }
      }
    }

    return affectedRows;
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
    // 自动初始化（如果未初始化）
    await this.ensureInitialized();

    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
      );
    }

    // 先查找要删除的记录
    let instanceToDelete: InstanceType<typeof SQLModel> | null = null;
    if (typeof condition === "number" || typeof condition === "string") {
      instanceToDelete = await this.find(condition);
    } else {
      const results = await this.findAll(condition);
      instanceToDelete = results[0] || null;
    }

    if (!instanceToDelete) {
      return 0;
    }

    // beforeDelete 钩子
    if (this.beforeDelete) {
      await this.beforeDelete(instanceToDelete);
    }

    const { where, params } = this.buildWhereClause(condition, true, false);

    // 软删除：设置 deletedAt 字段
    if (this.softDelete) {
      const sql =
        `UPDATE ${this.tableName} SET ${this.deletedAtField} = ? WHERE ${where}`;
      const result = await this.adapter.execute(sql, [new Date(), ...params]);
      const affectedRows = (typeof result === "number")
        ? result
        : ((result && typeof result === "object" && "affectedRows" in result)
          ? ((result as any).affectedRows || 0)
          : 0);

      if (affectedRows > 0 && this.afterDelete) {
        await this.afterDelete(instanceToDelete);
      }
      return affectedRows;
    }

    // 硬删除：真正删除记录
    const sql = `DELETE FROM ${this.tableName} WHERE ${where}`;
    const result = await this.adapter.execute(sql, params);

    // 返回影响的行数（如果适配器支持）
    const affectedRows = (typeof result === "number")
      ? result
      : ((result && typeof result === "object" && "affectedRows" in result)
        ? ((result as any).affectedRows || 0)
        : 0);

    if (affectedRows > 0) {
      if (this.afterDelete) {
        await this.afterDelete(instanceToDelete);
      }

      // 清除相关缓存
      if (this.cacheAdapter) {
        await this.cacheAdapter.deleteByTags([`model:${this.tableName}`]);
      }
    }

    return affectedRows;
  }

  /**
   * 保存当前实例（插入或更新）
   * @returns 保存后的实例
   */
  async save<T extends SQLModel>(this: T): Promise<T> {
    const Model = this.constructor as typeof SQLModel;
    if (!Model.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const primaryKey = (Model.constructor as any).primaryKey || "id";
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
   * 更新当前实例
   * @param data 要更新的数据对象
   * @returns 更新后的实例
   *
   * @example
   * const user = await User.find(1);
   * await user.update({ age: 26 });
   */
  async update<T extends SQLModel>(
    this: T,
    data: Record<string, any>,
  ): Promise<T> {
    const Model = this.constructor as typeof SQLModel;
    if (!Model.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const primaryKey = (Model.constructor as any).primaryKey || "id";
    const id = (this as any)[primaryKey];

    if (!id) {
      throw new Error("Cannot update instance without primary key");
    }

    await Model.update(id, data);
    // 重新加载更新后的数据
    await this.reload();
    return this;
  }

  /**
   * 删除当前实例
   * @returns 是否删除成功
   */
  async delete<T extends SQLModel>(this: T): Promise<boolean> {
    const Model = this.constructor as typeof SQLModel;
    if (!Model.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const primaryKey = (Model.constructor as any).primaryKey || "id";
    const id = (this as any)[primaryKey];

    if (!id) {
      throw new Error("Cannot delete instance without primary key");
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
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
    options?: {
      sort?: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc";
    },
  ): Promise<InstanceType<T> | null> {
    return await this.find(
      condition,
      fields,
      includeTrashed,
      onlyTrashed,
      options,
    );
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
   * 通过主键 ID 更新记录
   * @param id 主键值
   * @param data 要更新的数据对象
   * @returns 更新的记录数
   *
   * @example
   * await User.updateById(1, { name: 'lisi' });
   */
  static async updateById(
    id: number | string,
    data: Record<string, any>,
  ): Promise<number> {
    return await this.update(id, data);
  }

  /**
   * 通过主键 ID 删除记录
   * @param id 主键值
   * @returns 删除的记录数
   *
   * @example
   * await User.deleteById(1);
   */
  static async deleteById(
    id: number | string,
  ): Promise<number> {
    return await this.delete(id);
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
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
  ): Promise<number> {
    // 自动初始化（如果未初始化）
    await this.ensureInitialized();

    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
      );
    }

    const { where, params } = this.buildWhereClause(
      condition,
      includeTrashed,
      onlyTrashed,
    );
    const sql =
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${where}`;
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
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
  ): Promise<boolean> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const { where, params } = this.buildWhereClause(
      condition,
      includeTrashed,
      onlyTrashed,
    );
    const sql =
      `SELECT EXISTS(SELECT 1 FROM ${this.tableName} WHERE ${where}) as exists`;
    const results = await this.adapter.query(sql, params);

    if (results.length > 0) {
      // 不同数据库可能返回不同的布尔值表示方式
      const exists = results[0].exists;
      return exists === true || exists === 1 || exists === "1" ||
        exists === "t";
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
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    if (dataArray.length === 0) {
      return [];
    }

    // 获取所有数据的键（假设所有对象有相同的键）
    const keys = Object.keys(dataArray[0]);
    const placeholders = keys.map(() => "?").join(", ");

    // 构建批量插入 SQL
    const valuesList = dataArray.map(() => `(${placeholders})`).join(", ");
    const allValues = dataArray.flatMap((data) => keys.map((key) => data[key]));

    let sql = `INSERT INTO ${this.tableName} (${
      keys.join(", ")
    }) VALUES ${valuesList}`;
    const isPostgres = (this.adapter as any)?.config?.type === "postgresql";
    if (isPostgres) {
      sql = `${sql} RETURNING ${this.primaryKey}`;
    }
    const execResult = await this.adapter.execute(sql, allValues);

    // 尝试获取最后插入的 ID（如果支持）
    // 注意：批量插入时，不同数据库获取 ID 的方式不同
    // 这里简化处理，重新查询所有记录
    // 实际应用中可能需要根据业务逻辑优化
    if (
      isPostgres && execResult && typeof execResult === "object" &&
      "rows" in execResult
    ) {
      const rows = (execResult as any).rows;
      if (Array.isArray(rows) && rows.length === dataArray.length) {
        return dataArray.map((data, idx) => {
          const instance = new (this as any)();
          Object.assign(instance, data);
          const idVal = rows[idx]?.[this.primaryKey] ?? rows[idx]?.id ?? null;
          if (idVal != null) {
            (instance as any)[this.primaryKey] = idVal;
          }
          return instance as InstanceType<T>;
        });
      }
    }
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
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    // 确保页码和每页数量有效
    page = Math.max(1, Math.floor(page));
    pageSize = Math.max(1, Math.floor(pageSize));

    // 计算偏移量
    const offset = (page - 1) * pageSize;

    // 统计总数
    const total = await this.count(condition);

    // 构建查询 SQL
    const { where, params } = this.buildWhereClause(condition, false, false);
    const columns = fields && fields.length > 0 ? fields.join(", ") : "*";
    const sql =
      `SELECT ${columns} FROM ${this.tableName} WHERE ${where} LIMIT ? OFFSET ?`;

    const results = await this.adapter.query(sql, [
      ...params,
      pageSize,
      offset,
    ]);

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
  static async increment<T extends typeof SQLModel>(
    this: T,
    condition: WhereCondition | number | string,
    field: string,
    amount: number = 1,
    returnLatest: boolean = false,
  ): Promise<number | InstanceType<T>> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const { where, params } = this.buildWhereClause(condition, false, false);
    let sql =
      `UPDATE ${this.tableName} SET ${field} = ${field} + ? WHERE ${where}`;
    const isPostgres = (this.adapter as any)?.config?.type === "postgresql";
    if (isPostgres && returnLatest) {
      sql = `${sql} RETURNING *`;
    }
    const result = await this.adapter.execute(sql, [amount, ...params]);

    if (!returnLatest) {
      if (typeof result === "number") {
        return result;
      }
      if (result && typeof result === "object" && "affectedRows" in result) {
        return (result as any).affectedRows || 0;
      }
      return 0;
    }

    let instance: any | null = null;
    if (
      isPostgres && result && typeof result === "object" && "rows" in result
    ) {
      const rows = (result as any).rows as any[];
      if (Array.isArray(rows) && rows.length > 0) {
        instance = new (this as any)();
        Object.assign(instance, rows[0]);
      }
    } else {
      const existing = await this.find(condition);
      if (existing) {
        instance = new (this as any)();
        Object.assign(instance, existing);
        const prevVal = (instance as any)[field];
        (instance as any)[field] = (typeof prevVal === "number" ? prevVal : 0) +
          amount;
      }
    }

    return instance as InstanceType<T>;
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
  static async decrement<T extends typeof SQLModel>(
    this: T,
    condition: WhereCondition | number | string,
    field: string,
    amount: number = 1,
    returnLatest: boolean = false,
  ): Promise<number | InstanceType<T>> {
    return await (this as any).increment(
      condition,
      field,
      -amount,
      returnLatest,
    );
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
    options?: { useDialectUpsert?: boolean; conflictKeys?: string[] },
  ): Promise<InstanceType<T>> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const useDialect = options?.useDialectUpsert ??
      ((this as any).useDialectUpsert === true);
    const type = (this.adapter as any)?.config?.type;
    const conflictKeys = options?.conflictKeys ??
      (this as any).upsertConflictKeys ??
      (typeof condition === "object" && !Array.isArray(condition)
        ? Object.keys(condition)
        : []);

    if (useDialect && type === "postgresql" && conflictKeys.length > 0) {
      try {
        const processedData = this.processFields(data);
        if (this.timestamps) {
          const updatedAtField = typeof this.timestamps === "object"
            ? (this.timestamps.updatedAt || "updatedAt")
            : "updatedAt";
          processedData[updatedAtField] = new Date();
        }
        if (typeof condition === "object" && condition) {
          for (const k of conflictKeys) {
            if (
              processedData[k] === undefined &&
              (condition as any)[k] !== undefined
            ) {
              const v = (condition as any)[k];
              processedData[k] = (v && typeof v === "object") ? undefined : v;
            }
          }
        }
        const keys = Object.keys(processedData).filter((k) =>
          k !== this.primaryKey
        );
        const values = keys.map((k) => processedData[k]);
        const placeholders = keys.map(() => "?").join(", ");
        const updateSet = keys.map((k) => `${k} = EXCLUDED.${k}`).join(", ");
        const sql = `INSERT INTO ${this.tableName} (${
          keys.join(", ")
        }) VALUES (${placeholders}) ON CONFLICT (${
          conflictKeys.join(", ")
        }) DO UPDATE SET ${updateSet} RETURNING *`;
        const result = await this.adapter.execute(sql, values);
        if (result && typeof result === "object" && "rows" in result) {
          const rows = (result as any).rows as any[];
          if (Array.isArray(rows) && rows.length > 0) {
            const instance = new (this as any)();
            Object.assign(instance, rows[0]);
            return instance as InstanceType<T>;
          }
        }
      } catch (_e) {
        void 0;
      }
    }

    if (useDialect && type === "mysql") {
      const processedData = this.processFields(data);
      if (this.timestamps) {
        const updatedAtField = typeof this.timestamps === "object"
          ? (this.timestamps.updatedAt || "updatedAt")
          : "updatedAt";
        processedData[updatedAtField] = new Date();
      }
      const keys = Object.keys(processedData).filter((k) =>
        k !== this.primaryKey
      );
      const values = keys.map((k) => processedData[k]);
      const placeholders = keys.map(() => "?").join(", ");
      const updateSet = keys.map((k) => `${k} = VALUES(${k})`).join(", ");
      const sql = `INSERT INTO ${this.tableName} (${
        keys.join(", ")
      }) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateSet}`;
      const result = await this.adapter.execute(sql, values);
      const instance = new (this as any)();
      Object.assign(instance, processedData);
      if (result && typeof result === "object" && "insertId" in result) {
        const insertedId = (result as any).insertId ?? null;
        if (insertedId != null) {
          (instance as any)[this.primaryKey] = insertedId;
        }
      }
      return instance as InstanceType<T>;
    }

    const existing = await this.withTrashed().find(condition);
    if (existing) {
      await this.update(condition, data);
      const updated = await this.find(condition);
      if (updated) {
        return updated as InstanceType<T>;
      }
    }
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
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
  ): Promise<any[]> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const { where, params } = this.buildWhereClause(
      condition,
      includeTrashed,
      onlyTrashed,
    );
    const sql =
      `SELECT DISTINCT ${field} FROM ${this.tableName} WHERE ${where}`;
    const results = await this.adapter.query(sql, params);

    return results.map((row: any) => row[field]).filter((value: any) =>
      value !== null && value !== undefined
    );
  }

  /**
   * 查询时包含已软删除的记录
   * @returns 查询构建器（链式调用）
   *
   * @example
   * const allUsers = await User.withTrashed().findAll();
   * const user = await User.withTrashed().find(1);
   */
  static withTrashed<T extends typeof SQLModel>(this: T): {
    findAll: (
      condition?: WhereCondition,
      fields?: string[],
      options?: {
        sort?: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc";
        skip?: number;
        limit?: number;
      },
    ) => Promise<InstanceType<T>[]>;
    find: (
      condition?: WhereCondition | number | string,
      fields?: string[],
    ) => Promise<InstanceType<T> | null>;
    count: (condition?: WhereCondition) => Promise<number>;
  } {
    return {
      findAll: async (
        condition: WhereCondition = {},
        fields?: string[],
        options?: {
          sort?: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc";
          skip?: number;
          limit?: number;
        },
      ): Promise<InstanceType<T>[]> => {
        await this.ensureInitialized();
        if (!this.adapter) {
          throw new Error(
            "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
          );
        }
        const { where, params } = this.buildWhereClause(condition, true, false);
        const columns = fields && fields.length > 0 ? fields.join(", ") : "*";
        const orderBy = this.buildOrderByClause(options?.sort);
        const useLimit = typeof options?.limit === "number";
        const useSkip = typeof options?.skip === "number";
        let sql = `SELECT ${columns} FROM ${this.tableName} WHERE ${where}`;
        if (orderBy) {
          sql = `${sql} ORDER BY ${orderBy}`;
        }
        if (useLimit) {
          sql = `${sql} LIMIT ?`;
        }
        if (useLimit && useSkip) {
          sql = `${sql} OFFSET ?`;
        }
        const extraParams = [];
        if (useLimit) {
          extraParams.push(Math.max(1, Math.floor(options!.limit!)));
        }
        if (useLimit && useSkip) {
          extraParams.push(Math.max(0, Math.floor(options!.skip!)));
        }
        const results = await this.adapter.query(sql, [
          ...params,
          ...extraParams,
        ]);
        return results.map((row: any) => {
          const instance = new (this as any)();
          Object.assign(instance, row);
          return instance as InstanceType<T>;
        });
      },
      find: async (
        condition: WhereCondition | number | string = {},
        fields?: string[],
      ): Promise<InstanceType<T> | null> => {
        await this.ensureInitialized();
        if (!this.adapter) {
          throw new Error(
            "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
          );
        }
        const { where, params } = this.buildWhereClause(condition, true, false);
        const columns = fields && fields.length > 0 ? fields.join(", ") : "*";
        const sql =
          `SELECT ${columns} FROM ${this.tableName} WHERE ${where} LIMIT 1`;
        const results = await this.adapter.query(sql, params);
        if (results.length === 0) {
          return null;
        }
        const instance = new (this as any)();
        Object.assign(instance, results[0]);
        return instance as InstanceType<T>;
      },
      count: async (condition: WhereCondition = {}): Promise<number> => {
        await this.ensureInitialized();
        if (!this.adapter) {
          throw new Error(
            "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
          );
        }
        const { where, params } = this.buildWhereClause(condition, true, false);
        const sql =
          `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${where}`;
        const results = await this.adapter.query(sql, params);
        if (results.length > 0) {
          return parseInt(results[0].count) || 0;
        }
        return 0;
      },
    };
  }

  /**
   * 只查询已软删除的记录
   * @returns 查询构建器（链式调用）
   *
   * @example
   * const deletedUsers = await User.onlyTrashed().findAll();
   * const user = await User.onlyTrashed().find(1);
   */
  static onlyTrashed<T extends typeof SQLModel>(this: T): {
    findAll: (
      condition?: WhereCondition,
      fields?: string[],
      options?: {
        sort?: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc";
        skip?: number;
        limit?: number;
      },
    ) => Promise<InstanceType<T>[]>;
    find: (
      condition?: WhereCondition | number | string,
      fields?: string[],
    ) => Promise<InstanceType<T> | null>;
    count: (condition?: WhereCondition) => Promise<number>;
  } {
    return {
      findAll: async (
        condition: WhereCondition = {},
        fields?: string[],
        options?: {
          sort?: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc";
          skip?: number;
          limit?: number;
        },
      ): Promise<InstanceType<T>[]> => {
        await this.ensureInitialized();
        if (!this.adapter) {
          throw new Error(
            "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
          );
        }
        const { where, params } = this.buildWhereClause(condition, false, true);
        const columns = fields && fields.length > 0 ? fields.join(", ") : "*";
        const orderBy = this.buildOrderByClause(options?.sort);
        const useLimit = typeof options?.limit === "number";
        const useSkip = typeof options?.skip === "number";
        let sql = `SELECT ${columns} FROM ${this.tableName} WHERE ${where}`;
        if (orderBy) {
          sql = `${sql} ORDER BY ${orderBy}`;
        }
        if (useLimit) {
          sql = `${sql} LIMIT ?`;
        }
        if (useLimit && useSkip) {
          sql = `${sql} OFFSET ?`;
        }
        const extraParams = [];
        if (useLimit) {
          extraParams.push(Math.max(1, Math.floor(options!.limit!)));
        }
        if (useLimit && useSkip) {
          extraParams.push(Math.max(0, Math.floor(options!.skip!)));
        }
        const results = await this.adapter.query(sql, [
          ...params,
          ...extraParams,
        ]);
        return results.map((row: any) => {
          const instance = new (this as any)();
          Object.assign(instance, row);
          return instance as InstanceType<T>;
        });
      },
      find: async (
        condition: WhereCondition | number | string = {},
        fields?: string[],
      ): Promise<InstanceType<T> | null> => {
        await this.ensureInitialized();
        if (!this.adapter) {
          throw new Error(
            "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
          );
        }
        const { where, params } = this.buildWhereClause(condition, false, true);
        const columns = fields && fields.length > 0 ? fields.join(", ") : "*";
        const sql =
          `SELECT ${columns} FROM ${this.tableName} WHERE ${where} LIMIT 1`;
        const results = await this.adapter.query(sql, params);
        if (results.length === 0) {
          return null;
        }
        const instance = new (this as any)();
        Object.assign(instance, results[0]);
        return instance as InstanceType<T>;
      },
      count: async (condition: WhereCondition = {}): Promise<number> => {
        await this.ensureInitialized();
        if (!this.adapter) {
          throw new Error(
            "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
          );
        }
        const { where, params } = this.buildWhereClause(condition, false, true);
        const sql =
          `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${where}`;
        const results = await this.adapter.query(sql, params);
        if (results.length > 0) {
          return parseInt(results[0].count) || 0;
        }
        return 0;
      },
    };
  }

  /**
   * 链式查询构建器
   */
  static query<T extends typeof SQLModel>(this: T): {
    where: (
      condition: WhereCondition | number | string,
    ) => ReturnType<T["query"]>;
    fields: (fields: string[]) => ReturnType<T["query"]>;
    sort: (
      sort: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc",
    ) => ReturnType<T["query"]>;
    skip: (n: number) => ReturnType<T["query"]>;
    limit: (n: number) => ReturnType<T["query"]>;
    includeTrashed: () => ReturnType<T["query"]>;
    onlyTrashed: () => ReturnType<T["query"]>;
    findAll: () => Promise<InstanceType<T>[]>;
    findOne: () => Promise<InstanceType<T> | null>;
    one: () => Promise<InstanceType<T> | null>;
    all: () => Promise<InstanceType<T>[]>;
    count: () => Promise<number>;
    exists: () => Promise<boolean>;
    update: (data: Record<string, any>) => Promise<number>;
    updateMany: (data: Record<string, any>) => Promise<number>;
    increment: (field: string, amount?: number) => Promise<number>;
    decrement: (field: string, amount?: number) => Promise<number>;
    deleteMany: () => Promise<number>;
    restore: (
      options?: { returnIds?: boolean },
    ) => Promise<number | { count: number; ids: any[] }>;
    forceDelete: (
      options?: { returnIds?: boolean },
    ) => Promise<number | { count: number; ids: any[] }>;
    distinct: (field: string) => Promise<any[]>;
    upsert: (data: Record<string, any>) => Promise<InstanceType<T>>;
    findOrCreate: (data: Record<string, any>) => Promise<InstanceType<T>>;
    findOneAndUpdate: (
      data: Record<string, any>,
    ) => Promise<InstanceType<T> | null>;
    findOneAndDelete: () => Promise<InstanceType<T> | null>;
  } {
    let _condition: WhereCondition | number | string = {};
    let _fields: string[] | undefined;
    let _sort:
      | Record<string, 1 | -1 | "asc" | "desc">
      | "asc"
      | "desc"
      | undefined;
    let _skip: number | undefined;
    let _limit: number | undefined;
    let _includeTrashed = false;
    let _onlyTrashed = false;

    const builder = {
      where: (condition: WhereCondition | number | string) => {
        _condition = condition;
        return builder;
      },
      fields: (fields: string[]) => {
        _fields = fields;
        return builder;
      },
      sort: (
        sort: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc",
      ) => {
        _sort = sort;
        return builder;
      },
      skip: (n: number) => {
        _skip = Math.max(0, Math.floor(n));
        return builder;
      },
      limit: (n: number) => {
        _limit = Math.max(1, Math.floor(n));
        return builder;
      },
      includeTrashed: () => {
        _includeTrashed = true;
        _onlyTrashed = false;
        return builder;
      },
      onlyTrashed: () => {
        _onlyTrashed = true;
        _includeTrashed = false;
        return builder;
      },
      findAll: async (): Promise<InstanceType<T>[]> => {
        await this.ensureInitialized();
        if (!this.adapter) {
          throw new Error(
            "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
          );
        }
        const { where, params } = this.buildWhereClause(
          _condition as any,
          _includeTrashed,
          _onlyTrashed,
        );
        const columns = _fields && _fields.length > 0
          ? _fields.join(", ")
          : "*";
        const orderBy = this.buildOrderByClause(_sort);
        const useLimit = typeof _limit === "number";
        const useSkip = typeof _skip === "number";
        let sql = `SELECT ${columns} FROM ${this.tableName} WHERE ${where}`;
        if (orderBy) {
          sql = `${sql} ORDER BY ${orderBy}`;
        }
        const extraParams: any[] = [];
        if (useLimit) {
          sql = `${sql} LIMIT ?`;
          extraParams.push(Math.max(1, Math.floor(_limit!)));
        }
        if (useLimit && useSkip) {
          sql = `${sql} OFFSET ?`;
          extraParams.push(Math.max(0, Math.floor(_skip!)));
        }
        const results = await this.adapter.query(sql, [
          ...params,
          ...extraParams,
        ]);
        return results.map((row: any) => {
          const instance = new (this as any)();
          Object.assign(instance, row);
          return instance as InstanceType<T>;
        });
      },
      findOne: async (): Promise<InstanceType<T> | null> => {
        await this.ensureInitialized();
        if (!this.adapter) {
          throw new Error(
            "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
          );
        }
        const { where, params } = this.buildWhereClause(
          _condition as any,
          _includeTrashed,
          _onlyTrashed,
        );
        const columns = _fields && _fields.length > 0
          ? _fields.join(", ")
          : "*";
        const orderBy = this.buildOrderByClause(_sort);
        let sql = `SELECT ${columns} FROM ${this.tableName} WHERE ${where}`;
        if (orderBy) {
          sql = `${sql} ORDER BY ${orderBy}`;
        }
        sql = `${sql} LIMIT 1`;
        const results = await this.adapter.query(sql, params);
        if (results.length === 0) {
          return null;
        }
        const instance = new (this as any)();
        Object.assign(instance, results[0]);
        return instance as InstanceType<T>;
      },
      one: async (): Promise<InstanceType<T> | null> => {
        return await builder.findOne();
      },
      all: async (): Promise<InstanceType<T>[]> => {
        return await builder.findAll();
      },
      count: async (): Promise<number> => {
        await this.ensureInitialized();
        if (!this.adapter) {
          throw new Error(
            "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
          );
        }
        const { where, params } = this.buildWhereClause(
          _condition as any,
          _includeTrashed,
          _onlyTrashed,
        );
        const sql =
          `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${where}`;
        const results = await this.adapter.query(sql, params);
        return results.length > 0 ? (parseInt(results[0].count) || 0) : 0;
      },
      exists: async (): Promise<boolean> => {
        await this.ensureInitialized();
        if (!this.adapter) {
          throw new Error(
            "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
          );
        }
        return await this.exists(
          _condition as any,
          _includeTrashed,
          _onlyTrashed,
        );
      },
      update: async (data: Record<string, any>): Promise<number> => {
        return await this.update(_condition as any, data);
      },
      updateMany: async (data: Record<string, any>): Promise<number> => {
        return await this.updateMany(_condition as any, data);
      },
      increment: async (field: string, amount: number = 1): Promise<number> => {
        const res = await this.increment(
          _condition as any,
          field,
          amount,
          false,
        );
        return typeof res === "number" ? res : 1;
      },
      decrement: async (field: string, amount: number = 1): Promise<number> => {
        const res = await this.decrement(
          _condition as any,
          field,
          amount,
          false,
        );
        return typeof res === "number" ? res : 1;
      },
      deleteMany: async (): Promise<number> => {
        return await this.deleteMany(_condition as any);
      },
      restore: async (
        options?: { returnIds?: boolean },
      ): Promise<number | { count: number; ids: any[] }> => {
        return await this.restore(_condition as any, options);
      },
      forceDelete: async (
        options?: { returnIds?: boolean },
      ): Promise<number | { count: number; ids: any[] }> => {
        return await this.forceDelete(_condition as any, options);
      },
      distinct: async (field: string): Promise<any[]> => {
        const cond =
          typeof _condition === "number" || typeof _condition === "string"
            ? { [this.primaryKey]: _condition }
            : (_condition as any);
        return await this.distinct(field, cond, _includeTrashed, _onlyTrashed);
      },
      upsert: async (data: Record<string, any>): Promise<InstanceType<T>> => {
        return await this.upsert(_condition as any, data);
      },
      findOrCreate: async (
        data: Record<string, any>,
      ): Promise<InstanceType<T>> => {
        const cond =
          typeof _condition === "number" || typeof _condition === "string"
            ? { [this.primaryKey]: _condition }
            : (_condition as any);
        return await this.findOrCreate(cond, data);
      },
      findOneAndUpdate: async (
        data: Record<string, any>,
      ): Promise<InstanceType<T> | null> => {
        const updated = await this.update(_condition as any, data);
        if (updated > 0) {
          return await this.find(
            _condition as any,
            _fields,
            _includeTrashed,
            _onlyTrashed,
          );
        }
        return null;
      },
      findOneAndDelete: async (): Promise<InstanceType<T> | null> => {
        const existing = await this.find(
          _condition as any,
          _fields,
          _includeTrashed,
          _onlyTrashed,
        );
        if (!existing) return null;
        const deleted = await this.delete(_condition as any);
        return deleted > 0 ? existing as InstanceType<T> : null;
      },
    };

    return builder as any;
  }

  /**
   * 恢复软删除的记录
   * @param condition 查询条件（可以是 ID、条件对象）
   * @returns 恢复的记录数
   *
   * @example
   * await User.restore(1);
   * await User.restore({ email: 'user@example.com' });
   */
  static async restore(
    condition: WhereCondition | number | string,
    options?: { returnIds?: boolean },
  ): Promise<number | { count: number; ids: any[] }> {
    if (!this.softDelete) {
      throw new Error("Soft delete is not enabled for this model");
    }
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const { where, params } = this.buildWhereClause(condition, true, true);

    let ids: any[] = [];
    if (options?.returnIds) {
      const rows = await this.adapter.query(
        `SELECT ${this.primaryKey} FROM ${this.tableName} WHERE ${where}`,
        params,
      );
      ids = rows.map((r: any) => r[this.primaryKey]).filter((v: any) =>
        v !== null && v !== undefined
      );
    }

    const result = await this.adapter.execute(
      `UPDATE ${this.tableName} SET ${this.deletedAtField} = NULL WHERE ${where}`,
      params,
    );

    const affectedRows = (typeof result === "number")
      ? result
      : ((result && typeof result === "object" && "affectedRows" in result)
        ? ((result as any).affectedRows || 0)
        : 0);

    if (options?.returnIds) {
      return { count: affectedRows, ids };
    }
    return affectedRows;
  }

  /**
   * 强制删除记录（忽略软删除，真正删除）
   * @param condition 查询条件（可以是 ID、条件对象）
   * @returns 删除的记录数
   *
   * @example
   * await User.forceDelete(1);
   * await User.forceDelete({ email: 'user@example.com' });
   */
  static async forceDelete(
    condition: WhereCondition | number | string,
    options?: { returnIds?: boolean },
  ): Promise<number | { count: number; ids: any[] }> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const { where, params } = this.buildWhereClause(condition, true, false);

    let ids: any[] = [];
    if (options?.returnIds) {
      const rows = await this.adapter.query(
        `SELECT ${this.primaryKey} FROM ${this.tableName} WHERE ${where}`,
        params,
      );
      ids = rows.map((r: any) => r[this.primaryKey]).filter((v: any) =>
        v !== null && v !== undefined
      );
    }

    const result = await this.adapter.execute(
      `DELETE FROM ${this.tableName} WHERE ${where}`,
      params,
    );

    const affectedRows = (typeof result === "number")
      ? result
      : ((result && typeof result === "object" && "affectedRows" in result)
        ? ((result as any).affectedRows || 0)
        : 0);

    if (options?.returnIds) {
      return { count: affectedRows, ids };
    }
    return affectedRows;
  }

  /**
   * 查找或创建记录（如果不存在则创建）
   * @param condition 查询条件（用于判断是否存在）
   * @param data 要创建的数据对象（如果不存在）
   * @returns 找到或创建的模型实例
   *
   * @example
   * const user = await User.findOrCreate(
   *   { email: 'user@example.com' },
   *   { name: 'John', email: 'user@example.com', age: 25 }
   * );
   */
  static async findOrCreate<T extends typeof SQLModel>(
    this: T,
    condition: WhereCondition,
    data: Record<string, any>,
  ): Promise<InstanceType<T>> {
    await this.ensureInitialized();
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
      );
    }

    // 先尝试查找
    const existing = await this.find(condition);
    if (existing) {
      return existing as InstanceType<T>;
    }

    // 如果不存在，创建新记录
    return await this.create(data);
  }

  /**
   * 清空表（删除所有记录）
   * @returns 删除的记录数
   *
   * @example
   * await User.truncate();
   */
  static async truncate(): Promise<number> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const sql = `TRUNCATE TABLE ${this.tableName}`;
    const result = await this.adapter.execute(sql, []);

    const affectedRows = (typeof result === "number")
      ? result
      : ((result && typeof result === "object" && "affectedRows" in result)
        ? ((result as any).affectedRows || 0)
        : 0);

    return affectedRows;
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
    fields?: string[],
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
  ): Promise<InstanceType<T> | null> {
    const Model = this.constructor as typeof SQLModel;
    if (!Model.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const relatedKey = localKey || RelatedModel.primaryKey;
    const foreignValue = (this as any)[foreignKey];

    if (!foreignValue) {
      return null;
    }

    return await RelatedModel.find(
      { [relatedKey]: foreignValue },
      fields,
      includeTrashed,
      onlyTrashed,
    );
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
    fields?: string[],
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
  ): Promise<InstanceType<T> | null> {
    const Model = this.constructor as typeof SQLModel;
    if (!Model.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const localKeyValue = localKey || Model.primaryKey;
    const localValue = (this as any)[localKeyValue];

    if (!localValue) {
      return null;
    }

    return await RelatedModel.find(
      { [foreignKey]: localValue },
      fields,
      includeTrashed,
      onlyTrashed,
    );
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
    fields?: string[],
    options?: {
      sort?: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc";
      skip?: number;
      limit?: number;
    },
  ): Promise<InstanceType<T>[]> {
    const Model = this.constructor as typeof SQLModel;
    if (!Model.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const localKeyValue = localKey || Model.primaryKey;
    const localValue = (this as any)[localKeyValue];

    if (!localValue) {
      return [];
    }

    return await RelatedModel.findAll(
      { [foreignKey]: localValue },
      fields,
      options,
    );
  }
}
