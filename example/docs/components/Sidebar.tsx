/**
 * 侧边栏导航组件
 * 用于文档网站的导航菜单，支持二级菜单
 */

import { useState } from 'preact/hooks';

interface NavItem {
  title: string;
  path: string;
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
    path: '/',
  },
  {
    title: '核心模块',
    path: '/core',
    children: [
      { title: '服务器 (Server)', path: '/core#server' },
      { title: '路由系统 (Router)', path: '/core#router' },
      { title: '配置管理 (Config)', path: '/core#config' },
      { title: '中间件系统', path: '/core#middleware' },
      { title: '插件系统', path: '/core#plugin' },
      { title: 'API 路由', path: '/core#api' },
    ],
  },
  {
    title: '功能模块',
    path: '/features',
    children: [
      { title: '数据库', path: '/database' },
      { title: 'GraphQL', path: '/graphql' },
      { title: 'WebSocket', path: '/websocket' },
      { title: 'Session', path: '/session' },
      { title: 'Cookie', path: '/cookie' },
      { title: 'Logger', path: '/logger' },
    ],
  },
  {
    title: '中间件',
    path: '/middleware',
    children: [
      { title: 'logger', path: '/middleware#logger' },
      { title: 'cors', path: '/middleware#cors' },
      { title: 'bodyParser', path: '/middleware#bodyParser' },
      { title: 'compression', path: '/middleware#compression' },
      { title: 'staticFiles', path: '/middleware#staticFiles' },
      { title: 'security', path: '/middleware#security' },
      { title: 'rateLimit', path: '/middleware#rateLimit' },
      { title: 'auth', path: '/middleware#auth' },
      { title: 'health', path: '/middleware#health' },
      { title: 'requestId', path: '/middleware#requestId' },
      { title: 'requestValidator', path: '/middleware#requestValidator' },
      { title: 'ipFilter', path: '/middleware#ipFilter' },
      { title: 'errorHandler', path: '/middleware#errorHandler' },
    ],
  },
  {
    title: '插件',
    path: '/plugins',
    children: [
      { title: 'tailwind', path: '/plugins#tailwind' },
      { title: 'seo', path: '/plugins#seo' },
      { title: 'sitemap', path: '/plugins#sitemap' },
      { title: 'pwa', path: '/plugins#pwa' },
      { title: 'cache', path: '/plugins#cache' },
      { title: 'email', path: '/plugins#email' },
      { title: 'fileUpload', path: '/plugins#fileUpload' },
      { title: 'formValidator', path: '/plugins#formValidator' },
      { title: 'i18n', path: '/plugins#i18n' },
      { title: 'imageOptimizer', path: '/plugins#imageOptimizer' },
      { title: 'performance', path: '/plugins#performance' },
      { title: 'theme', path: '/plugins#theme' },
      { title: 'rss', path: '/plugins#rss' },
    ],
  },
  {
    title: '配置与部署',
    path: '/deployment',
    children: [
      { title: '配置文档', path: '/configuration' },
      { title: 'Docker 部署', path: '/docker' },
      { title: '开发指南', path: '/development' },
    ],
  },
];

/**
 * 侧边栏导航组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function Sidebar({ currentPath = '/' }: SidebarProps) {
  // 展开状态管理
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    // 根据当前路径自动展开相关菜单项
    const expanded = new Set<string>();
    navItems.forEach((item) => {
      if (item.children) {
        // 检查当前路径是否匹配该菜单项或其子项
        const isActive = isItemActive(item, currentPath);
        if (isActive) {
          expanded.add(item.path);
        }
      }
    });
    return expanded;
  });

  /**
   * 检查菜单项是否激活
   * @param item 菜单项
   * @param path 当前路径
   * @returns 是否激活
   */
  const isItemActive = (item: NavItem, path: string): boolean => {
    if (item.path === '/') {
      return path === '/';
    }
    // 检查是否匹配路径或锚点
    if (path === item.path || path.startsWith(item.path + '#')) {
      return true;
    }
    // 检查子项是否激活
    if (item.children) {
      return item.children.some((child) => {
        if (child.path.includes('#')) {
          // 锚点链接，检查基础路径
          const basePath = child.path.split('#')[0];
          return path === basePath || path.startsWith(basePath + '#');
        }
        return path === child.path || path.startsWith(child.path + '/');
      });
    }
    return false;
  };

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
      const anchor = childPath.split('#')[1];
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
   * @param path 菜单项路径
   */
  const toggleExpanded = (path: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4">文档</h2>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = isItemActive(item, currentPath);
            const isExpanded = expandedItems.has(item.path);
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.path}>
                <div className="flex items-center">
                  <a
                    href={item.path}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive && !hasChildren
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.title}
                  </a>
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(item.path)}
                      className="px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      aria-label={isExpanded ? '折叠菜单' : '展开菜单'}
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  )}
                </div>
                {hasChildren && isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children!.map((child) => {
                      const childIsActive = isChildActive(child.path, currentPath);
                      return (
                        <a
                          key={child.path}
                          href={child.path}
                          className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                            childIsActive
                              ? 'bg-indigo-50 text-indigo-600 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
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
