/**
 * 中间件文档页面
 */

import CodeBlock from '../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: '中间件 - DWeb 框架文档',
  description: '内置中间件和使用指南',
};

export default function MiddlewarePage({ params: _params, query: _query, data: _data }: PageProps) {
  const middlewareCode = `import type { Middleware } from '@dreamer/dweb/core/middleware';

const myMiddleware: Middleware = async (req, res, next) => {
  // 请求前处理
  console.log('Before:', req.url);
  
  // 调用下一个中间件
  await next();
  
  // 响应后处理
  console.log('After:', res.status);
};`;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">中间件</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            DWeb 框架提供了强大的中间件系统，支持自定义中间件和内置中间件。
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">创建中间件</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              中间件是一个函数，接收请求、响应和下一个中间件函数作为参数：
            </p>
            <CodeBlock code={middlewareCode} language="typescript" />
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">内置中间件</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              框架提供了多个内置中间件，用于处理常见的 HTTP 请求和响应任务。每个中间件都有独立的文档页面：
            </p>

            <ul className="list-disc list-inside space-y-2 my-4">
              <li className="text-gray-700"><a href="/middleware/logger" className="text-indigo-600 hover:text-indigo-700 hover:underline">logger</a> - 请求日志记录</li>
              <li className="text-gray-700"><a href="/middleware/cors" className="text-indigo-600 hover:text-indigo-700 hover:underline">cors</a> - 跨域资源共享</li>
              <li className="text-gray-700"><a href="/middleware/body-parser" className="text-indigo-600 hover:text-indigo-700 hover:underline">bodyParser</a> - 请求体解析</li>
              <li className="text-gray-700"><a href="/middleware/compression" className="text-indigo-600 hover:text-indigo-700 hover:underline">compression</a> - 响应压缩</li>
              <li className="text-gray-700"><a href="/middleware/static-files" className="text-indigo-600 hover:text-indigo-700 hover:underline">staticFiles</a> - 静态文件服务</li>
              <li className="text-gray-700"><a href="/middleware/security" className="text-indigo-600 hover:text-indigo-700 hover:underline">security</a> - 安全头</li>
              <li className="text-gray-700"><a href="/middleware/rate-limit" className="text-indigo-600 hover:text-indigo-700 hover:underline">rateLimit</a> - 速率限制</li>
              <li className="text-gray-700"><a href="/middleware/auth" className="text-indigo-600 hover:text-indigo-700 hover:underline">auth</a> - JWT 认证</li>
              <li className="text-gray-700"><a href="/middleware/health" className="text-indigo-600 hover:text-indigo-700 hover:underline">health</a> - 健康检查</li>
              <li className="text-gray-700"><a href="/middleware/request-id" className="text-indigo-600 hover:text-indigo-700 hover:underline">requestId</a> - 请求 ID</li>
              <li className="text-gray-700"><a href="/middleware/request-validator" className="text-indigo-600 hover:text-indigo-700 hover:underline">requestValidator</a> - 请求验证</li>
              <li className="text-gray-700"><a href="/middleware/ip-filter" className="text-indigo-600 hover:text-indigo-700 hover:underline">ipFilter</a> - IP 过滤</li>
              <li className="text-gray-700"><a href="/middleware/error-handler" className="text-indigo-600 hover:text-indigo-700 hover:underline">errorHandler</a> - 错误处理</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}
