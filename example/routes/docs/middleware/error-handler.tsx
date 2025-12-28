/**
 * 中间件 - errorHandler 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
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
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              format
            </code>{" "}
            - 错误响应格式：'json' | 'html' | 'text'
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              includeStack
            </code>{" "}
            - 是否包含堆栈跟踪（仅开发环境）
          </li>
        </ul>
      </section>
    </article>
  );
}
