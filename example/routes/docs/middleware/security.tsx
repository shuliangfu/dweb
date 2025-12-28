/**
 * 中间件 - security 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "security 中间件 - DWeb 框架文档",
  description: "security 中间件使用指南",
};

export default function SecurityMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const securityCode = `import { security } from '@dreamer/dweb/middleware';

server.use(security({
  contentSecurityPolicy: true,
  xFrameOptions: 'DENY',
  xContentTypeOptions: true,
}));`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        security - 安全头
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        security 中间件用于设置 HTTP 安全响应头，提高应用安全性。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={securityCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          安全头说明
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              Content-Security-Policy
            </code>{" "}
            - 内容安全策略
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              X-Frame-Options
            </code>{" "}
            - 防止点击劫持
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              X-Content-Type-Options
            </code>{" "}
            - 防止 MIME 类型嗅探
          </li>
          <li className="text-gray-700 dark:text-gray-300">
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              X-XSS-Protection
            </code>{" "}
            - XSS 保护
          </li>
        </ul>
      </section>
    </article>
  );
}
