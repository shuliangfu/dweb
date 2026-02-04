/**
 * 布局组件
 * 页头、页脚和内容区域
 */

import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

/**
 * 全局布局组件
 */
export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between h-16">
            <a
              href="/"
              className="text-xl font-bold text-primary-600 hover:text-primary-700"
            >
              React CSR
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
                  href="/about"
                  className="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  关于
                </a>
              </li>
              <li>
                <a
                  href="/user/1"
                  className="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  用户示例
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2024 React CSR Basic Example. Built with @dreamer/dweb
          </p>
        </div>
      </footer>
    </div>
  );
}
