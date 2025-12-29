/**
 * 中间件 - requestValidator 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "requestValidator 中间件 - DWeb 框架文档",
  description: "requestValidator 中间件使用指南",
};

export default function RequestValidatorMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const requestValidatorCode =
    `import { requestValidator } from '@dreamer/dweb';

server.use(requestValidator({
  body: {
    name: { type: 'string', required: true, min: 2, max: 50 },
    email: { type: 'string', required: true, pattern: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/ },
  },
}));`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        requestValidator - 请求验证
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        requestValidator 中间件用于验证请求数据，确保数据格式和内容符合要求。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={requestValidatorCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          验证规则配置
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          可以在 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">body</code>、<code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">query</code>、<code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">params</code> 中配置验证规则。
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              field
            </code>{" "}
            - 字段名（必需）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              type
            </code>{" "}
            - 数据类型：'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'date'
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              required
            </code>{" "}
            - 是否必需
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              min
            </code>{" "}
            - 最小值（用于数字）或最小长度（用于字符串或数组）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              max
            </code>{" "}
            - 最大值（用于数字）或最大长度（用于字符串或数组）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              minLength
            </code>{" "}
            - 最小长度（用于字符串或数组）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              maxLength
            </code>{" "}
            - 最大长度（用于字符串或数组）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              pattern
            </code>{" "}
            - 正则表达式模式（字符串或 RegExp）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              enum
            </code>{" "}
            - 枚举值（允许的值列表）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              validate
            </code>{" "}
            - 自定义验证函数，接收值和字段名，返回布尔值或错误消息字符串
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              message
            </code>{" "}
            - 错误消息
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              properties
            </code>{" "}
            - 嵌套验证规则（用于对象类型）
          </li>
        </ul>
      </section>
    </article>
  );
}
