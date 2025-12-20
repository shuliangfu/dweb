/**
 * 根布局组件
 * 提供文档网站的整体布局结构，包含侧边栏导航
 */

import { h } from 'preact';
import Sidebar from '../components/Sidebar.tsx';

/**
 * 根布局组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default async function RootLayout({ children }: { children: unknown }) {
  // 获取当前路径（在客户端运行时）
  let currentPath = '/';
  if (typeof globalThis !== 'undefined' && globalThis.location) {
    currentPath = globalThis.location.pathname;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <a href="/" className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                DWeb 文档
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/dreamer/dweb"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://jsr.io/@dreamer/dweb"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                JSR
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容区域（侧边栏 + 内容） */}
      <div className="flex-1 flex">
        {/* 侧边栏 */}
        <Sidebar currentPath={currentPath} />
        
        {/* 内容区域 */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
