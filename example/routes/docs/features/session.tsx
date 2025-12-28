/**
 * Session 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "Session - DWeb 框架文档",
  description: "Session 管理和多种存储方式",
};

export default function SessionPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const sessionConfigCode = `// dweb.config.ts
session: {
  // 存储方式
  store: 'memory', // 'memory' | 'file' | 'kv' | 'mongodb' | 'redis'
  
  // Session 密钥（必需）
  secret: 'your-session-secret',
  
  // 最大存活时间（毫秒）
  maxAge: 3600000, // 1小时
  
  // 文件存储配置
  file: {
    dir: './sessions',
  },
  
  // MongoDB 存储配置
  mongodb: {
    collection: 'sessions',
    password: 'password',
    db: 'mydb',
  },
  
  // Redis 存储配置
  redis: {
    password: 'password',
    db: 0,
  },
},`;

  const sessionUsageCode = `// 在路由中使用 Session
import type { PageProps, LoadContext } from '@dreamer/dweb';

export async function load({ getSession }: LoadContext) {
  const session = await getSession();
  session.data.userId = '123';
  await session.save();
  return { userId: session.data.userId };
}

export default function Page({ data }: PageProps) {
  return <div>User ID: {data.userId}</div>;
}`;

  // 基本使用
  const basicUsageCode =
    `import { SessionManager } from "@dreamer/dweb/features/session";

// 创建 Session 管理器
const sessionManager = new SessionManager({
  store: "memory",
  secret: "your-secret-key",
  maxAge: 3600, // 1 小时
});

// 在请求处理中使用
server.setHandler(async (req, res) => {
  const session = await sessionManager.get(req);

  // 设置 Session 值
  session.set("userId", 123);
  session.set("username", "john");

  // 获取 Session 值
  const userId = session.get("userId");

  // 保存 Session
  await session.save();

  res.text("OK");
});`;

  // 不同存储方式
  const storageTypesCode = `// 文件存储
const sessionManager = new SessionManager({
  store: "file",
  secret: "your-secret-key",
  maxAge: 3600,
  file: {
    dir: "./sessions", // Session 文件存储目录
  },
});

// Deno KV 存储
const sessionManager = new SessionManager({
  store: "kv",
  secret: "your-secret-key",
  maxAge: 3600,
  kv: {}, // KV 配置（可选）
});

// MongoDB 存储
const sessionManager = new SessionManager({
  store: "mongodb",
  secret: "your-secret-key",
  maxAge: 3600,
  mongodb: {
    collection: "sessions", // 集合名称（可选，默认为 'sessions'）
  },
});

// Redis 存储
const sessionManager = new SessionManager({
  store: "redis",
  secret: "your-secret-key",
  maxAge: 3600,
  redis: {
    host: "localhost",
    port: 6379,
    password: "password", // 可选
    db: 0, // 可选，数据库编号
  },
});`;

  // Session API
  const sessionApiCode = `// Session 对象的方法
const session = await sessionManager.get(req);

// 获取 Session 值
const userId = session.get("userId");

// 设置 Session 值
session.set("userId", 123);

// 检查键是否存在
if (session.has("userId")) {
  // ...
}

// 删除 Session 值
session.delete("userId");

// 清空所有值
session.clear();

// 保存 Session
await session.save();

// 销毁 Session
await session.destroy();`;

  // SessionConfig
  const sessionConfigInterfaceCode = `interface SessionConfig {
  store?: "memory" | "file" | "kv" | "mongodb" | "redis";
  secret: string;
  maxAge?: number;
  name?: string;
  file?: {
    dir?: string;
  };
  kv?: Record<PropertyKey, never>;
  mongodb?: {
    collection?: string;
  };
  redis?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
}`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        Session
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 框架提供了完整的 Session 管理功能，支持多种存储方式。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          基本使用
        </h3>
        <CodeBlock code={basicUsageCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置 Session
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          在{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            dweb.config.ts
          </code>{" "}
          中配置 Session：
        </p>
        <CodeBlock code={sessionConfigCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          在路由中使用 Session
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          在页面或 API 路由中使用 Session：
        </p>
        <CodeBlock code={sessionUsageCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          支持的存储方式
        </h2>
        <CodeBlock code={storageTypesCode} language="typescript" />
        <div className="mt-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            存储方式说明
          </h3>
          <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
            <li>
              <strong>memory</strong> - 内存存储（开发环境，重启后丢失）
            </li>
            <li>
              <strong>file</strong> - 文件存储（适合单机部署）
            </li>
            <li>
              <strong>kv</strong> - Deno KV 存储（Deno Deploy 环境）
            </li>
            <li>
              <strong>mongodb</strong> - MongoDB 存储（适合分布式部署）
            </li>
            <li>
              <strong>redis</strong> - Redis 存储（高性能，适合生产环境）
            </li>
          </ul>
        </div>
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          SessionManager
        </h3>
        <CodeBlock
          code={`new SessionManager(config: SessionConfig)`}
          language="typescript"
        />
        <CodeBlock code={sessionConfigInterfaceCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方法
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              get(req: Request): Promise&lt;Session&gt;
            </code>{" "}
            - 获取或创建 Session
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              destroy(sessionId: string): Promise&lt;void&gt;
            </code>{" "}
            - 销毁 Session
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              clear(): Promise&lt;void&gt;
            </code>{" "}
            - 清空所有 Session
          </li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          Session 对象
        </h3>
        <CodeBlock code={sessionApiCode} language="typescript" />
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 mt-4">
          <strong>Session 方法：</strong>
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              get(key: string): any
            </code>{" "}
            - 获取 Session 值
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              set(key: string, value: any): void
            </code>{" "}
            - 设置 Session 值
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              has(key: string): boolean
            </code>{" "}
            - 检查键是否存在
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              delete(key: string): void
            </code>{" "}
            - 删除 Session 值
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              clear(): void
            </code>{" "}
            - 清空所有值
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              save(): Promise&lt;void&gt;
            </code>{" "}
            - 保存 Session
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              destroy(): Promise&lt;void&gt;
            </code>{" "}
            - 销毁 Session
          </li>
        </ul>
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/features/cookie"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Cookie
            </a>{" "}
            - Cookie 管理
          </li>
          <li>
            <a
              href="/docs/features/database"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Database
            </a>{" "}
            - 数据库
          </li>
          <li>
            <a
              href="/docs/core/application"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Application
            </a>{" "}
            - 应用核心
          </li>
        </ul>
      </section>
    </article>
  );
}
