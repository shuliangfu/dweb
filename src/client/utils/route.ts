/**
 * 客户端路由工具函数
 * 提供类似 preact-router 的 route 函数，支持参数传递
 */

/**
 * 路由导航函数
 * @param path 目标路径，可以是字符串路径或包含 path 和 params 的对象
 * @param replace 是否替换当前历史记录（默认 false，使用 pushState）
 * @returns 如果导航成功返回 true，否则返回 false
 *
 * @example
 * // 基本用法
 * route("/docs");
 *
 * // 带查询参数
 * route("/docs?page=1&sort=name");
 *
 * // 使用对象形式传递参数
 * route({ path: "/docs", params: { page: 1, sort: "name" } });
 *
 * // 替换当前历史记录
 * route("/docs", true);
 */
export function route(
  path: string | {
    path: string;
    params?: Record<string, string | number | boolean>;
  },
  replace?: boolean,
): boolean {
  try {
    let targetPath: string;
    let queryParams: Record<string, string | number | boolean> | undefined;

    // 处理参数：支持字符串路径或对象形式
    if (typeof path === "string") {
      // 字符串形式：检查是否包含查询参数
      const url = new URL(path, globalThis.location.origin);
      targetPath = url.pathname;

      // 提取已有的查询参数
      if (url.search) {
        queryParams = {};
        url.searchParams.forEach((value, key) => {
          queryParams![key] = value;
        });
      }
    } else {
      // 对象形式：path + params
      targetPath = path.path;
      queryParams = path.params;
    }

    // 构建完整的 URL（包含查询参数）
    let fullPath = targetPath;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        searchParams.append(key, String(value));
      }
      const queryString = searchParams.toString();
      if (queryString) {
        fullPath = `${targetPath}${
          targetPath.includes("?") ? "&" : "?"
        }${queryString}`;
      }
    }

    // 获取框架的导航函数
    const navigateFunc = (globalThis as Record<string, unknown>)
      .__CSR_NAVIGATE as
        | ((path: string, replace?: boolean) => void)
        | undefined;

    if (navigateFunc && typeof navigateFunc === "function") {
      // 使用框架的导航函数（支持 SPA 无刷新导航）
      navigateFunc(fullPath, replace);
      return true;
    } else {
      // 如果框架导航函数不可用，回退到整页跳转
      if (replace) {
        globalThis.history.replaceState({}, "", fullPath);
        globalThis.location.replace(fullPath);
      } else {
        globalThis.location.href = fullPath;
      }
      return false;
    }
  } catch (error) {
    console.warn("[route] 路由导航失败:", error);
    return false;
  }
}

/**
 * 获取当前路由路径
 * @returns 当前路径（不包含查询参数和哈希）
 */
export function getCurrentPath(): string {
  return globalThis.location.pathname;
}

/**
 * 获取当前路由的查询参数
 * @returns 查询参数对象
 */
export function getQueryParams(): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(globalThis.location.search);
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

/**
 * 获取当前路由的完整 URL
 * @returns 完整的 URL 字符串
 */
export function getCurrentUrl(): string {
  return globalThis.location.href;
}
