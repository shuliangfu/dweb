/**
 * 中间件 - bodyParser 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "bodyParser 中间件 - DWeb 框架文档",
  description: "bodyParser 中间件使用指南",
};

export default function BodyParserMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const bodyParserCode = `import { bodyParser } from '@dreamer/dweb';

server.use(bodyParser({
  json: { limit: '1mb' },
  urlencoded: { limit: '1mb', extended: true },
  text: { limit: '1mb' },
  raw: { limit: '1mb' },
}));`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        bodyParser - 请求体解析
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        bodyParser 中间件用于解析 HTTP 请求体，支持
        JSON、URL-encoded、文本和原始数据。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={bodyParserCode} language="typescript" />
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
              json
            </code>{" "}
            - JSON 解析配置对象：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">limit</code> - 大小限制（如 '1mb'，默认 '1mb'）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">strict</code> - 是否严格模式（默认 true）</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              urlencoded
            </code>{" "}
            - URL-encoded 解析配置对象：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">extended</code> - 是否使用扩展模式（默认 true）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">limit</code> - 大小限制（如 '1mb'，默认 '1mb'）</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              text
            </code>{" "}
            - 文本解析配置对象：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">limit</code> - 大小限制（如 '1mb'，默认 '1mb'）</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              raw
            </code>{" "}
            - 原始数据解析配置对象：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">limit</code> - 大小限制（如 '1mb'，默认 '1mb'）</li>
            </ul>
          </li>
        </ul>
      </section>
    </article>
  );
}
