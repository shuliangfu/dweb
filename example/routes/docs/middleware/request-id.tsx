/**
 * 中间件 - requestId 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "requestId 中间件 - DWeb 框架文档",
  description: "requestId 中间件使用指南",
};

export default function RequestIdMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const requestIdCode = `import { requestId } from '@dreamer/dweb';

server.use(requestId({
  header: 'X-Request-ID',
  generator: () => crypto.randomUUID(),
}));`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        requestId - 请求 ID
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        requestId 中间件为每个请求生成唯一 ID，便于追踪和调试。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={requestIdCode} language="typescript" />
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
              headerName
            </code>{" "}
            - 请求 ID 响应头名称（默认 'X-Request-Id'）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              exposeHeader
            </code>{" "}
            - 是否在响应头中包含请求 ID（默认 true）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              generator
            </code>{" "}
            - 自定义 ID 生成器函数（如果不提供，使用默认的 UUID v4 生成器）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              skip
            </code>{" "}
            - 跳过生成请求 ID 的路径数组（支持 glob 模式）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              useHeader
            </code>{" "}
            - 是否从请求头中读取现有的请求 ID（默认 true）。如果请求头中已有请求 ID，则使用它而不是生成新的
          </li>
        </ul>
      </section>
    </article>
  );
}
