/**
 * 文档布局组件
 * 为所有文档页面提供统一的布局，包括头部标题和左侧菜单
 */

import Sidebar from "../../components/Sidebar.tsx";
import type { LayoutProps } from "@dreamer/dweb";

// export const layout = false; // 禁用布局继承

export const metadata = {
  title: "文档",
  description: "快速开始使用 DWeb 框架，构建现代化的 Web 应用",
  keywords: "DWeb, 文档, 快速开始, 教程, 使用指南, Deno, Preact, Web 框架",
  author: "DWeb",
};

export const load = async () => {
  return {
    title: "文档",
    description: "快速开始使用 DWeb 框架，构建现代化的 Web 应用",
    keywords: "DWeb, 文档, 快速开始, 教程, 使用指南, Deno, Preact, Web 框架",
    author: "DWeb",
  };
};

/**
 * 文档布局组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function DocsLayout({ children, routePath }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 页面标题 */}
      <div className="relative overflow-hidden bg-linear-to-r bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 py-24">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2">
          </div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2">
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
            文档中心
          </h1>
          <p className="text-xl text-blue-100 dark:text-blue-200 max-w-3xl mx-auto leading-relaxed">
            探索 DWeb 框架的无限可能，构建下一代高性能 Web 应用
          </p>
        </div>
      </div>

      {/* 主要内容区域：左侧菜单 + 文档内容 */}
      <div className="flex flex-1 max-w-8xl mx-auto w-full px-4 sm:px-6 lg:px-8 gap-8">
        {/* 侧边栏导航 */}
        <Sidebar currentPath={routePath} />

        {/* 文档内容区域 */}
        <div className="flex-1 min-w-0 py-10 lg:py-12">
          {/* 文档内容 */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-8 lg:p-12 min-h-[calc(100vh-20rem)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
