/**
 * 功能模块 - 优雅关闭 (shutdown) 文档页面
 * 展示 DWeb 框架的优雅关闭功能和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "优雅关闭 (shutdown) - DWeb 框架文档",
  description:
    "DWeb 框架的优雅关闭功能使用指南，确保服务器在关闭时能够正确处理未完成的请求和清理资源",
};

export default function FeaturesShutdownPage() {
  // 基本使用
  const basicUsageCode =
    `import { setupSignalHandlers, registerShutdownHandler } from "@dreamer/dweb";
import { Server } from "@dreamer/dweb";

const server = new Server();

// 设置信号监听器（自动处理 SIGTERM 和 SIGINT）
setupSignalHandlers(server);

// 注册关闭处理器（清理资源）
registerShutdownHandler(async () => {
  console.log("关闭数据库连接...");
  await database.close();
});

registerShutdownHandler(async () => {
  console.log("清理临时文件...");
  await cleanupTempFiles();
});

// 启动服务器
await server.start(3000);`;

  // 工作原理
  const howItWorksCode = `优雅关闭流程包括以下步骤：

1. 停止接收新请求：服务器停止接受新的连接
2. 等待现有请求完成：给现有请求一定时间完成处理
3. 执行关闭处理器：按注册顺序的逆序执行所有关闭处理器
4. 退出进程：正常退出或错误退出`;

  // 完整示例
  const completeExampleCode = `import { Server } from "@dreamer/dweb";
import { setupSignalHandlers, registerShutdownHandler } from "@dreamer/dweb";
import { Database } from "./database";

const server = new Server();
const database = new Database();

// 注册关闭处理器
registerShutdownHandler(async () => {
  console.log("关闭数据库连接...");
  await database.close();
});

registerShutdownHandler(async () => {
  console.log("关闭 Redis 连接...");
  await redis.quit();
});

registerShutdownHandler(async () => {
  console.log("保存应用状态...");
  await saveApplicationState();
});

// 设置信号监听器
setupSignalHandlers(server);

// 配置服务器
server.setHandler(async (req, res) => {
  res.text("Hello World");
});

// 启动服务器
await server.start(3000);
console.log("服务器运行在 http://localhost:3000");`;

  // Docker 环境
  const dockerCode = `# Dockerfile
FROM denoland/deno:latest

# 设置信号处理
STOPSIGNAL SIGTERM

# 运行应用
CMD ["deno", "run", "-A", "main.ts"]`;

  const dockerMainCode = `// main.ts
import { setupSignalHandlers } from "@dreamer/dweb";

const server = new Server();
setupSignalHandlers(server);

await server.start(3000);`;

  // 关闭处理器执行顺序
  const executionOrderCode =
    `// 关闭处理器按照注册顺序的逆序执行（后注册的先执行）

// 注册顺序
registerShutdownHandler(() => console.log("1"));
registerShutdownHandler(() => console.log("2"));
registerShutdownHandler(() => console.log("3"));

// 执行顺序：3 -> 2 -> 1

// 这样设计是为了确保：
// - 最后注册的处理器（通常是关键资源）最先执行
// - 先注册的处理器（通常是次要资源）最后执行`;

  const registerShutdownHandlerCode = `registerShutdownHandler(async () => {
  // 关闭数据库连接
  await db.close();
  
  // 清理缓存
  await cache.clear();
  
  // 保存状态
  await saveState();
});`;

  const setupSignalHandlersCode = `const server = new Server();
setupSignalHandlers(server);`;

  const gracefulShutdownCode = `await gracefulShutdown("SIGTERM", server);`;

  const content = {
    title: "优雅关闭 (shutdown)",
    description:
      "DWeb 框架提供了优雅关闭功能，确保服务器在关闭时能够正确处理未完成的请求和清理资源。",
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
        title: "工作原理",
        blocks: [
          {
            type: "code",
            code: howItWorksCode,
            language: "text",
          },
        ],
      },
      {
        title: "完整示例",
        blocks: [
          {
            type: "code",
            code: completeExampleCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "Docker 环境",
        blocks: [
          {
            type: "text",
            content: "在 Docker 容器中，优雅关闭特别重要：",
          },
          {
            type: "code",
            code: dockerCode,
            language: "dockerfile",
          },
          {
            type: "code",
            code: dockerMainCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "关闭处理器执行顺序",
        blocks: [
          {
            type: "code",
            code: executionOrderCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "API 参考",
        blocks: [
          {
            type: "api",
            name: "registerShutdownHandler(handler)",
            description: "注册一个关闭处理器，在服务器关闭时执行。",
            code: registerShutdownHandlerCode,
          },
          {
            type: "api",
            name: "setupSignalHandlers(server)",
            description:
              "设置系统信号监听器，自动处理 `SIGTERM` 和 `SIGINT` 信号。",
            code: setupSignalHandlersCode,
          },
          {
            type: "api",
            name: "gracefulShutdown(signal, server)",
            description: "手动触发优雅关闭流程。",
            code: gracefulShutdownCode,
          },
        ],
      },
      {
        title: "最佳实践",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**注册所有资源清理**：数据库连接、Redis 连接、文件句柄、定时器、WebSocket 连接",
              "**处理异步操作**：确保所有异步操作在关闭前完成，使用 `await` 等待异步清理",
              "**错误处理**：关闭处理器中的错误不会阻止其他处理器执行，记录所有错误以便调试",
              "**测试优雅关闭**：在开发环境中测试关闭流程，确保所有资源正确清理",
            ],
          },
        ],
      },
      {
        title: "注意事项",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "优雅关闭仅在收到 `SIGTERM` 或 `SIGINT` 信号时触发",
              "强制终止（`SIGKILL`）无法被捕获，不会执行关闭处理器",
              "确保关闭处理器不会执行过长时间的操作",
              "在生产环境中，确保进程管理器配置了合理的超时时间",
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
              "[开发服务器](/docs/features/dev)",
              "[生产服务器](/docs/features/prod)",
              "[性能监控](/docs/features/monitoring)",
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
