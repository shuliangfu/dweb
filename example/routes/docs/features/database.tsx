/**
 * 数据库模块文档页面
 * 详细介绍 DWeb 框架的数据库功能
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "数据库模块 - DWeb 框架文档",
  description: "DWeb 框架的数据库支持，包括 ORM/ODM、查询构建器、迁移管理等",
};

/**
 * 数据库模块文档页面
 */
export default function DatabasePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 初始化数据库
  const initDbCode =
    `import { initDatabase } from '@dreamer/dweb/features/database';

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

  // SQLModel 基本使用
  const sqlModelCode =
    `import { SQLModel, getDatabase } from '@dreamer/dweb/features/database';

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
      validate: { required: true, pattern: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/ }
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
await user.delete();`;

  // MongoDB 适配器
  const mongoAdapterCode =
    `import { MongoDBAdapter } from '@dreamer/dweb/features/database';

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
    `import { PostgreSQLAdapter } from '@dreamer/dweb/features/database';

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

  // 查询构建器
  const queryBuilderCode =
    `import { SQLQueryBuilder } from '@dreamer/dweb/features/database';

const builder = new SQLQueryBuilder();
const query = builder
  .select('users.*')
  .from('users')
  .where('age', '>', 18)
  .where('status', '=', 'active')
  .orderBy('createdAt', 'DESC')
  .limit(10)
  .toSQL();

const results = await adapter.query(query.sql, query.params);`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      {/* 标题 */}
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">数据库模块</h1>

      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 框架提供了强大的数据库支持，支持 PostgreSQL 和
        MongoDB，包含查询构建器、ORM/ODM、迁移管理等功能。
      </p>

      {/* 目录结构 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          目录结构
        </h2>
        <CodeBlock
          code={`src/features/database/
├── adapters/          # 数据库适配器
│   ├── base.ts        # 基础适配器抽象类
│   ├── mongodb.ts     # MongoDB 适配器
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
└── types.ts           # 数据库类型定义`}
          language="text"
        />
      </section>

      {/* 快速开始 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          初始化数据库
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          使用{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">initDatabase</code>
          {" "}
          函数初始化数据库连接：
        </p>
        <CodeBlock code={initDbCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          使用 ORM 模型
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          框架提供了强大的 ORM/ODM
          功能，支持字段定义、验证、时间戳、软删除等特性：
        </p>
        <CodeBlock code={sqlModelCode} language="typescript" />
      </section>

      {/* 数据库适配器 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          数据库适配器
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          PostgreSQL 适配器
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          PostgreSQL 适配器支持连接池、事务、查询构建等功能：
        </p>
        <CodeBlock code={postgresAdapterCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          MongoDB 适配器
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          MongoDB 适配器支持文档查询、聚合、索引等功能：
        </p>
        <CodeBlock code={mongoAdapterCode} language="typescript" />
      </section>

      {/* ORM/ODM 模型 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          ORM/ODM 模型
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          模型特性
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700 dark:text-gray-300">字段定义和类型验证</li>
          <li className="text-gray-700 dark:text-gray-300">自动时间戳管理</li>
          <li className="text-gray-700 dark:text-gray-300">软删除支持</li>
          <li className="text-gray-700 dark:text-gray-300">查询作用域</li>
          <li className="text-gray-700 dark:text-gray-300">虚拟字段</li>
          <li className="text-gray-700 dark:text-gray-300">生命周期钩子</li>
          <li className="text-gray-700 dark:text-gray-300">关联查询（一对一、一对多、多对多）</li>
          <li className="text-gray-700 dark:text-gray-300">索引管理</li>
          <li className="text-gray-700 dark:text-gray-300">查询缓存</li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          关联查询
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          框架支持多种关联查询方式：
        </p>
        <CodeBlock code={associationCode} language="typescript" />
      </section>

      {/* 查询构建器 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          查询构建器
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          SQL 查询构建器
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          使用查询构建器可以方便地构建复杂的 SQL 查询：
        </p>
        <CodeBlock code={queryBuilderCode} language="typescript" />
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          SQLModel / MongoModel
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              find(id: number | string): Promise&lt;T&gt;
            </code>{" "}
            - 根据 ID 查找
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              findOne(conditions: Record&lt;string, any&gt;): Promise&lt;T |
              null&gt;
            </code>{" "}
            - 查找单个记录
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              findAll(conditions?: Record&lt;string, any&gt;):
              Promise&lt;T[]&gt;
            </code>{" "}
            - 查找所有记录
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              create(data: Partial&lt;T&gt;): Promise&lt;T&gt;
            </code>{" "}
            - 创建记录
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              update(data: Partial&lt;T&gt;): Promise&lt;T&gt;
            </code>{" "}
            - 更新记录
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              delete(): Promise&lt;void&gt;
            </code>{" "}
            - 删除记录
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              belongsTo(Model: typeof Model, foreignKey: string):
              Promise&lt;InstanceType&lt;typeof Model&gt;&gt;
            </code>{" "}
            - 多对一关联
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              hasOne(Model: typeof Model, foreignKey: string):
              Promise&lt;InstanceType&lt;typeof Model&gt; | null&gt;
            </code>{" "}
            - 一对一关联
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              hasMany(Model: typeof Model, foreignKey: string):
              Promise&lt;InstanceType&lt;typeof Model&gt;[]&gt;
            </code>{" "}
            - 一对多关联
          </li>
        </ul>
      </section>
    </article>
  );
}
