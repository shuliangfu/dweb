/**
 * 插件 - email 文档页面
 */

import CodeBlock from '../../../components/CodeBlock.tsx';
import Sidebar from '../../../components/Sidebar.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'email 插件 - DWeb 框架文档',
  description: 'email 插件使用指南',
};

export default function EmailPluginPage({ params: _params, query: _query, data: _data }: PageProps) {
  const emailCode = `import { email } from '@dreamer/dweb/plugins';

plugins: [
  email({
    smtp: {
      host: 'smtp.example.com',
      port: 587,
      user: 'user@example.com',
      password: 'password',
    },
  }),
],`;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 侧边栏导航 */}
      <Sidebar currentPath="/docs/plugins/email" />

      {/* 文档内容区域 */}
      <div className="flex-1 overflow-auto">
        <div className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <article className="prose prose-lg max-w-none">
              <h1 className="text-4xl font-bold text-gray-900 mb-8">email - 邮件插件</h1>
              <p className="text-gray-700 leading-relaxed mb-8">
                email 插件用于发送邮件，支持 SMTP 和模板渲染。
              </p>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">基本使用</h2>
                <CodeBlock code={emailCode} language="typescript" />
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">配置选项</h2>
                <ul className="list-disc list-inside space-y-2 my-4">
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">smtp</code> - SMTP 服务器配置</li>
                </ul>
              </section>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

