/**
 * 后台管理布局组件
 * 侧边栏 + 顶部导航 + 内容区
 */

import type { ComponentChildren } from "preact";

interface LayoutProps {
  children: ComponentChildren;
}

/**
 * 后台管理布局
 */
export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* 侧边栏 */}
      <aside className="w-64 bg-gray-900 text-white shrink-0">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold">后台管理</h1>
          <p className="text-xs text-gray-400 mt-1">Preact Advanced</p>
        </div>
        <nav className="p-4">
          <ul className="space-y-2 list-none m-0 p-0">
            <li>
              <a
                href="/"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                仪表盘
              </a>
            </li>
            <li>
              <a
                href="/users"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                用户管理
              </a>
            </li>
            <li>
              <a
                href="/settings"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                系统设置
              </a>
            </li>
            <li>
              <a
                href="/content"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                内容管理
              </a>
            </li>
            <li>
              <a
                href="/logs"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                日志管理
              </a>
            </li>
            <li>
              <a
                href="/permissions"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                权限管理
              </a>
            </li>
          </ul>
        </nav>
        <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-gray-800">
          <a href="/" className="text-sm text-gray-400 hover:text-white">
            ← 返回前台
          </a>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航 */}
        <header className="bg-white shadow-sm h-16 flex items-center px-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索..."
              className="w-64 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white font-medium">
              A
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
