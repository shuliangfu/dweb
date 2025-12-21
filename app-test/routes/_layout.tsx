/**
 * 根布局组件
 * 提供网站的整体布局结构
 * 注意：HTML 文档结构由 _app.tsx 提供
 */

import { useState, useEffect } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

/**
 * 根布局组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function RootLayout({ children }: { children: ComponentChildren }) {
  // 在客户端使用 state 跟踪当前路径
  const [currentPath, setCurrentPath] = useState<string>(() => {
    // 初始化：使用 window.location.pathname（客户端）
    if (typeof globalThis !== 'undefined' && globalThis.window) {
      return globalThis.window.location.pathname;
    }
    return '/';
  });

  // 监听 URL 地址变化
  useEffect(() => {
    if (typeof globalThis === 'undefined' || !globalThis.window) {
      return;
    }

    // 更新当前路径
    const updatePath = () => {
      setCurrentPath(globalThis.window.location.pathname);
    };

    // 初始化时设置当前路径
    updatePath();

    // 监听 popstate 事件（浏览器前进/后退）
    globalThis.window.addEventListener('popstate', updatePath);
    
    // 监听 routechange 事件（客户端路由导航时触发）
    // 从事件详情中获取路径，确保立即更新
    const handleRouteChange = (event) => {
      const customEvent = event;
      if (customEvent.detail?.path) {
        setCurrentPath(customEvent.detail.path);
      } else {
        // 如果没有路径详情，回退到从 location 获取
        updatePath();
      }
    };
    globalThis.window.addEventListener('routechange', handleRouteChange);

    return () => {
      globalThis.window.removeEventListener('popstate', updatePath);
      globalThis.window.removeEventListener('routechange', handleRouteChange);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <a href="/" className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                app-test
              </a>
            </div>
            <div className="flex space-x-4">
              <a
                href="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPath === '/' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-700 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                首页
              </a>
              <a
                href="/about"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPath === '/about' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-700 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                关于
              </a>
            </div>
          </div>
        </div>
      </nav>
      
      {/* 主内容区域 */}
      <main className="grow">
        {children}
      </main>
    </div>
  );
}
