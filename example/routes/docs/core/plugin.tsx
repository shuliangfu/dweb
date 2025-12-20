/**
 * 核心模块 - 插件系统文档页面
 */

import CodeBlock from '../../../components/CodeBlock.tsx';
import Sidebar from '../../../components/Sidebar.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: '插件系统 - DWeb 框架文档',
  description: 'DWeb 框架的插件系统介绍',
};

export default function CorePluginPage({ params: _params, query: _query, data: _data }: PageProps) {
  const pluginCode = `import type { Plugin } from '@dreamer/dweb/core/plugin';

const myPlugin: Plugin = {
  name: 'my-plugin',
  setup(app) {
    // 插件初始化
    console.log('Plugin initialized');
  },
};`;

  const usePluginCode = `import { createApp } from '@dreamer/dweb';
import { tailwind, seo } from '@dreamer/dweb/plugins';

const app = createApp();

// 注册插件
app.plugin(tailwind({ version: 'v4' }));
app.plugin(seo({ title: 'My App' }));

export default app;`;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 侧边栏导航 */}
      <Sidebar currentPath="/docs/core/plugin" />

      {/* 文档内容区域 */}
      <div className="flex-1 overflow-auto">
        <div className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <article className="prose prose-lg max-w-none">
              <h1 className="text-4xl font-bold text-gray-900 mb-8">插件系统</h1>
              <p className="text-gray-700 leading-relaxed mb-8">
                DWeb 框架提供了灵活的插件系统，允许你扩展框架功能。
              </p>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">什么是插件</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  插件是一个对象，包含名称和初始化函数。插件可以：
                </p>
                <ul className="list-disc list-inside space-y-2 my-4">
                  <li className="text-gray-700">扩展框架功能</li>
                  <li className="text-gray-700">添加全局中间件</li>
                  <li className="text-gray-700">修改应用配置</li>
                  <li className="text-gray-700">注册生命周期钩子</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">创建插件</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  创建一个自定义插件：
                </p>
                <CodeBlock code={pluginCode} language="typescript" />
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">使用插件</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  在应用中使用插件：
                </p>
                <CodeBlock code={usePluginCode} language="typescript" />
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">插件生命周期</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  插件支持多个生命周期钩子：
                </p>
                <ul className="list-disc list-inside space-y-2 my-4">
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">onInit</code> - 应用初始化时执行</li>
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">onRequest</code> - 每个请求前执行</li>
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">onResponse</code> - 每个响应后执行</li>
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">onError</code> - 发生错误时执行</li>
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">onBuild</code> - 构建时执行</li>
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">onStart</code> - 服务器启动时执行</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">内置插件</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  框架提供了多个内置插件，详见 <a href="/docs/plugins" className="text-indigo-600 hover:text-indigo-700 hover:underline">插件文档</a>。
                </p>
              </section>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

