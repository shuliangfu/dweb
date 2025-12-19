# 数据库使用指南

本文档介绍如何在 DWeb 框架中使用数据库功能。

## 📋 目录

- [快速开始](#快速开始)
- [配置数据库](#配置数据库)
- [使用查询构建器](#使用查询构建器)
- [使用 ORM/ODM](#使用ormodm)
- [使用迁移管理](#使用迁移管理)
- [在 load 函数中使用](#在-load-函数中使用)
- [在 API 路由中使用](#在-api-路由中使用)
- [在中间件中使用](#在中间件中使用)
- [最佳实践](#最佳实践)

---

## 快速开始

### 1. 配置数据库

在 `dweb.config.ts` 中配置数据库：

```typescript
import type { AppConfig } from '@dreamer/dweb';

const config: AppConfig = {
  // ... 其他配置
  
  database: {
    type: 'sqlite',
    connection: {
      path: 'database.sqlite',
    },
  },
};

export default config;
```

### 2. 在 load 函数中使用

```typescript
// routes/users/[id].tsx
export const load = async ({ params, db }) => {
  if (!db) {
    throw new Error('Database not configured');
  }
  
  const users = await db.query('SELECT * FROM users WHERE id = ?', [params.id]);
  return { user: users[0] };
};

export default function UserPage({ data }) {
  return <div>{data.user.name}</div>;
}
```

### 3. 在 API 路由中使用

```typescript
// routes/api/users.ts
import { getDatabase } from '@dreamer/dweb';

export async function getUser(req: Request) {
  const db = getDatabase();
  const users = await db.query('SELECT * FROM users');
  return { users };
}
```

---

## 配置数据库

### SQLite

```typescript
database: {
  type: 'sqlite',
  connection: {
    path: 'database.sqlite', // 数据库文件路径
  },
}
```

### PostgreSQL

```typescript
database: {
  type: 'postgresql',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'mydb',
    username: 'user',
    password: 'password',
  },
  pool: {
    min: 2,
    max: 10,
    idleTimeout: 30000,
  },
}
```

### MySQL

```typescript
database: {
  type: 'mysql',
  connection: {
    host: 'localhost',
    port: 3306,
    database: 'mydb',
    username: 'user',
    password: 'password',
  },
  pool: {
    min: 2,
    max: 10,
    idleTimeout: 30000,
  },
}
```

### MongoDB

```typescript
database: {
  type: 'mongodb',
  connection: {
    host: 'localhost',
    port: 27017,
    database: 'mydb',
    username: 'user',
    password: 'password',
  },
  mongoOptions: {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
  },
}
```

---

## 使用查询构建器

### SQL 查询构建器

```typescript
import { getDatabase, SQLQueryBuilder } from '@dreamer/dweb';

const db = getDatabase();
const builder = new SQLQueryBuilder(db);

// 查询
const users = await builder
  .select(['id', 'name', 'email'])
  .from('users')
  .where('age > ?', [18])
  .orderBy('created_at', 'DESC')
  .limit(10)
  .execute();

// 插入
await builder
  .insert('users', {
    name: 'John',
    email: 'john@example.com',
    age: 25,
  })
  .execute();

// 更新
await builder
  .update('users', { name: 'Jane' })
  .where('id = ?', [1])
  .execute();

// 删除
await builder
  .delete('users')
  .where('id = ?', [1])
  .execute();
```

### MongoDB 查询构建器

```typescript
import { getDatabase, MongoQueryBuilder } from '@dreamer/dweb';

const db = getDatabase();
const builder = new MongoQueryBuilder(db);

// 查询
const users = await builder
  .from('users')
  .find({ age: { $gt: 18 } })
  .sort({ createdAt: -1 })
  .limit(10)
  .query();

// 插入
await builder
  .from('users')
  .execute()
  .insert({ name: 'John', email: 'john@example.com', age: 25 });

// 更新
await builder
  .from('users')
  .find({ id: 1 })
  .execute()
  .update({ name: 'Jane' });

// 删除
await builder
  .from('users')
  .find({ id: 1 })
  .execute()
  .delete();
```

---

## 使用 ORM/ODM

### SQL 模型

```typescript
// models/User.ts
import { SQLModel } from '@dreamer/dweb';
import { getDatabase } from '@dreamer/dweb';

export class User extends SQLModel {
  static tableName = 'users';
  static primaryKey = 'id';
  
  id!: number;
  name!: string;
  email!: string;
  age!: number;
}

// 初始化模型（在应用启动时）
User.setAdapter(getDatabase());

// 使用模型
const user = await User.find(1);
const user = await User.find({ id: 1 });
const user = await User.find({ email: 'user@example.com' }, ['id', 'name', 'email']);

const users = await User.findAll();
const users = await User.findAll({ age: 25 });
const users = await User.findAll({ age: { $gt: 18 } });

const newUser = await User.create({ name: 'John', email: 'john@example.com' });

await User.update({ id: 1 }, { name: 'lisi' });
await User.update({ email: 'user@example.com' }, { name: 'lisi' });

await User.delete({ id: 1 });
await User.delete({ email: 'user@example.com' });
```

### MongoDB 模型

```typescript
// models/User.ts
import { MongoModel } from '@dreamer/dweb';
import { getDatabase } from '@dreamer/dweb';

export class User extends MongoModel {
  static collectionName = 'users';
  static primaryKey = '_id';
  
  _id!: string;
  name!: string;
  email!: string;
  age!: number;
}

// 初始化模型（在应用启动时）
User.setAdapter(getDatabase());

// 使用模型（与 SQL 模型类似）
const user = await User.find('507f1f77bcf86cd799439011');
const user = await User.find({ _id: '507f1f77bcf86cd799439011' });
const users = await User.findAll({ age: { $gt: 18 } });
```

---

## 使用迁移管理

### 创建迁移

```typescript
import { MigrationManager, getDatabase } from '@dreamer/dweb';

const db = getDatabase();
const manager = new MigrationManager({
  migrationsDir: './migrations',
  adapter: db,
});

// 创建迁移文件
await manager.create('create_users_table');
```

### 迁移文件示例

```typescript
// migrations/1734567890_create_users_table.ts
import type { Migration } from '@dreamer/dweb';
import type { DatabaseAdapter } from '@dreamer/dweb';

export default class CreateUsersTable implements Migration {
  name = 'create_users_table';

  async up(db: DatabaseAdapter): Promise<void> {
    await db.execute(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async down(db: DatabaseAdapter): Promise<void> {
    await db.execute('DROP TABLE users');
  }
}
```

### 执行迁移

```typescript
// 执行所有待执行的迁移
await manager.up();

// 只执行前 5 个迁移
await manager.up(5);

// 回滚最后一个迁移
await manager.down();

// 回滚最后 3 个迁移
await manager.down(3);

// 查看迁移状态
const status = await manager.status();
console.log(status);
```

---

## 在 load 函数中使用

```typescript
// routes/users/[id].tsx
export const load = async ({ params, db }) => {
  if (!db) {
    return { user: null };
  }
  
  // 使用查询构建器
  const builder = new SQLQueryBuilder(db);
  const users = await builder
    .select(['*'])
    .from('users')
    .where('id = ?', [params.id])
    .execute();
  
  // 或使用 ORM
  const user = await User.find(params.id);
  
  return { user: users[0] || user };
};
```

---

## 在 API 路由中使用

```typescript
// routes/api/users.ts
import { getDatabase, SQLQueryBuilder } from '@dreamer/dweb';

export async function getUser(req: Request) {
  const db = getDatabase();
  const builder = new SQLQueryBuilder(db);
  const users = await builder
    .select(['*'])
    .from('users')
    .execute();
  return { users };
}

export async function createUser(req: Request) {
  const db = getDatabase();
  const body = await req.json();
  const builder = new SQLQueryBuilder(db);
  await builder
    .insert('users', body)
    .execute();
  return { success: true };
}
```

---

## 在中间件中使用

中间件可以通过 `getDatabase()` 函数访问数据库：

```typescript
// routes/_middleware.ts
import type { Request, Response } from '@dreamer/dweb';
import { getDatabase, SQLQueryBuilder } from '@dreamer/dweb';

export default async function middleware(
  req: Request,
  res: Response,
  next: () => Promise<void>
) {
  try {
    // 访问数据库
    const db = getDatabase();
    const builder = new SQLQueryBuilder(db);
    
    // 记录请求日志到数据库
    await builder
      .insert('request_logs', {
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString(),
      })
      .execute();
  } catch {
    // 数据库未配置或访问失败时忽略
  }
  
  await next();
}
```

---

## 最佳实践

### 1. 使用参数化查询

✅ **正确**：
```typescript
await db.query('SELECT * FROM users WHERE id = ?', [userId]);
```

❌ **错误**：
```typescript
await db.query(`SELECT * FROM users WHERE id = ${userId}`); // SQL 注入风险
```

### 2. 使用事务

```typescript
await db.transaction(async (tx) => {
  await tx.execute('INSERT INTO users (name) VALUES (?)', ['John']);
  await tx.execute('INSERT INTO profiles (user_id) VALUES (?)', [1]);
});
```

### 3. 错误处理

```typescript
try {
  const user = await User.find(1);
  if (!user) {
    return { error: 'User not found' };
  }
  return { user };
} catch (error) {
  console.error('Database error:', error);
  return { error: 'Database query failed' };
}
```

### 4. 模型初始化

在应用启动时初始化模型：

```typescript
// main.ts 或 _app.tsx
import { getDatabase } from '@dreamer/dweb';
import { User } from './models/User.ts';

// 在应用启动时
User.setAdapter(getDatabase());
```

### 5. 连接管理

数据库连接会在服务器启动时自动初始化，在服务器关闭时自动关闭。无需手动管理。

---

## 支持的数据库

- ✅ **SQLite** - 轻量级嵌入式数据库
- ✅ **PostgreSQL** - 强大的关系型数据库
- ✅ **MySQL** - 流行的关系型数据库
- ✅ **MongoDB** - NoSQL 文档数据库

---

## 相关文档

- [数据库实现方案分析](./DATABASE_ANALYSIS.md) - 详细的架构设计和实现方案
- [API 文档](../README.md) - 完整的 API 参考

---

**最后更新**: 2024-12-20

