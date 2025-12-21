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
                mobile
              </a>
            </div>
            <div className="flex items-center space-x-4">
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
              <a
                href="https://github.com/shuliangfu/dweb"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-gray-900 transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
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
