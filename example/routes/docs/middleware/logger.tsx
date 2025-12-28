/**
 * 中间件 - logger 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
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
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">format</code>{" "}
            - 日志格式：'combined' | 'common' | 'dev' | 'short' | 'tiny'
          </li>
        </ul>
      </section>
    </article>
  );
}
