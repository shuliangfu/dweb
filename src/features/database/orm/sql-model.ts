/**
 * SQL 模型基类
 * 提供 ORM 功能，支持对象条件查询和字段选择
 */

import type { DatabaseAdapter } from '../types.ts';
import type { IndexDefinitions } from '../types/index.ts';
import type { CacheAdapter } from '../cache/cache-adapter.ts';

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
 * 生命周期钩子函数类型
 */
export type LifecycleHook<T = any> = (instance: T, options?: any) => Promise<void> | void;

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
  static async init(connectionName: string = 'default'): Promise<void> {
    // 动态导入 getDatabaseAsync 以避免循环依赖
    const { getDatabaseAsync } = await import('../access.ts');
    
    try {
      // 获取数据库适配器（如果数据库未初始化，会自动尝试从配置文件加载并初始化）
      const adapter = await getDatabaseAsync(connectionName);
      // 设置适配器
      this.setAdapter(adapter);
      // 注意：SQL 模型的索引通常通过迁移管理，不在这里创建
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize model ${this.tableName}: ${message}`);
    }
  }

  /**
   * 确保模型已初始化（懒加载）
   * 如果适配器未设置，自动尝试初始化
   * @param connectionName 连接名称（默认为 'default'）
   */
  private static async ensureInitialized(connectionName: string = 'default'): Promise<void> {
    if (!this.adapter) {
      await this.init(connectionName);
    }
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
        processed[fieldName] = typeof field.default === 'function'
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
    if (rule.required && (value === null || value === undefined || value === '')) {
      throw new ValidationError(fieldName, rule.message || `${fieldName} 是必填字段`);
    }

    // 如果值为空且不是必填，跳过其他验证
    if (value === null || value === undefined || value === '') {
      return;
    }

    // 类型验证
    if (rule.type) {
      const expectedType = rule.type;
      const actualType = typeof value;
      if (expectedType === 'array' && !Array.isArray(value)) {
        throw new ValidationError(fieldName, rule.message || `${fieldName} 必须是数组类型`);
      }
      if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(value) || value === null)) {
        throw new ValidationError(fieldName, rule.message || `${fieldName} 必须是对象类型`);
      }
      if (expectedType !== 'array' && expectedType !== 'object' && actualType !== expectedType) {
        throw new ValidationError(fieldName, rule.message || `${fieldName} 必须是 ${expectedType} 类型`);
      }
    }

    // 长度验证（字符串或数组）
    if (rule.length !== undefined) {
      const len = Array.isArray(value) ? value.length : String(value).length;
      if (len !== rule.length) {
        throw new ValidationError(fieldName, rule.message || `${fieldName} 长度必须是 ${rule.length}`);
      }
    }

    // 最小值/最大长度验证
    if (rule.min !== undefined) {
      if (typeof value === 'number') {
        if (value < rule.min) {
          throw new ValidationError(fieldName, rule.message || `${fieldName} 必须大于等于 ${rule.min}`);
        }
      } else {
        const len = Array.isArray(value) ? value.length : String(value).length;
        if (len < rule.min) {
          throw new ValidationError(fieldName, rule.message || `${fieldName} 长度必须大于等于 ${rule.min}`);
        }
      }
    }

    // 最大值/最大长度验证
    if (rule.max !== undefined) {
      if (typeof value === 'number') {
        if (value > rule.max) {
          throw new ValidationError(fieldName, rule.message || `${fieldName} 必须小于等于 ${rule.max}`);
        }
      } else {
        const len = Array.isArray(value) ? value.length : String(value).length;
        if (len > rule.max) {
          throw new ValidationError(fieldName, rule.message || `${fieldName} 长度必须小于等于 ${rule.max}`);
        }
      }
    }

    // 正则表达式验证
    if (rule.pattern) {
      const regex = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern);
      if (!regex.test(String(value))) {
        throw new ValidationError(fieldName, rule.message || `${fieldName} 格式不正确`);
      }
    }

    // 枚举验证
    if (rule.enum && !rule.enum.includes(value)) {
      throw new ValidationError(fieldName, rule.message || `${fieldName} 必须是以下之一: ${rule.enum.join(', ')}`);
    }

    // 自定义验证
    if (rule.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        throw new ValidationError(fieldName, rule.message || (typeof result === 'string' ? result : `${fieldName} 验证失败`));
      }
    }
  }

  /**
   * 类型转换
   */
  private static convertType(value: any, type: FieldType, enumValues?: any[]): any {
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
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
      }
      case 'date': {
        if (value instanceof Date) return value;
        if (typeof value === 'string' || typeof value === 'number') {
          return new Date(value);
        }
        return value;
      }
      case 'array': {
        return Array.isArray(value) ? value : [value];
      }
      case 'object': {
        return typeof value === 'object' ? value : JSON.parse(String(value));
      }
      case 'enum': {
        if (enumValues && enumValues.includes(value)) {
          return value;
        }
        throw new ValidationError('enum', `值必须是以下之一: ${enumValues?.join(', ')}`);
      }
      case 'bigint': {
        return BigInt(value);
      }
      case 'decimal': {
        return parseFloat(String(value));
      }
      case 'timestamp': {
        if (value instanceof Date) return value;
        if (typeof value === 'string' || typeof value === 'number') {
          return new Date(value);
        }
        return value;
      }
      case 'uuid': {
        return String(value);
      }
      case 'text': {
        return String(value);
      }
      case 'binary': {
        return value;
      }
      case 'json': {
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return typeof value === 'object' ? value : value;
      }
      case 'any': {
        return value;
      }
      default: {
        return value;
      }
    }
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
    // 自动初始化（如果未初始化）
    await this.ensureInitialized();
    
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.');
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
    // 自动初始化（如果未初始化）
    await this.ensureInitialized();
    
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.');
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
    // 自动初始化（如果未初始化）
    await this.ensureInitialized();
    
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.');
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

    const keys = Object.keys(processedData);
    const values = Object.values(processedData);
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
      throw new Error('Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.');
    }

    // 先查找要更新的记录
    let existingInstance: InstanceType<typeof SQLModel> | null = null;
    if (typeof condition === 'number' || typeof condition === 'string') {
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

    const { where, params: whereParams } = this.buildWhereClause(condition);
    const keys = Object.keys(processedData);
    const values = Object.values(processedData);
    const setClause = keys.map(key => `${key} = ?`).join(', ');

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${where}`;
    const result = await this.adapter.execute(sql, [...values, ...whereParams]);

    // 返回影响的行数（如果适配器支持）
    const affectedRows = (typeof result === 'number')
      ? result
      : ((result && typeof result === 'object' && 'affectedRows' in result)
        ? ((result as any).affectedRows || 0)
        : 0);

    if (affectedRows > 0) {
      // 重新查询更新后的记录
      const updatedInstance = await this.find(condition);
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
      throw new Error('Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.');
    }

    // 先查找要删除的记录
    let instanceToDelete: InstanceType<typeof SQLModel> | null = null;
    if (typeof condition === 'number' || typeof condition === 'string') {
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

    const { where, params } = this.buildWhereClause(condition);

    // 软删除：设置 deletedAt 字段
    if (this.softDelete) {
      const sql = `UPDATE ${this.tableName} SET ${this.deletedAtField} = ? WHERE ${where}`;
      const result = await this.adapter.execute(sql, [new Date(), ...params]);
      const affectedRows = (typeof result === 'number')
        ? result
        : ((result && typeof result === 'object' && 'affectedRows' in result)
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
    const affectedRows = (typeof result === 'number')
      ? result
      : ((result && typeof result === 'object' && 'affectedRows' in result)
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
  ): Promise<number> {
    // 自动初始化（如果未初始化）
    await this.ensureInitialized();
    
    if (!this.adapter) {
      throw new Error('Database adapter not set. Please call Model.setAdapter() or ensure database is initialized.');
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

