/**
 * 布局组件
 * 使用 UnoCSS 样式
 */

import type { VNode } from "@dreamer/view";

interface LayoutProps {
  children?: VNode | VNode[];
}

/**
 * 布局组件
 */
export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 导航栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PA</span>
              </div>
              <span className="font-semibold text-gray-900">
                View Advanced UnoCSS
              </span>
            </a>

            {/* 导航链接 */}
            <ul className="flex items-center gap-6 list-none m-0 p-0">
              <li>
                <a
                  href="/"
                  className="text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  首页
                </a>
              </li>
              <li>
                <a
                  href="/users"
                  className="text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  用户管理
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  className="text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  关于
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* 页脚 */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              &copy; 2024 View Advanced Example. Built with @dreamer/dweb +
              UnoCSS
            </p>
            <div className="flex items-center gap-4">
              <a
                href="/api/health"
                className="text-sm hover:text-white transition-colors"
              >
                API 状态
              </a>
              <a
                href="https://github.com"
                className="text-sm hover:text-white transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
