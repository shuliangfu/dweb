# 数据库支持实现方案分析

本文档分析 DWeb 框架如何实现数据库支持功能。

## 📋 目录

- [需求分析](#需求分析)
- [技术选型](#技术选型)
- [架构设计](#架构设计)
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

DWeb 框架将支持以下四种数据库：

1. **SQLite** - 轻量级嵌入式数据库
2. **PostgreSQL** - 强大的关系型数据库
3. **MySQL** - 流行的关系型数据库
4. **MongoDB** - NoSQL 文档数据库

### 数据库驱动选择

#### 1. **SQLite** - `deno-sqlite`

**驱动**: `https://deno.land/x/sqlite@v3.8.0/mod.ts`

**优点**:
- ✅ 官方维护，稳定可靠
- ✅ 轻量级，无需外部服务
- ✅ 零配置，适合开发和简单部署
- ✅ 性能优秀（单机场景）
- ✅ 支持事务

**缺点**:
- ❌ 仅支持单机访问
- ❌ 并发写入性能有限
- ❌ 不适合高并发场景

**适用场景**: 
- 小型项目、原型开发
- 单机应用
- 开发环境
- 嵌入式应用

**示例代码**:
```typescript
import { DB } from "https://deno.land/x/sqlite@v3.8.0/mod.ts";

const db = new DB("database.sqlite");
db.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)");
```

---

#### 2. **PostgreSQL** - `postgres`

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

#### 3. **MySQL** - `deno_mysql`

**驱动**: `https://deno.land/x/mysql@v2.12.1/mod.ts`

**优点**:
- ✅ 流行的关系型数据库
- ✅ 性能优秀
- ✅ 社区支持广泛
- ✅ 支持连接池
- ✅ 兼容性好

**缺点**:
- ❌ 需要独立的数据库服务
- ❌ 某些高级特性不如 PostgreSQL

**适用场景**:
- 需要 MySQL 兼容性的项目
- 现有 MySQL 基础设施
- Web 应用

**示例代码**:
```typescript
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

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
- ✅ 支持 SQLite、PostgreSQL、MySQL
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
- ✅ 便于测试（可以使用 SQLite 作为测试数据库）

---

## 架构设计

### 1. 数据库管理器 (DatabaseManager)

```typescript
// src/features/database.ts

/**
 * 数据库类型
 */
export type DatabaseType = 'sqlite' | 'postgresql' | 'mysql' | 'mongodb';

/**
 * 数据库连接配置
 */
export interface DatabaseConfig {
  /** 数据库类型 */
  type: DatabaseType;
  
  /** 连接配置 */
  connection: {
    // SQLite
    path?: string;
    
    // PostgreSQL/MySQL/MongoDB
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
      case 'sqlite':
        return new SQLiteAdapter();
      case 'postgresql':
        return new PostgreSQLAdapter();
      case 'mysql':
        return new MySQLAdapter();
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
 * SQL 数据库模型基类（用于 SQLite、PostgreSQL、MySQL）
 */
export abstract class SQLModel {
  static table: string;
  static primaryKey: string = 'id';
  static adapter: DatabaseAdapter;
  
  static async find(id: any): Promise<SQLModel | null> {
    const query = new SQLQueryBuilder(this.adapter)
      .select(['*'])
      .from(this.table)
      .where(`${this.primaryKey} = ?`, [id]);
    
    const result = await query.executeOne();
    return result ? this.fromRow(result) : null;
  }
  
  static async findAll(conditions?: Record<string, any>): Promise<SQLModel[]> {
    const query = new SQLQueryBuilder(this.adapter)
      .select(['*'])
      .from(this.table);
    
    if (conditions) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      query.where(whereClause, Object.values(conditions));
    }
    
    const results = await query.execute();
    return results.map(row => this.fromRow(row));
  }
  
  static async create(data: Record<string, any>): Promise<SQLModel> {
    const query = new SQLQueryBuilder(this.adapter)
      .insert(this.table, data);
    
    const result = await query.execute();
    return this.fromRow(result);
  }
  
  static async update(id: any, data: Record<string, any>): Promise<SQLModel> {
    const query = new SQLQueryBuilder(this.adapter)
      .update(this.table, data)
      .where(`${this.primaryKey} = ?`, [id]);
    
    await query.execute();
    return await this.find(id) as SQLModel;
  }
  
  static async delete(id: any): Promise<boolean> {
    const query = new SQLQueryBuilder(this.adapter)
      .delete(this.table)
      .where(`${this.primaryKey} = ?`, [id]);
    
    const result = await query.execute();
    return result.affectedRows > 0;
  }
  
  static fromRow(row: any): SQLModel {
    const model = new (this as any)();
    Object.assign(model, row);
    return model;
  }
  
  async save(): Promise<this> {
    // 实现保存逻辑
    return this;
  }
  
  async delete(): Promise<boolean> {
    return await (this.constructor as typeof SQLModel).delete((this as any)[(this.constructor as typeof SQLModel).primaryKey]);
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
  
  static async find(id: any): Promise<MongoModel | null> {
    const collection = this.getCollection();
    const result = await collection.findOne({ [this.primaryKey]: id });
    return result ? this.fromDocument(result) : null;
  }
  
  static async findAll(filter: any = {}): Promise<MongoModel[]> {
    const collection = this.getCollection();
    const results = await collection.find(filter).toArray();
    return results.map(doc => this.fromDocument(doc));
  }
  
  static async create(data: Record<string, any>): Promise<MongoModel> {
    const collection = this.getCollection();
    const result = await collection.insertOne(data);
    return await this.find(result.insertedId);
  }
  
  static async update(id: any, data: Record<string, any>): Promise<MongoModel> {
    const collection = this.getCollection();
    await collection.updateOne(
      { [this.primaryKey]: id },
      { $set: data }
    );
    return await this.find(id) as MongoModel;
  }
  
  static async delete(id: any): Promise<boolean> {
    const collection = this.getCollection();
    const result = await collection.deleteOne({ [this.primaryKey]: id });
    return result.deletedCount > 0;
  }
  
  static fromDocument(doc: any): MongoModel {
    const model = new (this as any)();
    Object.assign(model, doc);
    return model;
  }
  
  async save(): Promise<this> {
    const collection = (this.constructor as typeof MongoModel).getCollection();
    const id = (this as any)[(this.constructor as typeof MongoModel).primaryKey];
    await collection.updateOne(
      { [(this.constructor as typeof MongoModel).primaryKey]: id },
      { $set: this.toDocument() }
    );
    return this;
  }
  
  async delete(): Promise<boolean> {
    return await (this.constructor as typeof MongoModel).delete(
      (this as any)[(this.constructor as typeof MongoModel).primaryKey]
    );
  }
  
  toDocument(): Record<string, any> {
    // 转换为文档格式
    return { ...this };
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
  type: 'sqlite' | 'postgresql' | 'mysql' | 'mongodb';
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

### SQL 数据库查询（SQLite、PostgreSQL、MySQL）

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

### ORM 使用

```typescript
import { User } from "./models/User.ts";

// 查找
const user = await User.find(1);

// 查找所有
const users = await User.findAll({ age: { $gt: 18 } });

// 创建
const newUser = await User.create({
  name: 'John',
  email: 'john@example.com'
});

// 更新
await User.update(1, { name: 'Jane' });

// 删除
await User.delete(1);
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

#### Week 2: PostgreSQL 和 MySQL 适配器
- 实现 `PostgreSQLAdapter`
- 实现 `MySQLAdapter`
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
- CRUD 操作
- 关系映射（一对一、一对多）
- 数据验证
- 单元测试

#### Week 10: MongoDB ODM
- `MongoModel` 基类实现
- 文档模型定义
- CRUD 操作
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

**推荐**: 默认支持 SQLite，通过插件支持 PostgreSQL/MySQL

**理由**:
- SQLite 无需额外服务，适合开发和简单部署
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

#### SQLite
- 并发写入性能有限，不适合高并发写入场景
- 文件锁可能导致性能问题
- 建议用于读多写少的场景

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
- 使用 SQLite 作为开发数据库（零配置）
- 使用内存数据库进行测试

#### 生产环境
- 使用 PostgreSQL 或 MySQL（关系型数据）
- 使用 MongoDB（非结构化数据）
- 配置连接池和超时
- 启用查询日志（调试）
- 监控数据库性能

#### 测试
- 使用 SQLite 内存数据库进行单元测试
- 使用 Docker 容器进行集成测试
- 测试不同数据库的兼容性

---

## 总结

数据库支持是一个可选功能，但可以大大提升框架的实用性。建议采用渐进式实现：

1. **先实现基础功能**（查询构建器 + SQLite）
2. **再添加 ORM 支持**（模型定义 + CRUD）
3. **最后完善迁移管理**（版本控制 + 回滚）

这样可以让用户尽早使用，同时逐步完善功能。

---

**最后更新**: 2024-12-19

