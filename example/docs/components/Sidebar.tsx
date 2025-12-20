/**
 * 侧边栏导航组件
 * 用于文档网站的导航菜单
 */

import { h } from 'preact';

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
      { title: '服务器', path: '/core#server' },
      { title: '路由', path: '/core#router' },
      { title: '配置', path: '/core#config' },
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
    title: '扩展模块',
    path: '/extensions',
    children: [
      { title: '中间件', path: '/middleware' },
      { title: '插件', path: '/plugins' },
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
  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(path);
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4">文档</h2>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <div key={item.path}>
              <a
                href={item.path}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.title}
              </a>
              {item.children && isActive(item.path) && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <a
                      key={child.path}
                      href={child.path}
                      className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                        currentPath === child.path
                          ? 'bg-indigo-50 text-indigo-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {child.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}

