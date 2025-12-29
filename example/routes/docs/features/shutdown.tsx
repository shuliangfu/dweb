/**
 * 功能模块 - 优雅关闭 (shutdown) 文档页面
 * 展示 DWeb 框架的优雅关闭功能和使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "优雅关闭 (shutdown) - DWeb 框架文档",
  description:
    "DWeb 框架的优雅关闭功能使用指南，确保服务器在关闭时能够正确处理未完成的请求和清理资源",
};

export default function FeaturesShutdownPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
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
  const completeExampleCode =
    `import { Server } from "@dreamer/dweb";
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

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        优雅关闭 (shutdown)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb
        框架提供了优雅关闭功能，确保服务器在关闭时能够正确处理未完成的请求和清理资源。
      </p>

      {/* 快速开始 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          基本使用
        </h3>
        <CodeBlock code={basicUsageCode} language="typescript" />
      </section>

      {/* 工作原理 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          工作原理
        </h2>
        <CodeBlock code={howItWorksCode} language="text" />
      </section>

      {/* 完整示例 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          完整示例
        </h2>
        <CodeBlock code={completeExampleCode} language="typescript" />
      </section>

      {/* Docker 环境 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          Docker 环境
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          在 Docker 容器中，优雅关闭特别重要：
        </p>
        <CodeBlock code={dockerCode} language="dockerfile" />
        <CodeBlock code={dockerMainCode} language="typescript" />
      </section>

      {/* 关闭处理器执行顺序 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          关闭处理器执行顺序
        </h2>
        <CodeBlock code={executionOrderCode} language="typescript" />
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>

        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                registerShutdownHandler(handler)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              注册一个关闭处理器，在服务器关闭时执行。
            </p>
            <CodeBlock
              code={`registerShutdownHandler(async () => {
  // 关闭数据库连接
  await db.close();
  
  // 清理缓存
  await cache.clear();
  
  // 保存状态
  await saveState();
});`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                setupSignalHandlers(server)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              设置系统信号监听器，自动处理{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                SIGTERM
              </code>{" "}
              和{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                SIGINT
              </code>{" "}
              信号。
            </p>
            <CodeBlock
              code={`const server = new Server();
setupSignalHandlers(server);`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                gracefulShutdown(signal, server)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              手动触发优雅关闭流程。
            </p>
            <CodeBlock
              code={`await gracefulShutdown("SIGTERM", server);`}
              language="typescript"
            />
          </div>
        </div>
      </section>

      {/* 最佳实践 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          最佳实践
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <strong>注册所有资源清理</strong>：数据库连接、Redis
            连接、文件句柄、定时器、WebSocket 连接
          </li>
          <li>
            <strong>处理异步操作</strong>：确保所有异步操作在关闭前完成，使用
            {" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              await
            </code>{" "}
            等待异步清理
          </li>
          <li>
            <strong>
              错误处理
            </strong>：关闭处理器中的错误不会阻止其他处理器执行，记录所有错误以便调试
          </li>
          <li>
            <strong>
              测试优雅关闭
            </strong>：在开发环境中测试关闭流程，确保所有资源正确清理
          </li>
        </ul>
      </section>

      {/* 注意事项 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          注意事项
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            优雅关闭仅在收到{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              SIGTERM
            </code>{" "}
            或{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              SIGINT
            </code>{" "}
            信号时触发
          </li>
          <li>
            强制终止（<code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              SIGKILL
            </code>）无法被捕获，不会执行关闭处理器
          </li>
          <li>确保关闭处理器不会执行过长时间的操作</li>
          <li>在生产环境中，确保进程管理器配置了合理的超时时间</li>
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
              href="/docs/features/dev"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              开发服务器
            </a>
          </li>
          <li>
            <a
              href="/docs/features/prod"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              生产服务器
            </a>
          </li>
          <li>
            <a
              href="/docs/features/monitoring"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              性能监控
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}
