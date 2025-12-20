/**
 * 插件 - seo 文档页面
 */

import CodeBlock from '../../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'seo 插件 - DWeb 框架文档',
  description: 'seo 插件使用指南',
};

export default function SeoPluginPage({ params: _params, query: _query, data: _data }: PageProps) {
  const seoCode = `import { seo } from '@dreamer/dweb/plugins';

plugins: [
  seo({
    title: 'My App',
    description: 'My awesome app',
    keywords: ['web', 'framework'],
    openGraph: {
      type: 'website',
      image: 'https://example.com/og-image.jpg',
    },
    twitter: {
      card: 'summary_large_image',
    },
  }),
],`;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">seo - SEO 优化</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            seo 插件自动生成 SEO 元数据，包括 Open Graph 和 Twitter Card。
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">基本使用</h2>
            <CodeBlock code={seoCode} language="typescript" />
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">配置选项</h2>
            <ul className="list-disc list-inside space-y-2 my-4">
              <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">title</code> - 页面标题</li>
              <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">description</code> - 页面描述</li>
              <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">keywords</code> - 关键词数组</li>
              <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">openGraph</code> - Open Graph 配置</li>
              <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">twitter</code> - Twitter Card 配置</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}

