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

  const builtinPluginsCode = `import { tailwind, seo } from '@dreamer/dweb/plugins';

// 在配置中使用
plugins: [
  tailwind({
    version: 'v4',
    cssPath: 'assets/style.css',
  }),
  seo({
    title: 'My App',
    description: 'My awesome app',
  }),
],`;

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
              框架提供了多个内置插件：
            </p>
            <CodeBlock code={builtinPluginsCode} language="typescript" />
            <ul className="list-disc list-inside space-y-2 my-4">
              <li className="text-gray-700"><strong>tailwind</strong> - Tailwind CSS 支持</li>
              <li className="text-gray-700"><strong>seo</strong> - SEO 优化</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}
