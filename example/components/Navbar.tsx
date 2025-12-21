/**
 * 导航栏组件
 * 用于网站顶部导航
 */

import { useState, useEffect } from 'preact/hooks';

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
  const [currentPath, setCurrentPath] = useState<string>(() => {
    // 初始化：优先使用传入的 prop，其次使用 window.location.pathname（客户端）
    if (typeof globalThis !== 'undefined' && globalThis.window) {
      return globalThis.window.location.pathname;
    }
    return initialPath || '/';
  });

  // 监听 URL 变化（客户端路由导航和浏览器前进/后退）
  useEffect(() => {
    if (typeof globalThis === 'undefined' || !globalThis.window) {
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
    globalThis.window.addEventListener('popstate', updatePath);

    // 监听自定义路由事件（客户端路由导航时触发）
    const handleRouteChange = () => {
      updatePath();
    };
    globalThis.window.addEventListener('routechange', handleRouteChange);

    return () => {
      globalThis.window.removeEventListener('popstate', updatePath);
      globalThis.window.removeEventListener('routechange', handleRouteChange);
    };
  }, []);

  const navItems = [
    { href: '/', label: '首页' },
    { href: '/features', label: '特性' },
    { href: '/examples', label: '示例' },
    { href: '/docs', label: '文档' },
    { href: '/about', label: '关于' },
  ];

  return (
    <nav className="bg-gray-100/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm border-b border-gray-400 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                DWeb
              </span>
            </a>
          </div>

          {/* 导航链接 */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              // 精确匹配路径，支持根路径和子路径
              const isActive = currentPath === item.href || 
                (item.href !== '/' && currentPath.startsWith(item.href));
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-800 dark:text-blue-400 bg-blue-200 dark:bg-blue-900/20'
                      : 'text-gray-900 dark:text-gray-300 hover:text-blue-800 dark:hover:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>

          {/* 主题切换按钮和 CTA 按钮 */}
          <div className="flex items-center space-x-4">
            {/* 主题切换按钮 */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // 直接调用主题切换方法
                if (typeof globalThis !== 'undefined' && globalThis.window) {
                  const win = globalThis.window as any;
                  if (win.toggleTheme) {
                    win.toggleTheme();
                  }
                }
              }}
              className="p-2 rounded-md text-gray-800 hover:text-gray-900 hover:bg-gray-300 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
              title="切换主题"
              aria-label="切换主题"
            >
              {/* 月亮图标（深色模式显示） */}
              <svg
                className="w-5 h-5 dark:block hidden"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
              {/* 太阳图标（浅色模式显示） */}
              <svg
                className="w-5 h-5 dark:hidden block"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </button>
            <a
              href="https://github.com/shuliangfu/dweb"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
            <a
              href="/docs"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-linear-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
            >
              快速开始
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

