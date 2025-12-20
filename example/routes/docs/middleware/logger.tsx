/**
 * 中间件 - logger 文档页面
 */

import CodeBlock from '../../../components/CodeBlock.tsx';
import Sidebar from '../../../components/Sidebar.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'logger 中间件 - DWeb 框架文档',
  description: 'logger 中间件使用指南',
};

export default function LoggerMiddlewarePage({ params: _params, query: _query, data: _data }: PageProps) {
  const loggerCode = `import { logger } from '@dreamer/dweb/middleware';

server.use(logger({
  format: 'combined', // 'combined' | 'common' | 'dev' | 'short' | 'tiny'
}));`;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 侧边栏导航 */}
      <Sidebar currentPath="/docs/middleware/logger" />

      {/* 文档内容区域 */}
      <div className="flex-1 overflow-auto">
        <div className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <article className="prose prose-lg max-w-none">
              <h1 className="text-4xl font-bold text-gray-900 mb-8">logger - 请求日志</h1>
              <p className="text-gray-700 leading-relaxed mb-8">
                logger 中间件用于记录 HTTP 请求日志，支持多种日志格式。
              </p>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">基本使用</h2>
                <CodeBlock code={loggerCode} language="typescript" />
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">配置选项</h2>
                <ul className="list-disc list-inside space-y-2 my-4">
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">format</code> - 日志格式：'combined' | 'common' | 'dev' | 'short' | 'tiny'</li>
                </ul>
              </section>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

