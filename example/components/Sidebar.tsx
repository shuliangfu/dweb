/**
 * 侧边栏导航组件
 * 用于文档网站的导航菜单，支持二级菜单
 */

import { useEffect, useState } from "preact/hooks";

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
    title: "快速开始",
    path: "/docs",
  },
  {
    title: "核心模块",
    children: [
      { title: "应用核心 (Application)", path: "/docs/core/application" },
      {
        title: "应用上下文 (ApplicationContext)",
        path: "/docs/core/application-context",
      },
      {
        title: "配置管理器 (ConfigManager)",
        path: "/docs/core/config-manager",
      },
      {
        title: "服务容器 (ServiceContainer)",
        path: "/docs/core/service-container",
      },
      {
        title: "生命周期管理器 (LifecycleManager)",
        path: "/docs/core/lifecycle-manager",
      },
      { title: "服务接口 (IService)", path: "/docs/core/iservice" },
      { title: "基础管理器 (BaseManager)", path: "/docs/core/base-manager" },
      { title: "服务器 (Server)", path: "/docs/core/server" },
      { title: "路由系统 (Router)", path: "/docs/core/router" },
      { title: "配置管理 (Config)", path: "/docs/core/config" },
      { title: "路由处理器 (RouteHandler)", path: "/docs/core/route-handler" },
      { title: "中间件系统 (Middleware)", path: "/docs/core/middleware" },
      { title: "插件系统 (Plugin)", path: "/docs/core/plugin" },
      { title: "API 路由 (API Route)", path: "/docs/core/api" },
    ],
  },
  {
    title: "功能模块",
    children: [
      { title: "项目创建 (Create)", path: "/docs/features/create" },
      { title: "开发服务器 (Dev)", path: "/docs/features/dev" },
      { title: "热模块替换 (HMR)", path: "/docs/features/hmr" },
      { title: "环境变量 (Env)", path: "/docs/features/env" },
      { title: "构建 (Build)", path: "/docs/features/build" },
      { title: "生产服务器 (Prod)", path: "/docs/features/prod" },
      { title: "性能监控 (Monitoring)", path: "/docs/features/monitoring" },
      { title: "优雅关闭 (Shutdown)", path: "/docs/features/shutdown" },
      { title: "缓存系统 (Cache)", path: "/docs/features/cache" },
      { title: "数据库 (Database)", path: "/docs/features/database" },
      { title: "GraphQL (GraphQL)", path: "/docs/features/graphql" },
      { title: "WebSocket (WebSocket)", path: "/docs/features/websocket" },
      { title: "会话 (Session)", path: "/docs/features/session" },
      { title: "Cookie (Cookie)", path: "/docs/features/cookie" },
      { title: "日志记录器 (Logger)", path: "/docs/features/logger" },
    ],
  },
  {
    title: "中间件",
    children: [
      { title: "日志记录 (logger)", path: "/docs/middleware/logger" },
      { title: "跨域支持 (cors)", path: "/docs/middleware/cors" },
      {
        title: "请求体解析 (bodyParser)",
        path: "/docs/middleware/body-parser",
      },
      {
        title: "静态文件 (staticFiles)",
        path: "/docs/middleware/static-files",
      },
      { title: "安全头 (security)", path: "/docs/middleware/security" },
      { title: "速率限制 (rateLimit)", path: "/docs/middleware/rate-limit" },
      { title: "JWT 认证 (auth)", path: "/docs/middleware/auth" },
      { title: "健康检查 (health)", path: "/docs/middleware/health" },
      { title: "请求 ID (requestId)", path: "/docs/middleware/request-id" },
      {
        title: "请求验证 (requestValidator)",
        path: "/docs/middleware/request-validator",
      },
      { title: "IP 过滤 (ipFilter)", path: "/docs/middleware/ip-filter" },
      {
        title: "错误处理 (errorHandler)",
        path: "/docs/middleware/error-handler",
      },
    ],
  },
  {
    title: "插件",
    children: [
      { title: "Tailwind CSS (tailwind)", path: "/docs/plugins/tailwind" },
      { title: "状态管理 (store)", path: "/docs/plugins/store" },
      { title: "SEO 优化 (seo)", path: "/docs/plugins/seo" },
      { title: "网站地图 (sitemap)", path: "/docs/plugins/sitemap" },
      { title: "渐进式 Web 应用 (pwa)", path: "/docs/plugins/pwa" },
      { title: "缓存 (cache)", path: "/docs/plugins/cache" },
      { title: "邮件发送 (email)", path: "/docs/plugins/email" },
      { title: "文件上传 (fileUpload)", path: "/docs/plugins/file-upload" },
      {
        title: "表单验证 (formValidator)",
        path: "/docs/plugins/form-validator",
      },
      { title: "国际化 (i18n)", path: "/docs/plugins/i18n" },
      {
        title: "图片优化 (imageOptimizer)",
        path: "/docs/plugins/image-optimizer",
      },
      { title: "性能监控 (performance)", path: "/docs/plugins/performance" },
      { title: "主题切换 (theme)", path: "/docs/plugins/theme" },
      { title: "RSS 订阅 (rss)", path: "/docs/plugins/rss" },
    ],
  },
  {
    title: "扩展模块",
    children: [
      { title: "扩展系统", path: "/docs/extensions" },
      { title: "控制台工具", path: "/docs/console" },
      { title: "渲染适配器", path: "/docs/render" },
      { title: "Web3 工具函数", path: "/docs/common/utils/web3" },
    ],
  },
  {
    title: "配置与部署",
    children: [
      { title: "配置文档", path: "/docs/deployment/configuration" },
      { title: "Docker 部署", path: "/docs/deployment/docker" },
      { title: "开发指南", path: "/docs/deployment/development" },
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
    if (item.path === "/docs") {
      return path === "/docs";
    }
    // 检查是否匹配路径或锚点
    if (path === item.path || path.startsWith(item.path + "#")) {
      return true;
    }
  }
  // 检查子项是否激活
  if (item.children) {
    return item.children.some((child) => {
      // 子项必须有 path
      if (!child.path) return false;
      if (child.path.includes("#")) {
        // 锚点链接，检查基础路径
        const basePath = child.path.split("#")[0];
        return path === basePath || path.startsWith(basePath + "#");
      }
      return path === child.path || path.startsWith(child.path + "/");
    });
  }
  return false;
}

/**
 * 侧边栏导航组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function Sidebar(
  { currentPath: initialPath = "/docs" }: SidebarProps,
) {
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
    return "/docs";
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
    if (childPath.includes("#")) {
      // 锚点链接
      const basePath = childPath.split("#")[0];
      if (path === basePath) {
        // 如果当前路径匹配基础路径，检查是否有对应的锚点
        return true;
      }
      return path.startsWith(basePath + "#");
    }
    return path === childPath || path.startsWith(childPath + "/");
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
    <>
      <style>
        {`
        /* 美化滚动条 */
        aside::-webkit-scrollbar {
          width: 6px;
        }
        aside::-webkit-scrollbar-track {
          background: transparent;
        }
        aside::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
          border-radius: 3px;
        }
        aside::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
        /* 暗色模式 */
        @media (prefers-color-scheme: dark) {
          aside::-webkit-scrollbar-thumb {
            background: rgba(156, 163, 175, 0.4);
          }
          aside::-webkit-scrollbar-thumb:hover {
            background: rgba(156, 163, 175, 0.6);
          }
        }
        /* 支持 dark 类 */
        .dark aside::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.4);
        }
        .dark aside::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.6);
        }
      `}
      </style>
      <aside className="w-80 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0 overflow-y-auto sidebar-scrollbar pb-20">
        <div className="pt-8 px-6 pb-8">
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-6 pl-2">
            文档目录
          </h2>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = isItemActive(item, currentPath);
              const isExpanded = finalExpandedItems.has(item.title);
              const hasChildren = item.children && item.children.length > 0;
              // 使用 title 作为 key，因为不是所有菜单项都有 path
              const itemKey = item.path || item.title;

              return (
                <div key={itemKey} className="mb-2">
                  {/* 快速开始菜单保留链接，其他一级菜单作为可点击的分组标题 */}
                  {!hasChildren && item.path
                    ? (
                      <a
                        href={item.path}
                        className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/40 dark:to-blue-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:pl-5"
                        }`}
                      >
                        {item.title}
                      </a>
                    )
                    : (
                      <div className="px-4 py-2 text-sm font-bold text-gray-900 dark:text-gray-100 mt-6 mb-2 uppercase tracking-wider opacity-80">
                        {item.title}
                      </div>
                    )}
                  {hasChildren && (
                    <div className="space-y-1 relative">
                      {/* 连接线 */}
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700 hidden"></div>
                      {item.children!.map((child) => {
                        // 子项必须有 path
                        if (!child.path) return null;
                        const childIsActive = isChildActive(
                          child.path,
                          currentPath,
                        );
                        return (
                          <a
                            key={child.path}
                            href={child.path}
                            className={`block px-4 py-2 pl-4 rounded-lg text-sm transition-all duration-200 border-l-2 ${
                              childIsActive
                                ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-medium translate-x-1"
                                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 hover:translate-x-1"
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
    </>
  );
}
