/**
 * 中间件 - auth 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "auth 中间件 - DWeb 框架文档",
  description: "auth 中间件使用指南",
};

export default function AuthMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const authCode = `import { auth } from '@dreamer/dweb';

server.use(auth({
  secret: 'your-secret-key',
  algorithms: ['HS256'],
}));`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        auth - JWT 认证
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        auth 中间件提供 JWT 认证功能，支持令牌生成和验证。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={authCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          必需参数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              secret
            </code>{" "}
            - JWT 密钥（必需）
          </li>
        </ul>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          可选参数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              headerName
            </code>{" "}
            - Token 在请求头中的名称（默认 'Authorization'）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              tokenPrefix
            </code>{" "}
            - Token 前缀（默认 'Bearer '）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              cookieName
            </code>{" "}
            - Token 在 Cookie 中的名称（可选）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              skip
            </code>{" "}
            - 跳过认证的路径数组（支持 glob 模式）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              verifyToken
            </code>{" "}
            - 验证 Token 的函数（可选，默认使用内置验证）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              onError
            </code>{" "}
            - 自定义错误处理函数
          </li>
        </ul>
      </section>
    </article>
  );
}
