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

### 完整示例：User 模型

#### SQLModel 完整示例

```typescript
// models/User.ts
import { SQLModel, getDatabase } from '@dreamer/dweb/features/database';
import type { DatabaseAdapter } from '@dreamer/dweb/features/database/types';

/**
 * 用户模型（PostgreSQL）
 * 展示完整的模型定义，包括字段、验证、索引、时间戳、软删除、作用域、虚拟字段和生命周期钩子
 */
class User extends SQLModel {
  // 表名
  static tableName = 'users';
  
  // 主键字段名
  static primaryKey = 'id';
  
  // 字段定义和验证规则
  static schema = {
    // 用户名：必填，长度 2-50
    username: {
      type: 'string',
      validate: {
        required: true,
        min: 2,
        max: 50,
        pattern: /^[a-zA-Z0-9_]+$/,
        custom: (value: string) => {
          if (value.toLowerCase() === 'admin') {
            throw new Error('用户名不能为 admin');
          }
        }
      }
    },
    
    // 邮箱：必填，邮箱格式验证
    email: {
      type: 'string',
      validate: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        custom: async (value: string) => {
          // 检查邮箱是否已存在
          const existing = await User.findOne({ email: value });
          if (existing) {
            throw new Error('邮箱已被使用');
          }
        }
      }
    },
    
    // 密码：必填，最小长度 8
    password: {
      type: 'string',
      validate: {
        required: true,
        min: 8,
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        custom: (value: string) => {
          if (!/(?=.*[!@#$%^&*])/.test(value)) {
            throw new Error('密码必须包含至少一个特殊字符');
          }
        }
      }
    },
    
    // 年龄：可选，范围 0-150
    age: {
      type: 'number',
      validate: {
        required: false,
        min: 0,
        max: 150
      },
      default: null
    },
    
    // 状态：枚举类型
    status: {
      type: 'enum',
      values: ['active', 'inactive', 'suspended'],
      default: 'active',
      validate: {
        required: true
      }
    },
    
    // 角色：数组类型
    roles: {
      type: 'array',
      default: [],
      validate: {
        required: false
      }
    },
    
    // 元数据：对象类型
    metadata: {
      type: 'object',
      default: {},
      validate: {
        required: false
      }
    },
    
    // 余额：小数类型
    balance: {
      type: 'decimal',
      default: 0,
      validate: {
        required: false,
        min: 0
      }
    },
    
    // 最后登录时间
    lastLoginAt: {
      type: 'timestamp',
      default: null,
      validate: {
        required: false
      }
    }
  };
  
  // 索引定义
  static indexes = [
    // 唯一索引：用户名
    { field: 'username', unique: true },
    // 唯一索引：邮箱
    { field: 'email', unique: true },
    // 普通索引：状态
    { field: 'status' },
    // 复合索引：状态和创建时间
    { fields: { status: 1, createdAt: -1 } },
    // 复合索引：角色
    { fields: { roles: 1 } }
  ];
  
  // 自动时间戳（自定义字段名）
  static timestamps = {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  };
  
  // 软删除
  static softDelete = true;
  static deletedAtField = 'deleted_at';
  
  // 查询作用域
  static scopes = {
    // 活跃用户
    active: () => ({ status: 'active' }),
    // 非活跃用户
    inactive: () => ({ status: 'inactive' }),
    // 最近注册的用户（7天内）
    recent: () => ({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }),
    // 有余额的用户
    withBalance: () => ({ balance: { $gt: 0 } })
  };
  
  // 虚拟字段
  static virtuals = {
    // 全名（如果有名字和姓氏）
    fullName: (instance: User) => {
      return instance.metadata?.firstName && instance.metadata?.lastName
        ? `${instance.metadata.firstName} ${instance.metadata.lastName}`
        : instance.username;
    },
    // 是否为新用户（注册7天内）
    isNew: (instance: User) => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(instance.createdAt).getTime() > weekAgo;
    },
    // 账户状态描述
    statusText: (instance: User) => {
      const statusMap: Record<string, string> = {
        active: '活跃',
        inactive: '未激活',
        suspended: '已暂停'
      };
      return statusMap[instance.status] || '未知';
    }
  };
  
  // 生命周期钩子
  
  /**
   * 创建前钩子：加密密码
   */
  static async beforeCreate(instance: User) {
    // 模拟密码加密（实际应使用 bcrypt 等）
    if (instance.password && !instance.password.startsWith('$2b$')) {
      // 这里应该使用实际的加密库
      instance.password = `hashed_${instance.password}`;
    }
    // 设置默认角色
    if (!instance.roles || instance.roles.length === 0) {
      instance.roles = ['user'];
    }
  }
  
  /**
   * 创建后钩子：发送欢迎邮件
   */
  static async afterCreate(instance: User) {
    console.log(`用户 ${instance.username} 创建成功，ID: ${instance.id}`);
    // 这里可以发送欢迎邮件等操作
  }
  
  /**
   * 更新前钩子：记录更新时间
   */
  static async beforeUpdate(instance: User) {
    // 如果密码被修改，重新加密
    if (instance.password && !instance.password.startsWith('$2b$')) {
      instance.password = `hashed_${instance.password}`;
    }
  }
  
  /**
   * 更新后钩子：记录操作日志
   */
  static async afterUpdate(instance: User) {
    console.log(`用户 ${instance.username} 已更新`);
  }
  
  /**
   * 删除前钩子：检查是否可以删除
   */
  static async beforeDelete(instance: User) {
    if (instance.status === 'active') {
      throw new Error('不能删除活跃用户，请先停用');
    }
  }
  
  /**
   * 删除后钩子：清理相关数据
   */
  static async afterDelete(instance: User) {
    console.log(`用户 ${instance.username} 已删除`);
    // 这里可以清理用户的关联数据
  }
  
  /**
   * 保存前钩子：统一处理
   */
  static async beforeSave(instance: User) {
    // 统一的数据处理逻辑
    if (instance.email) {
      instance.email = instance.email.toLowerCase().trim();
    }
  }
  
  /**
   * 验证前钩子：自定义验证
   */
  static async beforeValidate(instance: User) {
    // 自定义验证逻辑
    if (instance.age && instance.age < 13) {
      throw new Error('用户年龄不能小于 13 岁');
    }
  }
  
  // 实例方法
  
  /**
   * 更新最后登录时间
   */
  async updateLastLogin() {
    await this.update({ lastLoginAt: new Date() });
  }
  
  /**
   * 增加余额
   */
  async addBalance(amount: number) {
    await this.increment('balance', amount);
    await this.reload(); // 重新加载以获取最新数据
  }
  
  /**
   * 减少余额
   */
  async deductBalance(amount: number) {
    if (this.balance < amount) {
      throw new Error('余额不足');
    }
    await this.decrement('balance', amount);
    await this.reload();
  }
  
  /**
   * 关联查询：用户的帖子（一对多）
   */
  async posts() {
    const Post = (await import('./Post')).default;
    return await this.hasMany(Post, 'userId', 'id');
  }
  
  /**
   * 关联查询：用户的资料（一对一）
   */
  async profile() {
    const Profile = (await import('./Profile')).default;
    return await this.hasOne(Profile, 'userId', 'id');
  }
}

// 初始化：设置数据库适配器
const db = await getDatabase();
User.setAdapter(db);

// 创建索引（通常在应用启动时执行）
await User.createIndexes();

export default User;
```

#### MongoModel 完整示例

```typescript
// models/User.ts
import { MongoModel, getDatabase } from '@dreamer/dweb/features/database';
import type { DatabaseAdapter } from '@dreamer/dweb/features/database/types';

/**
 * 用户模型（MongoDB）
 * 展示完整的模型定义，包括字段、验证、索引、时间戳、软删除、作用域、虚拟字段和生命周期钩子
 */
class User extends MongoModel {
  // 集合名
  static collectionName = 'users';
  
  // 主键字段名（MongoDB 默认使用 _id）
  static primaryKey = '_id';
  
  // 字段定义和验证规则
  static schema = {
    // 用户名：必填，长度 2-50
    username: {
      type: 'string',
      validate: {
        required: true,
        min: 2,
        max: 50,
        pattern: /^[a-zA-Z0-9_]+$/,
        custom: (value: string) => {
          if (value.toLowerCase() === 'admin') {
            throw new Error('用户名不能为 admin');
          }
        }
      }
    },
    
    // 邮箱：必填，邮箱格式验证
    email: {
      type: 'string',
      validate: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        custom: async (value: string) => {
          // 检查邮箱是否已存在
          const existing = await User.findOne({ email: value });
          if (existing) {
            throw new Error('邮箱已被使用');
          }
        }
      }
    },
    
    // 密码：必填，最小长度 8
    password: {
      type: 'string',
      validate: {
        required: true,
        min: 8,
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        custom: (value: string) => {
          if (!/(?=.*[!@#$%^&*])/.test(value)) {
            throw new Error('密码必须包含至少一个特殊字符');
          }
        }
      }
    },
    
    // 年龄：可选，范围 0-150
    age: {
      type: 'number',
      validate: {
        required: false,
        min: 0,
        max: 150
      },
      default: null
    },
    
    // 状态：枚举类型
    status: {
      type: 'enum',
      values: ['active', 'inactive', 'suspended'],
      default: 'active',
      validate: {
        required: true
      }
    },
    
    // 角色：数组类型
    roles: {
      type: 'array',
      default: [],
      validate: {
        required: false
      }
    },
    
    // 元数据：对象类型
    metadata: {
      type: 'object',
      default: {},
      validate: {
        required: false
      }
    },
    
    // 余额：小数类型
    balance: {
      type: 'decimal',
      default: 0,
      validate: {
        required: false,
        min: 0
      }
    },
    
    // 位置信息：对象类型（用于地理空间查询）
    location: {
      type: 'object',
      default: null,
      validate: {
        required: false,
        custom: (value: any) => {
          if (value && (!value.type || value.type !== 'Point' || !value.coordinates)) {
            throw new Error('位置信息格式错误，应为 GeoJSON Point');
          }
        }
      }
    },
    
    // 最后登录时间
    lastLoginAt: {
      type: 'timestamp',
      default: null,
      validate: {
        required: false
      }
    },
    
    // 标签：数组类型
    tags: {
      type: 'array',
      default: [],
      validate: {
        required: false
      }
    }
  };
  
  // 索引定义
  static indexes = [
    // 唯一索引：用户名
    { field: 'username', unique: true },
    // 唯一索引：邮箱
    { field: 'email', unique: true },
    // 普通索引：状态
    { field: 'status' },
    // 复合索引：状态和创建时间
    { fields: { status: 1, createdAt: -1 } },
    // 复合索引：角色
    { fields: { roles: 1 } },
    // 文本索引：用户名和邮箱（用于全文搜索）
    { fields: { username: 'text', email: 'text' }, type: 'text' },
    // 地理空间索引：位置信息
    { field: 'location', type: '2dsphere' }
  ];
  
  // 自动时间戳
  static timestamps = true;
  
  // 软删除
  static softDelete = true;
  static deletedAtField = 'deletedAt';
  
  // 查询作用域
  static scopes = {
    // 活跃用户
    active: () => ({ status: 'active' }),
    // 非活跃用户
    inactive: () => ({ status: 'inactive' }),
    // 最近注册的用户（7天内）
    recent: () => ({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }),
    // 有余额的用户
    withBalance: () => ({ balance: { $gt: 0 } }),
    // 有位置信息的用户
    withLocation: () => ({ location: { $ne: null } })
  };
  
  // 虚拟字段
  static virtuals = {
    // 全名（如果有名字和姓氏）
    fullName: (instance: User) => {
      return instance.metadata?.firstName && instance.metadata?.lastName
        ? `${instance.metadata.firstName} ${instance.metadata.lastName}`
        : instance.username;
    },
    // 是否为新用户（注册7天内）
    isNew: (instance: User) => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(instance.createdAt).getTime() > weekAgo;
    },
    // 账户状态描述
    statusText: (instance: User) => {
      const statusMap: Record<string, string> = {
        active: '活跃',
        inactive: '未激活',
        suspended: '已暂停'
      };
      return statusMap[instance.status] || '未知';
    },
    // 年龄组
    ageGroup: (instance: User) => {
      if (!instance.age) return '未知';
      if (instance.age < 18) return '未成年';
      if (instance.age < 30) return '青年';
      if (instance.age < 50) return '中年';
      return '老年';
    }
  };
  
  // 生命周期钩子
  
  /**
   * 创建前钩子：加密密码
   */
  static async beforeCreate(instance: User) {
    // 模拟密码加密（实际应使用 bcrypt 等）
    if (instance.password && !instance.password.startsWith('$2b$')) {
      // 这里应该使用实际的加密库
      instance.password = `hashed_${instance.password}`;
    }
    // 设置默认角色
    if (!instance.roles || instance.roles.length === 0) {
      instance.roles = ['user'];
    }
    // 确保位置信息格式正确
    if (instance.location && !instance.location.type) {
      instance.location = {
        type: 'Point',
        coordinates: [instance.location.lng || 0, instance.location.lat || 0]
      };
    }
  }
  
  /**
   * 创建后钩子：发送欢迎邮件
   */
  static async afterCreate(instance: User) {
    console.log(`用户 ${instance.username} 创建成功，ID: ${instance._id}`);
    // 这里可以发送欢迎邮件等操作
  }
  
  /**
   * 更新前钩子：记录更新时间
   */
  static async beforeUpdate(instance: User) {
    // 如果密码被修改，重新加密
    if (instance.password && !instance.password.startsWith('$2b$')) {
      instance.password = `hashed_${instance.password}`;
    }
  }
  
  /**
   * 更新后钩子：记录操作日志
   */
  static async afterUpdate(instance: User) {
    console.log(`用户 ${instance.username} 已更新`);
  }
  
  /**
   * 删除前钩子：检查是否可以删除
   */
  static async beforeDelete(instance: User) {
    if (instance.status === 'active') {
      throw new Error('不能删除活跃用户，请先停用');
    }
  }
  
  /**
   * 删除后钩子：清理相关数据
   */
  static async afterDelete(instance: User) {
    console.log(`用户 ${instance.username} 已删除`);
    // 这里可以清理用户的关联数据
  }
  
  /**
   * 保存前钩子：统一处理
   */
  static async beforeSave(instance: User) {
    // 统一的数据处理逻辑
    if (instance.email) {
      instance.email = instance.email.toLowerCase().trim();
    }
  }
  
  /**
   * 验证前钩子：自定义验证
   */
  static async beforeValidate(instance: User) {
    // 自定义验证逻辑
    if (instance.age && instance.age < 13) {
      throw new Error('用户年龄不能小于 13 岁');
    }
  }
  
  // 实例方法
  
  /**
   * 更新最后登录时间
   */
  async updateLastLogin() {
    await this.update({ lastLoginAt: new Date() });
  }
  
  /**
   * 增加余额
   */
  async addBalance(amount: number) {
    await this.increment('balance', amount);
    await this.reload(); // 重新加载以获取最新数据
  }
  
  /**
   * 减少余额
   */
  async deductBalance(amount: number) {
    if (this.balance < amount) {
      throw new Error('余额不足');
    }
    await this.decrement('balance', amount);
    await this.reload();
  }
  
  /**
   * 关联查询：用户的帖子（一对多）
   */
  async posts() {
    const Post = (await import('./Post')).default;
    return await this.hasMany(Post, 'userId', '_id');
  }
  
  /**
   * 关联查询：用户的资料（一对一）
   */
  async profile() {
    const Profile = (await import('./Profile')).default;
    return await this.hasOne(Profile, 'userId', '_id');
  }
  
  /**
   * 地理空间查询：查找附近的用户
   */
  static async findNearby(longitude: number, latitude: number, maxDistance: number = 1000) {
    return await User.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      }
    });
  }
  
  /**
   * 聚合查询：按状态统计用户数
   */
  static async countByStatus() {
    return await User.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
  }
}

// 初始化：设置数据库适配器
const db = await getDatabase();
User.setAdapter(db);

// 创建索引（通常在应用启动时执行）
await User.createIndexes();

export default User;
```

#### 使用示例

```typescript
// 使用 User 模型

// 1. 创建用户
const user = await User.create({
  username: 'john_doe',
  email: 'john@example.com',
  password: 'SecurePass123!',
  age: 25,
  status: 'active',
  metadata: {
    firstName: 'John',
    lastName: 'Doe'
  }
});
console.log(user.fullName); // 虚拟字段：John Doe
console.log(user.isNew); // 虚拟字段：true

// 2. 查询用户
const activeUser = await User.findById(user.id);
const users = await User.findAll({ age: { $gte: 18 } });

// 3. 使用作用域
const activeUsers = await User.scope('active').findAll();
const recentUsers = await User.scope('recent').findAll();
const usersWithBalance = await User.scope('withBalance').findAll();

// 4. 组合查询
const result = await User
  .scope('active')
  .findAll({ age: { $gte: 18 } })
  .then(users => users.filter(u => u.isNew));

// 5. 更新用户
await user.update({ age: 26 });
await user.updateLastLogin();

// 6. 使用实例方法
await user.addBalance(100);
await user.deductBalance(50);

// 7. 关联查询
const posts = await user.posts();
const profile = await user.profile();

// 8. 批量操作
await User.createMany([
  { username: 'user1', email: 'user1@example.com', password: 'pass123' },
  { username: 'user2', email: 'user2@example.com', password: 'pass123' }
]);

await User.updateMany(
  { status: 'inactive' },
  { status: 'active' }
);

// 9. 分页查询
const page1 = await User.paginate({}, 1, 10);
console.log(`总数: ${page1.total}, 当前页: ${page1.data.length}`);

// 10. 统计查询
const count = await User.count({ status: 'active' });
const exists = await User.exists({ email: 'john@example.com' });

// 11. MongoDB 特有功能
// 地理空间查询
const nearbyUsers = await User.findNearby(116.3974, 39.9093, 5000);

// 聚合查询
const stats = await User.countByStatus();
```

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

关联查询用于处理模型之间的关系，支持一对一、一对多和多对一关系。

### 关联方法

#### `belongsTo(RelatedModel, foreignKey, localKey?)`

属于关系（多对一）。例如：Post belongsTo User（一个帖子属于一个用户）。

**参数：**
- `RelatedModel`: 关联的模型类
- `foreignKey`: 外键字段名（当前模型中的字段）
- `localKey?`: 关联模型的主键字段名（默认为关联模型的 primaryKey）

**返回值：** 关联的模型实例或 `null`

**示例：**
```typescript
class Post extends SQLModel {
  static tableName = 'posts';
  
  async user() {
    return await this.belongsTo(User, 'userId', 'id');
  }
}

const post = await Post.find(1);
const user = await post.user();
```

#### `hasOne(RelatedModel, foreignKey, localKey?)`

有一个关系（一对一）。例如：User hasOne Profile（一个用户有一个资料）。

**参数：**
- `RelatedModel`: 关联的模型类
- `foreignKey`: 外键字段名（关联模型中的字段）
- `localKey?`: 当前模型的主键字段名（默认为当前模型的 primaryKey）

**返回值：** 关联的模型实例或 `null`

**示例：**
```typescript
class User extends SQLModel {
  static tableName = 'users';
  
  async profile() {
    return await this.hasOne(Profile, 'userId', 'id');
  }
}

const user = await User.find(1);
const profile = await user.profile();
```

#### `hasMany(RelatedModel, foreignKey, localKey?)`

有多个关系（一对多）。例如：User hasMany Posts（一个用户有多个帖子）。

**参数：**
- `RelatedModel`: 关联的模型类
- `foreignKey`: 外键字段名（关联模型中的字段）
- `localKey?`: 当前模型的主键字段名（默认为当前模型的 primaryKey）

**返回值：** 关联的模型实例数组

**示例：**
```typescript
class User extends SQLModel {
  static tableName = 'users';
  
  async posts() {
    return await this.hasMany(Post, 'userId', 'id');
  }
}

const user = await User.find(1);
const posts = await user.posts();
```

### 完整示例

#### 一对一关系

```typescript
// 用户模型
class User extends SQLModel {
  static tableName = 'users';
  static primaryKey = 'id';
  
  // 用户有一个资料
  async profile() {
    return await this.hasOne(Profile, 'userId', 'id');
  }
}

// 资料模型
class Profile extends SQLModel {
  static tableName = 'profiles';
  static primaryKey = 'id';
  
  // 资料属于一个用户
  async user() {
    return await this.belongsTo(User, 'userId', 'id');
  }
}

// 使用
const user = await User.find(1);
const profile = await user.profile();

const profile = await Profile.find(1);
const user = await profile.user();
```

#### 一对多关系

```typescript
// 用户模型
class User extends SQLModel {
  static tableName = 'users';
  static primaryKey = 'id';
  
  // 用户有多个帖子
  async posts() {
    return await this.hasMany(Post, 'userId', 'id');
  }
}

// 帖子模型
class Post extends SQLModel {
  static tableName = 'posts';
  static primaryKey = 'id';
  
  // 帖子属于一个用户
  async user() {
    return await this.belongsTo(User, 'userId', 'id');
  }
  
  // 帖子有多个评论
  async comments() {
    return await this.hasMany(Comment, 'postId', 'id');
  }
}

// 使用
const user = await User.find(1);
const posts = await user.posts();

const post = await Post.find(1);
const user = await post.user();
const comments = await post.comments();
```

#### 多对多关系（通过中间表）

```typescript
// 用户模型
class User extends SQLModel {
  static tableName = 'users';
  static primaryKey = 'id';
  
  // 用户有多个角色（通过 user_roles 中间表）
  async roles() {
    // 先获取中间表数据
    const userRoles = await UserRole.findAll({ userId: this.id });
    // 再获取关联的角色
    const roleIds = userRoles.map(ur => ur.roleId);
    return await Role.findAll({ id: { $in: roleIds } });
  }
}

// 角色模型
class Role extends SQLModel {
  static tableName = 'roles';
  static primaryKey = 'id';
  
  // 角色有多个用户（通过 user_roles 中间表）
  async users() {
    const userRoles = await UserRole.findAll({ roleId: this.id });
    const userIds = userRoles.map(ur => ur.userId);
    return await User.findAll({ id: { $in: userIds } });
  }
}

// 中间表模型
class UserRole extends SQLModel {
  static tableName = 'user_roles';
  static primaryKey = 'id';
}
```

### MongoDB 关联查询

MongoDB 的关联查询方法与 SQL 相同，但使用 `_id` 作为主键：

```typescript
// MongoDB 模型
class User extends MongoModel {
  static collectionName = 'users';
  static primaryKey = '_id';
  
  async posts() {
    return await this.hasMany(Post, 'userId', '_id');
  }
  
  async profile() {
    return await this.hasOne(Profile, 'userId', '_id');
  }
}

class Post extends MongoModel {
  static collectionName = 'posts';
  static primaryKey = '_id';
  
  async user() {
    return await this.belongsTo(User, 'userId', '_id');
  }
}
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
- `increment(condition, field, amount)` - 递增字段（静态方法）
- `increment(field, amount)` - 递增字段（实例方法）
- `decrement(condition, field, amount)` - 递减字段（静态方法）
- `decrement(field, amount)` - 递减字段（实例方法）
- `findOneAndUpdate(condition, data)` - 查找并更新（仅 MongoDB）

#### 删除方法

- `delete(condition)` - 删除记录（静态方法）
- `delete()` - 删除当前实例（实例方法）
- `deleteMany(condition)` - 批量删除
- `findOneAndDelete(condition)` - 查找并删除（仅 MongoDB）

#### 其他方法

- `upsert(condition, data)` - 更新或插入
- `distinct(field, condition?)` - 去重查询
- `aggregate(pipeline)` - 聚合查询（仅 MongoDB）
- `save()` - 保存当前实例（实例方法）
- `reload()` - 重新加载当前实例（实例方法）

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

### 核心文档
- [文档总览](./README.md)
- [核心模块](./core.md)
- [配置文档](./configuration.md)
- [开发指南](./development.md)

### 功能模块
- [数据库](./database.md)
- [GraphQL](./graphql.md)
- [WebSocket](./websocket.md)
- [Session](./session.md)
- [Cookie](./cookie.md)
- [Logger](./logger.md)

### 扩展模块
- [中间件](./middleware.md)
- [插件](./plugins.md)

### 部署与运维
- [Docker 部署](./docker.md)

