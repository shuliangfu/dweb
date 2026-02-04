/**
 * 布局组件
 * 使用 Tailwind CSS v4 样式
 */

import type { ComponentChildren } from "preact";

interface LayoutProps {
  children: ComponentChildren;
}

/**
 * 布局组件
 */
export default function Layout({ children }: LayoutProps) {
  return (
    <div class="min-h-screen flex flex-col">
      {/* 导航栏 */}
      <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav class="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="/" class="flex items-center gap-2">
              <div class="w-8 h-8 bg-linear-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-sm">PA</span>
              </div>
              <span class="font-semibold text-gray-900">Preact Advanced</span>
            </a>

            {/* 导航链接 */}
            <ul class="flex items-center gap-6 list-none m-0 p-0">
              <li>
                <a
                  href="/"
                  class="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  首页
                </a>
              </li>
              <li>
                <a
                  href="/users"
                  class="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  用户管理
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  class="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  关于
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* 主内容 */}
      <main class="flex-1">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* 页脚 */}
      <footer class="bg-gray-900 text-gray-400">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="flex flex-col md:flex-row justify-between items-center gap-4">
            <p class="text-sm">
              &copy; 2024 Preact Advanced Example. Built with @dreamer/dweb
            </p>
            <div class="flex items-center gap-4">
              <a
                href="/api/health"
                class="text-sm hover:text-white transition-colors"
              >
                API 状态
              </a>
              <a
                href="https://github.com"
                class="text-sm hover:text-white transition-colors"
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
