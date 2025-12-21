/**
 * 中间件 - auth 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "auth 中间件 - DWeb 框架文档",
  description: "auth 中间件使用指南",
};

export default function AuthMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const authCode = `import { auth } from '@dreamer/dweb/middleware';

server.use(auth({
  secret: 'your-secret-key',
  algorithms: ['HS256'],
}));`;

  return (
    <article className="prose prose-lg max-w-none">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">auth - JWT 认证</h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        auth 中间件提供 JWT 认证功能，支持令牌生成和验证。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          基本使用
        </h2>
        <CodeBlock code={authCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          配置选项
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">secret</code>{" "}
            - JWT 密钥
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">algorithms</code>
            {" "}
            - 支持的算法列表
          </li>
        </ul>
      </section>
    </article>
  );
}
