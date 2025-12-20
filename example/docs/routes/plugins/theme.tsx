/**
 * 插件 - theme 文档页面
 */

import CodeBlock from '../../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'theme 插件 - DWeb 框架文档',
  description: 'theme 插件使用指南',
};

export default function ThemePluginPage({ params: _params, query: _query, data: _data }: PageProps) {
  const themeCode = `import { theme } from '@dreamer/dweb/plugins';

plugins: [
  theme({
    themes: {
      light: { colors: { primary: '#000' } },
      dark: { colors: { primary: '#fff' } },
    },
    defaultTheme: 'light',
  }),
],`;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">theme - 主题插件</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            theme 插件支持主题切换，包括亮色和暗色主题。
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">基本使用</h2>
            <CodeBlock code={themeCode} language="typescript" />
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">配置选项</h2>
            <ul className="list-disc list-inside space-y-2 my-4">
              <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">themes</code> - 主题配置对象</li>
              <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">defaultTheme</code> - 默认主题</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}

