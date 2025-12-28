/**
 * 中间件 - cors 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "cors 中间件 - DWeb 框架文档",
  description: "cors 中间件使用指南",
};

export default function CorsMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const corsCode = `import { cors } from '@dreamer/dweb/middleware';

server.use(cors({
  origin: '*', // 或指定域名 ['https://example.com']
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        cors - 跨域支持
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        cors 中间件用于处理跨域资源共享（CORS）请求。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={corsCode} language="typescript" />
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
              origin
            </code>{" "}
            - 允许的源，可以是字符串、数组或函数（默认 '*'）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              methods
            </code>{" "}
            - 允许的 HTTP 方法（默认 ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              allowedHeaders
            </code>{" "}
            - 允许的请求头（默认 ['Content-Type', 'Authorization']）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              exposedHeaders
            </code>{" "}
            - 暴露的响应头（默认 []）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              credentials
            </code>{" "}
            - 是否允许发送凭证（默认 false）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              maxAge
            </code>{" "}
            - 预检请求的缓存时间（秒，默认 86400）
          </li>
        </ul>
      </section>
    </article>
  );
}
