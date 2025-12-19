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

### Deno 生态中的数据库库

#### 1. **Deno SQLite** (推荐用于简单场景)

**优点**:
- 官方支持，稳定可靠
- 轻量级，无需外部依赖
- 适合小型项目

**缺点**:
- 仅支持 SQLite
- 功能相对简单

**适用场景**: 小型项目、原型开发、单机应用

#### 2. **Postgres.js** (推荐用于生产环境)

**优点**:
- 原生 PostgreSQL 支持
- 高性能
- 支持连接池
- TypeScript 类型支持

**缺点**:
- 仅支持 PostgreSQL
- 需要外部数据库服务

**适用场景**: 生产环境、需要关系型数据库的场景

#### 3. **MySQL2** (通过 npm 兼容层)

**优点**:
- 成熟的 MySQL 驱动
- 功能完整

**缺点**:
- 需要通过 npm 兼容层
- 性能可能不如原生库

**适用场景**: 需要 MySQL 的场景

#### 4. **Drizzle ORM** (推荐用于 ORM)

**优点**:
- 轻量级 ORM
- 类型安全
- 支持多种数据库（PostgreSQL、MySQL、SQLite）
- 支持迁移
- 性能优秀

**缺点**:
- 需要学习新的 API
- 社区相对较小

**适用场景**: 需要 ORM 功能的项目

#### 5. **Prisma** (通过 npm 兼容层)

**优点**:
- 功能强大的 ORM
- 优秀的类型推断
- 完善的迁移工具
- 大型社区

**缺点**:
- 需要通过 npm 兼容层
- 配置相对复杂
- 包体积较大

**适用场景**: 大型项目、需要完整 ORM 功能

### 推荐方案

**方案一：轻量级方案（推荐）**
- 使用 **Deno SQLite** 作为默认数据库
- 提供简单的查询构建器
- 支持插件方式集成其他数据库（PostgreSQL、MySQL）

**方案二：完整方案**
- 集成 **Drizzle ORM** 作为核心 ORM
- 支持多种数据库
- 提供完整的迁移工具

---

## 架构设计

### 1. 数据库管理器 (DatabaseManager)

```typescript
// src/features/database.ts
export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql' | 'mysql';
  connection: {
    // SQLite
    path?: string;
    // PostgreSQL/MySQL
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
  };
  pool?: {
    min?: number;
    max?: number;
    idleTimeout?: number;
  };
}

export class DatabaseManager {
  private connections: Map<string, DatabaseConnection>;
  
  connect(name: string, config: DatabaseConfig): Promise<void>;
  getConnection(name?: string): DatabaseConnection;
  close(name?: string): Promise<void>;
  closeAll(): Promise<void>;
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

### 3. ORM 模型 (Model)

```typescript
// src/features/orm.ts
export abstract class Model {
  static table: string;
  static primaryKey: string = 'id';
  
  static find(id: any): Promise<Model | null>;
  static findAll(conditions?: Record<string, any>): Promise<Model[]>;
  static create(data: Record<string, any>): Promise<Model>;
  static update(id: any, data: Record<string, any>): Promise<Model>;
  static delete(id: any): Promise<boolean>;
  
  save(): Promise<this>;
  delete(): Promise<boolean>;
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
  type: 'sqlite' | 'postgresql' | 'mysql';
  connection: {
    path?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
  };
  pool?: {
    min?: number;
    max?: number;
    idleTimeout?: number;
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

### 基础查询

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

### 第一阶段：基础支持（2-3 周）

1. **Week 1**: 数据库管理器实现
   - SQLite 支持
   - 连接池基础
   - 配置集成

2. **Week 2**: 查询构建器
   - SELECT、INSERT、UPDATE、DELETE
   - WHERE、JOIN、ORDER BY、LIMIT
   - 参数化查询（SQL 注入防护）

3. **Week 3**: 测试和文档
   - 单元测试
   - 集成测试
   - 使用文档

### 第二阶段：ORM 支持（2-3 周）

1. **Week 4-5**: ORM 核心功能
   - Model 基类
   - 模型定义
   - CRUD 操作
   - 关系映射（基础）

2. **Week 6**: 高级功能
   - 数据验证
   - 钩子（beforeSave、afterSave 等）
   - 查询优化

### 第三阶段：迁移管理（1-2 周）

1. **Week 7**: 迁移管理器
   - 迁移文件生成
   - 迁移执行
   - 版本控制

2. **Week 8**: 测试和优化
   - 迁移测试
   - 回滚测试
   - 性能优化

### 第四阶段：集成和优化（1 周）

1. **Week 9**: 框架集成
   - 配置系统集成
   - load 函数支持
   - API 路由支持
   - 文档完善

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

- 连接池大小需要根据实际负载调整
- 避免 N+1 查询问题
- 使用索引优化查询性能

### 2. 安全考虑

- 所有查询必须使用参数化查询
- 输入验证和清理
- 权限控制

### 3. 类型安全

- 充分利用 TypeScript 类型系统
- 提供类型推断
- 避免 any 类型

### 4. 错误处理

- 统一的错误处理机制
- 详细的错误信息
- 连接失败重试机制

---

## 总结

数据库支持是一个可选功能，但可以大大提升框架的实用性。建议采用渐进式实现：

1. **先实现基础功能**（查询构建器 + SQLite）
2. **再添加 ORM 支持**（模型定义 + CRUD）
3. **最后完善迁移管理**（版本控制 + 回滚）

这样可以让用户尽早使用，同时逐步完善功能。

---

**最后更新**: 2024-12-19

