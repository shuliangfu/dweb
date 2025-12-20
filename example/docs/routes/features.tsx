/**
 * 功能模块文档页面
 */

import CodeBlock from '../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: '功能模块 - DWeb 框架文档',
  description: 'DWeb 框架的功能模块介绍',
};

export default function FeaturesPage({ params: _params, query: _query, data: _data }: PageProps) {
  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">功能模块</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            DWeb 框架提供了丰富的功能模块，用于扩展应用能力。
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">内置功能模块</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              框架提供了多个功能模块，每个模块都有独立的文档页面：
            </p>

            <ul className="list-disc list-inside space-y-2 my-4">
              <li className="text-gray-700"><a href="/features/database" className="text-indigo-600 hover:text-indigo-700 hover:underline">数据库</a> - 数据库适配器和 ORM/ODM 支持</li>
              <li className="text-gray-700"><a href="/features/graphql" className="text-indigo-600 hover:text-indigo-700 hover:underline">GraphQL</a> - GraphQL 服务器和查询处理</li>
              <li className="text-gray-700"><a href="/features/websocket" className="text-indigo-600 hover:text-indigo-700 hover:underline">WebSocket</a> - WebSocket 服务器和客户端</li>
              <li className="text-gray-700"><a href="/features/session" className="text-indigo-600 hover:text-indigo-700 hover:underline">Session</a> - 会话管理，支持多种存储方式</li>
              <li className="text-gray-700"><a href="/features/cookie" className="text-indigo-600 hover:text-indigo-700 hover:underline">Cookie</a> - Cookie 管理，支持签名和验证</li>
              <li className="text-gray-700"><a href="/features/logger" className="text-indigo-600 hover:text-indigo-700 hover:underline">Logger</a> - 日志系统，支持多种输出格式</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}

