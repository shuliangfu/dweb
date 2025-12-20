/**
 * 中间件 - compression 文档页面
 */

import CodeBlock from '../../../components/CodeBlock.tsx';
import Sidebar from '../../../components/Sidebar.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'compression 中间件 - DWeb 框架文档',
  description: 'compression 中间件使用指南',
};

export default function CompressionMiddlewarePage({ params: _params, query: _query, data: _data }: PageProps) {
  const compressionCode = `import { compression } from '@dreamer/dweb/middleware';

server.use(compression({
  level: 6, // 压缩级别 0-9
  threshold: 1024, // 最小压缩大小（字节）
}));`;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 侧边栏导航 */}
      <Sidebar currentPath="/docs/middleware/compression" />

      {/* 文档内容区域 */}
      <div className="flex-1 overflow-auto">
        <div className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <article className="prose prose-lg max-w-none">
              <h1 className="text-4xl font-bold text-gray-900 mb-8">compression - 响应压缩</h1>
              <p className="text-gray-700 leading-relaxed mb-8">
                compression 中间件用于压缩 HTTP 响应，减少传输数据量，提高性能。
              </p>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">基本使用</h2>
                <CodeBlock code={compressionCode} language="typescript" />
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">配置选项</h2>
                <ul className="list-disc list-inside space-y-2 my-4">
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">level</code> - 压缩级别（0-9），数字越大压缩率越高但速度越慢</li>
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">threshold</code> - 最小压缩大小（字节），小于此大小的响应不会被压缩</li>
                </ul>
              </section>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

