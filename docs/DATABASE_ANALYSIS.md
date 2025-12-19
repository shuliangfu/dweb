# 数据库支持实现方案分析

本文档分析 DWeb 框架如何实现数据库支持功能。

## 📋 目录

- [需求分析](#需求分析)
- [技术选型](#技术选型)
- [架构设计](#架构设计)
- [目录结构](#目录结构)
- [实现方案](#实现方案)
- [使用示例](#使用示例)
- [实施计划](#实施计划)

---

## 需求分析

### 核心需求

1. **数据库连接池**
   - 管理数据库连接
   - 连接复用和生命周期管理
   - 支持连接池配置（最大连接数、超时等）

2. **查询构建器**
   - 类型安全的查询 API
   - 支持链式调用
   - SQL 注入防护
   - 支持常见 SQL 操作（SELECT、INSERT、UPDATE、DELETE）

3. **ORM 集成**
   - 模型定义
   - 关系映射（一对一、一对多、多对多）
   - 自动类型推断
   - 数据验证

4. **迁移管理**
   - 数据库迁移脚本
   - 版本控制
   - 回滚支持
   - 迁移历史记录

### 使用场景

- 在 `load` 函数中查询数据
- 在 API 路由中操作数据库
- 在中间件中访问数据库
- 在插件中集成数据库功能

---

## 技术选型

### 支持的数据库类型

DWeb 框架支持以下两种数据库：

1. **PostgreSQL** - 强大的关系型数据库
2. **MongoDB** - NoSQL 文档数据库

### 数据库驱动选择

#### 1. **PostgreSQL** - `postgres`

**驱动**: `https://deno.land/x/postgres@v0.17.0/mod.ts` 或 `npm:postgres`

**优点**:
- ✅ 功能强大的关系型数据库
- ✅ 支持复杂查询和事务
- ✅ 高性能，适合生产环境
- ✅ 支持连接池
- ✅ 丰富的数据类型
- ✅ ACID 事务支持

**缺点**:
- ❌ 需要独立的数据库服务
- ❌ 配置相对复杂
- ❌ 资源占用较大

**适用场景**:
- 生产环境
- 需要复杂查询的应用
- 需要 ACID 事务的应用
- 企业级应用

**示例代码**:
```typescript
import postgres from "npm:postgres";

const sql = postgres("postgres://user:password@localhost:5432/database");
const users = await sql`SELECT * FROM users WHERE age > ${18}`;
```

---

const client = await new Client().connect({
  hostname: "127.0.0.1",
  username: "root",
  db: "database",
  password: "password",
});

const users = await client.query("SELECT * FROM users WHERE age > ?", [18]);
```

---

#### 4. **MongoDB** - `mongodb` (npm)

**驱动**: `npm:mongodb@6`

**优点**:
- ✅ NoSQL 文档数据库
- ✅ 灵活的文档结构
- ✅ 水平扩展能力强
- ✅ 适合非结构化数据
- ✅ 丰富的查询功能

**缺点**:
- ❌ 需要通过 npm 兼容层
- ❌ 不支持 JOIN 操作
- ❌ 事务支持相对较弱（早期版本）

**适用场景**:
- 非结构化数据
- 需要水平扩展的应用
- 内容管理系统
- 日志存储

**示例代码**:
```typescript
import { MongoClient } from "npm:mongodb@6";

const client = new MongoClient("mongodb://localhost:27017");
await client.connect();
const db = client.db("database");
const users = await db.collection("users").find({ age: { $gt: 18 } }).toArray();
```

---

### ORM 选择

#### **Drizzle ORM** (推荐用于 SQL 数据库)

**优点**:
- ✅ 支持 PostgreSQL、MongoDB
- ✅ 类型安全
- ✅ 轻量级
- ✅ 支持迁移
- ✅ 性能优秀
- ✅ 学习曲线平缓

**缺点**:
- ❌ 不支持 MongoDB（MongoDB 需要单独的 ODM）

**适用场景**: SQL 数据库的 ORM 需求

#### **Mongoose** (用于 MongoDB)

**驱动**: `npm:mongoose@8`

**优点**:
- ✅ MongoDB 官方推荐的 ODM
- ✅ 功能完整
- ✅ 模式验证
- ✅ 中间件支持

**缺点**:
- ❌ 仅支持 MongoDB
- ❌ 需要通过 npm 兼容层

**适用场景**: MongoDB 的 ODM 需求

---

### 推荐架构方案

**统一接口 + 多驱动支持**

```typescript
// 统一的数据库接口
interface DatabaseAdapter {
  connect(config: DatabaseConfig): Promise<void>;
  query(sql: string, params?: any[]): Promise<any[]>;
  execute(sql: string, params?: any[]): Promise<any>;
  transaction(callback: (db: DatabaseAdapter) => Promise<void>): Promise<void>;
  close(): Promise<void>;
}

// 不同数据库的适配器实现
class SQLiteAdapter implements DatabaseAdapter { ... }
class PostgreSQLAdapter implements DatabaseAdapter { ... }
class MySQLAdapter implements DatabaseAdapter { ... }
class MongoDBAdapter implements DatabaseAdapter { ... }
```

**优势**:
- ✅ 统一的 API，用户无需关心底层实现
- ✅ 可以轻松切换数据库
- ✅ 支持多种数据库同时使用
- ✅ 便于测试

---

## 架构设计

### 1. 数据库管理器 (DatabaseManager)

```typescript
// src/features/database.ts

/**
 * 数据库类型
 */
export type DatabaseType = 'postgresql' | 'mongodb';

/**
 * 数据库连接配置
 */
export interface DatabaseConfig {
  /** 数据库类型 */
  type: DatabaseType;
  
  /** 连接配置 */
  connection: {
    // PostgreSQL/MongoDB
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    
    // MongoDB 特定
    authSource?: string;
    replicaSet?: string;
  };
  
  /** 连接池配置（SQL 数据库） */
  pool?: {
    min?: number;
    max?: number;
    idleTimeout?: number;
  };
  
  /** MongoDB 特定配置 */
  mongoOptions?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    serverSelectionTimeoutMS?: number;
  };
}

/**
 * 数据库适配器接口
 */
export interface DatabaseAdapter {
  connect(config: DatabaseConfig): Promise<void>;
  query(sql: string, params?: any[]): Promise<any[]>;
  execute(sql: string, params?: any[]): Promise<any>;
  transaction<T>(callback: (db: DatabaseAdapter) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  isConnected(): boolean;
}

/**
 * 数据库管理器
 */
export class DatabaseManager {
  private adapters: Map<string, DatabaseAdapter> = new Map();
  
  /**
   * 连接数据库
   */
  async connect(name: string, config: DatabaseConfig): Promise<void> {
    const adapter = this.createAdapter(config.type);
    await adapter.connect(config);
    this.adapters.set(name, adapter);
  }
  
  /**
   * 获取数据库连接
   */
  getConnection(name: string = 'default'): DatabaseAdapter {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Database connection "${name}" not found`);
    }
    return adapter;
  }
  
  /**
   * 创建适配器
   */
  private createAdapter(type: DatabaseType): DatabaseAdapter {
    switch (type) {
      case 'postgresql':
        return new PostgreSQLAdapter();
      case 'mongodb':
        return new MongoDBAdapter();
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }
  
  /**
   * 关闭连接
   */
  async close(name?: string): Promise<void> {
    if (name) {
      const adapter = this.adapters.get(name);
      if (adapter) {
        await adapter.close();
        this.adapters.delete(name);
      }
    } else {
      await this.closeAll();
    }
  }
  
  /**
   * 关闭所有连接
   */
  async closeAll(): Promise<void> {
    for (const [name, adapter] of this.adapters) {
      await adapter.close();
    }
    this.adapters.clear();
  }
}
```

### 2. 查询构建器 (QueryBuilder)

```typescript
// src/features/query-builder.ts
export class QueryBuilder {
  select(columns: string[]): QueryBuilder;
  from(table: string): QueryBuilder;
  where(condition: string, params?: any[]): QueryBuilder;
  join(table: string, condition: string): QueryBuilder;
  orderBy(column: string, direction?: 'ASC' | 'DESC'): QueryBuilder;
  limit(count: number): QueryBuilder;
  offset(count: number): QueryBuilder;
  
  insert(table: string, data: Record<string, any>): QueryBuilder;
  update(table: string, data: Record<string, any>): QueryBuilder;
  delete(table: string): QueryBuilder;
  
  execute<T = any>(): Promise<T[]>;
  executeOne<T = any>(): Promise<T | null>;
}
```

### 3. ORM/ODM 模型 (Model)

```typescript
// src/features/orm.ts

/**
 * SQL 数据库模型基类（用于 PostgreSQL）
 */
export abstract class SQLModel {
  static table: string;
  static primaryKey: string = 'id';
  static adapter: DatabaseAdapter;
  
  /**
   * 查找单个记录
   * @param condition 查询条件（可以是 ID 值或条件对象）
   * @param fields 要查询的字段数组（可选，默认查询所有字段）
   * @returns 找到的记录或 null
   * 
   * @example
   * // 通过 ID 查找
   * const user = await User.find(1);
   * 
   * // 通过条件对象查找
   * const user = await User.find({ id: 1 });
   * const user = await User.find({ email: 'user@example.com' });
   * 
   * // 指定查询字段
   * const user = await User.find(1, ['id', 'name', 'email']);
   */
  static async find(
    condition: any | Record<string, any>,
    fields?: string[]
  ): Promise<SQLModel | null> {
    const columns = fields || ['*'];
    const query = new SQLQueryBuilder(this.adapter)
      .select(columns)
      .from(this.table);
    
    // 如果 condition 是对象，使用对象条件
    if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
      const whereClause = Object.keys(condition)
        .map(key => `${key} = ?`)
        .join(' AND ');
      query.where(whereClause, Object.values(condition));
    } else {
      // 否则使用主键查找
      query.where(`${this.primaryKey} = ?`, [condition]);
    }
    
    const result = await query.executeOne();
    return result ? this.fromRow(result) : null;
  }
  
  /**
   * 查找多个记录
   * @param conditions 查询条件对象（可选）
   * @param fields 要查询的字段数组（可选，默认查询所有字段）
   * @returns 记录数组
   * 
   * @example
   * // 查找所有记录
   * const users = await User.findAll();
   * 
   * // 按条件查找
   * const users = await User.findAll({ age: 25 });
   * const users = await User.findAll({ status: 'active', age: { $gt: 18 } });
   * 
   * // 指定查询字段
   * const users = await User.findAll({}, ['id', 'name', 'email']);
   */
  static async findAll(
    conditions?: Record<string, any>,
    fields?: string[]
  ): Promise<SQLModel[]> {
    const columns = fields || ['*'];
    const query = new SQLQueryBuilder(this.adapter)
      .select(columns)
      .from(this.table);
    
    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = this.buildWhereClause(conditions);
      query.where(whereClause.clause, whereClause.params);
    }
    
    const results = await query.execute();
    return results.map(row => this.fromRow(row));
  }
  
  /**
   * 创建新记录
   * @param data 记录数据
   * @returns 创建的记录
   */
  static async create(data: Record<string, any>): Promise<SQLModel> {
    const query = new SQLQueryBuilder(this.adapter)
      .insert(this.table, data);
    
    const result = await query.execute();
    return this.fromRow(result);
  }
  
  /**
   * 更新记录
   * @param condition 查询条件（可以是 ID 值或条件对象）
   * @param data 要更新的数据
   * @returns 更新后的记录
   * 
   * @example
   * // 通过 ID 更新
   * await User.update(1, { name: 'lisi' });
   * 
   * // 通过条件对象更新
   * await User.update({ id: 1 }, { name: 'lisi' });
   * await User.update({ email: 'user@example.com' }, { name: 'lisi' });
   */
  static async update(
    condition: any | Record<string, any>,
    data: Record<string, any>
  ): Promise<SQLModel | null> {
    const query = new SQLQueryBuilder(this.adapter)
      .update(this.table, data);
    
    // 如果 condition 是对象，使用对象条件
    if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
      const whereClause = Object.keys(condition)
        .map(key => `${key} = ?`)
        .join(' AND ');
      query.where(whereClause, Object.values(condition));
    } else {
      // 否则使用主键
      query.where(`${this.primaryKey} = ?`, [condition]);
    }
    
    await query.execute();
    
    // 返回更新后的记录
    if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
      return await this.find(condition);
    } else {
      return await this.find(condition);
    }
  }
  
  /**
   * 删除记录
   * @param condition 查询条件（可以是 ID 值或条件对象）
   * @returns 是否删除成功
   * 
   * @example
   * // 通过 ID 删除
   * await User.delete(1);
   * 
   * // 通过条件对象删除
   * await User.delete({ id: 1 });
   * await User.delete({ email: 'user@example.com' });
   */
  static async delete(condition: any | Record<string, any>): Promise<boolean> {
    const query = new SQLQueryBuilder(this.adapter)
      .delete(this.table);
    
    // 如果 condition 是对象，使用对象条件
    if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
      const whereClause = Object.keys(condition)
        .map(key => `${key} = ?`)
        .join(' AND ');
      query.where(whereClause, Object.values(condition));
    } else {
      // 否则使用主键
      query.where(`${this.primaryKey} = ?`, [condition]);
    }
    
    const result = await query.execute();
    return result.affectedRows > 0;
  }
  
  /**
   * 构建 WHERE 子句（支持操作符）
   * @param conditions 条件对象
   * @returns WHERE 子句和参数
   */
  private static buildWhereClause(conditions: Record<string, any>): {
    clause: string;
    params: any[];
  } {
    const clauses: string[] = [];
    const params: any[] = [];
    
    for (const [key, value] of Object.entries(conditions)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // 支持操作符：{ $gt: 18 }, { $lt: 100 }, { $gte: 0 }, { $lte: 100 }, { $ne: null }, { $in: [1, 2, 3] }
        if ('$gt' in value) {
          clauses.push(`${key} > ?`);
          params.push(value.$gt);
        } else if ('$lt' in value) {
          clauses.push(`${key} < ?`);
          params.push(value.$lt);
        } else if ('$gte' in value) {
          clauses.push(`${key} >= ?`);
          params.push(value.$gte);
        } else if ('$lte' in value) {
          clauses.push(`${key} <= ?`);
          params.push(value.$lte);
        } else if ('$ne' in value) {
          clauses.push(`${key} != ?`);
          params.push(value.$ne);
        } else if ('$in' in value) {
          const placeholders = value.$in.map(() => '?').join(', ');
          clauses.push(`${key} IN (${placeholders})`);
          params.push(...value.$in);
        } else {
          // 默认等于
          clauses.push(`${key} = ?`);
          params.push(value);
        }
      } else {
        clauses.push(`${key} = ?`);
        params.push(value);
      }
    }
    
    return {
      clause: clauses.join(' AND '),
      params,
    };
  }
  
  /**
   * 从数据库行转换为模型实例
   */
  static fromRow(row: any): SQLModel {
    const model = new (this as any)();
    Object.assign(model, row);
    return model;
  }
  
  /**
   * 保存当前实例
   */
  async save(): Promise<this> {
    const primaryKey = (this.constructor as typeof SQLModel).primaryKey;
    const id = (this as any)[primaryKey];
    
    if (id) {
      // 更新
      await (this.constructor as typeof SQLModel).update({ [primaryKey]: id }, this.toData());
    } else {
      // 创建
      const created = await (this.constructor as typeof SQLModel).create(this.toData());
      (this as any)[primaryKey] = (created as any)[primaryKey];
    }
    
    return this;
  }
  
  /**
   * 删除当前实例
   */
  async delete(): Promise<boolean> {
    const primaryKey = (this.constructor as typeof SQLModel).primaryKey;
    const id = (this as any)[primaryKey];
    return await (this.constructor as typeof SQLModel).delete({ [primaryKey]: id });
  }
  
  /**
   * 转换为数据对象（用于保存）
   */
  protected toData(): Record<string, any> {
    const data: Record<string, any> = {};
    const model = this as any;
    for (const key in model) {
      if (typeof model[key] !== 'function' && key !== 'constructor') {
        data[key] = model[key];
      }
    }
    return data;
  }
}

/**
 * MongoDB 文档模型基类
 */
export abstract class MongoModel {
  static collection: string;
  static primaryKey: string = '_id';
  static db: any; // MongoDB 数据库实例
  
  static getCollection() {
    return this.db.collection(this.collection);
  }
  
  /**
   * 查找单个文档
   * @param condition 查询条件（可以是 ID 值或条件对象）
   * @param fields 要查询的字段数组（可选，MongoDB 使用投影）
   * @returns 找到的文档或 null
   * 
   * @example
   * // 通过 ID 查找
   * const user = await User.find(userId);
   * 
   * // 通过条件对象查找
   * const user = await User.find({ _id: userId });
   * const user = await User.find({ email: 'user@example.com' });
   * 
   * // 指定查询字段
   * const user = await User.find(userId, ['name', 'email', 'age']);
   */
  static async find(
    condition: any | Record<string, any>,
    fields?: string[]
  ): Promise<MongoModel | null> {
    const collection = this.getCollection();
    
    // 构建查询条件
    let filter: any;
    if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
      filter = condition;
    } else {
      filter = { [this.primaryKey]: condition };
    }
    
    // 构建投影（字段选择）
    const projection: any = fields && fields.length > 0
      ? fields.reduce((acc, field) => {
          acc[field] = 1;
          return acc;
        }, {} as Record<string, number>)
      : undefined;
    
    const result = await collection.findOne(filter, { projection });
    return result ? this.fromDocument(result) : null;
  }
  
  /**
   * 查找多个文档
   * @param filter 查询条件对象（可选）
   * @param fields 要查询的字段数组（可选，MongoDB 使用投影）
   * @returns 文档数组
   * 
   * @example
   * // 查找所有文档
   * const users = await User.findAll();
   * 
   * // 按条件查找
   * const users = await User.findAll({ age: 25 });
   * const users = await User.findAll({ age: { $gt: 18 } });
   * 
   * // 指定查询字段
   * const users = await User.findAll({}, ['name', 'email', 'age']);
   */
  static async findAll(
    filter: any = {},
    fields?: string[]
  ): Promise<MongoModel[]> {
    const collection = this.getCollection();
    
    // 构建投影（字段选择）
    const projection: any = fields && fields.length > 0
      ? fields.reduce((acc, field) => {
          acc[field] = 1;
          return acc;
        }, {} as Record<string, number>)
      : undefined;
    
    const results = await collection.find(filter, { projection }).toArray();
    return results.map(doc => this.fromDocument(doc));
  }
  
  /**
   * 创建新文档
   * @param data 文档数据
   * @returns 创建的文档
   */
  static async create(data: Record<string, any>): Promise<MongoModel> {
    const collection = this.getCollection();
    const result = await collection.insertOne(data);
    return await this.find(result.insertedId);
  }
  
  /**
   * 更新文档
   * @param condition 查询条件（可以是 ID 值或条件对象）
   * @param data 要更新的数据
   * @returns 更新后的文档
   * 
   * @example
   * // 通过 ID 更新
   * await User.update(userId, { name: 'lisi' });
   * 
   * // 通过条件对象更新
   * await User.update({ _id: userId }, { name: 'lisi' });
   * await User.update({ email: 'user@example.com' }, { name: 'lisi' });
   */
  static async update(
    condition: any | Record<string, any>,
    data: Record<string, any>
  ): Promise<MongoModel | null> {
    const collection = this.getCollection();
    
    // 构建查询条件
    let filter: any;
    if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
      filter = condition;
    } else {
      filter = { [this.primaryKey]: condition };
    }
    
    await collection.updateOne(filter, { $set: data });
    return await this.find(filter);
  }
  
  /**
   * 删除文档
   * @param condition 查询条件（可以是 ID 值或条件对象）
   * @returns 是否删除成功
   * 
   * @example
   * // 通过 ID 删除
   * await User.delete(userId);
   * 
   * // 通过条件对象删除
   * await User.delete({ _id: userId });
   * await User.delete({ email: 'user@example.com' });
   */
  static async delete(condition: any | Record<string, any>): Promise<boolean> {
    const collection = this.getCollection();
    
    // 构建查询条件
    let filter: any;
    if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
      filter = condition;
    } else {
      filter = { [this.primaryKey]: condition };
    }
    
    const result = await collection.deleteOne(filter);
    return result.deletedCount > 0;
  }
  
  /**
   * 从 MongoDB 文档转换为模型实例
   */
  static fromDocument(doc: any): MongoModel {
    const model = new (this as any)();
    Object.assign(model, doc);
    return model;
  }
  
  /**
   * 保存当前实例
   */
  async save(): Promise<this> {
    const primaryKey = (this.constructor as typeof MongoModel).primaryKey;
    const id = (this as any)[primaryKey];
    
    if (id) {
      // 更新
      await (this.constructor as typeof MongoModel).update(
        { [primaryKey]: id },
        this.toDocument()
      );
    } else {
      // 创建
      const created = await (this.constructor as typeof MongoModel).create(this.toDocument());
      (this as any)[primaryKey] = (created as any)[primaryKey];
    }
    
    return this;
  }
  
  /**
   * 删除当前实例
   */
  async delete(): Promise<boolean> {
    const primaryKey = (this.constructor as typeof MongoModel).primaryKey;
    const id = (this as any)[primaryKey];
    return await (this.constructor as typeof MongoModel).delete({ [primaryKey]: id });
  }
  
  /**
   * 转换为文档格式（用于保存）
   */
  protected toDocument(): Record<string, any> {
    const doc: Record<string, any> = {};
    const model = this as any;
    for (const key in model) {
      if (typeof model[key] !== 'function' && key !== 'constructor') {
        doc[key] = model[key];
      }
    }
    return doc;
  }
}
```

### 4. 迁移管理器 (MigrationManager)

```typescript
// src/features/migration.ts
export interface Migration {
  up(): Promise<void>;
  down(): Promise<void>;
}

export class MigrationManager {
  create(name: string): Promise<string>;
  up(count?: number): Promise<void>;
  down(count?: number): Promise<void>;
  status(): Promise<MigrationStatus[]>;
}
```

---

## 目录结构

### 框架源码目录结构

数据库支持功能将添加到框架的 `src/features/database/` 目录下，具体结构如下：

```
src/
├── features/
│   └── database/              # 数据库功能模块
│       ├── mod.ts             # 数据库模块入口，导出所有公共 API
│       ├── manager.ts         # 数据库管理器 (DatabaseManager)
│       ├── types.ts           # 数据库相关类型定义
│       │
│       ├── adapters/          # 数据库适配器
│       │   ├── mod.ts         # 适配器模块入口
│       │   ├── base.ts        # 基础适配器接口和抽象类
│       │   ├── postgresql.ts  # PostgreSQL 适配器
│       │   └── mongodb.ts      # MongoDB 适配器
│       │
│       ├── query/             # 查询构建器
│       │   ├── mod.ts         # 查询构建器模块入口
│       │   ├── sql-builder.ts # SQL 查询构建器 (SQLQueryBuilder)
│       │   └── mongo-builder.ts # MongoDB 查询构建器 (MongoQueryBuilder)
│       │
│       ├── orm/               # ORM/ODM 模型
│       │   ├── mod.ts         # ORM 模块入口
│       │   ├── sql-model.ts  # SQL 模型基类 (SQLModel)
│       │   └── mongo-model.ts # MongoDB 模型基类 (MongoModel)
│       │
│       └── migration/         # 迁移管理
│           ├── mod.ts         # 迁移模块入口
│           ├── manager.ts     # 迁移管理器 (MigrationManager)
│           ├── types.ts       # 迁移相关类型
│           └── utils.ts       # 迁移工具函数
│
├── types/
│   └── index.ts               # 添加 DatabaseConfig 到 AppConfig
│
└── mod.ts                     # 框架主入口，导出数据库相关 API
```

### 项目使用目录结构

使用数据库功能的项目目录结构：

```
my-project/
├── routes/                    # 路由目录
│   ├── users/
│   │   └── [id].tsx          # 使用数据库查询的页面
│   └── api/
│       └── users.ts          # API 路由中使用数据库
│
├── models/                    # 数据模型目录（可选）
│   ├── User.ts               # User 模型
│   ├── Post.ts               # Post 模型
│   └── index.ts              # 模型导出
│
├── migrations/                # 数据库迁移目录（可选）
│   ├── 001_create_users_table.ts
│   ├── 002_create_posts_table.ts
│   └── 003_add_email_to_users.ts
│
├── dweb.config.ts            # 配置文件（包含数据库配置）
├── main.ts                   # 应用入口
└── ...
```

### 目录说明

#### 1. `src/features/database/` - 数据库功能模块

**`mod.ts`** - 数据库模块入口
- 导出 `DatabaseManager`
- 导出所有适配器
- 导出查询构建器
- 导出 ORM/ODM 模型基类
- 导出迁移管理器

**`manager.ts`** - 数据库管理器
- 管理多个数据库连接
- 提供连接创建、获取、关闭功能
- 支持多数据库同时使用

**`types.ts`** - 类型定义
- `DatabaseType` - 数据库类型枚举
- `DatabaseConfig` - 数据库配置接口
- `DatabaseAdapter` - 适配器接口
- 其他相关类型

#### 2. `src/features/database/adapters/` - 数据库适配器

每个适配器实现 `DatabaseAdapter` 接口，提供统一的数据库操作 API。

**`base.ts`** - 基础适配器
- `DatabaseAdapter` 接口定义
- 抽象适配器基类（可选）

**`postgresql.ts`** - PostgreSQL 适配器
- 使用 `postgres` 库
- 实现 PostgreSQL 特定功能

**`mongodb.ts`** - MongoDB 适配器
- 使用 `npm:mongodb` 库
- 实现 MongoDB 特定功能

#### 3. `src/features/database/query/` - 查询构建器

**`sql-builder.ts`** - SQL 查询构建器
- 支持 SELECT、INSERT、UPDATE、DELETE
- 支持 WHERE、JOIN、ORDER BY、LIMIT、OFFSET
- 参数化查询（SQL 注入防护）

**`mongo-builder.ts`** - MongoDB 查询构建器
- 支持 find、insert、update、delete
- 支持聚合查询
- 支持索引管理

#### 4. `src/features/database/orm/` - ORM/ODM 模型

**`sql-model.ts`** - SQL 模型基类
- `SQLModel` 抽象类
- 提供 CRUD 操作方法
- 支持对象条件查询
- 支持字段数组选择
- 支持查询条件操作符

**`mongo-model.ts`** - MongoDB 模型基类
- `MongoModel` 抽象类
- 提供 CRUD 操作方法
- 支持对象条件查询
- 支持字段投影
- 支持 MongoDB 操作符

#### 5. `src/features/database/migration/` - 迁移管理

**`manager.ts`** - 迁移管理器
- 迁移文件生成
- 迁移执行和回滚
- 版本控制
- 迁移历史记录

**`types.ts`** - 迁移类型
- `Migration` 接口
- `MigrationStatus` 接口
- 其他迁移相关类型

**`utils.ts`** - 迁移工具
- 迁移文件解析
- 迁移历史管理
- 迁移文件模板生成

### 导出结构

#### 框架主入口 (`src/mod.ts`)

```typescript
// 数据库相关导出
export {
  // 数据库管理器
  DatabaseManager,
  type DatabaseConfig,
  type DatabaseType,
  type DatabaseAdapter,
  
  // 查询构建器
  SQLQueryBuilder,
  MongoQueryBuilder,
  
  // ORM/ODM
  SQLModel,
  MongoModel,
  
  // 迁移管理
  MigrationManager,
  type Migration,
} from './features/database/mod.ts';
```

#### 数据库模块入口 (`src/features/database/mod.ts`)

```typescript
// 导出管理器
export { DatabaseManager } from './manager.ts';

// 导出类型
export type {
  DatabaseConfig,
  DatabaseType,
  DatabaseAdapter,
} from './types.ts';

// 导出适配器
export {
  PostgreSQLAdapter,
  MongoDBAdapter,
} from './adapters/mod.ts';

// 导出查询构建器
export {
  SQLQueryBuilder,
  MongoQueryBuilder,
} from './query/mod.ts';

// 导出 ORM/ODM
export {
  SQLModel,
  MongoModel,
} from './orm/mod.ts';

// 导出迁移管理
export {
  MigrationManager,
  type Migration,
  type MigrationStatus,
} from './migration/mod.ts';
```

### 使用示例

#### 在项目中使用数据库

```typescript
// models/User.ts
import { SQLModel } from '@dreamer/dweb';
import { db } from '@dreamer/dweb';

export class User extends SQLModel {
  static table = 'users';
  static primaryKey = 'id';
  static adapter = db.getConnection();
  
  id!: number;
  name!: string;
  email!: string;
  age!: number;
  
  static fromRow(row: any): User {
    const user = new User();
    Object.assign(user, row);
    return user;
  }
}
```

```typescript
// dweb.config.ts
import type { AppConfig } from '@dreamer/dweb';

const config: AppConfig = {
  database: {
    type: 'postgresql',
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'mydb',
      username: 'user',
      password: 'password',
    },
  },
  // ... 其他配置
};

export default config;
```

```typescript
// routes/users/[id].tsx
import { User } from '../../models/User.ts';

export const load = async ({ params }) => {
  const user = await User.find({ id: parseInt(params.id) });
  return { user };
};

export default function UserPage({ data }) {
  return <div>{data.user.name}</div>;
}
```

---

## 实现方案

### 阶段一：基础数据库支持（1-2 周）

#### 1.1 数据库管理器

```typescript
// src/features/database.ts
import { DB } from "https://deno.land/x/sqlite@v3.8.0/mod.ts";

export class DatabaseManager {
  private db: DB | null = null;
  
  async connect(config: DatabaseConfig): Promise<void> {
    if (config.type === 'sqlite') {
      this.db = new DB(config.connection.path || 'database.sqlite');
    }
    // 其他数据库类型...
  }
  
  getConnection(): DB {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }
}
```

#### 1.2 查询构建器

```typescript
// src/features/query-builder.ts
export class QueryBuilder {
  private db: DB;
  private query: string = '';
  private params: any[] = [];
  
  select(columns: string[]): this {
    this.query = `SELECT ${columns.join(', ')}`;
    return this;
  }
  
  from(table: string): this {
    this.query += ` FROM ${table}`;
    return this;
  }
  
  where(condition: string, params?: any[]): this {
    this.query += ` WHERE ${condition}`;
    if (params) {
      this.params.push(...params);
    }
    return this;
  }
  
  async execute<T = any>(): Promise<T[]> {
    const result = this.db.query(this.query, this.params);
    // 转换为对象数组
    return result.map(row => this.rowToObject(row));
  }
}
```

### 阶段二：ORM 支持（2-3 周）

#### 2.1 模型定义

```typescript
// src/features/orm.ts
export abstract class Model {
  static table: string;
  static primaryKey: string = 'id';
  
  static async find(id: any): Promise<Model | null> {
    const db = getDatabase();
    const query = new QueryBuilder(db)
      .select(['*'])
      .from(this.table)
      .where(`${this.primaryKey} = ?`, [id]);
    
    const result = await query.executeOne();
    return result ? this.fromRow(result) : null;
  }
  
  static async create(data: Record<string, any>): Promise<Model> {
    const db = getDatabase();
    const query = new QueryBuilder(db)
      .insert(this.table, data);
    
    const result = await query.execute();
    return this.fromRow(result);
  }
}
```

#### 2.2 使用示例

```typescript
// models/User.ts
import { Model } from "@dreamer/dweb";

export class User extends Model {
  static table = 'users';
  static primaryKey = 'id';
  
  id!: number;
  name!: string;
  email!: string;
  createdAt!: Date;
  
  static fromRow(row: any): User {
    const user = new User();
    Object.assign(user, row);
    return user;
  }
}
```

### 阶段三：迁移管理（1-2 周）

#### 3.1 迁移文件结构

```
migrations/
├── 001_create_users_table.ts
├── 002_create_posts_table.ts
└── 003_add_email_to_users.ts
```

#### 3.2 迁移管理器

```typescript
// src/features/migration.ts
export class MigrationManager {
  async create(name: string): Promise<string> {
    const timestamp = Date.now();
    const filename = `${timestamp}_${name}.ts`;
    // 创建迁移文件模板
    return filename;
  }
  
  async up(count?: number): Promise<void> {
    const migrations = await this.getPendingMigrations();
    const toRun = count ? migrations.slice(0, count) : migrations;
    
    for (const migration of toRun) {
      await migration.up();
      await this.recordMigration(migration.name);
    }
  }
}
```

### 阶段四：集成到框架（1 周）

#### 4.1 配置支持

```typescript
// src/types/index.ts
export interface DatabaseConfig {
  type: 'postgresql' | 'mongodb';
  connection: {
    path?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    authSource?: string;
    replicaSet?: string;
  };
  pool?: {
    min?: number;
    max?: number;
    idleTimeout?: number;
  };
  mongoOptions?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    serverSelectionTimeoutMS?: number;
  };
}

export interface AppConfig {
  // ... 其他配置
  database?: DatabaseConfig;
}
```

#### 4.2 在 load 函数中使用

```typescript
// routes/users/[id].tsx
import { User } from "../../models/User.ts";

export const load = async ({ params }) => {
  const user = await User.find(params.id);
  return { user };
};

export default function UserPage({ data }) {
  return <div>{data.user.name}</div>;
}
```

#### 4.3 在 API 路由中使用

```typescript
// routes/api/users.ts
import { User } from "../../models/User.ts";

export async function getUsers(req: Request) {
  const users = await User.findAll();
  return { users };
}

export async function createUser(req: Request) {
  const body = await req.json();
  const user = await User.create(body);
  return { user };
}
```

---

## 使用示例

### SQL 数据库查询（PostgreSQL）

```typescript
import { db } from "@dreamer/dweb";

// 查询
const users = await db
  .select(['id', 'name', 'email'])
  .from('users')
  .where('age > ?', [18])
  .orderBy('created_at', 'DESC')
  .limit(10)
  .execute();

// 插入
await db
  .insert('users', {
    name: 'John',
    email: 'john@example.com',
    age: 25
  })
  .execute();

// 更新
await db
  .update('users', { name: 'Jane' })
  .where('id = ?', [1])
  .execute();

// 删除
await db
  .delete('users')
  .where('id = ?', [1])
  .execute();

// 事务
await db.transaction(async (tx) => {
  await tx.insert('users', { name: 'John', email: 'john@example.com' });
  await tx.insert('profiles', { user_id: 1, bio: 'Developer' });
});
```

### MongoDB 查询

```typescript
import { db } from "@dreamer/dweb";

// 查询
const users = await db
  .collection('users')
  .find({ age: { $gt: 18 } })
  .sort({ createdAt: -1 })
  .limit(10)
  .execute();

// 插入
await db
  .collection('users')
  .insert({
    name: 'John',
    email: 'john@example.com',
    age: 25
  });

// 更新
await db
  .collection('users')
  .update(
    { _id: userId },
    { $set: { name: 'Jane' } }
  );

// 删除
await db
  .collection('users')
  .delete({ _id: userId });
```

### ORM 使用（习惯性写法）

```typescript
import { User } from "./models/User.ts";

// 1. 查找 - 支持对象条件
const user1 = await User.find(1);  // 通过 ID
const user2 = await User.find({ id: 1 });  // 通过条件对象
const user3 = await User.find({ email: 'user@example.com' });  // 通过其他字段

// 2. 查找 - 指定查询字段
const user4 = await User.find(1, ['id', 'name', 'email']);  // 只查询指定字段

// 3. 查找多个 - 支持条件对象和字段选择
const users1 = await User.findAll();  // 查找所有
const users2 = await User.findAll({ age: 25 });  // 按条件查找
const users3 = await User.findAll({ age: { $gt: 18 } });  // 支持操作符
const users4 = await User.findAll({}, ['id', 'name', 'email']);  // 指定字段

// 4. 创建
const newUser = await User.create({
  name: 'John',
  email: 'john@example.com'
});

// 5. 更新 - 支持对象条件
await User.update(1, { name: 'lisi' });  // 通过 ID 更新
await User.update({ id: 1 }, { name: 'lisi' });  // 通过条件对象更新
await User.update({ email: 'user@example.com' }, { name: 'lisi' });  // 通过其他字段更新

// 6. 删除 - 支持对象条件
await User.delete(1);  // 通过 ID 删除
await User.delete({ id: 1 });  // 通过条件对象删除
await User.delete({ email: 'user@example.com' });  // 通过其他字段删除
```

### 迁移使用

```typescript
// migrations/001_create_users_table.ts
import { Migration } from "@dreamer/dweb";

export default class CreateUsersTable implements Migration {
  async up() {
    await db.execute(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  
  async down() {
    await db.execute('DROP TABLE users');
  }
}
```

---

## 实施计划

### 第一阶段：基础数据库支持（3-4 周）

#### Week 1: 数据库适配器接口和 SQLite 实现
- 定义统一的 `DatabaseAdapter` 接口
- 实现 `SQLiteAdapter`
- 实现基础的连接管理
- 单元测试

#### Week 2: MongoDB 适配器
- 实现 `MongoDBAdapter`
- 连接池支持
- 事务支持
- 单元测试

#### Week 3: MongoDB 适配器
- 实现 `MongoDBAdapter`
- MongoDB 特定功能（集合操作、文档操作）
- 事务支持（MongoDB 4.0+）
- 单元测试

#### Week 4: 数据库管理器
- 实现 `DatabaseManager`
- 多数据库连接支持
- 配置系统集成
- 集成测试

### 第二阶段：查询构建器（2-3 周）

#### Week 5: SQL 查询构建器
- `SQLQueryBuilder` 实现
- SELECT、INSERT、UPDATE、DELETE
- WHERE、JOIN、ORDER BY、LIMIT、OFFSET
- 参数化查询（SQL 注入防护）
- 单元测试

#### Week 6: MongoDB 查询构建器
- `MongoQueryBuilder` 实现
- find、insert、update、delete
- 聚合查询支持
- 索引管理
- 单元测试

#### Week 7: 测试和优化
- 集成测试
- 性能测试
- 文档编写

### 第三阶段：ORM/ODM 支持（2-3 周）

#### Week 8-9: SQL ORM
- `SQLModel` 基类实现
- 模型定义和注册
- CRUD 操作（支持对象条件查询）
- 字段选择支持（数组形式）
- 查询条件操作符支持（$gt, $lt, $gte, $lte, $ne, $in）
- 关系映射（一对一、一对多）
- 数据验证
- 单元测试

#### Week 10: MongoDB ODM
- `MongoModel` 基类实现
- 文档模型定义
- CRUD 操作（支持对象条件查询）
- 字段投影支持（数组形式）
- MongoDB 操作符支持（$gt, $lt, $gte, $lte, $ne, $in, $nin, $exists 等）
- 模式验证
- 单元测试

#### Week 11: 高级功能
- 钩子（beforeSave、afterSave、beforeDelete 等）
- 查询优化
- 批量操作
- 性能优化

### 第四阶段：迁移管理（2 周）

#### Week 12: 迁移管理器
- `MigrationManager` 实现
- 迁移文件生成（SQL 和 MongoDB）
- 迁移执行和回滚
- 版本控制
- 迁移历史记录

#### Week 13: 测试和优化
- 迁移测试
- 回滚测试
- 多数据库迁移支持
- 文档编写

### 第五阶段：框架集成（1 周）

#### Week 14: 框架集成
- 配置系统集成（`dweb.config.ts`）
- `load` 函数中数据库访问支持
- API 路由中数据库访问支持
- 中间件集成
- 文档完善
- 示例项目更新

---

## 技术决策

### 1. 数据库选择

**推荐**: 支持 PostgreSQL 和 MongoDB

**理由**:
- PostgreSQL 功能强大，适合生产环境
- 通过插件方式支持其他数据库，保持灵活性
- 用户可以根据需求选择数据库

### 2. ORM vs 查询构建器

**推荐**: 两者都支持，用户可以选择

**理由**:
- 查询构建器适合简单查询和性能敏感场景
- ORM 适合复杂业务逻辑和类型安全
- 提供选择权，满足不同需求

### 3. 迁移管理

**推荐**: 使用文件系统管理迁移

**理由**:
- 简单直观
- 易于版本控制
- 支持回滚

---

## 注意事项

### 1. 性能考虑

#### SQL 数据库
- 连接池大小需要根据实际负载调整
- 避免 N+1 查询问题
- 使用索引优化查询性能
- 使用事务减少数据库往返
- 批量操作优化

#### MongoDB
- 合理使用索引
- 避免全表扫描
- 使用聚合管道优化复杂查询
- 连接池配置优化

### 2. 安全考虑

#### SQL 注入防护
- **所有查询必须使用参数化查询**
- 禁止字符串拼接 SQL
- 输入验证和清理
- 权限控制（最小权限原则）

#### MongoDB 注入防护
- 使用参数化查询
- 验证输入数据
- 使用操作符而非字符串拼接

#### 连接安全
- 使用环境变量存储敏感信息
- 生产环境使用 SSL/TLS 连接
- 定期更新数据库驱动

### 3. 类型安全

- 充分利用 TypeScript 类型系统
- 提供类型推断
- 避免 any 类型
- 模型定义使用接口或类
- 查询结果类型推断

### 4. 错误处理

- 统一的错误处理机制
- 详细的错误信息（开发环境）
- 连接失败重试机制
- 事务回滚处理
- 超时处理

### 5. 数据库特定注意事项

#### PostgreSQL
- 需要合理配置连接池
- 使用预编译语句提升性能
- 注意事务隔离级别

#### MySQL
- 注意字符集配置（UTF-8）
- 合理使用索引
- 注意存储引擎选择（InnoDB vs MyISAM）

#### MongoDB
- 注意文档大小限制（16MB）
- 合理设计文档结构
- 使用适当的索引策略
- 注意事务性能影响（4.0+）

### 6. 开发建议

#### 开发环境
- 使用 PostgreSQL 作为开发数据库
- 使用内存数据库进行测试

#### 生产环境
- 使用 PostgreSQL（关系型数据）
- 使用 MongoDB（非结构化数据）
- 配置连接池和超时
- 启用查询日志（调试）
- 监控数据库性能

#### 测试
- 使用 PostgreSQL 进行单元测试
- 使用 Docker 容器进行集成测试
- 测试不同数据库的兼容性

---

## 总结

数据库支持是一个可选功能，但可以大大提升框架的实用性。建议采用渐进式实现：

1. **先实现基础功能**（查询构建器 + PostgreSQL）
2. **再添加 ORM 支持**（模型定义 + CRUD）
3. **最后完善迁移管理**（版本控制 + 回滚）

这样可以让用户尽早使用，同时逐步完善功能。

---

**最后更新**: 2024-12-19

