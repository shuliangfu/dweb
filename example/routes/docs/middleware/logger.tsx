/**
 * 中间件 - logger 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "logger 中间件 - DWeb 框架文档",
  description: "logger 中间件使用指南",
};

export default function LoggerMiddlewarePage({
  params: _params,
  query: _query,
  data: _data,
}: PageProps) {
  const loggerCode = `import { logger } from '@dreamer/dweb/middleware';

server.use(logger({
  format: 'combined', // 'combined' | 'common' | 'dev' | 'short' | 'tiny'
}));`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        logger - 请求日志
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        logger 中间件用于记录 HTTP 请求日志，支持多种日志格式。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={loggerCode} language="typescript" />
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
              format
            </code>{" "}
            - 日志格式（默认 'combined'）：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">'combined'</code> - 完整格式，包含方法、路径、状态码、耗时和 User-Agent</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">'common'</code> - 通用格式，类似 Apache 日志</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">'dev'</code> - 开发格式，带颜色标记</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">'short'</code> - 简短格式</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">'tiny'</code> - 最简格式</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              skip
            </code>{" "}
            - 跳过日志记录的函数，接收请求对象，返回布尔值（默认跳过 Chrome DevTools 的自动请求）
          </li>
        </ul>
      </section>
    </article>
  );
}
