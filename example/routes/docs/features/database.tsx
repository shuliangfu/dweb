/**
 * 数据库模块文档页面
 * 详细介绍 DWeb 框架的数据库功能
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "数据库模块 - DWeb 框架文档",
  description: "DWeb 框架的数据库支持，包括 ORM/ODM、查询构建器、迁移管理等",
};

/**
 * 数据库模块文档页面
 */
export default function DatabasePage() {
  // 初始化数据库 - 方式 1：使用初始化工具（推荐）
  const initDbFromConfigCode =
    `import { initDatabaseFromConfig } from '@dreamer/dweb';

// 自动从 dweb.config.ts 加载配置并初始化数据库
await initDatabaseFromConfig();

// 或者手动传入配置
import config from './dweb.config.ts';
await initDatabaseFromConfig(config);`;

  // 初始化数据库 - 方式 2：手动初始化
  const initDbCode = `import { initDatabase } from '@dreamer/dweb';

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
});`;

  // 解决 "Database config loader not set" 错误
  const setupConfigLoaderCode = `// 方法 1：使用初始化工具（最简单）
import { initDatabaseFromConfig } from '@dreamer/dweb';
await initDatabaseFromConfig();

// 方法 2：仅设置配置加载器（延迟初始化）
import { setupDatabaseConfigLoader } from '@dreamer/dweb';
await setupDatabaseConfigLoader();

// 之后使用模型时，会自动初始化数据库
await User.init();

// 方法 3：手动设置配置加载器
import { setDatabaseConfigLoader } from '@dreamer/dweb';
import { loadConfig } from '@dreamer/dweb';

const { config } = await loadConfig();
setDatabaseConfigLoader(() => {
  return Promise.resolve(config.database || null);
});`;

  // SQLModel 完整示例
  const sqlModelFullCode = `// models/User.ts
import { getDatabase, SQLModel } from '@dreamer/dweb';

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
        },
      },
    },

    // 邮箱：必填，邮箱格式验证
    email: {
      type: 'string',
      validate: {
        required: true,
        pattern: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/,
        custom: async (value: string) => {
          // 检查邮箱是否已存在
          const existing = await User.findOne({ email: value });
          if (existing) {
            throw new Error('邮箱已被使用');
          }
        },
      },
    },

    // 密码：必填，最小长度 8
    password: {
      type: 'string',
      validate: {
        required: true,
        min: 8,
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/,
        custom: (value: string) => {
          if (!/(?=.*[!@#$%^&*])/.test(value)) {
            throw new Error('密码必须包含至少一个特殊字符');
          }
        },
      },
    },

    // 年龄：可选，范围 0-150
    age: {
      type: 'number',
      validate: {
        required: false,
        min: 0,
        max: 150,
      },
      default: null,
    },

    // 状态：枚举类型
    status: {
      type: 'enum',
      values: ['active', 'inactive', 'suspended'],
      default: 'active',
      validate: {
        required: true,
      },
    },

    // 角色：数组类型
    roles: {
      type: 'array',
      default: [],
      validate: {
        required: false,
      },
    },

    // 元数据：对象类型
    metadata: {
      type: 'object',
      default: {},
      validate: {
        required: false,
      },
    },

    // 余额：小数类型
    balance: {
      type: 'decimal',
      default: 0,
      validate: {
        required: false,
        min: 0,
      },
    },

    // 最后登录时间
    lastLoginAt: {
      type: 'timestamp',
      default: null,
      validate: {
        required: false,
      },
    },
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
  ];

  // 自动时间戳（自定义字段名）
  static timestamps = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
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
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
    // 有余额的用户
    withBalance: () => ({ balance: { $gt: 0 } }),
  };

  // 虚拟字段
  static virtuals = {
    // 全名（如果有名字和姓氏）
    fullName: (instance: User) => {
      return instance.metadata?.firstName && instance.metadata?.lastName
        ? \`\${instance.metadata.firstName} \${instance.metadata.lastName}\`
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
        suspended: '已暂停',
      };
      return statusMap[instance.status] || '未知';
    },
  };

  // 生命周期钩子
  static async beforeCreate(instance: User) {
    // 模拟密码加密（实际应使用 bcrypt 等）
    if (instance.password && !instance.password.startsWith('$2b$')) {
      instance.password = \`hashed_\${instance.password}\`;
    }
    // 设置默认角色
    if (!instance.roles || instance.roles.length === 0) {
      instance.roles = ['user'];
    }
  }

  static async afterCreate(instance: User) {
    console.log(\`用户 \${instance.username} 创建成功，ID: \${instance.id}\`);
  }

  static async beforeUpdate(instance: User) {
    // 如果密码被修改，重新加密
    if (instance.password && !instance.password.startsWith('$2b$')) {
      instance.password = \`hashed_\${instance.password}\`;
    }
  }

  static async afterUpdate(instance: User) {
    console.log(\`用户 \${instance.username} 已更新\`);
  }

  static async beforeDelete(instance: User) {
    if (instance.status === 'active') {
      throw new Error('不能删除活跃用户，请先停用');
    }
  }

  static async afterDelete(instance: User) {
    console.log(\`用户 \${instance.username} 已删除\`);
  }

  static async beforeSave(instance: User) {
    // 统一的数据处理逻辑
    if (instance.email) {
      instance.email = instance.email.toLowerCase().trim();
    }
  }

  static async beforeValidate(instance: User) {
    // 自定义验证逻辑
    if (instance.age && instance.age < 13) {
      throw new Error('用户年龄不能小于 13 岁');
    }
  }

  // 实例方法
  async updateLastLogin() {
    await this.update({ lastLoginAt: new Date() });
  }

  async addBalance(amount: number) {
    await this.increment('balance', amount);
    await this.reload(); // 重新加载以获取最新数据
  }

  async deductBalance(amount: number) {
    if (this.balance < amount) {
      throw new Error('余额不足');
    }
    await this.decrement('balance', amount);
    await this.reload();
  }

  // 关联查询：用户的帖子（一对多）
  async posts() {
    const Post = (await import('./Post')).default;
    return await this.hasMany(Post, 'userId', 'id');
  }

  // 关联查询：用户的资料（一对一）
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

export default User;`;

  // SQLModel 使用示例
  const sqlModelUsageCode = `// 使用 User 模型

// 1. 创建用户
const user = await User.create({
  username: 'john_doe',
  email: 'john@example.com',
  password: 'SecurePass123!',
  age: 25,
  status: 'active',
  metadata: {
    firstName: 'John',
    lastName: 'Doe',
  },
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

// 4. 更新用户
try {
  await user.update({ age: 26 }); // 如果更新失败（记录不存在），会抛出错误
  await user.updateLastLogin();
} catch (error) {
  console.error("更新失败:", error.message);
}

// 4.1. 使用 save() 方法保存实例
try {
  user.quantity += 10;
  user.amount += 100;
  const saved = await user.save(); // 返回实例表示保存成功
  console.log("保存成功:", saved);
} catch (error) {
  console.error("保存失败:", error.message);
}

// 5. 通过 ID 更新（静态方法）
await User.updateById(user.id, { age: 27 });

// 6. 使用实例方法
await user.addBalance(100);
await user.deductBalance(50);

// 7. 关联查询
const posts = await user.posts();
const profile = await user.profile();

// 8. 批量操作
await User.createMany([
  { username: 'user1', email: 'user1@example.com', password: 'pass123' },
  { username: 'user2', email: 'user2@example.com', password: 'pass123' },
]);

await User.updateMany(
  { status: 'inactive' },
  { status: 'active' },
);

// 9. 分页查询
const page1 = await User.paginate({}, 1, 10);
console.log(\`总数: \${page1.total}, 当前页: \${page1.data.length}\`);

// 10. 统计查询
const count = await User.count({ status: 'active' });
const exists = await User.exists({ email: 'john@example.com' });

// 11. 通过 ID 删除（静态方法）
await User.deleteById(user.id);

// 12. 软删除相关操作
// 恢复软删除的记录
await User.restore(1);
await User.restore({ email: 'user@example.com' });

// 强制删除（忽略软删除）
await User.forceDelete(1);

// 查询时包含已软删除的记录
const allUsers = await User.withTrashed().findAll();
const deletedUser = await User.withTrashed().find(1);

// 只查询已软删除的记录
const deletedUsers = await User.onlyTrashed().findAll();
const count = await User.onlyTrashed().count();

// 13. 查找或创建
const user = await User.findOrCreate(
  { email: 'user@example.com' },
  { name: 'John', email: 'user@example.com', age: 25 }
);

// 14. 清空表/集合
await User.truncate();

// 15. 初始化模型
await User.init(); // 使用默认连接
await User.init('secondary'); // 使用指定连接`;

  // MongoModel 完整示例
  const mongoModelFullCode = `// models/User.ts
import { getDatabase, MongoModel } from '@dreamer/dweb';

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
    username: {
      type: 'string',
      validate: {
        required: true,
        min: 2,
        max: 50,
        pattern: /^[a-zA-Z0-9_]+$/,
      },
    },
    email: {
      type: 'string',
      validate: {
        required: true,
        pattern: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/,
      },
    },
    age: {
      type: 'number',
      validate: {
        required: false,
        min: 0,
        max: 150,
      },
      default: null,
    },
    status: {
      type: 'enum',
      values: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    roles: {
      type: 'array',
      default: [],
    },
    location: {
      type: 'object',
      default: null,
      validate: {
        required: false,
        custom: (value: any) => {
          if (value && (!value.type || value.type !== 'Point' || !value.coordinates)) {
            throw new Error('位置信息格式错误，应为 GeoJSON Point');
          }
        },
      },
    },
  };

  // 索引定义
  static indexes = [
    { field: 'username', unique: true },
    { field: 'email', unique: true },
    { field: 'status' },
    { fields: { status: 1, createdAt: -1 } },
    // 文本索引：用户名和邮箱（用于全文搜索）
    { fields: { username: 'text', email: 'text' }, type: 'text' },
    // 地理空间索引：位置信息
    { field: 'location', type: '2dsphere' },
  ];

  // 自动时间戳
  static timestamps = true;

  // 软删除
  static softDelete = true;
  static deletedAtField = 'deletedAt';

  // 查询作用域
  static scopes = {
    active: () => ({ status: 'active' }),
    recent: () => ({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
    withLocation: () => ({ location: { $ne: null } }),
  };

  // 虚拟字段
  static virtuals = {
    fullName: (instance: User) => {
      return instance.metadata?.firstName && instance.metadata?.lastName
        ? \`\${instance.metadata.firstName} \${instance.metadata.lastName}\`
        : instance.username;
    },
  };

  // 生命周期钩子
  static async beforeCreate(instance: User) {
    if (instance.password && !instance.password.startsWith('$2b$')) {
      instance.password = \`hashed_\${instance.password}\`;
    }
  }

  // 地理空间查询：查找附近的用户
  static async findNearby(
    longitude: number,
    latitude: number,
    maxDistance: number = 1000,
  ) {
    return await User.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistance,
        },
      },
    });
  }

  // 聚合查询：按状态统计用户数
  static async countByStatus() {
    return await User.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }
}

// 初始化：设置数据库适配器
const db = await getDatabase();
User.setAdapter(db);

// 创建索引（通常在应用启动时执行）
await User.createIndexes();

export default User;`;

  // MongoDB 适配器
  const mongoAdapterCode = `import { MongoDBAdapter } from '@dreamer/dweb';

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
    timeoutMS: 5000,
    maxRetries: 3,
    retryDelay: 1000,
  },
});

// 执行查询
const results = await adapter.query('users', { age: { $gt: 18 } });

// 执行插入
await adapter.execute('insert', 'users', { name: 'John', age: 25 });`;

  // PostgreSQL 适配器
  const postgresAdapterCode =
    `import { PostgreSQLAdapter } from '@dreamer/dweb';

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
await adapter.execute('UPDATE users SET age = ? WHERE id = ?', [25, 1]);`;

  // MySQL 适配器
  const mysqlAdapterCode =
    `import { MySQLAdapter } from '@dreamer/dweb/database/adapters/mysql';

const adapter = new MySQLAdapter();
await adapter.connect({
  type: 'mysql',
  connection: {
    host: 'localhost',
    port: 3306,
    database: 'mydb',
    username: 'user',
    password: 'password',
  },
  pool: {
    maxRetries: 3,
    retryDelay: 1000,
  },
});

// 执行查询
const results = await adapter.query('SELECT * FROM users WHERE age > ?', [18]);

// 执行更新
await adapter.execute('UPDATE users SET age = ? WHERE id = ?', [25, 1]);`;

  // 关联查询
  const associationCode = `// 一对一关联
const user = await User.find(1);
const profile = await user.belongsTo(Profile, 'profileId');

// 一对多关联
const user = await User.find(1);
const posts = await user.hasMany(Post, 'userId');

// 多对一关联
const post = await Post.find(1);
const author = await post.belongsTo(User, 'userId');`;

  // SQL 查询构建器
  const sqlQueryBuilderCode =
    `import { getDatabase, SQLQueryBuilder } from '@dreamer/dweb';

const db = await getDatabase();
const query = new SQLQueryBuilder(db, 'users');

// 构建查询
const results = await query
  .where('age', '>', 18)
  .where('status', '=', 'active')
  .orderBy('createdAt', 'DESC')
  .limit(10)
  .offset(0)
  .get();`;

  // MongoDB 查询构建器
  const mongoQueryBuilderCode =
    `import { getDatabase, MongoQueryBuilder } from '@dreamer/dweb';

const db = await getDatabase();
const query = new MongoQueryBuilder(db, 'users');

// 构建查询
const results = await query
  .where('age', '$gt', 18)
  .where('status', '=', 'active')
  .sort('createdAt', -1)
  .limit(10)
  .skip(0)
  .get();`;

  // 数据库迁移
  const migrationCode = `import { MigrationManager } from '@dreamer/dweb';

const manager = new MigrationManager({
  adapter: await getDatabase(),
  migrationsPath: './migrations',
});

// 运行迁移
await manager.up();

// 回滚迁移
await manager.down();

// 创建新迁移
await manager.create('create_users_table');`;

  // 查询缓存
  const cacheCode = `import { MemoryCacheAdapter } from '@dreamer/dweb';

// 设置缓存适配器
User.cacheAdapter = new MemoryCacheAdapter();
User.cacheTTL = 3600; // 1 小时

// 查询会自动使用缓存
const user = await User.find(1); // 第一次查询数据库
const cachedUser = await User.find(1); // 从缓存获取`;

  // 查询日志
  const queryLoggerCode =
    `import { QueryLogger, getDatabase } from '@dreamer/dweb';

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
console.log('Average duration:', stats.averageDuration);`;

  // 连接池监控
  const poolMonitorCode = `import { getDatabase } from '@dreamer/dweb';

const db = await getDatabase();

// 获取连接池状态
const status = await db.getPoolStatus();
console.log('Total connections:', status.total);
console.log('Active connections:', status.active);
console.log('Idle connections:', status.idle);
console.log('Waiting connections:', status.waiting);`;

  // 健康检查
  const healthCheckCode = `import { getDatabase } from '@dreamer/dweb';

const db = await getDatabase();

// 执行健康检查
const health = await db.healthCheck();
if (health.healthy) {
  console.log('Database is healthy, latency:', health.latency + 'ms');
} else {
  console.error('Database is unhealthy:', health.error);
}`;

  // 关联查询详细示例
  const associationDetailCode = `// 一对一关系
class User extends SQLModel {
  static tableName = 'users';
  static primaryKey = 'id';

  // 用户有一个资料
  async profile() {
    return await this.hasOne(Profile, 'userId', 'id');
  }
}

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

// 一对多关系
class User extends SQLModel {
  // 用户有多个帖子
  async posts() {
    return await this.hasMany(Post, 'userId', 'id');
  }
}

class Post extends SQLModel {
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
const comments = await post.comments();`;

  const importCode = `import {
  // 管理器
  DatabaseManager,
  // 类型
  type DatabaseAdapter,
  type DatabaseConfig,
  type DatabaseType,
  // 适配器
  BaseAdapter,
  PostgreSQLAdapter,
  MongoDBAdapter,
  // 查询构建器
  SQLQueryBuilder,
  MongoQueryBuilder,
  // ORM/ODM 模型
  SQLModel,
  MongoModel,
  type WhereCondition,
  type MongoWhereCondition,
  // 迁移管理
  MigrationManager,
  type Migration,
  type MigrationConfig,
  type MigrationStatus,
  // 缓存
  type CacheAdapter,
  MemoryCacheAdapter,
  // 查询日志
  QueryLogger,
  type QueryLogEntry,
  type QueryLoggerConfig,
  // 索引类型
  type IndexDefinition,
  type IndexDefinitions,
  // 访问函数
  getDatabase,
  initDatabase,
  closeDatabase,
  // 初始化工具
  initDatabaseFromConfig,
  setupDatabaseConfigLoader,
} from '@dreamer/dweb';`;

  const directoryStructureCode = `src/features/database/
├── adapters/          # 数据库适配器
│   ├── base.ts        # 基础适配器抽象类
│   ├── mongodb.ts     # MongoDB 适配器
│   ├── mysql.ts       # MySQL 适配器
│   └── postgresql.ts  # PostgreSQL 适配器
├── cache/             # 查询缓存
├── logger/            # 查询日志
├── migration/         # 数据库迁移
├── orm/               # ORM/ODM 模型
│   ├── mongo-model.ts # MongoDB 模型
│   └── sql-model.ts   # SQL 模型
├── query/             # 查询构建器
│   ├── mongo-builder.ts
│   └── sql-builder.ts
└── types.ts           # 数据库类型定义`;

  const content = {
    title: "数据库模块",
    description:
      "DWeb 框架提供了强大的数据库支持，支持 PostgreSQL 和 MongoDB，包含查询构建器、ORM/ODM、迁移管理等功能。",
    sections: [
      {
        title: "架构深度与优化",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "ORM 架构",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**Active Record 模式**：SQLModel 类实现了一个功能丰富的 Active Record 模式。模型类（如 User）直接拥有 find, create, update 等方法，使用直观便捷。",
                  "**多适配器策略 (Multi-Adapter Strategy)**：DatabaseManager 管理多个连接，并通过 DatabaseAdapter 接口抽象了底层数据库（支持 PostgreSQL 和 MongoDB），实现了业务逻辑与数据库实现的解耦。",
                  "**流式查询构建器 (Fluent Query Builder)**：SQLQueryBuilder 提供了链式调用的 API (select().from().where().join())，用于构建复杂的 SQL 查询，并自动防止 SQL 注入。",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "性能优化",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**自动连接管理**：模型类使用 ensureInitialized 机制，只有在第一次执行查询时才建立连接或加载配置，加快了应用启动速度。",
                  "**集成缓存层**：SQLModel 直接集成了 CacheAdapter，支持在 ORM 层级配置 cacheTTL，能够自动缓存查询结果，显著减少数据库负载。",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "高级特性",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**软删除 (Soft Deletes)**：原生支持软删除逻辑（deletedAt），并提供了 withTrashed()、onlyTrashed() 和 restore() 等 API 进行全生命周期管理。",
                  "**虚拟字段与作用域**：支持 virtuals（计算属性）和 scopes（预定义查询条件），增强了模型的表达能力和代码复用性。",
                  "**内置验证器**：在 ORM 层实现了字段级的 Schema 验证（required, min, max, pattern 等），保证入库数据的完整性和一致性。",
                ],
              },
            ],
          },
        ],
      },
      {
        title: "导入方式",
        blocks: [
          {
            type: "text",
            content:
              "所有数据库相关的功能都可以从 `@dreamer/dweb/database` 统一导入，无需从子目录导入：",
          },
          {
            type: "code",
            code: importCode,
            language: "typescript",
          },
          {
            type: "text",
            content:
              "使用 MySQL 时，请从 `@dreamer/dweb/database/adapters/mysql` 导入 `MySQLAdapter`。",
          },
        ],
      },
      {
        title: "目录结构",
        blocks: [
          {
            type: "code",
            code: directoryStructureCode,
            language: "text",
          },
        ],
      },

      {
        title: "快速开始",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "初始化数据库",
            blocks: [
              {
                type: "subsection",
                level: 4,
                title: "方式 1：使用初始化工具（推荐）",
                blocks: [
                  {
                    type: "text",
                    content:
                      "在项目入口文件（如 `main.ts` 或 `init.ts`）中调用初始化工具，自动从 `dweb.config.ts` 加载配置：",
                  },
                  {
                    type: "code",
                    code: initDbFromConfigCode,
                    language: "typescript",
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "方式 2：手动初始化",
                blocks: [
                  {
                    type: "text",
                    content: "使用 `initDatabase` 函数手动初始化数据库连接：",
                  },
                  {
                    type: "code",
                    code: initDbCode,
                    language: "typescript",
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: '解决 "Database config loader not set" 错误',
                blocks: [
                  {
                    type: "text",
                    content:
                      "如果在使用模型时遇到 `Database config loader not set` 错误，需要在项目启动时设置配置加载器：",
                  },
                  {
                    type: "code",
                    code: setupConfigLoaderCode,
                    language: "typescript",
                  },
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用 ORM 模型",
            blocks: [
              {
                type: "text",
                content:
                  "框架提供了强大的 ORM/ODM 功能，支持字段定义、验证、时间戳、软删除、作用域、虚拟字段、生命周期钩子等特性。",
              },
              {
                type: "subsection",
                level: 4,
                title: "SQLModel 完整示例",
                blocks: [
                  {
                    type: "text",
                    content: "以下是一个完整的 SQLModel 示例，展示了所有特性：",
                  },
                  {
                    type: "code",
                    code: sqlModelFullCode,
                    language: "typescript",
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "使用示例",
                blocks: [
                  {
                    type: "text",
                    content: "使用 User 模型的各种方法：",
                  },
                  {
                    type: "code",
                    code: sqlModelUsageCode,
                    language: "typescript",
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "MongoModel 完整示例",
                blocks: [
                  {
                    type: "text",
                    content: "MongoDB 模型示例，支持地理空间查询和聚合查询：",
                  },
                  {
                    type: "code",
                    code: mongoModelFullCode,
                    language: "typescript",
                  },
                ],
              },
            ],
          },
        ],
      },

      {
        title: "数据库适配器",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "PostgreSQL 适配器",
            blocks: [
              {
                type: "text",
                content: "PostgreSQL 适配器支持连接池、事务、查询构建等功能：",
              },
              {
                type: "code",
                code: postgresAdapterCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "MongoDB 适配器",
            blocks: [
              {
                type: "text",
                content: "MongoDB 适配器支持文档查询、聚合、索引等功能：",
              },
              {
                type: "code",
                code: mongoAdapterCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "MySQL 适配器",
            blocks: [
              {
                type: "text",
                content:
                  "MySQL/MariaDB 适配器支持基本查询、执行、事务与自动重连：",
              },
              {
                type: "code",
                code: mysqlAdapterCode,
                language: "typescript",
              },
            ],
          },
        ],
      },

      {
        title: "ORM/ODM 模型",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "模型特性",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "字段定义和类型验证",
                  "自动时间戳管理",
                  "软删除支持",
                  "查询作用域",
                  "虚拟字段",
                  "生命周期钩子",
                  "关联查询（一对一、一对多、多对多）",
                  "索引管理",
                  "查询缓存",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "关联查询",
            blocks: [
              {
                type: "text",
                content:
                  "关联查询用于处理模型之间的关系，支持一对一、一对多和多对一关系。",
              },
              {
                type: "subsection",
                level: 4,
                title: "关联方法",
                blocks: [
                  {
                    type: "text",
                    content:
                      "**belongsTo(RelatedModel, foreignKey, localKey?)** - 属于关系（多对一）\n\n例如：Post belongsTo User（一个帖子属于一个用户）\n\n- `RelatedModel`: 关联的模型类\n- `foreignKey`: 外键字段名（当前模型中的字段）\n- `localKey`: 关联模型的主键字段名（默认为关联模型的 primaryKey）",
                  },
                  {
                    type: "text",
                    content:
                      "**hasOne(RelatedModel, foreignKey, localKey?)** - 有一个关系（一对一）\n\n例如：User hasOne Profile（一个用户有一个资料）\n\n- `foreignKey`: 外键字段名（关联模型中的字段）\n- `localKey`: 当前模型的主键字段名（默认为当前模型的 primaryKey）",
                  },
                  {
                    type: "text",
                    content:
                      "**hasMany(RelatedModel, foreignKey, localKey?)** - 有多个关系（一对多）\n\n例如：User hasMany Posts（一个用户有多个帖子）\n\n- `foreignKey`: 外键字段名（关联模型中的字段）\n- `localKey`: 当前模型的主键字段名（默认为当前模型的 primaryKey）",
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "完整示例",
                blocks: [
                  {
                    type: "code",
                    code: associationDetailCode,
                    language: "typescript",
                  },
                ],
              },
            ],
          },
        ],
      },

      {
        title: "查询构建器",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "SQL 查询构建器",
            blocks: [
              {
                type: "text",
                content: "使用查询构建器可以方便地构建复杂的 SQL 查询：",
              },
              {
                type: "code",
                code: sqlQueryBuilderCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "MongoDB 查询构建器",
            blocks: [
              {
                type: "text",
                content: "MongoDB 查询构建器支持文档查询：",
              },
              {
                type: "code",
                code: mongoQueryBuilderCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "数据库迁移",
        blocks: [
          {
            type: "text",
            content: "使用 `MigrationManager` 管理数据库迁移：",
          },
          {
            type: "code",
            code: migrationCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "查询缓存",
        blocks: [
          {
            type: "text",
            content: "框架支持查询缓存，可以显著提高查询性能：",
          },
          {
            type: "code",
            code: cacheCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "查询日志",
        blocks: [
          {
            type: "text",
            content: "使用 `QueryLogger` 记录和监控数据库查询：",
          },
          {
            type: "code",
            code: queryLoggerCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "连接池监控",
        blocks: [
          {
            type: "text",
            content: "监控数据库连接池的状态，了解连接使用情况：",
          },
          {
            type: "code",
            code: poolMonitorCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "健康检查",
        blocks: [
          {
            type: "text",
            content: "执行数据库健康检查，确保数据库连接正常：",
          },
          {
            type: "code",
            code: healthCheckCode,
            language: "typescript",
          },
        ],
      },

      {
        title: "API 参考",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "模型方法",
            blocks: [
              {
                type: "subsection",
                level: 4,
                title: "查询方法",
                blocks: [
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "**`find(condition, fields?)`** - 查找单条记录",
                      "**`findAll(condition?, fields?)`** - 查找多条记录",
                      "**`findById(id, fields?)`** - 根据 ID 查找",
                      "**`findOne(condition, fields?)`** - 查找一条记录",
                      "**`count(condition?)`** - 统计数量",
                      "**`exists(condition)`** - 检查是否存在",
                      "**`paginate(condition, page, pageSize)`** - 分页查询",
                    ],
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "创建方法",
                blocks: [
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "**`create(data)`** - 创建单条记录",
                      "**`createMany(data[])`** - 批量创建",
                    ],
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "更新方法",
                blocks: [
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "**`update(condition, data)`** - 更新记录（静态方法）",
                      "**`update(data)`** - 更新当前实例（实例方法）",
                      "**`updateById(id, data)`** - 通过主键 ID 更新记录（静态方法）",
                      "**`updateMany(condition, data)`** - 批量更新",
                      "**`increment(condition, field, amount)`** - 递增字段（静态方法）",
                      "**`decrement(condition, field, amount)`** - 递减字段（静态方法）",
                      "**`findOneAndUpdate(condition, data)`** - 查找并更新（仅 MongoDB）",
                    ],
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "删除方法",
                blocks: [
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "**`delete(condition)`** - 删除记录（静态方法）",
                      "**`deleteById(id)`** - 通过主键 ID 删除记录（静态方法）",
                      "**`delete()`** - 删除当前实例（实例方法）",
                      "**`deleteMany(condition)`** - 批量删除",
                      "**`findOneAndDelete(condition)`** - 查找并删除（仅 MongoDB）",
                    ],
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "软删除相关方法",
                blocks: [
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "**`restore(condition)`** - 恢复软删除的记录（静态方法）",
                      "**`forceDelete(condition)`** - 强制删除记录，忽略软删除（静态方法）",
                      "**`withTrashed()`** - 查询时包含已软删除的记录（静态方法，返回查询构建器）",
                      "**`onlyTrashed()`** - 只查询已软删除的记录（静态方法，返回查询构建器）",
                    ],
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "其他方法",
                blocks: [
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "**`upsert(condition, data)`** - 更新或插入",
                      "**`findOrCreate(condition, data)`** - 查找或创建（如果不存在则创建）",
                      "**`distinct(field, condition?)`** - 去重查询",
                      "**`aggregate(pipeline)`** - 聚合查询（仅 MongoDB）",
                      "**`truncate()`** - 清空表/集合（删除所有记录）",
                      "**`save()`** - 保存当前实例（实例方法）",
                      "**`reload()`** - 重新加载当前实例（实例方法）",
                    ],
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "查询作用域方法",
                blocks: [
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "**`scope(scopeName)`** - 应用查询作用域（静态方法，返回查询构建器）",
                    ],
                  },
                  {
                    type: "text",
                    content:
                      "返回的查询构建器支持 `findAll()`, `find()`, `count()` 方法",
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "初始化方法",
                blocks: [
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "**`init(connectionName?)`** - 初始化模型，设置数据库适配器并创建索引（静态方法）",
                    ],
                  },
                  {
                    type: "text",
                    content:
                      "`connectionName`: 连接名称，默认为 'default'。如果数据库未初始化，会自动尝试从 dweb.config.ts 加载配置并初始化。",
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "关联查询方法（实例方法）",
                blocks: [
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "**`belongsTo(RelatedModel, foreignKey, localKey?)`** - 属于关系（多对一）",
                      "**`hasOne(RelatedModel, foreignKey, localKey?)`** - 有一个关系（一对一）",
                      "**`hasMany(RelatedModel, foreignKey, localKey?)`** - 有多个关系（一对多）",
                    ],
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "索引管理",
                blocks: [
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "**`createIndexes()`** - 创建索引",
                      "**`createIndexes(true)`** - 强制重新创建索引",
                      "**`dropIndexes()`** - 删除所有索引",
                      "**`getIndexes()`** - 获取所有索引",
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
