/**
 * 中间件 - health 文档页面
 */

import CodeBlock from '../../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'health 中间件 - DWeb 框架文档',
  description: 'health 中间件使用指南',
};

export default function HealthMiddlewarePage({ params: _params, query: _query, data: _data }: PageProps) {
  const healthCode = `import { health } from '@dreamer/dweb/middleware';

server.use(health({
  path: '/health',
  checks: {
    database: async () => {
      // 检查数据库连接
      return { status: 'ok' };
    },
  },
}));`;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">health - 健康检查</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            health 中间件提供应用健康检查端点，用于监控应用状态。
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">基本使用</h2>
            <CodeBlock code={healthCode} language="typescript" />
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">配置选项</h2>
            <ul className="list-disc list-inside space-y-2 my-4">
              <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">path</code> - 健康检查端点路径</li>
              <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">checks</code> - 健康检查函数对象</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}

