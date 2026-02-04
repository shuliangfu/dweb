/**
 * 后台管理布局
 */

import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-900 text-white shrink-0">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold">后台管理</h1>
          <p className="text-xs text-gray-400 mt-1">React Advanced</p>
        </div>
        <nav className="p-4">
          <ul className="space-y-2 list-none m-0 p-0">
            <li>
              <a
                href="/"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                仪表盘
              </a>
            </li>
            <li>
              <a
                href="/users"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                用户管理
              </a>
            </li>
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
