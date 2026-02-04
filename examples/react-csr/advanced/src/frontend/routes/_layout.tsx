/**
 * 前端布局
 */

import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-linear-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">RA</span>
              </div>
              <span className="font-semibold text-gray-900">
                React Advanced
              </span>
            </a>
            <ul className="flex items-center gap-6 list-none m-0 p-0">
              <li>
                <a
                  href="/"
                  className="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  首页
                </a>
              </li>
              <li>
                <a
                  href="/users"
                  className="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  用户管理
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  className="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  关于
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm">
            © 2024 React Advanced Example. Built with @dreamer/dweb
          </p>
        </div>
      </footer>
    </div>
  );
}
