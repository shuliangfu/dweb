/**
 * 插件 - rss 文档页面
 */

import CodeBlock from '../../../components/CodeBlock.tsx';
import Sidebar from '../../../components/Sidebar.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'rss 插件 - DWeb 框架文档',
  description: 'rss 插件使用指南',
};

export default function RssPluginPage({ params: _params, query: _query, data: _data }: PageProps) {
  const rssCode = `import { rss } from '@dreamer/dweb/plugins';

plugins: [
  rss({
    title: 'My Blog',
    description: 'My awesome blog',
    feedUrl: '/feed.xml',
  }),
],`;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 侧边栏导航 */}
      <Sidebar currentPath="/docs/plugins/rss" />

      {/* 文档内容区域 */}
      <div className="flex-1 overflow-auto">
        <div className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <article className="prose prose-lg max-w-none">
              <h1 className="text-4xl font-bold text-gray-900 mb-8">rss - RSS 插件</h1>
              <p className="text-gray-700 leading-relaxed mb-8">
                rss 插件用于生成 RSS Feed，支持内容订阅。
              </p>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">基本使用</h2>
                <CodeBlock code={rssCode} language="typescript" />
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">配置选项</h2>
                <ul className="list-disc list-inside space-y-2 my-4">
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">title</code> - RSS Feed 标题</li>
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">description</code> - RSS Feed 描述</li>
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">feedUrl</code> - RSS Feed URL</li>
                </ul>
              </section>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

