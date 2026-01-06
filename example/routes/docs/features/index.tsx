/**
 * 功能模块 - 功能模块概述文档页面
 * 展示 DWeb 框架的功能模块概述
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "功能模块概述 - DWeb 框架文档",
  description: "DWeb 框架提供了丰富的功能模块，用于处理各种业务需求",
};

export default function FeaturesOverviewPage() {
  // 基本用法
  const basicUsageCode = `import { Application } from "@dreamer/dweb";
import { dev, build, prod } from "@dreamer/dweb";

// 开发模式
if (Deno.env.get("DENO_ENV") === "development") {
  await dev();
}

// 构建
await build();

// 生产模式
await prod();`;

  // 数据库使用
  const databaseUsageCode = `import { Application } from "@dreamer/dweb";
import { database } from "@dreamer/dweb";

const app = new Application();
await app.initialize();

// 使用数据库
const User = database.model("User", {
  name: String,
  email: String,
});

const user = await User.create({
  name: "Alice",
  email: "alice@example.com",
});`;

  // 页面文档数据
  const content = {
    title: "功能模块概述",
    description: "DWeb 框架提供了丰富的功能模块，用于处理各种业务需求。",
    sections: [
      {
        title: "目录结构",
        blocks: [
          {
            type: "code",
            code: `src/features/
├── build.ts          # 构建功能
├── cookie.ts         # Cookie 管理
├── create.ts         # 项目创建
├── database/         # 数据库支持
├── dev.ts            # 开发服务器
├── env.ts            # 环境变量
├── graphql/          # GraphQL 支持
├── hmr.ts            # 热模块替换
├── logger.ts         # 日志系统
├── monitoring.ts     # 性能监控
├── prod.ts           # 生产服务器
├── session.ts        # Session 管理
├── shutdown.ts       # 优雅关闭
└── websocket/        # WebSocket 支持`,
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
            title: "基本用法",
            blocks: [
              {
                type: "code",
                code: basicUsageCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "数据库使用",
            blocks: [
              {
                type: "code",
                code: databaseUsageCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "核心功能",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[数据库 (Database)](/docs/features/database) - 数据库支持、ORM/ODM、查询构建器",
              "[GraphQL](/docs/features/graphql) - GraphQL 服务器和查询处理",
              "[WebSocket](/docs/features/websocket) - WebSocket 服务器和客户端",
              "[Session](/docs/features/session) - Session 管理和多种存储方式",
              "[Cookie](/docs/features/cookie) - Cookie 管理和签名",
              "[缓存 (Cache)](/docs/features/cache) - 缓存系统与分布式支持",
              "[日志记录器 (Logger)](/docs/features/logger) - 日志系统和日志轮转",
            ],
          },
        ],
      },
      {
        title: "开发工具",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[项目创建 (Create)](/docs/features/create) - 使用 CLI 创建项目",
              "[开发服务器 (Dev)](/docs/features/dev) - 开发模式服务器",
              "[热模块替换 (HMR)](/docs/features/hmr) - 开发时的热更新",
              "[环境变量 (Env)](/docs/features/env) - 环境变量管理",
            ],
          },
        ],
      },
      {
        title: "生产部署",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[构建 (Build)](/docs/features/build) - 生产构建",
              "[生产服务器 (Prod)](/docs/features/prod) - 生产模式服务器",
              "[性能监控 (Monitoring)](/docs/features/monitoring) - 性能监控功能",
              "[优雅关闭 (Shutdown)](/docs/features/shutdown) - 服务器优雅关闭",
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
              "[核心模块](/docs/core) - 框架核心功能",
              "[中间件系统](/docs/middleware) - 中间件系统",
              "[插件系统](/docs/plugins) - 插件系统",
              "[工具函数库](/docs/utils) - 工具函数库",
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
