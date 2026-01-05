/**
 * MongoDB 模型基类
 * 提供 ODM 功能，支持对象条件查询和字段投影
 */

import type { DatabaseAdapter } from "../types.ts";
import type { MongoDBAdapter } from "../adapters/mongodb.ts";
import type {
  CompoundIndex,
  GeospatialIndex,
  IndexDefinitions,
  IndexDirection,
  SingleFieldIndex,
  TextIndex,
} from "../types/index.ts";

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
  static primaryKey: string = "_id";

  /**
   * 数据库适配器实例（子类需要设置，必须是 MongoDBAdapter）
   */
  static adapter: DatabaseAdapter | null = null;

  /**
   * 字段定义（可选，用于定义字段类型、默认值和验证规则）
   *
   * @example
   * static schema: ModelSchema = {
   *   name: {
   *     type: 'string',
   *     validate: { required: true, min: 2, max: 50 }
   *   },
   *   email: {
   *     type: 'string',
   *     validate: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
   *   },
   *   age: {
   *     type: 'number',
   *     validate: { min: 0, max: 150 }
   *   }
   * };
   */
  static schema?: ModelSchema;

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
   *
   * // 文本索引
   * static indexes = [
   *   { fields: { title: 10, content: 5 }, type: 'text' }
   * ];
   *
   * // 地理空间索引
   * static indexes = [
   *   { field: 'location', type: '2dsphere' }
   * ];
   */
  static indexes?: IndexDefinitions;

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
   *   published: () => ({ published: true, deletedAt: { $exists: false } }),
   *   recent: () => ({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
   * };
   *
   * // 使用
   * const activeUsers = await User.scope('active').findAll();
   */
  static scopes?: Record<string, () => MongoWhereCondition>;

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
   * 实例数据
   */
  [key: string]: any;

  /**
   * 缓存适配器（可选，用于查询结果缓存）
   */
  static cacheAdapter?: import("../cache/cache-adapter.ts").CacheAdapter;

  /**
   * 缓存 TTL（秒，默认 3600）
   */
  static cacheTTL: number = 3600;

  /**
   * 设置数据库适配器
   * @param adapter 数据库适配器实例（必须是 MongoDBAdapter）
   */
  static setAdapter(adapter: DatabaseAdapter): void {
    this.adapter = adapter;
  }

  /**
   * 初始化模型
   * 设置数据库适配器并创建索引（如果定义了索引）
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
      // 创建索引（如果定义了索引）
      if (this.indexes && this.indexes.length > 0) {
        await this.createIndexes();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to initialize model ${this.collectionName}: ${message}`,
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
   * 验证字段值
   * @param fieldName 字段名
   * @param value 字段值
   * @param fieldDef 字段定义
   * @throws ValidationError 验证失败时抛出
   */
  private static validateField(
    fieldName: string,
    value: any,
    fieldDef: FieldDefinition,
  ): void {
    const rule = fieldDef.validate;

    // 必填验证（优先检查字段定义中的 required，然后是验证规则中的）
    const isRequired = rule?.required || false;
    if (isRequired && (value === null || value === undefined || value === "")) {
      throw new ValidationError(
        fieldName,
        rule?.message || `${fieldName} is required`,
      );
    }

    // 如果值为空且不是必填，跳过其他验证
    if (value === null || value === undefined || value === "") {
      return;
    }

    // 枚举类型验证（优先检查字段定义中的 enum）
    if (fieldDef.type === "enum") {
      if (fieldDef.enum && !fieldDef.enum.includes(value)) {
        throw new ValidationError(
          fieldName,
          rule?.message ||
            `${fieldName} must be one of: ${fieldDef.enum.join(", ")}`,
        );
      }
    }

    // 类型验证
    if (fieldDef.type && fieldDef.type !== "enum") {
      const typeCheck = this.checkType(value, fieldDef.type);
      if (!typeCheck) {
        throw new ValidationError(
          fieldName,
          rule?.message || `${fieldName} must be of type ${fieldDef.type}`,
        );
      }
    }

    // 验证规则中的类型验证（如果字段定义中没有指定类型）
    if (rule?.type && !fieldDef.type) {
      const typeCheck = this.checkType(value, rule.type);
      if (!typeCheck) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} must be of type ${rule.type}`,
        );
      }
    }

    // 验证规则中的枚举验证（如果字段定义中没有指定枚举）
    if (rule?.enum && fieldDef.type !== "enum" && !rule.enum.includes(value)) {
      throw new ValidationError(
        fieldName,
        rule.message || `${fieldName} must be one of: ${rule.enum.join(", ")}`,
      );
    }

    // 字符串长度验证
    if (rule && typeof value === "string") {
      if (rule.length !== undefined && value.length !== rule.length) {
        throw new ValidationError(
          fieldName,
          rule.message ||
            `${fieldName} must be exactly ${rule.length} characters`,
        );
      }
      if (rule.min !== undefined && value.length < rule.min) {
        throw new ValidationError(
          fieldName,
          rule.message ||
            `${fieldName} must be at least ${rule.min} characters`,
        );
      }
      if (rule.max !== undefined && value.length > rule.max) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} must be at most ${rule.max} characters`,
        );
      }
    }

    // 数字范围验证
    if (rule && typeof value === "number") {
      if (rule.min !== undefined && value < rule.min) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} must be at least ${rule.min}`,
        );
      }
      if (rule.max !== undefined && value > rule.max) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} must be at most ${rule.max}`,
        );
      }
    }

    // 正则表达式验证
    if (rule?.pattern) {
      const regex = typeof rule.pattern === "string"
        ? new RegExp(rule.pattern)
        : rule.pattern;
      if (typeof value === "string" && !regex.test(value)) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} format is invalid`,
        );
      }
    }

    // 自定义验证
    if (rule?.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        throw new ValidationError(
          fieldName,
          rule.message ||
            (typeof result === "string"
              ? result
              : `${fieldName} validation failed`),
        );
      }
    }
  }

  /**
   * 检查值是否符合指定类型
   */
  private static checkType(value: any, type: FieldType): boolean {
    switch (type) {
      case "string": {
        return typeof value === "string";
      }
      case "number": {
        return typeof value === "number" && !isNaN(value);
      }
      case "bigint": {
        return typeof value === "bigint" ||
          (typeof value === "number" && Number.isInteger(value));
      }
      case "decimal": {
        return typeof value === "number" && !isNaN(value);
      }
      case "boolean": {
        return typeof value === "boolean";
      }
      case "date": {
        return value instanceof Date || !isNaN(Date.parse(value));
      }
      case "timestamp": {
        return typeof value === "number" && value > 0;
      }
      case "array": {
        return Array.isArray(value);
      }
      case "object": {
        return typeof value === "object" && value !== null &&
          !Array.isArray(value);
      }
      case "json": {
        // JSON 类型可以是对象或数组
        return typeof value === "object" && value !== null;
      }
      case "enum": {
        // 枚举类型检查在 validateField 中处理
        return true;
      }
      case "uuid": {
        // UUID 格式验证: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return typeof value === "string" && uuidRegex.test(value);
      }
      case "text": {
        return typeof value === "string";
      }
      case "binary": {
        // 检查是否为二进制数据类型
        if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
          return true;
        }
        // 在 Node.js 环境中检查 Buffer
        if (typeof globalThis !== "undefined" && "Buffer" in globalThis) {
          const Buffer = (globalThis as any).Buffer;
          if (Buffer && Buffer.isBuffer && Buffer.isBuffer(value)) {
            return true;
          }
        }
        return false;
      }
      case "any": {
        return true;
      }
      default: {
        return false;
      }
    }
  }

  /**
   * 处理字段值（应用默认值、类型转换、getter/setter）
   * @param data 原始数据
   * @returns 处理后的数据
   */
  private static processFields(data: Record<string, any>): Record<string, any> {
    const schema = this.schema;
    if (!schema) {
      return data;
    }

    const processed: Record<string, any> = {};

    // 处理已定义的字段
    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      let value = data[fieldName];

      // 应用默认值
      if (
        (value === null || value === undefined) &&
        fieldDef.default !== undefined
      ) {
        value = typeof fieldDef.default === "function"
          ? fieldDef.default()
          : fieldDef.default;
      }

      // 应用 setter
      if (value !== undefined && fieldDef.set) {
        value = fieldDef.set(value);
      }

      // 类型转换（枚举类型不需要转换）
      if (value !== undefined && fieldDef.type && fieldDef.type !== "enum") {
        value = this.convertType(value, fieldDef.type);
      }

      // 验证
      if (value !== undefined) {
        this.validateField(fieldName, value, fieldDef);
      }

      processed[fieldName] = value;
    }

    // 保留未定义的字段（如果存在）
    for (const [key, value] of Object.entries(data)) {
      if (!(key in processed)) {
        processed[key] = value;
      }
    }

    return processed;
  }

  /**
   * 类型转换
   */
  private static convertType(value: any, type: FieldType): any {
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
          return value === "true" || value === "1";
        }
        return Boolean(value);
      }
      case "date": {
        if (value instanceof Date) return value;
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date;
      }
      case "array": {
        return Array.isArray(value) ? value : [value];
      }
      case "object": {
        if (typeof value === "object" && !Array.isArray(value)) return value;
        try {
          return typeof value === "string" ? JSON.parse(value) : value;
        } catch {
          return value;
        }
      }
      case "json": {
        if (typeof value === "object" && value !== null) return value;
        try {
          return typeof value === "string" ? JSON.parse(value) : value;
        } catch {
          return value;
        }
      }
      case "enum": {
        // 枚举类型不需要转换，直接返回
        return value;
      }
      case "uuid": {
        // UUID 保持字符串格式
        return String(value);
      }
      case "text": {
        return String(value);
      }
      case "bigint": {
        if (typeof value === "bigint") return value;
        if (typeof value === "number" && Number.isInteger(value)) {
          return BigInt(value);
        }
        if (typeof value === "string") {
          const num = parseInt(value, 10);
          return !isNaN(num) ? BigInt(num) : value;
        }
        return value;
      }
      case "decimal": {
        const num = Number(value);
        return isNaN(num) ? value : num;
      }
      case "timestamp": {
        if (typeof value === "number") return value;
        if (value instanceof Date) return value.getTime();
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.getTime();
      }
      case "binary": {
        if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
          return value;
        }
        if (typeof value === "string") {
          // 尝试将字符串转换为 Uint8Array
          try {
            return new TextEncoder().encode(value);
          } catch {
            return value;
          }
        }
        return value;
      }
      default: {
        return value;
      }
    }
  }

  /**
   * 验证数据
   * @param data 要验证的数据
   * @throws ValidationError 验证失败时抛出
   */
  static validate(data: Record<string, any>): void {
    const schema = this.schema;
    if (!schema) {
      return;
    }

    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      const value = data[fieldName];
      this.validateField(fieldName, value, fieldDef);
    }
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
   * 应用软删除过滤（内部辅助）
   * @param filter 原始查询条件
   * @param includeTrashed 是否包含软删除
   * @param onlyTrashed 是否仅软删除
   */
  private static applySoftDeleteFilter(
    filter: Record<string, any>,
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
  ): Record<string, any> {
    if (!this.softDelete || includeTrashed) {
      return filter;
    }
    return {
      ...filter,
      [this.deletedAtField]: { $exists: onlyTrashed ? true : false },
    };
  }

  /**
   * 规范化排序参数（支持字符串 asc/desc）
   */
  private static normalizeSort(
    sort?: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc",
  ): Record<string, 1 | -1> | undefined {
    if (!sort) return undefined;
    if (typeof sort === "string") {
      const dir = sort.toLowerCase() === "desc" ? -1 : 1;
      return { [this.primaryKey]: dir };
    }
    const normalized: Record<string, 1 | -1> = {};
    for (const [field, dir] of Object.entries(sort)) {
      if (typeof dir === "string") {
        normalized[field] = dir.toLowerCase() === "desc" ? -1 : 1;
      } else {
        normalized[field] = dir;
      }
    }
    return normalized;
  }

  /**
   * 查询构建器（支持链式调用，可查找单条或多条记录）
   * @param condition 查询条件（可以是 ID、条件对象）
   * @param fields 要查询的字段数组（可选，用于字段投影）
   * @returns 查询构建器（支持链式调用，也可以直接 await）
   *
   * @example
   * // 直接查询单条记录（向后兼容）
   * const user = await User.find('507f1f77bcf86cd799439011');
   * const user = await User.find({ email: 'user@example.com' });
   *
   * // 链式调用查找单条记录
   * const user = await User.find({ status: 'active' }).sort({ createdAt: -1 });
   *
   * // 链式调用查找多条记录
   * const users = await User.find({ status: 'active' }).sort({ createdAt: -1 }).findAll();
   * const users = await User.find({ status: 'active' }).sort({ sort: -1 }).limit(10).findAll();
   */
  static find<T extends typeof MongoModel>(
    this: T,
    condition: MongoWhereCondition | string,
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
    const _condition: MongoWhereCondition | string = condition;
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

      const adapter = this.adapter as any as MongoDBAdapter;
      let filter: any = {};

      // 如果是字符串，作为主键查询
      if (typeof _condition === "string") {
        filter[this.primaryKey] = _condition;
      } else {
        filter = _condition;
      }

      const projection = this.buildProjection(_fields);
      const queryOptions: any = { limit: 1 };
      if (Object.keys(projection).length > 0) {
        queryOptions.projection = projection;
      }
      const normalizedSort = this.normalizeSort(_sort);
      if (normalizedSort) {
        queryOptions.sort = normalizedSort;
      }
      if (typeof _skip === "number") {
        queryOptions.skip = _skip;
      }
      if (typeof _limit === "number") {
        queryOptions.limit = _limit;
      }

      // 软删除：自动过滤已删除的记录（默认排除软删除）
      const queryFilter = this.applySoftDeleteFilter(
        filter,
        _includeTrashed,
        _onlyTrashed,
      );

      const results = await adapter.query(
        this.collectionName,
        queryFilter,
        queryOptions,
      );

      if (results.length === 0) {
        return null;
      }

      const instance = new (this as any)();
      Object.assign(instance, results[0]);

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
      const adapter = this.adapter as any as MongoDBAdapter;
      const projection = this.buildProjection(_fields);
      const queryOptions: any = {};
      if (Object.keys(projection).length > 0) {
        queryOptions.projection = projection;
      }
      const normalizedSort = this.normalizeSort(_sort);
      if (normalizedSort) {
        queryOptions.sort = normalizedSort;
      }
      if (typeof _skip === "number") {
        queryOptions.skip = _skip;
      }
      if (typeof _limit === "number") {
        queryOptions.limit = _limit;
      }

      let filter: any = {};
      if (typeof _condition === "string") {
        filter[this.primaryKey] = _condition;
      } else {
        filter = _condition;
      }
      const queryFilter = this.applySoftDeleteFilter(
        filter,
        _includeTrashed,
        _onlyTrashed,
      );

      const results = await adapter.query(
        this.collectionName,
        queryFilter,
        queryOptions,
      );

      return results.map((row: any) => {
        const instance = new (this as any)();
        Object.assign(instance, row);
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
        const adapter = this.adapter as any as MongoDBAdapter;
        const db = (adapter as any).getDatabase();
        if (!db) {
          throw new Error("Database not connected");
        }

        let filter: any = {};
        if (typeof _condition === "string") {
          filter[this.primaryKey] = _condition;
        } else {
          filter = _condition;
        }
        const queryFilter = this.applySoftDeleteFilter(
          filter,
          _includeTrashed,
          _onlyTrashed,
        );
        const count = await db.collection(this.collectionName).countDocuments(
          queryFilter,
        );
        return count;
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

    const adapter = this.adapter as any as MongoDBAdapter;
    const projection = this.buildProjection(fields);
    const queryOptions: any = {};
    if (Object.keys(projection).length > 0) {
      queryOptions.projection = projection;
    }
    const normalizedSort = this.normalizeSort(options?.sort);
    if (normalizedSort) {
      queryOptions.sort = normalizedSort;
    }
    if (typeof options?.skip === "number") {
      queryOptions.skip = options.skip;
    }
    if (typeof options?.limit === "number") {
      queryOptions.limit = options.limit;
    }

    // 软删除：自动过滤已删除的记录（默认排除软删除）
    const queryFilter = this.applySoftDeleteFilter(
      condition,
      includeTrashed,
      onlyTrashed,
    );

    const results = await adapter.query(
      this.collectionName,
      queryFilter,
      queryOptions,
    );

    return results.map((row: any) => {
      const instance = new (this as any)();
      Object.assign(instance, row);

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

      return instance as InstanceType<T>;
    });
  }

  /**
   * 应用查询作用域
   * @param scopeName 作用域名称
   * @returns 查询构建器（链式调用）
   *
   * @example
   * const activeUsers = await User.scope('active').findAll();
   */
  static scope(scopeName: string): {
    findAll: <T extends typeof MongoModel>(
      this: T,
      condition?: MongoWhereCondition,
      fields?: string[],
      options?: {
        sort?: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc";
        skip?: number;
        limit?: number;
      },
    ) => Promise<InstanceType<T>[]>;
    find: <T extends typeof MongoModel>(
      this: T,
      condition?: MongoWhereCondition | string,
      fields?: string[],
    ) => Promise<InstanceType<T> | null>;
    count: (condition?: MongoWhereCondition) => Promise<number>;
  } {
    if (!this.scopes || !this.scopes[scopeName]) {
      throw new Error(`Scope "${scopeName}" is not defined`);
    }

    const scopeCondition = this.scopes[scopeName]();

    return {
      findAll: async <T extends typeof MongoModel>(
        condition: MongoWhereCondition = {},
        fields?: string[],
        options?: {
          sort?: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc";
          skip?: number;
          limit?: number;
        },
      ): Promise<InstanceType<T>[]> => {
        return await this.findAll(
          { ...scopeCondition, ...condition },
          fields,
          options,
        ) as InstanceType<T>[];
      },
      find: async <T extends typeof MongoModel>(
        condition: MongoWhereCondition | string = {},
        fields?: string[],
      ): Promise<InstanceType<T> | null> => {
        if (typeof condition === "string") {
          return await this.find(condition, fields) as InstanceType<T> | null;
        }
        return await this.find({ ...scopeCondition, ...condition }, fields) as
          | InstanceType<T>
          | null;
      },
      count: async (condition: MongoWhereCondition = {}): Promise<number> => {
        return await this.count({ ...scopeCondition, ...condition });
      },
    };
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

    const adapter = this.adapter as any as MongoDBAdapter;
    const result = await adapter.execute(
      "insert",
      this.collectionName,
      processedData,
    );

    // MongoDB insert 返回结果包含 insertedId
    let insertedId: any = null;
    if (result && typeof result === "object") {
      if ("insertedId" in result) {
        insertedId = (result as any).insertedId;
      } else if ("_id" in processedData) {
        insertedId = processedData._id;
      }
    }

    const instance = new (this as any)();
    Object.assign(instance, processedData);
    if (insertedId != null) {
      (instance as any)[this.primaryKey] = insertedId;
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
   * await User.update('507f1f77bcf86cd799439011', { name: 'lisi' });
   * await User.update({ _id: '507f1f77bcf86cd799439011' }, { name: 'lisi' });
   * await User.update({ email: 'user@example.com' }, { name: 'lisi' });
   */
  static async update<T extends typeof MongoModel>(
    this: T,
    condition: MongoWhereCondition | string,
    data: Record<string, any>,
  ): Promise<number>;
  static async update<T extends typeof MongoModel>(
    this: T,
    condition: MongoWhereCondition | string,
    data: Record<string, any>,
    returnLatest: true,
    fields?: string[],
  ): Promise<InstanceType<T>>;
  static async update<T extends typeof MongoModel>(
    this: T,
    condition: MongoWhereCondition | string,
    data: Record<string, any>,
    returnLatest: boolean = false,
    fields?: string[],
  ): Promise<number | InstanceType<T>> {
    // 自动初始化（如果未初始化）
    await this.ensureInitialized();

    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
      );
    }

    // 先查找要更新的记录
    let existingInstance: InstanceType<typeof MongoModel> | null = null;
    if (typeof condition === "string") {
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

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    // 如果是字符串，作为主键查询
    if (typeof condition === "string") {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    if (this.softDelete) {
      filter = {
        ...filter,
        [this.deletedAtField]: { $exists: false },
      };
    }

    const db = (adapter as any).getDatabase();
    if (!db) {
      throw new Error("Database not connected");
    }
    if (returnLatest) {
      const projection = this.buildProjection(fields);
      const opts: any = { returnDocument: "after" };
      if (Object.keys(projection).length > 0) {
        opts.projection = projection;
      }
      const result = await db.collection(this.collectionName).findOneAndUpdate(
        filter,
        { $set: processedData },
        opts,
      );
      if (!result) {
        return 0;
      }
      const updatedInstance = new (this as any)();
      Object.assign(updatedInstance, result);
      if ((this as any).virtuals) {
        for (const [name, getter] of Object.entries((this as any).virtuals)) {
          const getterFn = getter as (instance: any) => any;
          Object.defineProperty(updatedInstance, name, {
            get: () => getterFn(updatedInstance),
            enumerable: true,
            configurable: true,
          });
        }
      }
      if (this.afterUpdate) {
        await this.afterUpdate(updatedInstance);
      }
      if (this.afterSave) {
        await this.afterSave(updatedInstance);
      }
      return updatedInstance as InstanceType<T>;
    } else {
      const result = await db.collection(this.collectionName).updateOne(
        filter,
        { $set: processedData },
      );
      const modifiedCount = result.modifiedCount || 0;
      if (modifiedCount > 0) {
        const updatedInstance = new (this as any)();
        Object.assign(updatedInstance, {
          ...existingInstance,
          ...processedData,
        });
        if (this.afterUpdate) {
          await this.afterUpdate(updatedInstance);
        }
        if (this.afterSave) {
          await this.afterSave(updatedInstance);
        }
      }
      return modifiedCount;
    }
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
    // 自动初始化（如果未初始化）
    await this.ensureInitialized();

    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
      );
    }

    // 先查找要删除的记录
    let instanceToDelete: InstanceType<typeof MongoModel> | null = null;
    if (typeof condition === "string") {
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

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    // 如果是字符串，作为主键查询
    if (typeof condition === "string") {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    // 软删除：设置 deletedAt 字段
    if (this.softDelete) {
      const result = await adapter.execute("update", this.collectionName, {
        filter,
        update: { $set: { [this.deletedAtField]: new Date() } },
      });
      const modifiedCount =
        (result && typeof result === "object" && "modifiedCount" in result)
          ? ((result as any).modifiedCount || 0)
          : 0;

      if (modifiedCount > 0 && this.afterDelete) {
        await this.afterDelete(instanceToDelete);
      }
      return modifiedCount;
    }

    // 硬删除：真正删除记录
    const result = await adapter.execute("delete", this.collectionName, {
      filter,
    });

    // MongoDB delete 返回结果包含 deletedCount
    const deletedCount =
      (result && typeof result === "object" && "deletedCount" in result)
        ? ((result as any).deletedCount || 0)
        : 0;

    if (deletedCount > 0 && this.afterDelete) {
      await this.afterDelete(instanceToDelete);
    }

    return deletedCount;
  }

  /**
   * 保存当前实例（插入或更新）
   * @returns 保存后的实例
   */
  async save<T extends MongoModel>(this: T): Promise<T> {
    const Model = this.constructor as typeof MongoModel;
    if (!Model.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const primaryKey = (Model.constructor as any).primaryKey || "_id";
    const id = (this as any)[primaryKey];

    if (id) {
      // 更新现有记录
      // 将实例对象转换为普通数据对象，排除主键字段
      const data: Record<string, any> = {};
      // 使用 Object.keys 避免 hasOwnProperty 的问题
      const keys = Object.keys(this);
      for (const key of keys) {
        if (key !== primaryKey) {
          const value = (this as any)[key];
          // 只包含数据属性，排除方法
          if (typeof value !== "function") {
            data[key] = value;
          }
        }
      }
      // 检查更新是否成功（受影响的行数 > 0）
      const affectedRows = await Model.update(id, data);
      if (affectedRows === 0) {
        throw new Error(
          `更新失败：未找到 ID 为 ${id} 的记录或记录已被删除`,
        );
      }
      // 重新查询更新后的数据，确保获取最新状态
      const updated = await Model.find(id);
      if (!updated) {
        throw new Error(`更新后无法找到 ID 为 ${id} 的记录`);
      }
      Object.assign(this, updated);
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
   * const user = await User.find('507f1f77bcf86cd799439011');
   * await user.update({ age: 26 });
   */
  async update<T extends MongoModel>(
    this: T,
    data: Record<string, any>,
  ): Promise<T> {
    const Model = this.constructor as typeof MongoModel;
    if (!Model.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const primaryKey = (Model.constructor as any).primaryKey || "_id";
    const id = (this as any)[primaryKey];

    if (!id) {
      throw new Error("Cannot update instance without primary key");
    }

    // 使用 returnLatest: true 获取更新后的实例
    const updated = await Model.update(
      Model.primaryKey === "_id" ? id : id,
      data,
      true,
    );
    if (!updated) {
      // 如果返回 null 或 0，表示更新失败
      throw new Error(
        `更新失败：未找到 ID 为 ${id} 的记录或记录已被删除`,
      );
    }
    // 更新成功，同步实例数据
    Object.assign(this, updated);
    return this;
  }

  /**
   * 删除当前实例
   * @returns 是否删除成功
   */
  async delete<T extends MongoModel>(this: T): Promise<boolean> {
    const Model = this.constructor as typeof MongoModel;
    if (!Model.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const primaryKey = (Model.constructor as any).primaryKey || "_id";
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
   * 通过主键 ID 更新记录
   * @param id 主键值
   * @param data 要更新的数据对象
   * @returns 更新的记录数
   *
   * @example
   * await User.updateById('507f1f77bcf86cd799439011', { name: 'lisi' });
   */
  static async updateById(
    id: string,
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
   * await User.deleteById('507f1f77bcf86cd799439011');
   */
  static async deleteById(
    id: string,
  ): Promise<number> {
    return await this.delete(id);
  }

  static async restoreById(id: string): Promise<number> {
    return await this.restore(id) as number;
  }

  static async forceDeleteById(id: string): Promise<number> {
    return await this.forceDelete(id) as number;
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
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    // 处理字段并设置时间戳
    const processedData = this.processFields(data);
    if (this.timestamps) {
      const updatedAtField = typeof this.timestamps === "object"
        ? (this.timestamps.updatedAt || "updatedAt")
        : "updatedAt";
      processedData[updatedAtField] = new Date();
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    // 如果是字符串，作为主键查询
    if (typeof condition === "string") {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    filter = this.applySoftDeleteFilter(filter);

    const result = await adapter.execute("updateMany", this.collectionName, {
      filter,
      update: processedData,
    });

    // MongoDB updateMany 返回结果包含 modifiedCount
    if (result && typeof result === "object" && "modifiedCount" in result) {
      return (result as any).modifiedCount || 0;
    }
    return 0;
  }

  /**
   * 批量自增字段
   * @param condition 查询条件（可以是 ID、条件对象）
   * @param fieldOrMap 字段名或字段-增量映射
   * @param amount 增量（当提供单个字段名时生效）
   */
  static async incrementMany(
    condition: MongoWhereCondition | string,
    fieldOrMap: string | Record<string, number>,
    amount: number = 1,
  ): Promise<number> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }
    const adapter = this.adapter as any as MongoDBAdapter;
    const db = (adapter as any).getDatabase();
    if (!db) {
      throw new Error("Database not connected");
    }
    let filter: any = {};
    if (typeof condition === "string") {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }
    filter = this.applySoftDeleteFilter(filter);
    const incSpec: Record<string, number> = typeof fieldOrMap === "string"
      ? { [fieldOrMap]: amount }
      : fieldOrMap;
    const update: any = { $inc: incSpec };
    if (this.timestamps) {
      const updatedAtField = typeof this.timestamps === "object"
        ? (this.timestamps.updatedAt || "updatedAt")
        : "updatedAt";
      update.$set = { [updatedAtField]: new Date() };
    }
    const result = await db.collection(this.collectionName).updateMany(
      filter,
      update,
    );
    return result.modifiedCount || 0;
  }

  /**
   * 批量自减字段
   * @param condition 查询条件（可以是 ID、条件对象）
   * @param fieldOrMap 字段名或字段-减量映射
   * @param amount 减量（当提供单个字段名时生效）
   */
  static async decrementMany(
    condition: MongoWhereCondition | string,
    fieldOrMap: string | Record<string, number>,
    amount: number = 1,
  ): Promise<number> {
    if (typeof fieldOrMap === "string") {
      return await this.incrementMany(condition, fieldOrMap, -amount);
    }
    const map: Record<string, number> = {};
    for (const [k, v] of Object.entries(fieldOrMap)) {
      map[k] = -Math.abs(v);
    }
    return await this.incrementMany(condition, map);
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
    options?: { returnIds?: boolean },
  ): Promise<number | { count: number; ids: any[] }> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    // 如果是字符串，作为主键查询
    if (typeof condition === "string") {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    // 软删除：批量设置 deletedAt 字段；否则执行物理删除
    if (this.softDelete) {
      const db = (adapter as any).getDatabase();
      if (!db) {
        throw new Error("Database not connected");
      }
      let ids: any[] = [];
      if (options?.returnIds) {
        ids = await db.collection(this.collectionName)
          .find(filter, { projection: { [this.primaryKey]: 1 } })
          .map((doc: any) => doc[this.primaryKey])
          .toArray();
      }
      const result = await db.collection(this.collectionName).updateMany(
        filter,
        { $set: { [this.deletedAtField]: new Date() } },
      );
      if (options?.returnIds) {
        return { count: result.modifiedCount || 0, ids };
      }
      return result.modifiedCount || 0;
    }

    let preIds: any[] = [];
    if (options?.returnIds) {
      const db = (adapter as any).getDatabase();
      if (!db) {
        throw new Error("Database not connected");
      }
      preIds = await db.collection(this.collectionName)
        .find(filter, { projection: { [this.primaryKey]: 1 } })
        .map((doc: any) => doc[this.primaryKey])
        .toArray();
    }
    const result = await adapter.execute(
      "deleteMany",
      this.collectionName,
      { filter },
    );

    // MongoDB deleteMany 返回结果包含 deletedCount
    const deletedCount =
      (result && typeof result === "object" && "deletedCount" in result)
        ? ((result as any).deletedCount || 0)
        : 0;
    if (options?.returnIds) {
      return { count: deletedCount, ids: preIds };
    }
    return deletedCount;
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
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
  ): Promise<number> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    const db = (adapter as any).getDatabase();

    if (!db) {
      throw new Error("Database not connected");
    }

    try {
      const queryFilter = this.applySoftDeleteFilter(
        condition,
        includeTrashed,
        onlyTrashed,
      );
      const count = await db.collection(this.collectionName).countDocuments(
        queryFilter,
      );
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
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
  ): Promise<boolean> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    // 如果是字符串，作为主键查询
    if (typeof condition === "string") {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    filter = this.applySoftDeleteFilter(filter, includeTrashed, onlyTrashed);

    const db = (adapter as any).getDatabase();

    if (!db) {
      throw new Error("Database not connected");
    }

    try {
      const count = await db.collection(this.collectionName).countDocuments(
        filter,
        { limit: 1 },
      );
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
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    // 处理每个数据项（应用默认值、类型转换、验证、时间戳与钩子）
    const processedArray = [];
    for (const data of dataArray) {
      let item = this.processFields(data);
      if (this.timestamps) {
        const createdAtField = typeof this.timestamps === "object"
          ? (this.timestamps.createdAt || "createdAt")
          : "createdAt";
        const updatedAtField = typeof this.timestamps === "object"
          ? (this.timestamps.updatedAt || "updatedAt")
          : "updatedAt";
        if (!item[createdAtField]) {
          item[createdAtField] = new Date();
        }
        if (!item[updatedAtField]) {
          item[updatedAtField] = new Date();
        }
      }
      const tempInstance = new (this as any)();
      Object.assign(tempInstance, item);
      if (this.beforeValidate) {
        await this.beforeValidate(tempInstance);
        item = { ...item, ...tempInstance };
      }
      if (this.afterValidate) {
        await this.afterValidate(tempInstance);
        item = { ...item, ...tempInstance };
      }
      if (this.beforeCreate) {
        await this.beforeCreate(tempInstance);
        item = { ...item, ...tempInstance };
      }
      if (this.beforeSave) {
        await this.beforeSave(tempInstance);
        item = { ...item, ...tempInstance };
      }
      processedArray.push(item);
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    const result = await adapter.execute(
      "insertMany",
      this.collectionName,
      processedArray,
    );

    // 构造实例并应用 insertedIds
    const instances: InstanceType<T>[] = [];
    const insertedIdsMap = (result && typeof result === "object" &&
        "insertedIds" in result)
      ? (result as any).insertedIds
      : undefined;
    for (let i = 0; i < processedArray.length; i++) {
      const instance = new (this as any)();
      const item = { ...processedArray[i] };
      const insertedId = insertedIdsMap ? insertedIdsMap[i] : undefined;
      if (insertedId != null) {
        (item as any)[this.primaryKey] = insertedId;
      }
      Object.assign(instance, item);
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
      if (this.afterCreate) {
        await this.afterCreate(instance);
      }
      if (this.afterSave) {
        await this.afterSave(instance);
      }
      instances.push(instance as InstanceType<T>);
    }
    return instances;
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
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
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

    const adapter = this.adapter as any as MongoDBAdapter;
    const db = (adapter as any).getDatabase();

    if (!db) {
      throw new Error("Database not connected");
    }

    // 确保页码和每页数量有效
    page = Math.max(1, Math.floor(page));
    pageSize = Math.max(1, Math.floor(pageSize));

    // 计算跳过数量
    const skip = (page - 1) * pageSize;

    // 统计总数
    const total = await this.count(condition, includeTrashed, onlyTrashed);

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
    const queryFilter = this.applySoftDeleteFilter(
      condition,
      includeTrashed,
      onlyTrashed,
    );
    const results = await adapter.query(
      this.collectionName,
      queryFilter,
      options,
    );

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
  static async increment<T extends typeof MongoModel>(
    this: T,
    condition: MongoWhereCondition | string,
    field: string,
    amount: number = 1,
    returnLatest: boolean = false,
    fields?: string[],
  ): Promise<number | InstanceType<T>> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    if (typeof condition === "string") {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    filter = this.applySoftDeleteFilter(filter);

    const db = (adapter as any).getDatabase();
    if (!db) {
      throw new Error("Database not connected");
    }

    try {
      if (returnLatest) {
        const projection = this.buildProjection(fields);
        const opts: any = { returnDocument: "after" };
        if (Object.keys(projection).length > 0) {
          opts.projection = projection;
        }
        const result = await db.collection(this.collectionName)
          .findOneAndUpdate(
            filter,
            { $inc: { [field]: amount } },
            opts,
          );
        if (!result) {
          return 0;
        }
        const instance = new (this as any)();
        Object.assign(instance, result);
        if ((this as any).virtuals) {
          for (const [name, getter] of Object.entries((this as any).virtuals)) {
            const getterFn = getter as (instance: any) => any;
            Object.defineProperty(instance, name, {
              get: () => getterFn(instance),
              enumerable: true,
              configurable: true,
            });
          }
        }
        return instance as InstanceType<T>;
      } else {
        const result = await db.collection(this.collectionName).updateOne(
          filter,
          { $inc: { [field]: amount } },
        );
        return result.modifiedCount || 0;
      }
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
  static async decrement<T extends typeof MongoModel>(
    this: T,
    condition: MongoWhereCondition | string,
    field: string,
    amount: number = 1,
    returnLatest: boolean = false,
    fields?: string[],
  ): Promise<number | InstanceType<T>> {
    return await this.increment(
      condition,
      field,
      -amount,
      returnLatest,
      fields,
    );
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
    options: { returnDocument?: "before" | "after" } = {
      returnDocument: "after",
    },
    fields?: string[],
  ): Promise<InstanceType<T> | null> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    if (typeof condition === "string") {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    filter = this.applySoftDeleteFilter(filter);

    const db = (adapter as any).getDatabase();
    if (!db) {
      throw new Error("Database not connected");
    }

    try {
      if (this.timestamps) {
        const updatedAtField = typeof this.timestamps === "object"
          ? (this.timestamps.updatedAt || "updatedAt")
          : "updatedAt";
        data = { ...data, [updatedAtField]: new Date() };
      }
      const projection = this.buildProjection(fields);
      const opts: any = { returnDocument: options.returnDocument || "after" };
      if (Object.keys(projection).length > 0) {
        opts.projection = projection;
      }
      const result = await db.collection(this.collectionName).findOneAndUpdate(
        filter,
        { $set: data },
        opts,
      );

      if (!result) {
        return null;
      }

      const instance = new (this as any)();
      Object.assign(instance, result);
      if ((this as any).virtuals) {
        for (const [name, getter] of Object.entries((this as any).virtuals)) {
          const getterFn = getter as (instance: any) => any;
          Object.defineProperty(instance, name, {
            get: () => getterFn(instance),
            enumerable: true,
            configurable: true,
          });
        }
      }
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
    fields?: string[],
  ): Promise<InstanceType<T> | null> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    if (typeof condition === "string") {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    const db = (adapter as any).getDatabase();
    if (!db) {
      throw new Error("Database not connected");
    }

    try {
      const projection = this.buildProjection(fields);
      const optsUpdate: any = { returnDocument: "after" };
      const optsDelete: any = {};
      if (Object.keys(projection).length > 0) {
        optsUpdate.projection = projection;
        optsDelete.projection = projection;
      }
      if (this.softDelete) {
        const result = await db.collection(this.collectionName)
          .findOneAndUpdate(
            filter,
            { $set: { [this.deletedAtField]: new Date() } },
            optsUpdate,
          );
        if (!result) {
          return null;
        }
        const instance = new (this as any)();
        Object.assign(instance, result);
        if ((this as any).virtuals) {
          for (const [name, getter] of Object.entries((this as any).virtuals)) {
            const getterFn = getter as (instance: any) => any;
            Object.defineProperty(instance, name, {
              get: () => getterFn(instance),
              enumerable: true,
              configurable: true,
            });
          }
        }
        return instance as InstanceType<T>;
      } else {
        const result = await db.collection(this.collectionName)
          .findOneAndDelete(
            filter,
            optsDelete,
          );
        if (!result) {
          return null;
        }
        const instance = new (this as any)();
        Object.assign(instance, result);
        if ((this as any).virtuals) {
          for (const [name, getter] of Object.entries((this as any).virtuals)) {
            const getterFn = getter as (instance: any) => any;
            Object.defineProperty(instance, name, {
              get: () => getterFn(instance),
              enumerable: true,
              configurable: true,
            });
          }
        }
        return instance as InstanceType<T>;
      }
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
    returnLatest: boolean = true,
    resurrect: boolean = false,
    fields?: string[],
  ): Promise<InstanceType<T>> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    if (typeof condition === "string") {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    if (!resurrect) {
      filter = this.applySoftDeleteFilter(filter);
    }

    const db = (adapter as any).getDatabase();
    if (!db) {
      throw new Error("Database not connected");
    }

    try {
      const projection = this.buildProjection(fields);
      const opts: any = {
        upsert: true,
        returnDocument: returnLatest ? "after" : "before",
      };
      if (Object.keys(projection).length > 0) {
        opts.projection = projection;
      }
      const result = await db.collection(this.collectionName).findOneAndUpdate(
        filter,
        {
          $set: data,
          ...(resurrect && this.softDelete
            ? { $unset: { [this.deletedAtField]: "" } }
            : {}),
        },
        opts,
      );

      const instance = new (this as any)();
      Object.assign(instance, result);
      return instance as InstanceType<T>;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB upsert error: ${message}`);
    }
  }

  static async findOneAndReplace<T extends typeof MongoModel>(
    this: T,
    condition: MongoWhereCondition | string,
    replacement: Record<string, any>,
    returnLatest: boolean = true,
    fields?: string[],
  ): Promise<InstanceType<T> | null> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    if (typeof condition === "string") {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    filter = this.applySoftDeleteFilter(filter);

    const db = (adapter as any).getDatabase();
    if (!db) {
      throw new Error("Database not connected");
    }

    try {
      if (this.timestamps) {
        const updatedAtField = typeof this.timestamps === "object"
          ? (this.timestamps.updatedAt || "updatedAt")
          : "updatedAt";
        replacement = { ...replacement, [updatedAtField]: new Date() };
      }
      const projection = this.buildProjection(fields);
      const opts: any = { returnDocument: returnLatest ? "after" : "before" };
      if (Object.keys(projection).length > 0) {
        opts.projection = projection;
      }
      const result = await db.collection(this.collectionName).findOneAndReplace(
        filter,
        replacement,
        opts,
      );
      if (!result) {
        return null;
      }
      const instance = new (this as any)();
      Object.assign(instance, result);
      if ((this as any).virtuals) {
        for (const [name, getter] of Object.entries((this as any).virtuals)) {
          const getterFn = getter as (instance: any) => any;
          Object.defineProperty(instance, name, {
            get: () => getterFn(instance),
            enumerable: true,
            configurable: true,
          });
        }
      }
      return instance as InstanceType<T>;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB findOneAndReplace error: ${message}`);
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
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
  ): Promise<any[]> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    const db = (adapter as any).getDatabase();

    if (!db) {
      throw new Error("Database not connected");
    }

    try {
      const queryFilter = this.applySoftDeleteFilter(
        condition,
        includeTrashed,
        onlyTrashed,
      );
      const values = await db.collection(this.collectionName).distinct(
        field,
        queryFilter,
      );
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
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
  ): Promise<any[]> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    const db = (adapter as any).getDatabase();

    if (!db) {
      throw new Error("Database not connected");
    }

    try {
      let effectivePipeline = pipeline;
      if (this.softDelete && !includeTrashed) {
        const match = onlyTrashed
          ? { [this.deletedAtField]: { $exists: true } }
          : { [this.deletedAtField]: { $exists: false } };
        effectivePipeline = [{ $match: match }, ...pipeline];
      }
      const results = await db.collection(this.collectionName).aggregate(
        effectivePipeline,
      ).toArray();
      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB aggregate error: ${message}`);
    }
  }

  /**
   * 查询时包含已软删除的记录
   * @returns 查询构建器（链式调用）
   *
   * @example
   * const allUsers = await User.withTrashed().findAll();
   * const user = await User.withTrashed().find('507f1f77bcf86cd799439011');
   */
  static onlyTrashed<T extends typeof MongoModel>(this: T): {
    findAll: (
      condition?: MongoWhereCondition,
      fields?: string[],
      options?: {
        sort?: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc";
        skip?: number;
        limit?: number;
      },
    ) => Promise<InstanceType<T>[]>;
    find: (
      condition?: MongoWhereCondition | string,
      fields?: string[],
    ) => Promise<InstanceType<T> | null>;
    count: (condition?: MongoWhereCondition) => Promise<number>;
  } {
    return {
      findAll: async (
        condition: MongoWhereCondition = {},
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
        const adapter = this.adapter as any as MongoDBAdapter;
        const projection = this.buildProjection(fields);
        const queryOptions: any = {};
        if (Object.keys(projection).length > 0) {
          queryOptions.projection = projection;
        }
        const normalizedSort = this.normalizeSort(options?.sort);
        if (normalizedSort) {
          queryOptions.sort = normalizedSort;
        }
        if (typeof options?.skip === "number") {
          queryOptions.skip = options.skip;
        }
        if (typeof options?.limit === "number") {
          queryOptions.limit = options.limit;
        }
        const results = await adapter.query(
          this.collectionName,
          condition,
          queryOptions,
        );
        return results.map((row: any) => {
          const instance = new (this as any)();
          Object.assign(instance, row);
          if ((this as any).virtuals) {
            for (
              const [name, getter] of Object.entries((this as any).virtuals)
            ) {
              const getterFn = getter as (instance: any) => any;
              Object.defineProperty(instance, name, {
                get: () => getterFn(instance),
                enumerable: true,
                configurable: true,
              });
            }
          }
          return instance as InstanceType<T>;
        });
      },
      find: async (
        condition: MongoWhereCondition | string = {},
        fields?: string[],
      ): Promise<InstanceType<T> | null> => {
        await this.ensureInitialized();
        if (!this.adapter) {
          throw new Error(
            "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
          );
        }
        const adapter = this.adapter as any as MongoDBAdapter;
        let filter: any = {};
        if (typeof condition === "string") {
          filter[this.primaryKey] = condition;
        } else {
          filter = condition;
        }
        const projection = this.buildProjection(fields);
        const options: any = { limit: 1 };
        if (Object.keys(projection).length > 0) {
          options.projection = projection;
        }
        const results = await adapter.query(
          this.collectionName,
          filter,
          options,
        );
        if (results.length === 0) {
          return null;
        }
        const instance = new (this as any)();
        Object.assign(instance, results[0]);
        if ((this as any).virtuals) {
          for (const [name, getter] of Object.entries((this as any).virtuals)) {
            const getterFn = getter as (instance: any) => any;
            Object.defineProperty(instance, name, {
              get: () => getterFn(instance),
              enumerable: true,
              configurable: true,
            });
          }
        }
        return instance as InstanceType<T>;
      },
      count: async (condition: MongoWhereCondition = {}): Promise<number> => {
        await this.ensureInitialized();
        if (!this.adapter) {
          throw new Error(
            "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
          );
        }
        const adapter = this.adapter as any as MongoDBAdapter;
        const db = (adapter as any).getDatabase();
        if (!db) {
          throw new Error("Database not connected");
        }
        const count = await db.collection(this.collectionName).countDocuments(
          condition,
        );
        return count;
      },
    };
  }

  /**
   * 只查询已软删除的记录
   * @returns 查询构建器（链式调用）
   *
   * @example
   * const deletedUsers = await User.onlyTrashed().findAll();
   * const user = await User.onlyTrashed().find('507f1f77bcf86cd799439011');
   */
  static withTrashed<T extends typeof MongoModel>(this: T): {
    findAll: (
      condition?: MongoWhereCondition,
      fields?: string[],
      options?: {
        sort?: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc";
        skip?: number;
        limit?: number;
      },
    ) => Promise<InstanceType<T>[]>;
    find: (
      condition?: MongoWhereCondition | string,
      fields?: string[],
    ) => Promise<InstanceType<T> | null>;
    count: (condition?: MongoWhereCondition) => Promise<number>;
  } {
    return {
      findAll: async (
        condition: MongoWhereCondition = {},
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
        const adapter = this.adapter as any as MongoDBAdapter;
        const projection = this.buildProjection(fields);
        const queryOptions: any = {};
        if (Object.keys(projection).length > 0) {
          queryOptions.projection = projection;
        }
        const normalizedSort = this.normalizeSort(options?.sort);
        if (normalizedSort) {
          queryOptions.sort = normalizedSort;
        }
        if (typeof options?.skip === "number") {
          queryOptions.skip = options.skip;
        }
        if (typeof options?.limit === "number") {
          queryOptions.limit = options.limit;
        }
        const queryFilter = {
          ...condition,
          [this.deletedAtField]: { $exists: true },
        };
        const results = await adapter.query(
          this.collectionName,
          queryFilter,
          queryOptions,
        );
        return results.map((row: any) => {
          const instance = new (this as any)();
          Object.assign(instance, row);
          if ((this as any).virtuals) {
            for (
              const [name, getter] of Object.entries((this as any).virtuals)
            ) {
              const getterFn = getter as (instance: any) => any;
              Object.defineProperty(instance, name, {
                get: () => getterFn(instance),
                enumerable: true,
                configurable: true,
              });
            }
          }
          return instance as InstanceType<T>;
        });
      },
      find: async (
        condition: MongoWhereCondition | string = {},
        fields?: string[],
      ): Promise<InstanceType<T> | null> => {
        await this.ensureInitialized();
        if (!this.adapter) {
          throw new Error(
            "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
          );
        }
        const adapter = this.adapter as any as MongoDBAdapter;
        let filter: any = {};
        if (typeof condition === "string") {
          filter[this.primaryKey] = condition;
        } else {
          filter = condition;
        }
        filter[this.deletedAtField] = { $exists: true };
        const projection = this.buildProjection(fields);
        const options: any = { limit: 1 };
        if (Object.keys(projection).length > 0) {
          options.projection = projection;
        }
        const results = await adapter.query(
          this.collectionName,
          filter,
          options,
        );
        if (results.length === 0) {
          return null;
        }
        const instance = new (this as any)();
        Object.assign(instance, results[0]);
        if ((this as any).virtuals) {
          for (const [name, getter] of Object.entries((this as any).virtuals)) {
            const getterFn = getter as (instance: any) => any;
            Object.defineProperty(instance, name, {
              get: () => getterFn(instance),
              enumerable: true,
              configurable: true,
            });
          }
        }
        return instance as InstanceType<T>;
      },
      count: async (condition: MongoWhereCondition = {}): Promise<number> => {
        await this.ensureInitialized();
        if (!this.adapter) {
          throw new Error(
            "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
          );
        }
        const adapter = this.adapter as any as MongoDBAdapter;
        const db = (adapter as any).getDatabase();
        if (!db) {
          throw new Error("Database not connected");
        }
        const queryFilter = {
          ...condition,
          [this.deletedAtField]: { $exists: true },
        };
        const count = await db.collection(this.collectionName).countDocuments(
          queryFilter,
        );
        return count;
      },
    };
  }

  /**
   * 恢复软删除的记录
   * @param condition 查询条件（可以是 ID、条件对象）
   * @returns 恢复的记录数
   *
   * @example
   * await User.restore('507f1f77bcf86cd799439011');
   * await User.restore({ email: 'user@example.com' });
   */
  static async restore(
    condition: MongoWhereCondition | string,
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

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    if (typeof condition === "string") {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    // 只恢复已软删除的记录
    filter[this.deletedAtField] = { $exists: true };

    const db = (adapter as any).getDatabase();
    if (!db) {
      throw new Error("Database not connected");
    }

    try {
      let ids: any[] = [];
      if (options?.returnIds) {
        ids = await db.collection(this.collectionName)
          .find(filter, { projection: { [this.primaryKey]: 1 } })
          .map((doc: any) => doc[this.primaryKey])
          .toArray();
      }
      const result = await db.collection(this.collectionName).updateMany(
        filter,
        { $unset: { [this.deletedAtField]: "" } },
      );
      const count = result.modifiedCount || 0;
      if (options?.returnIds) {
        return { count, ids };
      }
      return count;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB restore error: ${message}`);
    }
  }

  /**
   * 强制删除记录（忽略软删除，真正删除）
   * @param condition 查询条件（可以是 ID、条件对象）
   * @returns 删除的记录数
   *
   * @example
   * await User.forceDelete('507f1f77bcf86cd799439011');
   * await User.forceDelete({ email: 'user@example.com' });
   */
  static async forceDelete(
    condition: MongoWhereCondition | string,
    options?: { returnIds?: boolean },
  ): Promise<number | { count: number; ids: any[] }> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    let filter: any = {};

    if (typeof condition === "string") {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    const db = (adapter as any).getDatabase();
    if (!db) {
      throw new Error("Database not connected");
    }

    try {
      let ids: any[] = [];
      if (options?.returnIds) {
        ids = await db.collection(this.collectionName)
          .find(filter, { projection: { [this.primaryKey]: 1 } })
          .map((doc: any) => doc[this.primaryKey])
          .toArray();
      }
      const result = await db.collection(this.collectionName).deleteMany(
        filter,
      );
      const count = result.deletedCount || 0;
      if (options?.returnIds) {
        return { count, ids };
      }
      return count;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB forceDelete error: ${message}`);
    }
  }

  /**
   * 链式查询构建器
   * @example
   * const rows = await User.query()
   *   .where({ status: 'active' })
   *   .fields(['_id', 'name'])
   *   .sort({ createdAt: 'desc' })
   *   .skip(10)
   *   .limit(20)
   *   .findAll();
   */
  static query<T extends typeof MongoModel>(this: T): {
    where: (condition: MongoWhereCondition | string) => ReturnType<T["query"]>;
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
    update: (
      data: Record<string, any>,
      returnLatest?: boolean,
    ) => Promise<number | InstanceType<T>>;
    updateMany: (data: Record<string, any>) => Promise<number>;
    increment: (
      field: string,
      amount?: number,
      returnLatest?: boolean,
    ) => Promise<number | InstanceType<T>>;
    decrement: (
      field: string,
      amount?: number,
      returnLatest?: boolean,
    ) => Promise<number | InstanceType<T>>;
    deleteMany: (
      options?: { returnIds?: boolean },
    ) => Promise<number | { count: number; ids: any[] }>;
    restore: (
      options?: { returnIds?: boolean },
    ) => Promise<number | { count: number; ids: any[] }>;
    forceDelete: (
      options?: { returnIds?: boolean },
    ) => Promise<number | { count: number; ids: any[] }>;
    distinct: (field: string) => Promise<any[]>;
    aggregate: (pipeline: any[]) => Promise<any[]>;
    findOneAndUpdate: (
      data: Record<string, any>,
      options?: { returnDocument?: "before" | "after" },
    ) => Promise<InstanceType<T> | null>;
    findOneAndDelete: () => Promise<InstanceType<T> | null>;
    findOneAndReplace: (
      replacement: Record<string, any>,
      returnLatest?: boolean,
    ) => Promise<InstanceType<T> | null>;
    upsert: (
      data: Record<string, any>,
      returnLatest?: boolean,
      resurrect?: boolean,
    ) => Promise<InstanceType<T>>;
    findOrCreate: (
      data: Record<string, any>,
      resurrect?: boolean,
    ) => Promise<InstanceType<T>>;
    incrementMany: (
      fieldOrMap: string | Record<string, number>,
      amount?: number,
    ) => Promise<number>;
    decrementMany: (
      fieldOrMap: string | Record<string, number>,
      amount?: number,
    ) => Promise<number>;
  } {
    let _condition: MongoWhereCondition | string = {};
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
      where: (condition: MongoWhereCondition | string) => {
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
        const adapter = this.adapter as any as MongoDBAdapter;
        const projection = this.buildProjection(_fields);
        const queryOptions: any = {};
        if (Object.keys(projection).length > 0) {
          queryOptions.projection = projection;
        }
        const normalizedSort = this.normalizeSort(_sort);
        if (normalizedSort) {
          queryOptions.sort = normalizedSort;
        }
        if (typeof _skip === "number") {
          queryOptions.skip = _skip;
        }
        if (typeof _limit === "number") {
          queryOptions.limit = _limit;
        }

        let filter: any = {};
        if (typeof _condition === "string") {
          filter[this.primaryKey] = _condition;
        } else {
          filter = _condition;
        }
        const queryFilter = this.applySoftDeleteFilter(
          filter,
          _includeTrashed,
          _onlyTrashed,
        );

        const results = await adapter.query(
          this.collectionName,
          queryFilter,
          queryOptions,
        );

        return results.map((row: any) => {
          const instance = new (this as any)();
          Object.assign(instance, row);
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
        const adapter = this.adapter as any as MongoDBAdapter;
        const projection = this.buildProjection(_fields);
        const queryOptions: any = { limit: 1 };
        if (Object.keys(projection).length > 0) {
          queryOptions.projection = projection;
        }
        const normalizedSort = this.normalizeSort(_sort);
        if (normalizedSort) {
          queryOptions.sort = normalizedSort;
        }

        let filter: any = {};
        if (typeof _condition === "string") {
          filter[this.primaryKey] = _condition;
        } else {
          filter = _condition;
        }
        const queryFilter = this.applySoftDeleteFilter(
          filter,
          _includeTrashed,
          _onlyTrashed,
        );

        const results = await adapter.query(
          this.collectionName,
          queryFilter,
          queryOptions,
        );
        if (results.length === 0) {
          return null;
        }
        const instance = new (this as any)();
        Object.assign(instance, results[0]);
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
        const adapter = this.adapter as any as MongoDBAdapter;
        const db = (adapter as any).getDatabase();
        if (!db) {
          throw new Error("Database not connected");
        }

        let filter: any = {};
        if (typeof _condition === "string") {
          filter[this.primaryKey] = _condition;
        } else {
          filter = _condition;
        }
        const queryFilter = this.applySoftDeleteFilter(
          filter,
          _includeTrashed,
          _onlyTrashed,
        );
        const count = await db.collection(this.collectionName).countDocuments(
          queryFilter,
        );
        return count;
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
      update: async (
        data: Record<string, any>,
        returnLatest: boolean = false,
      ): Promise<number | InstanceType<T>> => {
        if (returnLatest) {
          return await this.update(
            _condition as any,
            data,
            true,
            _fields,
          );
        }
        return await this.update(_condition as any, data);
      },
      updateMany: async (data: Record<string, any>): Promise<number> => {
        return await this.updateMany(_condition as any, data);
      },
      increment: async (
        field: string,
        amount: number = 1,
        returnLatest: boolean = false,
      ): Promise<number | InstanceType<T>> => {
        return await this.increment(
          _condition as any,
          field,
          amount,
          returnLatest,
          _fields,
        );
      },
      decrement: async (
        field: string,
        amount: number = 1,
        returnLatest: boolean = false,
      ): Promise<number | InstanceType<T>> => {
        return await this.decrement(
          _condition as any,
          field,
          amount,
          returnLatest,
          _fields,
        );
      },
      deleteMany: async (
        options?: { returnIds?: boolean },
      ): Promise<number | { count: number; ids: any[] }> => {
        return await this.deleteMany(_condition as any, options);
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
        const cond = typeof _condition === "string"
          ? { [this.primaryKey]: _condition }
          : (_condition as any);
        return await this.distinct(field, cond, _includeTrashed, _onlyTrashed);
      },
      aggregate: async (pipeline: any[]): Promise<any[]> => {
        let match: any = {};
        if (typeof _condition === "string") {
          match[this.primaryKey] = _condition;
        } else if (_condition && Object.keys(_condition).length > 0) {
          match = _condition;
        }
        const effective = Object.keys(match).length > 0
          ? [{ $match: match }, ...pipeline]
          : pipeline;
        return await this.aggregate(effective, _includeTrashed, _onlyTrashed);
      },
      findOneAndUpdate: async (
        data: Record<string, any>,
        options?: { returnDocument?: "before" | "after" },
      ): Promise<InstanceType<T> | null> => {
        return await this.findOneAndUpdate(
          _condition as any,
          data,
          options ?? { returnDocument: "after" },
          _fields,
        );
      },
      findOneAndDelete: async (): Promise<InstanceType<T> | null> => {
        return await this.findOneAndDelete(_condition as any, _fields);
      },
      findOneAndReplace: async (
        replacement: Record<string, any>,
        returnLatest: boolean = true,
      ): Promise<InstanceType<T> | null> => {
        return await this.findOneAndReplace(
          _condition as any,
          replacement,
          returnLatest,
          _fields,
        );
      },
      upsert: async (
        data: Record<string, any>,
        returnLatest: boolean = true,
        resurrect: boolean = false,
      ): Promise<InstanceType<T>> => {
        return await this.upsert(
          _condition as any,
          data,
          returnLatest,
          resurrect,
          _fields,
        );
      },
      findOrCreate: async (
        data: Record<string, any>,
        resurrect: boolean = false,
      ): Promise<InstanceType<T>> => {
        const cond = typeof _condition === "string"
          ? { [this.primaryKey]: _condition }
          : (_condition as any);
        return await this.findOrCreate(cond, data, resurrect, _fields);
      },
      incrementMany: async (
        fieldOrMap: string | Record<string, number>,
        amount: number = 1,
      ): Promise<number> => {
        return await this.incrementMany(_condition as any, fieldOrMap, amount);
      },
      decrementMany: async (
        fieldOrMap: string | Record<string, number>,
        amount: number = 1,
      ): Promise<number> => {
        return await this.decrementMany(_condition as any, fieldOrMap, amount);
      },
    };

    return builder as any;
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
  static async findOrCreate<T extends typeof MongoModel>(
    this: T,
    condition: MongoWhereCondition,
    data: Record<string, any>,
    resurrect: boolean = false,
    fields?: string[],
  ): Promise<InstanceType<T>> {
    await this.ensureInitialized();
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.",
      );
    }

    // 先尝试查找（包含软删除的记录）
    const existing = await this.withTrashed().find(condition, fields);
    if (existing) {
      if (resurrect && this.softDelete) {
        const id = (existing as any)[this.primaryKey];
        if (id) {
          await this.restore(id);
          const latest = await this.find(id, fields);
          if (latest) {
            return latest as InstanceType<T>;
          }
        }
      }
      return existing as InstanceType<T>;
    }

    // 如果不存在，创建新记录
    return await this.create(data);
  }

  /**
   * 清空集合（删除所有记录）
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

    const adapter = this.adapter as any as MongoDBAdapter;
    const db = (adapter as any).getDatabase();
    if (!db) {
      throw new Error("Database not connected");
    }

    try {
      const result = await db.collection(this.collectionName).deleteMany({});
      return result.deletedCount || 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`MongoDB truncate error: ${message}`);
    }
  }

  /**
   * 在事务中执行一段逻辑（需要 MongoDB 事务支持）
   * @param callback 事务回调，传入当前模型绑定的适配器
   * @returns 回调的返回值
   *
   * @example
   * await User.transaction(async (db) => {
   *   await User.update({ _id: id }, { name: 'tx' });
   *   await Profile.update({ userId: id }, { nickname: 'tx-nick' });
   * });
   */
  static async transaction<T>(
    callback: (db: DatabaseAdapter) => Promise<T>,
  ): Promise<T> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }
    const adapter = this.adapter as any as MongoDBAdapter;
    return await adapter.transaction(callback);
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
   * class Post extends MongoModel {
   *   static collectionName = 'posts';
   *   async user() {
   *     return await this.belongsTo(User, 'userId', '_id');
   *   }
   * }
   * const post = await Post.find('...');
   * const user = await post.user();
   */
  async belongsTo<T extends typeof MongoModel>(
    RelatedModel: T,
    foreignKey: string,
    localKey?: string,
    fields?: string[],
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
  ): Promise<InstanceType<T> | null> {
    const Model = this.constructor as typeof MongoModel;
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
   * class User extends MongoModel {
   *   static collectionName = 'users';
   *   async profile() {
   *     return await this.hasOne(Profile, 'userId', '_id');
   *   }
   * }
   * const user = await User.find('...');
   * const profile = await user.profile();
   */
  async hasOne<T extends typeof MongoModel>(
    RelatedModel: T,
    foreignKey: string,
    localKey?: string,
    fields?: string[],
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
  ): Promise<InstanceType<T> | null> {
    const Model = this.constructor as typeof MongoModel;
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
   * class User extends MongoModel {
   *   static collectionName = 'users';
   *   async posts() {
   *     return await this.hasMany(Post, 'userId', '_id');
   *   }
   * }
   * const user = await User.find('...');
   * const posts = await user.posts();
   */
  async hasMany<T extends typeof MongoModel>(
    RelatedModel: T,
    foreignKey: string,
    localKey?: string,
    fields?: string[],
    options?: {
      sort?: Record<string, 1 | -1 | "asc" | "desc"> | "asc" | "desc";
      skip?: number;
      limit?: number;
    },
    includeTrashed: boolean = false,
    onlyTrashed: boolean = false,
  ): Promise<InstanceType<T>[]> {
    const Model = this.constructor as typeof MongoModel;
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
      includeTrashed,
      onlyTrashed,
    );
  }

  /**
   * 创建索引（如果未定义则自动创建）
   * @param force 是否强制重新创建（删除后重建）
   * @returns 创建的索引信息数组
   *
   * @example
   * await User.createIndexes(); // 创建所有定义的索引
   * await User.createIndexes(true); // 强制重新创建
   */
  static async createIndexes(force: boolean = false): Promise<string[]> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    if (!this.indexes || this.indexes.length === 0) {
      return [];
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    const db = adapter.getDatabase();
    if (!db) {
      throw new Error("Database not connected");
    }

    const collection = db.collection(this.collectionName);
    const createdIndexes: string[] = [];

    for (const indexDef of this.indexes) {
      try {
        let indexSpec: any;
        const indexOptions: any = {};

        // 判断索引类型
        if (
          "field" in indexDef &&
          !("type" in indexDef &&
            (indexDef.type === "2d" || indexDef.type === "2dsphere"))
        ) {
          // 单个字段索引
          const singleIndex = indexDef as SingleFieldIndex;
          const direction = this.normalizeDirection(singleIndex.direction || 1);
          indexSpec = { [singleIndex.field]: direction };

          if (singleIndex.unique) {
            indexOptions.unique = true;
          }
          if (singleIndex.sparse) {
            indexOptions.sparse = true;
          }
          if (singleIndex.name) {
            indexOptions.name = singleIndex.name;
          }
        } else if (
          "fields" in indexDef && "type" in indexDef && indexDef.type === "text"
        ) {
          // 文本索引
          const textIndex = indexDef as TextIndex;
          indexSpec = {};
          for (const field of Object.keys(textIndex.fields)) {
            indexSpec[field] = "text";
          }
          indexOptions.weights = textIndex.fields;
          if (textIndex.defaultLanguage) {
            indexOptions.default_language = textIndex.defaultLanguage;
          }
          if (textIndex.name) {
            indexOptions.name = textIndex.name;
          }
        } else if (
          "field" in indexDef && "type" in indexDef &&
          (indexDef.type === "2d" || indexDef.type === "2dsphere")
        ) {
          // 地理空间索引
          const geoIndex = indexDef as GeospatialIndex;
          indexSpec = { [geoIndex.field]: geoIndex.type };
          if (geoIndex.name) {
            indexOptions.name = geoIndex.name;
          }
        } else if ("fields" in indexDef) {
          // 复合索引
          const compoundIndex = indexDef as CompoundIndex;
          indexSpec = {};
          for (
            const [field, direction] of Object.entries(compoundIndex.fields)
          ) {
            indexSpec[field] = this.normalizeDirection(direction);
          }
          if (compoundIndex.unique) {
            indexOptions.unique = true;
          }
          if (compoundIndex.name) {
            indexOptions.name = compoundIndex.name;
          }
        }

        if (force) {
          // 删除现有索引（如果存在）
          try {
            const indexName = indexOptions.name ||
              this.generateIndexName(indexSpec);
            await collection.dropIndex(indexName);
          } catch {
            // 索引不存在，忽略错误
          }
        }

        // 创建索引
        const indexName = await collection.createIndex(indexSpec, indexOptions);
        createdIndexes.push(indexName);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to create index: ${message}`);
      }
    }

    return createdIndexes;
  }

  /**
   * 删除所有索引（除了 _id 索引）
   * @returns 删除的索引名称数组
   */
  static async dropIndexes(): Promise<string[]> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    const db = adapter.getDatabase();
    if (!db) {
      throw new Error("Database not connected");
    }

    const collection = db.collection(this.collectionName);
    const indexes = await collection.indexes();
    const droppedIndexes: string[] = [];

    for (const index of indexes) {
      // 跳过 _id 索引或没有名称的索引
      if (!index.name || index.name === "_id_") {
        continue;
      }

      try {
        await collection.dropIndex(index.name);
        droppedIndexes.push(index.name);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to drop index ${index.name}: ${message}`);
      }
    }

    return droppedIndexes;
  }

  /**
   * 获取所有索引信息
   * @returns 索引信息数组
   */
  static async getIndexes(): Promise<any[]> {
    if (!this.adapter) {
      throw new Error(
        "Database adapter not set. Please call Model.setAdapter() first.",
      );
    }

    const adapter = this.adapter as any as MongoDBAdapter;
    const db = adapter.getDatabase();
    if (!db) {
      throw new Error("Database not connected");
    }

    const collection = db.collection(this.collectionName);
    return await collection.indexes();
  }

  /**
   * 规范化索引方向
   */
  private static normalizeDirection(direction: IndexDirection): number {
    if (typeof direction === "number") {
      return direction;
    }
    if (direction === "asc" || direction === "ascending") {
      return 1;
    }
    if (direction === "desc" || direction === "descending") {
      return -1;
    }
    return 1;
  }

  /**
   * 生成索引名称
   */
  private static generateIndexName(indexSpec: any): string {
    const parts: string[] = [];
    for (const [field, direction] of Object.entries(indexSpec)) {
      parts.push(`${field}_${direction}`);
    }
    return parts.join("_");
  }
}
