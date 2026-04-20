/**
 * BGB Admin 嵌套布局
 * 仅对 /admin 下的页面生效，与根 _layout 形成嵌套（根 layout -> 本 layout -> 页面）
 */

import type { VNode } from "@dreamer/view";

interface LayoutProps {
  children?: VNode | VNode[];
}

export const inheritLayout = false;

export default function BgbAdminLayout({ children }: LayoutProps) {
  return (
    <div class="min-h-screen flex flex-col">
      <main class="flex-1">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      <footer class="bg-gray-800 text-white py-8">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p class="text-gray-400">
            © 2024 使用 @dreamer/dweb 构建
          </p>
        </div>
      </footer>
    </div>
  );
}
