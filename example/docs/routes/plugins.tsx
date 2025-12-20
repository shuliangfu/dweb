/**
 * 插件文档页面
 */

import CodeBlock from '../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: '插件 - DWeb 框架文档',
  description: '插件系统和使用指南',
};

export default function PluginsPage({ params: _params, query: _query, data: _data }: PageProps) {
  const pluginCode = `import type { Plugin } from '@dreamer/dweb/core/plugin';

const myPlugin: Plugin = {
  name: 'my-plugin',
  setup(app) {
    // 插件初始化
    console.log('Plugin initialized');
  },
};`;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">插件</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            DWeb 框架提供了灵活的插件系统，可以扩展框架功能。
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">创建插件</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              插件是一个对象，包含名称和初始化函数：
            </p>
            <CodeBlock code={pluginCode} language="typescript" />
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">内置插件</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              框架提供了多个内置插件，用于扩展应用功能。每个插件都有独立的文档页面：
            </p>

            <ul className="list-disc list-inside space-y-2 my-4">
              <li className="text-gray-700"><a href="/plugins/tailwind" className="text-indigo-600 hover:text-indigo-700 hover:underline">tailwind</a> - Tailwind CSS 支持</li>
              <li className="text-gray-700"><a href="/plugins/seo" className="text-indigo-600 hover:text-indigo-700 hover:underline">seo</a> - SEO 优化</li>
              <li className="text-gray-700"><a href="/plugins/sitemap" className="text-indigo-600 hover:text-indigo-700 hover:underline">sitemap</a> - 网站地图</li>
              <li className="text-gray-700"><a href="/plugins/pwa" className="text-indigo-600 hover:text-indigo-700 hover:underline">pwa</a> - 渐进式 Web 应用</li>
              <li className="text-gray-700"><a href="/plugins/cache" className="text-indigo-600 hover:text-indigo-700 hover:underline">cache</a> - 缓存插件</li>
              <li className="text-gray-700"><a href="/plugins/email" className="text-indigo-600 hover:text-indigo-700 hover:underline">email</a> - 邮件插件</li>
              <li className="text-gray-700"><a href="/plugins/file-upload" className="text-indigo-600 hover:text-indigo-700 hover:underline">fileUpload</a> - 文件上传</li>
              <li className="text-gray-700"><a href="/plugins/form-validator" className="text-indigo-600 hover:text-indigo-700 hover:underline">formValidator</a> - 表单验证</li>
              <li className="text-gray-700"><a href="/plugins/i18n" className="text-indigo-600 hover:text-indigo-700 hover:underline">i18n</a> - 国际化</li>
              <li className="text-gray-700"><a href="/plugins/image-optimizer" className="text-indigo-600 hover:text-indigo-700 hover:underline">imageOptimizer</a> - 图片优化</li>
              <li className="text-gray-700"><a href="/plugins/performance" className="text-indigo-600 hover:text-indigo-700 hover:underline">performance</a> - 性能监控</li>
              <li className="text-gray-700"><a href="/plugins/theme" className="text-indigo-600 hover:text-indigo-700 hover:underline">theme</a> - 主题插件</li>
              <li className="text-gray-700"><a href="/plugins/rss" className="text-indigo-600 hover:text-indigo-700 hover:underline">rss</a> - RSS 插件</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}
