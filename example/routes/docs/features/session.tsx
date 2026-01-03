/**
 * Session 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "Session - DWeb 框架文档",
  description: "Session 管理和多种存储方式",
};

export default function SessionPage() {
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
  const basicUsageCode = `import { SessionManager } from "@dreamer/dweb";

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

  const content = {
    title: "Session",
    description: "DWeb 框架提供了完整的 Session 管理功能，支持多种存储方式。",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "基本使用",
            blocks: [
              {
                type: "code",
                code: basicUsageCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "配置 Session",
        blocks: [
          {
            type: "text",
            content: "在 `dweb.config.ts` 中配置 Session：",
          },
          {
            type: "code",
            code: sessionConfigCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "在路由中使用 Session",
        blocks: [
          {
            type: "text",
            content: "在页面或 API 路由中使用 Session：",
          },
          {
            type: "code",
            code: sessionUsageCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "支持的存储方式",
        blocks: [
          {
            type: "code",
            code: storageTypesCode,
            language: "typescript",
          },
          {
            type: "subsection",
            level: 3,
            title: "存储方式说明",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**memory** - 内存存储（开发环境，重启后丢失）",
                  "**file** - 文件存储（适合单机部署）",
                  "**kv** - Deno KV 存储（Deno Deploy 环境）",
                  "**mongodb** - MongoDB 存储（适合分布式部署）",
                  "**redis** - Redis 存储（高性能，适合生产环境）",
                ],
              },
            ],
          },
        ],
      },
      {
        title: "API 参考",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "SessionManager",
            blocks: [
              {
                type: "code",
                code: `new SessionManager(config: SessionConfig)`,
                language: "typescript",
              },
              {
                type: "code",
                code: sessionConfigInterfaceCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "方法",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`get(req: Request): Promise<Session>`** - 获取或创建 Session",
                  "**`destroy(sessionId: string): Promise<void>`** - 销毁 Session",
                  "**`clear(): Promise<void>`** - 清空所有 Session",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "Session 对象",
            blocks: [
              {
                type: "code",
                code: sessionApiCode,
                language: "typescript",
              },
              {
                type: "text",
                content: "**Session 方法**：",
              },
              {
                type: "list",
                ordered: false,
                items: [
                  "**`get(key: string): any`** - 获取 Session 值",
                  "**`set(key: string, value: any): void`** - 设置 Session 值",
                  "**`has(key: string): boolean`** - 检查键是否存在",
                  "**`delete(key: string): void`** - 删除 Session 值",
                  "**`clear(): void`** - 清空所有值",
                  "**`save(): Promise<void>`** - 保存 Session",
                  "**`destroy(): Promise<void>`** - 销毁 Session",
                ],
              },
            ],
          },
        ],
      },
      {
        title: "相关文档",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[Cookie](/docs/features/cookie) - Cookie 管理",
              "[Database](/docs/features/database) - 数据库",
              "[Application](/docs/core/application) - 应用核心",
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
