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

    // 优先使用直接暴露的 navigateTo 方法（更可靠）
    const navigateToFunc = (globalThis as Record<string, unknown>)
      .__CSR_NAVIGATE_TO as
        | ((path: string, replace?: boolean) => Promise<void>)
        | undefined;

    if (navigateToFunc && typeof navigateToFunc === "function") {
      // 直接调用 navigateTo 方法（支持 SPA 无刷新导航）
      navigateToFunc(fullPath, replace).catch((error) => {
        console.warn("[route] 导航失败:", error);
        // 如果导航失败，回退到整页跳转
        if (replace) {
          globalThis.history.replaceState({}, "", fullPath);
          globalThis.location.replace(fullPath);
        } else {
          globalThis.location.href = fullPath;
        }
      });
      return true;
    }

    // 回退到使用 __CSR_NAVIGATE（向后兼容）
    const navigateFunc = (globalThis as Record<string, unknown>)
      .__CSR_NAVIGATE as
        | ((path: string, replace?: boolean) => void)
        | undefined;

    if (navigateFunc && typeof navigateFunc === "function") {
      // 使用框架的导航函数（支持 SPA 无刷新导航）
      navigateFunc(fullPath, replace);
      return true;
    }

    // 如果框架导航函数不可用，回退到整页跳转
    if (replace) {
      globalThis.history.replaceState({}, "", fullPath);
      globalThis.location.replace(fullPath);
    } else {
      globalThis.location.href = fullPath;
    }
    return false;
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

/**
 * 路由导航函数（routeTo 是 route 的别名）
 * 提供与 route 方法相同的功能，用于更语义化的方法命名
 * @param path 目标路径，可以是字符串路径或包含 path 和 params 的对象
 * @param replace 是否替换当前历史记录（默认 false，使用 pushState）
 * @returns 如果导航成功返回 true，否则返回 false
 *
 * @example
 * // 基本用法
 * routeTo("/docs");
 *
 * // 带查询参数
 * routeTo("/docs?page=1&sort=name");
 *
 * // 使用对象形式传递参数
 * routeTo({ path: "/docs", params: { page: 1, sort: "name" } });
 *
 * // 替换当前历史记录
 * routeTo("/docs", true);
 */
export function routeTo(
  path: string | {
    path: string;
    params?: Record<string, string | number | boolean>;
  },
  replace?: boolean,
): boolean {
  return route(path, replace);
}

/**
 * 返回上一页
 * 使用浏览器的历史记录 API 返回到上一个页面
 *
 * @param steps 返回的步数，默认为 1（返回上一页）。可以传入负数表示前进
 * @returns 如果成功返回 true，否则返回 false
 *
 * @example
 * // 返回上一页
 * goBack();
 *
 * // 返回上两页
 * goBack(2);
 *
 * // 前进一页（如果历史记录中有）
 * goBack(-1);
 */
export function goBack(steps: number = 1): boolean {
  try {
    // 检查浏览器是否支持 history API
    if (typeof globalThis.history === "undefined") {
      return false;
    }

    // 检查是否有历史记录可以返回
    if (steps > 0 && globalThis.history.length <= 1) {
      return false;
    }

    // 使用 history.go 进行导航
    // 正数表示后退，负数表示前进
    // 这会触发 popstate 事件，popstate 处理器会调用 navigateTo 来渲染正确的页面
    globalThis.history.go(-steps);
    return true;
  } catch (error) {
    console.warn("[goBack] 返回失败:", error);
    return false;
  }
}
