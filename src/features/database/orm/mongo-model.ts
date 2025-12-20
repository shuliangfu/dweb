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
 * 生命周期钩子函数类型
 */
export type LifecycleHook<T = any> = (instance: T, options?: any) => Promise<void> | void;

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
   * 是否启用软删除（默认为 false）
   * 启用后，删除操作会设置 deletedAt 字段而不是真正删除记录
   */
  static softDelete: boolean = false;

  /**
   * 软删除字段名（默认为 'deletedAt'）
   * 可以自定义为 'deleted_at' 等
   */
  static deletedAtField: string = 'deletedAt';

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
  static timestamps: boolean | { createdAt?: string; updatedAt?: string } = false;

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
   * 设置数据库适配器
   * @param adapter 数据库适配器实例（必须是 MongoDBAdapter）
   */
  static setAdapter(adapter: DatabaseAdapter): void {
    this.adapter = adapter;
  }

  /**
   * 验证字段值
   * @param fieldName 字段名
   * @param value 字段值
   * @param fieldDef 字段定义
   * @throws ValidationError 验证失败时抛出
   */
  private static validateField(fieldName: string, value: any, fieldDef: FieldDefinition): void {
    const rule = fieldDef.validate;
    
    // 必填验证（优先检查字段定义中的 required，然后是验证规则中的）
    const isRequired = rule?.required || false;
    if (isRequired && (value === null || value === undefined || value === '')) {
      throw new ValidationError(fieldName, rule?.message || `${fieldName} is required`);
    }

    // 如果值为空且不是必填，跳过其他验证
    if (value === null || value === undefined || value === '') {
      return;
    }

    // 枚举类型验证（优先检查字段定义中的 enum）
    if (fieldDef.type === 'enum') {
      if (fieldDef.enum && !fieldDef.enum.includes(value)) {
        throw new ValidationError(
          fieldName,
          rule?.message || `${fieldName} must be one of: ${fieldDef.enum.join(', ')}`
        );
      }
    }

    // 类型验证
    if (fieldDef.type && fieldDef.type !== 'enum') {
      const typeCheck = this.checkType(value, fieldDef.type);
      if (!typeCheck) {
        throw new ValidationError(
          fieldName,
          rule?.message || `${fieldName} must be of type ${fieldDef.type}`
        );
      }
    }

    // 验证规则中的类型验证（如果字段定义中没有指定类型）
    if (rule?.type && !fieldDef.type) {
      const typeCheck = this.checkType(value, rule.type);
      if (!typeCheck) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} must be of type ${rule.type}`
        );
      }
    }

    // 验证规则中的枚举验证（如果字段定义中没有指定枚举）
    if (rule?.enum && fieldDef.type !== 'enum' && !rule.enum.includes(value)) {
      throw new ValidationError(
        fieldName,
        rule.message || `${fieldName} must be one of: ${rule.enum.join(', ')}`
      );
    }

    // 字符串长度验证
    if (rule && typeof value === 'string') {
      if (rule.length !== undefined && value.length !== rule.length) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} must be exactly ${rule.length} characters`
        );
      }
      if (rule.min !== undefined && value.length < rule.min) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} must be at least ${rule.min} characters`
        );
      }
      if (rule.max !== undefined && value.length > rule.max) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} must be at most ${rule.max} characters`
        );
      }
    }

    // 数字范围验证
    if (rule && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} must be at least ${rule.min}`
        );
      }
      if (rule.max !== undefined && value > rule.max) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} must be at most ${rule.max}`
        );
      }
    }

    // 正则表达式验证
    if (rule?.pattern) {
      const regex = typeof rule.pattern === 'string' ? new RegExp(rule.pattern) : rule.pattern;
      if (typeof value === 'string' && !regex.test(value)) {
        throw new ValidationError(
          fieldName,
          rule.message || `${fieldName} format is invalid`
        );
      }
    }

    // 自定义验证
    if (rule?.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        throw new ValidationError(
          fieldName,
          rule.message || (typeof result === 'string' ? result : `${fieldName} validation failed`)
        );
      }
    }
  }

  /**
   * 检查值是否符合指定类型
   */
  private static checkType(value: any, type: FieldType): boolean {
    switch (type) {
      case 'string': {
        return typeof value === 'string';
      }
      case 'number': {
        return typeof value === 'number' && !isNaN(value);
      }
      case 'bigint': {
        return typeof value === 'bigint' || (typeof value === 'number' && Number.isInteger(value));
      }
      case 'decimal': {
        return typeof value === 'number' && !isNaN(value);
      }
      case 'boolean': {
        return typeof value === 'boolean';
      }
      case 'date': {
        return value instanceof Date || !isNaN(Date.parse(value));
      }
      case 'timestamp': {
        return typeof value === 'number' && value > 0;
      }
      case 'array': {
        return Array.isArray(value);
      }
      case 'object': {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      }
      case 'json': {
        // JSON 类型可以是对象或数组
        return typeof value === 'object' && value !== null;
      }
      case 'enum': {
        // 枚举类型检查在 validateField 中处理
        return true;
      }
      case 'uuid': {
        // UUID 格式验证: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return typeof value === 'string' && uuidRegex.test(value);
      }
      case 'text': {
        return typeof value === 'string';
      }
      case 'binary': {
        // 检查是否为二进制数据类型
        if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
          return true;
        }
        // 在 Node.js 环境中检查 Buffer
        if (typeof globalThis !== 'undefined' && 'Buffer' in globalThis) {
          const Buffer = (globalThis as any).Buffer;
          if (Buffer && Buffer.isBuffer && Buffer.isBuffer(value)) {
            return true;
          }
        }
        return false;
      }
      case 'any': {
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
      if ((value === null || value === undefined) && fieldDef.default !== undefined) {
        value = typeof fieldDef.default === 'function' ? fieldDef.default() : fieldDef.default;
      }

      // 应用 setter
      if (value !== undefined && fieldDef.set) {
        value = fieldDef.set(value);
      }

      // 类型转换（枚举类型不需要转换）
      if (value !== undefined && fieldDef.type && fieldDef.type !== 'enum') {
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
      case 'string': {
        return String(value);
      }
      case 'number': {
        const num = Number(value);
        return isNaN(num) ? value : num;
      }
      case 'boolean': {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value === 'true' || value === '1';
        }
        return Boolean(value);
      }
      case 'date': {
        if (value instanceof Date) return value;
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date;
      }
      case 'array': {
        return Array.isArray(value) ? value : [value];
      }
      case 'object': {
        if (typeof value === 'object' && !Array.isArray(value)) return value;
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          return value;
        }
      }
      case 'json': {
        if (typeof value === 'object' && value !== null) return value;
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          return value;
        }
      }
      case 'enum': {
        // 枚举类型不需要转换，直接返回
        return value;
      }
      case 'uuid': {
        // UUID 保持字符串格式
        return String(value);
      }
      case 'text': {
        return String(value);
      }
      case 'bigint': {
        if (typeof value === 'bigint') return value;
        if (typeof value === 'number' && Number.isInteger(value)) return BigInt(value);
        if (typeof value === 'string') {
          const num = parseInt(value, 10);
          return !isNaN(num) ? BigInt(num) : value;
        }
        return value;
      }
      case 'decimal': {
        const num = Number(value);
        return isNaN(num) ? value : num;
      }
      case 'timestamp': {
        if (typeof value === 'number') return value;
        if (value instanceof Date) return value.getTime();
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.getTime();
      }
      case 'binary': {
        if (value instanceof Uint8Array || value instanceof ArrayBuffer) return value;
        if (typeof value === 'string') {
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

    // 软删除：自动过滤已删除的记录
    let queryFilter = filter;
    if (this.softDelete) {
      queryFilter = {
        ...filter,
        [this.deletedAtField]: { $exists: false },
      };
    }

    const results = await adapter.query(this.collectionName, queryFilter, options);

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
      ): Promise<InstanceType<T>[]> => {
        return await this.findAll({ ...scopeCondition, ...condition }, fields) as InstanceType<T>[];
      },
      find: async <T extends typeof MongoModel>(
        condition: MongoWhereCondition | string = {},
        fields?: string[],
      ): Promise<InstanceType<T> | null> => {
        if (typeof condition === 'string') {
          return await this.find(condition, fields) as InstanceType<T> | null;
        }
        return await this.find({ ...scopeCondition, ...condition }, fields) as InstanceType<T> | null;
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
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    // 处理字段（应用默认值、类型转换、验证）
    let processedData = this.processFields(data);

    // 自动时间戳
    if (this.timestamps) {
      const createdAtField = typeof this.timestamps === 'object' 
        ? (this.timestamps.createdAt || 'createdAt')
        : 'createdAt';
      const updatedAtField = typeof this.timestamps === 'object'
        ? (this.timestamps.updatedAt || 'updatedAt')
        : 'updatedAt';
      
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
    const result = await adapter.execute('insert', this.collectionName, processedData);

    // MongoDB insert 返回结果包含 insertedId
    let insertedId: any = null;
    if (result && typeof result === 'object') {
      if ('insertedId' in result) {
        insertedId = (result as any).insertedId;
      } else if ('_id' in processedData) {
        insertedId = processedData._id;
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
  static async update(
    condition: MongoWhereCondition | string,
    data: Record<string, any>,
  ): Promise<number> {
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() first.');
    }

    // 先查找要更新的记录
    let existingInstance: InstanceType<typeof MongoModel> | null = null;
    if (typeof condition === 'string') {
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
      const updatedAtField = typeof this.timestamps === 'object'
        ? (this.timestamps.updatedAt || 'updatedAt')
        : 'updatedAt';
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
    if (typeof condition === 'string') {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    const result = await adapter.execute('update', this.collectionName, {
      filter,
      update: { $set: processedData },
    });

    // MongoDB update 返回结果包含 modifiedCount
    const modifiedCount = (result && typeof result === 'object' && 'modifiedCount' in result)
      ? ((result as any).modifiedCount || 0)
      : 0;

    if (modifiedCount > 0) {
      // 重新查询更新后的记录
      const updatedInstance = await this.find(filter);
      if (updatedInstance) {
        // afterUpdate 钩子
        if (this.afterUpdate) {
          await this.afterUpdate(updatedInstance);
        }

        // afterSave 钩子
        if (this.afterSave) {
          await this.afterSave(updatedInstance);
        }
      }
    }

    return modifiedCount;
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

    // 先查找要删除的记录
    let instanceToDelete: InstanceType<typeof MongoModel> | null = null;
    if (typeof condition === 'string') {
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
    if (typeof condition === 'string') {
      filter[this.primaryKey] = condition;
    } else {
      filter = condition;
    }

    // 软删除：设置 deletedAt 字段
    if (this.softDelete) {
      const result = await adapter.execute('update', this.collectionName, {
        filter,
        update: { $set: { [this.deletedAtField]: new Date() } },
      });
      const modifiedCount = (result && typeof result === 'object' && 'modifiedCount' in result)
        ? ((result as any).modifiedCount || 0)
        : 0;

      if (modifiedCount > 0 && this.afterDelete) {
        await this.afterDelete(instanceToDelete);
      }
      return modifiedCount;
    }

    // 硬删除：真正删除记录
    const result = await adapter.execute('delete', this.collectionName, {
      filter,
    });

    // MongoDB delete 返回结果包含 deletedCount
    const deletedCount = (result && typeof result === 'object' && 'deletedCount' in result)
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

    // 处理字段（应用默认值、类型转换、验证）
    const processedData = this.processFields(data);

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
      update: processedData,
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

    // 处理每个数据项（应用默认值、类型转换、验证）
    const processedArray = dataArray.map(data => this.processFields(data));

    const adapter = this.adapter as any as MongoDBAdapter;
    const result = await adapter.execute('insertMany', this.collectionName, processedArray);

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
  ): Promise<InstanceType<T> | null> {
    const Model = this.constructor as typeof MongoModel;
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
  ): Promise<InstanceType<T> | null> {
    const Model = this.constructor as typeof MongoModel;
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
  ): Promise<InstanceType<T>[]> {
    const Model = this.constructor as typeof MongoModel;
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

