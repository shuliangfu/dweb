/**
 * 中间件 - errorHandler 文档页面
 */

import CodeBlock from '../../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'errorHandler 中间件 - DWeb 框架文档',
  description: 'errorHandler 中间件使用指南',
};

export default function ErrorHandlerMiddlewarePage({ params: _params, query: _query, data: _data }: PageProps) {
  const errorHandlerCode = `import { errorHandler } from '@dreamer/dweb/middleware';

server.use(errorHandler({
  format: 'json', // 'json' | 'html' | 'text'
  includeStack: process.env.NODE_ENV === 'development',
}));`;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">errorHandler - 错误处理</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            errorHandler 中间件统一处理应用错误，提供友好的错误响应。
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">基本使用</h2>
            <CodeBlock code={errorHandlerCode} language="typescript" />
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">配置选项</h2>
            <ul className="list-disc list-inside space-y-2 my-4">
              <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">format</code> - 错误响应格式：'json' | 'html' | 'text'</li>
              <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">includeStack</code> - 是否包含堆栈跟踪（仅开发环境）</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}

