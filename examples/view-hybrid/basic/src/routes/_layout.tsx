/**
 * 布局组件
 * 页头、页脚和内容区域（使用 Tailwind CSS v4）
 */

import type { VNode } from "@dreamer/view";

interface LayoutProps {
  children?: VNode | VNode[];
  data?: LayoutLoadData;
}

/** e2e 用：layout load 注入的标记，断言 data-value 为 LAYOUT_LOAD_MARKER */
export interface LayoutLoadData {
  layoutLoadMarker: string;
}

export function load(_ctx: LoadContext): Promise<LayoutLoadData> {
  // 调试用：如需查看环境变量，使用 getEnvAll() 或 getEnv("KEY_NAME")
  // console.log(getEnvAll());

  return Promise.resolve({
    layoutLoadMarker: "layout-load-ok",
  });
}

/**
 * 全局布局组件
 */
export default function Layout({ children, data }: LayoutProps) {
  return (
    <div class="min-h-screen flex flex-col">
      {/* e2e: 验证 layout load 数据注入 */}
      <span
        data-testid="layout-load"
        data-value={data?.layoutLoadMarker ?? ""}
        aria-hidden="true"
      />
      {/* 页头 */}
      <header class="bg-white shadow-sm sticky top-0 z-50">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav class="flex items-center justify-between h-16">
            <a
              href="/"
              class="text-xl font-bold text-primary-600 hover:text-primary-700"
            >
              View Hybrid
            </a>
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
                  href="/about"
                  class="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  关于
                </a>
              </li>
              <li>
                <a
                  href="/gallery"
                  class="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  相册
                </a>
              </li>
              <li>
                <a
                  href="/charts"
                  class="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  图表
                </a>
              </li>
              <li>
                <a
                  href="/user/1"
                  class="text-gray-600 hover:text-primary-600 transition-colors"
                >
                  用户示例
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* 主内容 */}
      <main class="flex-1">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* 页脚 */}
      <footer class="bg-gray-800 text-white py-8">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p class="text-gray-400">
            © 2024 View Hybrid Basic Example. Built with @dreamer/dweb
          </p>
        </div>
      </footer>
    </div>
  );
}
