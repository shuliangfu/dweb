/**
 * 导航栏组件
 * 用于网站顶部导航
 */

import { useEffect, useState } from "preact/hooks";
import { menus } from "@config/menus.ts";

interface NavbarProps {
  /** 当前路径（服务端渲染时使用） */
  currentPath?: string;
}

/**
 * 导航栏组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function Navbar({ currentPath: initialPath }: NavbarProps) {
  // 在客户端使用 state 跟踪当前路径，支持客户端路由导航
  // 服务端渲染时使用传入的 routePath，客户端初始化时也优先使用传入的值
  const [currentPath, setCurrentPath] = useState<string>(() => {
    // 优先使用传入的 prop（服务端渲染时传入的 routePath）
    if (initialPath) {
      return initialPath;
    }
    // 客户端回退：使用 window.location.pathname
    if (typeof globalThis !== "undefined" && globalThis.window) {
      return globalThis.window.location.pathname;
    }
    return "/";
  });

  // 监听 URL 变化（客户端路由导航和浏览器前进/后退）
  useEffect(() => {
    if (typeof globalThis === "undefined" || !globalThis.window) {
      return;
    }

    // 更新当前路径
    const updatePath = () => {
      const newPath = globalThis.window.location.pathname;
      setCurrentPath(newPath);
    };

    // 初始化时设置当前路径
    updatePath();

    // 监听 popstate 事件（浏览器前进/后退）
    globalThis.window.addEventListener("popstate", updatePath);

    // 监听自定义路由事件（客户端路由导航时触发）
    const handleRouteChange = () => {
      updatePath();
    };
    globalThis.window.addEventListener("routechange", handleRouteChange);

    return () => {
      globalThis.window.removeEventListener("popstate", updatePath);
      globalThis.window.removeEventListener("routechange", handleRouteChange);
    };
  }, []);

  return (
    <nav className="bg-gray-100/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                app-test
              </span>
            </a>
          </div>

          {/* 导航链接 - 靠右对齐 */}
          <div className="hidden md:flex items-center space-x-8 ml-auto">
            {menus.map((item) => {
              // 精确匹配路径，支持根路径和子路径
              const isActive = currentPath === item.href ||
                (item.href !== "/" && currentPath.startsWith(item.href));
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "text-blue-800 dark:text-blue-400 bg-blue-200 dark:bg-blue-900/20"
                      : "text-gray-900 dark:text-gray-300 hover:text-blue-800 dark:hover:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
