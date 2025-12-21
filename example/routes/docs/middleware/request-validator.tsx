/**
 * 中间件 - requestValidator 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "requestValidator 中间件 - DWeb 框架文档",
  description: "requestValidator 中间件使用指南",
};

export default function RequestValidatorMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const requestValidatorCode =
    `import { requestValidator } from '@dreamer/dweb/middleware';

server.use(requestValidator({
  body: {
    name: { type: 'string', required: true, min: 2, max: 50 },
    email: { type: 'string', required: true, pattern: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/ },
  },
}));`;

  return (
    <article className="prose prose-lg max-w-none">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">
        requestValidator - 请求验证
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        requestValidator 中间件用于验证请求数据，确保数据格式和内容符合要求。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          基本使用
        </h2>
        <CodeBlock code={requestValidatorCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          验证规则
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">type</code>{" "}
            - 数据类型：'string' | 'number' | 'boolean' | 'array' | 'object'
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">required</code>{" "}
            - 是否必填
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">min</code>{" "}
            - 最小值或最小长度
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">max</code>{" "}
            - 最大值或最大长度
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">pattern</code>{" "}
            - 正则表达式模式
          </li>
        </ul>
      </section>
    </article>
  );
}
