/**
 * 文档布局组件
 * 为所有文档页面提供统一的布局，包括头部标题和左侧菜单
 */

import Sidebar from "../../components/Sidebar.tsx";
import type { LayoutProps } from "@dreamer/dweb";

// export const layout = false; // 禁用布局继承

/**
 * 文档布局组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function DocsLayout({ children, routePath }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 页面标题 */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            文档
          </h1>
          <p className="text-xl text-blue-100 dark:text-blue-200 max-w-3xl mx-auto">
            快速开始使用 DWeb 框架，构建现代化的 Web 应用
          </p>
        </div>
      </div>

      {/* 主要内容区域：左侧菜单 + 文档内容 */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        {/* 侧边栏导航 */}
        <Sidebar currentPath={routePath} />

        {/* 文档内容区域 */}
        <div className="flex-1 overflow-auto">
          {/* 文档内容 */}
          <div className="py-20 bg-white dark:bg-gray-900">
            <div className="px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
