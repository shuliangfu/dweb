/**
 * 插件 - i18n 文档页面
 */

import CodeBlock from '../../../components/CodeBlock.tsx';
import Sidebar from '../../../components/Sidebar.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'i18n 插件 - DWeb 框架文档',
  description: 'i18n 插件使用指南',
};

export default function I18nPluginPage({ params: _params, query: _query, data: _data }: PageProps) {
  const i18nCode = `import { i18n } from '@dreamer/dweb/plugins';

plugins: [
  i18n({
    defaultLocale: 'zh-CN',
    locales: ['zh-CN', 'en-US'],
    messages: {
      'zh-CN': { hello: '你好' },
      'en-US': { hello: 'Hello' },
    },
  }),
],`;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 侧边栏导航 */}
      <Sidebar currentPath="/docs/plugins/i18n" />

      {/* 文档内容区域 */}
      <div className="flex-1 overflow-auto">
        <div className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <article className="prose prose-lg max-w-none">
              <h1 className="text-4xl font-bold text-gray-900 mb-8">i18n - 国际化</h1>
              <p className="text-gray-700 leading-relaxed mb-8">
                i18n 插件提供国际化支持，支持多语言切换。
              </p>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">基本使用</h2>
                <CodeBlock code={i18nCode} language="typescript" />
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">配置选项</h2>
                <ul className="list-disc list-inside space-y-2 my-4">
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">defaultLocale</code> - 默认语言</li>
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">locales</code> - 支持的语言列表</li>
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">messages</code> - 翻译消息对象</li>
                </ul>
              </section>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

