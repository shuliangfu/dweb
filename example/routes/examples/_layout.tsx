/**
 * 示例布局组件
 * 为所有示例页面提供统一的布局，包括头部标题和左侧菜单
 */

import ExamplesSidebar from "@components/ExamplesSidebar.tsx";
import type { LayoutProps } from "@dreamer/dweb";

export const metadata = {
  title: "示例",
  description:
    "DWeb 框架的交互示例，包括点击事件、接口请求、表单提交、状态管理等完整示例代码",
  keywords: "DWeb, 示例, 交互示例, API 路由, 表单提交, Preact Hooks, 状态管理",
  author: "DWeb",
};

export const load = () => {
  return {
    title: "示例",
    description:
      "DWeb 框架的交互示例，包括点击事件、接口请求、表单提交、状态管理等完整示例代码",
    keywords:
      "DWeb, 示例, 交互示例, API 路由, 表单提交, Preact Hooks, 状态管理",
    author: "DWeb",
  };
};

/**
 * 获取页面颜色主题
 * @param routePath 当前路由路径
 * @returns 颜色主题配置
 */
function getPageTheme(routePath: string) {
  const themes: Record<
    string,
    {
      from: string;
      to: string;
      darkFrom: string;
      darkTo: string;
      text: string;
      darkText: string;
      accent: string;
    }
  > = {
    "/examples": {
      from: "from-green-600",
      to: "to-emerald-600",
      darkFrom: "dark:from-green-900",
      darkTo: "dark:to-emerald-900",
      text: "text-green-100",
      darkText: "dark:text-green-200",
      accent: "bg-teal-500/20",
    },
    "/examples/click-events": {
      from: "from-blue-600",
      to: "to-indigo-600",
      darkFrom: "dark:from-blue-900",
      darkTo: "dark:to-indigo-900",
      text: "text-blue-100",
      darkText: "dark:text-blue-200",
      accent: "bg-purple-500/20",
    },
    "/examples/api-requests": {
      from: "from-purple-600",
      to: "to-pink-600",
      darkFrom: "dark:from-purple-900",
      darkTo: "dark:to-pink-900",
      text: "text-purple-100",
      darkText: "dark:text-purple-200",
      accent: "bg-pink-500/20",
    },
    "/examples/form-submit": {
      from: "from-orange-600",
      to: "to-red-600",
      darkFrom: "dark:from-orange-900",
      darkTo: "dark:to-red-900",
      text: "text-orange-100",
      darkText: "dark:text-orange-200",
      accent: "bg-red-500/20",
    },
    "/examples/store": {
      from: "from-indigo-600",
      to: "to-blue-600",
      darkFrom: "dark:from-indigo-900",
      darkTo: "dark:to-blue-900",
      text: "text-indigo-100",
      darkText: "dark:text-indigo-200",
      accent: "bg-blue-500/20",
    },
    "/examples/image-upload": {
      from: "from-teal-600",
      to: "to-cyan-600",
      darkFrom: "dark:from-teal-900",
      darkTo: "dark:to-cyan-900",
      text: "text-teal-100",
      darkText: "dark:text-teal-200",
      accent: "bg-cyan-500/20",
    },
  };

  // 精确匹配或使用默认主题
  return themes[routePath] || themes["/examples"];
}

/**
 * 获取页面标题和描述
 * @param routePath 当前路由路径
 * @returns 标题和描述
 */
function getPageTitle(routePath: string) {
  const titles: Record<string, { title: string; description: string }> = {
    "/examples": {
      title: "交互示例",
      description:
        "探索 DWeb 框架的各种交互功能，学习如何构建现代化的 Web 应用",
    },
    "/examples/click-events": {
      title: "点击事件示例",
      description: "使用 Preact 的 useState 和事件处理函数实现交互",
    },
    "/examples/api-requests": {
      title: "接口请求示例",
      description: "演示如何通过 API 路由获取、创建、更新和删除数据",
    },
    "/examples/form-submit": {
      title: "表单提交示例",
      description: "使用表单提交数据，通过 POST 请求创建新记录",
    },
    "/examples/store": {
      title: "状态管理示例",
      description: "使用 Store 插件进行跨组件的响应式状态管理",
    },
    "/examples/image-upload": {
      title: "图片上传示例",
      description:
        "演示如何上传图片文件到服务器，支持多文件选择、图片预览等功能",
    },
  };

  return titles[routePath] || titles["/examples"];
}

/**
 * 示例布局组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function ExamplesLayout({ children, routePath }: LayoutProps) {
  const theme = getPageTheme(routePath);
  const { title, description } = getPageTitle(routePath);

  return (
    <div className="space-y-0">
      {/* 页面标题 */}
      <div className="relative overflow-hidden bg-linear-to-r bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 py-24">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2">
          </div>
          <div
            className={`absolute bottom-0 left-0 w-64 h-64 ${theme.accent} rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2`}
          >
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
            {title}
          </h1>
          <p
            className={`text-xl ${theme.text} ${theme.darkText} max-w-3xl mx-auto leading-relaxed`}
          >
            {description}
          </p>
        </div>
      </div>

      {/* 主要内容区域：左侧菜单 + 示例内容 */}
      <div className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex">
            {/* 侧边栏导航 */}
            <ExamplesSidebar currentPath={routePath} />

            {/* 示例内容区域 */}
            <div className="flex-1 min-w-0 pl-8">
              <div className="py-8">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
