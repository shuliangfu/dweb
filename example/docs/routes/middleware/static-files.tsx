/**
 * 中间件 - staticFiles 文档页面
 */

import CodeBlock from '../../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'staticFiles 中间件 - DWeb 框架文档',
  description: 'staticFiles 中间件使用指南',
};

export default function StaticFilesMiddlewarePage({ params: _params, query: _query, data: _data }: PageProps) {
  const staticFilesCode = `import { staticFiles } from '@dreamer/dweb/middleware';

server.use(staticFiles({
  dir: 'assets',
  prefix: '/assets',
  maxAge: 86400, // 缓存时间（秒）
}));`;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">staticFiles - 静态文件服务</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            staticFiles 中间件用于提供静态文件服务，支持缓存和 MIME 类型识别。
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">基本使用</h2>
            <CodeBlock code={staticFilesCode} language="typescript" />
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">配置选项</h2>
            <ul className="list-disc list-inside space-y-2 my-4">
              <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">dir</code> - 静态文件目录</li>
              <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">prefix</code> - URL 前缀</li>
              <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">maxAge</code> - 缓存时间（秒）</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}

