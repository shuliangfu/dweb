/**
 * 文档布局组件
 * 为所有文档页面提供统一的布局，包括头部标题和左侧菜单
 */

import Sidebar from "../../components/Sidebar.tsx";
import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

interface DocsLayoutProps {
  children: ComponentChildren;
}

// export const layout = false; // 禁用布局继承

/**
 * 文档布局组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function DocsLayout({ children }: DocsLayoutProps) {
  // 在客户端使用 state 跟踪当前路径
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof globalThis !== "undefined" && globalThis.window) {
      return globalThis.window.location.pathname;
    }
    return "/docs";
  });

  // 监听 URL 地址变化
  useEffect(() => {
    if (typeof globalThis === "undefined" || !globalThis.window) {
      return;
    }

    // 更新当前路径
    const updatePath = () => {
      setCurrentPath(globalThis.window.location.pathname);
    };

    // 初始化时设置当前路径
    updatePath();

    // 监听 popstate 事件（浏览器前进/后退）
    globalThis.window.addEventListener("popstate", updatePath);

    // 监听 routechange 事件（客户端路由导航时触发）
    const handleRouteChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.path) {
        setCurrentPath(customEvent.detail.path);
      } else {
        updatePath();
      }
    };
    globalThis.window.addEventListener("routechange", handleRouteChange);

    return () => {
      globalThis.window.removeEventListener("popstate", updatePath);
      globalThis.window.removeEventListener("routechange", handleRouteChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 页面标题 */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            文档
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            快速开始使用 DWeb 框架，构建现代化的 Web 应用
          </p>
        </div>
      </div>

      {/* 主要内容区域：左侧菜单 + 文档内容 */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        {/* 侧边栏导航 */}
        <Sidebar currentPath={currentPath} />

        {/* 文档内容区域 */}
        <div className="flex-1 overflow-auto">
          {/* 文档内容 */}
          <div className="py-20 bg-white">
            <div className="px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
