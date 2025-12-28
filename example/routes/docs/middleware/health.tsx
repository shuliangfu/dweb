/**
 * 中间件 - health 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "health 中间件 - DWeb 框架文档",
  description: "health 中间件使用指南",
};

export default function HealthMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const healthCode = `import { health } from '@dreamer/dweb/middleware';

server.use(health({
  path: '/health',
  checks: {
    database: async () => {
      // 检查数据库连接
      return { status: 'ok' };
    },
  },
}));`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        health - 健康检查
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        health 中间件提供应用健康检查端点，用于监控应用状态。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={healthCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          可选参数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              path
            </code>{" "}
            - 健康检查路径（默认 '/health'）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              readyPath
            </code>{" "}
            - 就绪检查路径（默认 '/health/ready'）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              livePath
            </code>{" "}
            - 存活检查路径（默认 '/health/live'）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              healthCheck
            </code>{" "}
            - 自定义健康检查函数，返回 Promise，包含 status（'ok' | 'error'）、message 和 details
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              readyCheck
            </code>{" "}
            - 自定义就绪检查函数，返回 Promise，包含 status（'ready' | 'not-ready'）、message 和 details
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              liveCheck
            </code>{" "}
            - 自定义存活检查函数，返回 Promise，包含 status（'alive' | 'dead'）、message 和 details
          </li>
        </ul>
      </section>
    </article>
  );
}
