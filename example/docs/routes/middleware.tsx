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

  const builtinMiddlewareCode = `import { logger, cors, bodyParser } from '@dreamer/dweb/middleware';

// 在配置中使用
middleware: [
  logger(),
  cors({ origin: '*' }),
  bodyParser(),
],`;

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
              框架提供了多个内置中间件：
            </p>
            <CodeBlock code={builtinMiddlewareCode} language="typescript" />
            <ul className="list-disc list-inside space-y-2 my-4">
              <li className="text-gray-700"><strong>logger</strong> - 请求日志记录</li>
              <li className="text-gray-700"><strong>cors</strong> - 跨域资源共享</li>
              <li className="text-gray-700"><strong>bodyParser</strong> - 请求体解析</li>
              <li className="text-gray-700"><strong>compression</strong> - 响应压缩</li>
              <li className="text-gray-700"><strong>staticFiles</strong> - 静态文件服务</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}
