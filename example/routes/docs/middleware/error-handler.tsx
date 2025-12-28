/**
 * 中间件 - errorHandler 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "errorHandler 中间件 - DWeb 框架文档",
  description: "errorHandler 中间件使用指南",
};

export default function ErrorHandlerMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const errorHandlerCode =
    `import { errorHandler } from '@dreamer/dweb/middleware';

server.use(errorHandler({
  format: 'json', // 'json' | 'html' | 'text'
  includeStack: Deno.env.get('DENO_ENV') === 'development',
}));`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        errorHandler - 错误处理
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        errorHandler 中间件统一处理应用错误，提供友好的错误响应。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={errorHandlerCode} language="typescript" />
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
              debug
            </code>{" "}
            - 是否在开发环境中显示详细错误信息（默认 true）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              formatError
            </code>{" "}
            - 自定义错误格式化函数，接收错误对象和请求对象，返回格式化后的错误信息对象（包含 error, message, statusCode, details）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              onError
            </code>{" "}
            - 错误日志记录函数，接收错误对象和请求对象
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              defaultMessage
            </code>{" "}
            - 默认错误消息（当无法获取错误消息时使用）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              logStack
            </code>{" "}
            - 是否记录错误堆栈（默认在开发环境中记录）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              skip
            </code>{" "}
            - 跳过错误处理的路径数组（支持 glob 模式）
          </li>
        </ul>
      </section>
    </article>
  );
}
