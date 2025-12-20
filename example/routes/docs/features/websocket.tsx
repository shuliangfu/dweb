/**
 * WebSocket 文档页面
 */

import CodeBlock from '../../../components/CodeBlock.tsx';
import Sidebar from '../../../components/Sidebar.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'WebSocket - DWeb 框架文档',
  description: 'WebSocket 服务器和客户端',
};

export default function WebSocketPage({ params: _params, query: _query, data: _data }: PageProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 侧边栏导航 */}
      <Sidebar currentPath="/docs/features/websocket" />

      {/* 文档内容区域 */}
      <div className="flex-1 overflow-auto">
        <div className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <article className="prose prose-lg max-w-none">
              <h1 className="text-4xl font-bold text-gray-900 mb-8">WebSocket</h1>
              <p className="text-gray-700 leading-relaxed mb-8">
                DWeb 框架提供了 WebSocket 服务器和客户端支持，可以实现实时通信功能。
              </p>
              <p className="text-gray-700 leading-relaxed mb-8">
                详细文档正在完善中...
              </p>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

