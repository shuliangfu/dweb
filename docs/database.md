# 数据库模块

DWeb 框架提供了强大的数据库支持，支持 PostgreSQL 和 MongoDB，包含查询构建器、ORM/ODM、迁移管理等功能。

## 目录结构

```
src/features/database/
├── adapters/          # 数据库适配器
│   ├── base.ts        # 基础适配器抽象类
│   ├── mongodb.ts     # MongoDB 适配器
│   └── postgresql.ts  # PostgreSQL 适配器
├── cache/             # 查询缓存
│   ├── cache-adapter.ts
│   └── memory-cache.ts
├── logger/            # 查询日志
│   └── query-logger.ts
├── migration/         # 数据库迁移
│   ├── manager.ts
│   └── types.ts
├── orm/               # ORM/ODM 模型
│   ├── mongo-model.ts # MongoDB 模型
│   └── sql-model.ts   # SQL 模型
├── query/             # 查询构建器
│   ├── mongo-builder.ts
│   └── sql-builder.ts
├── types/             # 类型定义
│   └── index.ts       # 索引类型
├── access.ts          # 数据库访问辅助函数
├── manager.ts         # 数据库管理器
├── mod.ts             # 模块导出
└── types.ts           # 数据库类型定义
```

## 快速开始

### 初始化数据库

```typescript
import { initDatabase } from '@dreamer/dweb/features/database';

// 初始化默认数据库连接
await initDatabase({
  type: 'postgresql',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'mydb',
    username: 'user',
    password: 'password',
  },
});
```

### 使用 ORM 模型

```typescript
import { SQLModel } from '@dreamer/dweb/features/database';

// 定义用户模型
class User extends SQLModel {
  static tableName = 'users';
  static primaryKey = 'id';
  
  // 字段定义
  static schema = {
    name: {
      type: 'string',
      validate: { required: true, min: 2, max: 50 }
    },
    email: {
      type: 'string',
      validate: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
    },
    age: {
      type: 'number',
      validate: { min: 0, max: 150 }
    }
  };
  
  // 自动时间戳
  static timestamps = true;
  
  // 软删除
  static softDelete = true;
}

// 设置数据库适配器
User.setAdapter(await getDatabase());

// 查询
const user = await User.find(1);
const users = await User.findAll({ age: { $gt: 18 } });

// 创建
const newUser = await User.create({
  name: 'John',
  email: 'john@example.com',
  age: 25
});

// 更新
await user.update({ age: 26 });

// 删除
await user.delete();
```

## 数据库适配器

### PostgreSQL 适配器

```typescript
import { PostgreSQLAdapter } from '@dreamer/dweb/features/database';

const adapter = new PostgreSQLAdapter();
await adapter.connect({
  type: 'postgresql',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'mydb',
    username: 'user',
    password: 'password',
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeout: 30,
    maxRetries: 3,
    retryDelay: 1000,
  },
});

// 执行查询
const results = await adapter.query('SELECT * FROM users WHERE age > ?', [18]);

// 执行更新
await adapter.execute('UPDATE users SET age = ? WHERE id = ?', [25, 1]);
```

### MongoDB 适配器

```typescript
import { MongoDBAdapter } from '@dreamer/dweb/features/database';

const adapter = new MongoDBAdapter();
await adapter.connect({
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
    maxRetries: 3,
    retryDelay: 1000,
  },
});

// 执行查询
const results = await adapter.query('users', { age: { $gt: 18 } });

// 执行插入
await adapter.execute('insert', 'users', { name: 'John', age: 25 });
```

## ORM/ODM 模型

### SQLModel (PostgreSQL)

```typescript
import { SQLModel } from '@dreamer/dweb/features/database';

class Post extends SQLModel {
  static tableName = 'posts';
  static primaryKey = 'id';
  
  // 字段定义
  static schema = {
    title: {
      type: 'string',
      validate: { required: true, min: 5, max: 200 }
    },
    content: {
      type: 'text',
      validate: { required: true }
    },
    status: {
      type: 'enum',
      values: ['draft', 'published', 'archived'],
      default: 'draft'
    }
  };
  
  // 索引定义
  static indexes = [
    { field: 'title', unique: true },
    { field: 'createdAt', direction: -1 },
    { fields: { userId: 1, status: 1 }, unique: false }
  ];
  
  // 自动时间戳
  static timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' };
  
  // 软删除
  static softDelete = true;
  static deletedAtField = 'deleted_at';
  
  // 查询作用域
  static scopes = {
    published: () => ({ status: 'published' }),
    recent: () => ({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
  };
  
  // 虚拟字段
  static virtuals = {
    excerpt: (instance: Post) => instance.content.substring(0, 100) + '...',
    isRecent: (instance: Post) => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(instance.createdAt).getTime() > weekAgo;
    }
  };
  
  // 生命周期钩子
  static async beforeCreate(instance: Post) {
    instance.slug = instance.title.toLowerCase().replace(/\s+/g, '-');
  }
  
  static async afterCreate(instance: Post) {
    console.log('Post created:', instance.id);
  }
}

// 创建索引
await Post.createIndexes();

// 使用作用域
const publishedPosts = await Post.scope('published').findAll();
const recentPosts = await Post.scope('recent').findAll();

// 查询
const post = await Post.find(1);
console.log(post.excerpt); // 虚拟字段
console.log(post.isRecent); // 虚拟字段
```

### MongoModel (MongoDB)

```typescript
import { MongoModel } from '@dreamer/dweb/features/database';

class Product extends MongoModel {
  static collectionName = 'products';
  static primaryKey = '_id';
  
  // 字段定义
  static schema = {
    name: {
      type: 'string',
      validate: { required: true, min: 2, max: 100 }
    },
    price: {
      type: 'decimal',
      validate: { required: true, min: 0 }
    },
    tags: {
      type: 'array',
      validate: { required: false }
    },
    location: {
      type: 'object',
      validate: { required: false }
    }
  };
  
  // 索引定义
  static indexes = [
    { field: 'name', unique: true },
    { field: 'price', direction: 1 },
    { fields: { category: 1, price: -1 } },
    { fields: { name: 10, description: 5 }, type: 'text' }, // 文本索引
    { field: 'location', type: '2dsphere' } // 地理空间索引
  ];
  
  // 自动时间戳
  static timestamps = true;
  
  // 软删除
  static softDelete = true;
}

// 创建索引
await Product.createIndexes();

// 查询
const product = await Product.find({ name: 'iPhone' });
const products = await Product.findAll({ price: { $lt: 1000 } });

// 聚合查询
const stats = await Product.aggregate([
  { $group: { _id: '$category', avgPrice: { $avg: '$price' } } }
]);
```

## 查询构建器

### SQL 查询构建器

```typescript
import { SQLQueryBuilder, getDatabase } from '@dreamer/dweb/features/database';

const db = await getDatabase();
const query = new SQLQueryBuilder(db, 'users');

// 构建查询
const results = await query
  .where('age', '>', 18)
  .where('status', '=', 'active')
  .orderBy('createdAt', 'DESC')
  .limit(10)
  .offset(0)
  .get();
```

### MongoDB 查询构建器

```typescript
import { MongoQueryBuilder, getDatabase } from '@dreamer/dweb/features/database';

const db = await getDatabase();
const query = new MongoQueryBuilder(db, 'users');

// 构建查询
const results = await query
  .where('age', '$gt', 18)
  .where('status', '=', 'active')
  .sort('createdAt', -1)
  .limit(10)
  .skip(0)
  .get();
```

## 数据库迁移

```typescript
import { MigrationManager } from '@dreamer/dweb/features/database';

const manager = new MigrationManager({
  adapter: await getDatabase(),
  migrationsPath: './migrations',
});

// 运行迁移
await manager.up();

// 回滚迁移
await manager.down();

// 创建新迁移
await manager.create('create_users_table');
```

## 查询缓存

```typescript
import { MongoModel, MemoryCacheAdapter } from '@dreamer/dweb/features/database';

// 设置缓存适配器
User.cacheAdapter = new MemoryCacheAdapter();
User.cacheTTL = 3600; // 1 小时

// 查询会自动使用缓存
const user = await User.find(1); // 第一次查询数据库
const cachedUser = await User.find(1); // 从缓存获取
```

## 查询日志

```typescript
import { QueryLogger } from '@dreamer/dweb/features/database/logger';
import { getDatabase } from '@dreamer/dweb/features/database';

const logger = new QueryLogger({
  enabled: true,
  slowQueryThreshold: 1000, // 1 秒
  handler: (entry) => {
    if (entry.slow) {
      console.warn('Slow query:', entry.sql, entry.duration + 'ms');
    }
  },
});

const db = await getDatabase();
db.setQueryLogger(logger);

// 获取统计信息
const stats = logger.getStats();
console.log('Total queries:', stats.total);
console.log('Slow queries:', stats.slow);
console.log('Average duration:', stats.averageDuration);
```

## 连接池监控

```typescript
import { getDatabase } from '@dreamer/dweb/features/database';

const db = await getDatabase();

// 获取连接池状态
const status = await db.getPoolStatus();
console.log('Total connections:', status.total);
console.log('Active connections:', status.active);
console.log('Idle connections:', status.idle);
console.log('Waiting connections:', status.waiting);
```

## 健康检查

```typescript
import { getDatabase } from '@dreamer/dweb/features/database';

const db = await getDatabase();

// 执行健康检查
const health = await db.healthCheck();
if (health.healthy) {
  console.log('Database is healthy, latency:', health.latency + 'ms');
} else {
  console.error('Database is unhealthy:', health.error);
}
```

## 关联查询

### 一对一关系

```typescript
class User extends SQLModel {
  static tableName = 'users';
  
  async profile() {
    return await this.hasOne(Profile, 'userId', 'id');
  }
}

class Profile extends SQLModel {
  static tableName = 'profiles';
  
  async user() {
    return await this.belongsTo(User, 'userId', 'id');
  }
}

const user = await User.find(1);
const profile = await user.profile();
```

### 一对多关系

```typescript
class User extends SQLModel {
  static tableName = 'users';
  
  async posts() {
    return await this.hasMany(Post, 'userId', 'id');
  }
}

class Post extends SQLModel {
  static tableName = 'posts';
  
  async user() {
    return await this.belongsTo(User, 'userId', 'id');
  }
}

const user = await User.find(1);
const posts = await user.posts();
```

## API 参考

### DatabaseManager

管理多个数据库连接。

```typescript
import { DatabaseManager } from '@dreamer/dweb/features/database';

const manager = new DatabaseManager();

// 连接多个数据库
await manager.connect('default', defaultConfig);
await manager.connect('analytics', analyticsConfig);

// 获取数据库连接
const db = manager.get('default');
```

### 模型方法

#### 查询方法

- `find(condition, fields?)` - 查找单条记录
- `findAll(condition?, fields?)` - 查找多条记录
- `findById(id, fields?)` - 根据 ID 查找
- `findOne(condition, fields?)` - 查找一条记录
- `count(condition?)` - 统计数量
- `exists(condition)` - 检查是否存在
- `paginate(condition, page, pageSize)` - 分页查询

#### 创建方法

- `create(data)` - 创建单条记录
- `createMany(data[])` - 批量创建

#### 更新方法

- `update(condition, data)` - 更新记录
- `updateMany(condition, data)` - 批量更新
- `increment(field, amount)` - 递增字段
- `decrement(field, amount)` - 递减字段

#### 删除方法

- `delete(condition)` - 删除记录
- `deleteMany(condition)` - 批量删除

#### 其他方法

- `upsert(condition, data)` - 更新或插入
- `distinct(field, condition?)` - 去重查询
- `aggregate(pipeline)` - 聚合查询（MongoDB）

### 索引管理

```typescript
// 创建索引
await Model.createIndexes();

// 强制重新创建索引
await Model.createIndexes(true);

// 删除所有索引
await Model.dropIndexes();

// 获取所有索引
const indexes = await Model.getIndexes();
```

---

## 📚 相关文档

- [文档总览](./README.md)
- [核心模块](./core.md)
- [配置文档](./configuration.md)
- [开发指南](./development.md)
- [GraphQL](./graphql.md)
- [WebSocket](./websocket.md)

