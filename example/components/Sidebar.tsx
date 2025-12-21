/**
 * 侧边栏导航组件
 * 用于文档网站的导航菜单，支持二级菜单
 */

import { useState, useEffect } from 'preact/hooks';

interface NavItem {
  title: string;
  path?: string; // 只有快速开始菜单需要 path，其他一级菜单不需要
  children?: NavItem[];
}

interface SidebarProps {
  currentPath?: string;
}

/**
 * 文档导航结构
 */
const navItems: NavItem[] = [
	{
		title: '快速开始',
		path: '/docs',
	},
  {
    title: '核心模块',
    children: [
      { title: '服务器 (Server)', path: '/docs/core/server' },
      { title: '路由系统 (Router)', path: '/docs/core/router' },
      { title: '配置管理 (Config)', path: '/docs/core/config' },
      { title: '中间件系统', path: '/docs/core/middleware' },
      { title: '插件系统', path: '/docs/core/plugin' },
      { title: 'API 路由', path: '/docs/core/api' },
    ],
  },
  {
    title: '功能模块',
    children: [
      { title: '数据库', path: '/docs/features/database' },
      { title: 'GraphQL', path: '/docs/features/graphql' },
      { title: 'WebSocket', path: '/docs/features/websocket' },
      { title: 'Session', path: '/docs/features/session' },
      { title: 'Cookie', path: '/docs/features/cookie' },
      { title: 'Logger', path: '/docs/features/logger' },
    ],
  },
  {
    title: '中间件',
    children: [
      { title: 'logger', path: '/docs/middleware/logger' },
      { title: 'cors', path: '/docs/middleware/cors' },
      { title: 'bodyParser', path: '/docs/middleware/body-parser' },
      { title: 'compression', path: '/docs/middleware/compression' },
      { title: 'staticFiles', path: '/docs/middleware/static-files' },
      { title: 'security', path: '/docs/middleware/security' },
      { title: 'rateLimit', path: '/docs/middleware/rate-limit' },
      { title: 'auth', path: '/docs/middleware/auth' },
      { title: 'health', path: '/docs/middleware/health' },
      { title: 'requestId', path: '/docs/middleware/request-id' },
      { title: 'requestValidator', path: '/docs/middleware/request-validator' },
      { title: 'ipFilter', path: '/docs/middleware/ip-filter' },
      { title: 'errorHandler', path: '/docs/middleware/error-handler' },
    ],
  },
  {
    title: '插件',
    children: [
      { title: 'tailwind', path: '/docs/plugins/tailwind' },
      { title: 'seo', path: '/docs/plugins/seo' },
      { title: 'sitemap', path: '/docs/plugins/sitemap' },
      { title: 'pwa', path: '/docs/plugins/pwa' },
      { title: 'cache', path: '/docs/plugins/cache' },
      { title: 'email', path: '/docs/plugins/email' },
      { title: 'fileUpload', path: '/docs/plugins/file-upload' },
      { title: 'formValidator', path: '/docs/plugins/form-validator' },
      { title: 'i18n', path: '/docs/plugins/i18n' },
      { title: 'imageOptimizer', path: '/docs/plugins/image-optimizer' },
      { title: 'performance', path: '/docs/plugins/performance' },
      { title: 'theme', path: '/docs/plugins/theme' },
      { title: 'rss', path: '/docs/plugins/rss' },
    ],
  },
  {
    title: '配置与部署',
    children: [
      { title: '配置文档', path: '/docs/deployment/configuration' },
      { title: 'Docker 部署', path: '/docs/deployment/docker' },
      { title: '开发指南', path: '/docs/deployment/development' },
    ],
  },
];

/**
 * 检查菜单项是否激活
 * @param item 菜单项
 * @param path 当前路径
 * @returns 是否激活
 */
function isItemActive(item: NavItem, path: string): boolean {
  // 如果菜单项有 path，检查是否匹配
  if (item.path) {
    if (item.path === '/docs') {
      return path === '/docs';
    }
    // 检查是否匹配路径或锚点
    if (path === item.path || path.startsWith(item.path + '#')) {
      return true;
    }
  }
  // 检查子项是否激活
  if (item.children) {
    return item.children.some((child) => {
      // 子项必须有 path
      if (!child.path) return false;
      if (child.path.includes('#')) {
        // 锚点链接，检查基础路径
        const basePath = child.path.split('#')[0];
        return path === basePath || path.startsWith(basePath + '#');
      }
      return path === child.path || path.startsWith(child.path + '/');
    });
  }
  return false;
}

/**
 * 侧边栏导航组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function Sidebar({ currentPath: initialPath = '/docs' }: SidebarProps) {
  // 在客户端使用 state 跟踪当前路径，支持客户端路由导航
  const [currentPath, setCurrentPath] = useState<string>(() => {
    // 初始化：优先使用传入的 prop，其次使用 window.location.pathname（客户端）
    if (typeof globalThis !== 'undefined' && globalThis.window) {
      return globalThis.window.location.pathname;
    }
    return initialPath;
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

  // 展开状态管理（允许用户手动展开/折叠）
  // 使用 title 作为 key，因为不是所有菜单项都有 path
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    // 初始化时展开所有菜单项
    const expanded = new Set<string>();
    navItems.forEach((item) => {
      if (item.children) {
          expanded.add(item.title);
      }
    });
    return expanded;
  });

  // 当路径变化时，自动展开相关菜单项
  useEffect(() => {
    const shouldBeExpanded = new Set<string>();
    navItems.forEach((item) => {
      if (item.children) {
        const isActive = isItemActive(item, currentPath);
        if (isActive) {
          shouldBeExpanded.add(item.title);
        }
      }
    });

    // 更新展开状态：保留用户手动展开的项，并添加应该自动展开的项
    setExpandedItems((prev) => {
      const next = new Set(prev);
      // 添加应该自动展开的项
      shouldBeExpanded.forEach((title) => {
        next.add(title);
      });
      return next;
    });
  }, [currentPath]);

  // 根据当前路径计算应该展开的菜单项（用于渲染）
  const shouldBeExpanded = new Set<string>();
  navItems.forEach((item) => {
    if (item.children) {
      const isActive = isItemActive(item, currentPath);
      if (isActive) {
        shouldBeExpanded.add(item.title);
      }
    }
  });

  // 合并用户手动展开的项和应该自动展开的项
  const finalExpandedItems = new Set(expandedItems);
  shouldBeExpanded.forEach((title) => {
    finalExpandedItems.add(title);
  });

  /**
   * 检查子项是否激活
   * @param childPath 子项路径
   * @param path 当前路径
   * @returns 是否激活
   */
  const isChildActive = (childPath: string, path: string): boolean => {
    if (childPath.includes('#')) {
      // 锚点链接
      const basePath = childPath.split('#')[0];
      if (path === basePath) {
        // 如果当前路径匹配基础路径，检查是否有对应的锚点
        return true;
      }
      return path.startsWith(basePath + '#');
    }
    return path === childPath || path.startsWith(childPath + '/');
  };

  /**
   * 切换菜单项展开状态
   * @param title 菜单项标题（用作唯一标识）
   */
  const toggleExpanded = (title: string, e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };


  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">文档目录</h2>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = isItemActive(item, currentPath);
            const isExpanded = finalExpandedItems.has(item.title);
            const hasChildren = item.children && item.children.length > 0;
            // 使用 title 作为 key，因为不是所有菜单项都有 path
            const itemKey = item.path || item.title;

            return (
              <div key={itemKey}>
                {/* 快速开始菜单保留链接，其他一级菜单作为可点击的分组标题 */}
                {!hasChildren && item.path ? (
                  <a
                    href={item.path}
                    className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {item.title}
                  </a>
                ) : (
                  <div className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white">
                    {item.title}
                  </div>
                )}
                {hasChildren && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children!.map((child) => {
                      // 子项必须有 path
                      if (!child.path) return null;
                      const childIsActive = isChildActive(child.path, currentPath);
                      return (
                        <a
                          key={child.path}
                          href={child.path}
                          className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                            childIsActive
                              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {child.title}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

