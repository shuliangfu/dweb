/**
 * 示例侧边栏导航组件
 * 用于示例网站的导航菜单
 */

import { useEffect, useState } from "preact/hooks";

interface NavItem {
  title: string;
  path?: string;
  children?: NavItem[];
}

interface ExamplesSidebarProps {
  currentPath?: string;
}

/**
 * 示例导航结构
 */
const navItems: NavItem[] = [
  {
    title: "快速开始",
    path: "/examples",
  },
  {
    title: "基础示例",
    children: [
      { title: "点击事件", path: "/examples/click-events" },
      { title: "接口请求", path: "/examples/api-requests" },
      { title: "表单提交", path: "/examples/form-submit" },
    ],
  },
  {
    title: "高级示例",
    children: [
      { title: "状态管理", path: "/examples/store" },
      { title: "图片上传", path: "/examples/image-upload" },
      { title: "曲线图", path: "/examples/chart" },
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
    if (item.path === "/examples") {
      return path === "/examples";
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
 * 示例侧边栏导航组件
 * @param props 组件属性
 * @returns JSX 元素
 */
export default function ExamplesSidebar(
  { currentPath: initialPath = "/examples" }: ExamplesSidebarProps,
) {
  // 在客户端使用 state 跟踪当前路径，支持客户端路由导航
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (initialPath) {
      return initialPath;
    }
    if (typeof globalThis !== "undefined" && globalThis.window) {
      return globalThis.window.location.pathname;
    }
    return "/examples";
  });

  // 监听 URL 变化（客户端路由导航和浏览器前进/后退）
  useEffect(() => {
    if (typeof globalThis === "undefined" || !globalThis.window) {
      return;
    }

    const updatePath = () => {
      const newPath = globalThis.window.location.pathname;
      setCurrentPath(newPath);
    };

    updatePath();

    globalThis.window.addEventListener("popstate", updatePath);
    const handleRouteChange = () => {
      updatePath();
    };
    globalThis.window.addEventListener("routechange", handleRouteChange);

    return () => {
      globalThis.window.removeEventListener("popstate", updatePath);
      globalThis.window.removeEventListener("routechange", handleRouteChange);
    };
  }, []);

  // 展开状态管理
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
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

    setExpandedItems((prev) => {
      const next = new Set(prev);
      shouldBeExpanded.forEach((title) => {
        next.add(title);
      });
      return next;
    });
  }, [currentPath]);

  const shouldBeExpanded = new Set<string>();
  navItems.forEach((item) => {
    if (item.children) {
      const isActive = isItemActive(item, currentPath);
      if (isActive) {
        shouldBeExpanded.add(item.title);
      }
    }
  });

  const finalExpandedItems = new Set(expandedItems);
  shouldBeExpanded.forEach((title) => {
    finalExpandedItems.add(title);
  });

  const isChildActive = (childPath: string, path: string): boolean => {
    if (childPath.includes("#")) {
      const basePath = childPath.split("#")[0];
      if (path === basePath) {
        return true;
      }
      return path.startsWith(basePath + "#");
    }
    return path === childPath || path.startsWith(childPath + "/");
  };

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
        @media (prefers-color-scheme: dark) {
          aside::-webkit-scrollbar-thumb {
            background: rgba(156, 163, 175, 0.4);
          }
          aside::-webkit-scrollbar-thumb:hover {
            background: rgba(156, 163, 175, 0.6);
          }
        }
        .dark aside::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.4);
        }
        .dark aside::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.6);
        }
      `}
      </style>
      <aside className="w-80 max-w-[320px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-[calc(100vh-12rem)] sticky top-24 overflow-y-auto sidebar-scrollbar">
        <div className="pt-8 px-6 pb-8">
          <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-6 pl-2">
            示例目录
          </h2>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = isItemActive(item, currentPath);
              const isExpanded = finalExpandedItems.has(item.title);
              const hasChildren = item.children && item.children.length > 0;
              const itemKey = item.path || item.title;

              return (
                <div key={itemKey} className="mb-2">
                  {!hasChildren && item.path
                    ? (
                      <a
                        href={item.path}
                        className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40 text-green-700 dark:text-green-300 shadow-sm"
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
                    <div className="space-y-1 relative ml-4">
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700 hidden">
                      </div>
                      {item.children!.map((child) => {
                        if (!child.path) return null;
                        const childIsActive = isChildActive(
                          child.path,
                          currentPath,
                        );
                        return (
                          <a
                            key={child.path}
                            href={child.path}
                            className={`block px-4 py-2 pl-6 rounded-lg text-sm transition-all duration-200 border-l-2 ${
                              childIsActive
                                ? "border-green-500 bg-green-50/50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium"
                                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
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
