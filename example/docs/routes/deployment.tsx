/**
 * 配置与部署文档页面
 */

import CodeBlock from '../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: '配置与部署 - DWeb 框架文档',
  description: 'DWeb 框架的配置和部署指南',
};

export default function DeploymentPage({ params: _params, query: _query, data: _data }: PageProps) {
  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">配置与部署</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            DWeb 框架提供了灵活的配置选项和多种部署方式。
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">配置和部署文档</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              以下文档帮助你配置和部署 DWeb 应用：
            </p>

            <ul className="list-disc list-inside space-y-2 my-4">
              <li className="text-gray-700"><a href="/deployment/configuration" className="text-indigo-600 hover:text-indigo-700 hover:underline">配置文档</a> - 详细的配置选项说明</li>
              <li className="text-gray-700"><a href="/deployment/docker" className="text-indigo-600 hover:text-indigo-700 hover:underline">Docker 部署</a> - 使用 Docker 部署应用</li>
              <li className="text-gray-700"><a href="/deployment/development" className="text-indigo-600 hover:text-indigo-700 hover:underline">开发指南</a> - 开发流程和最佳实践</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}

