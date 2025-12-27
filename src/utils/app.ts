/**
 * 应用加载工具
 * 用于加载 main.ts 文件并获取应用实例中的中间件和插件
 */

import type { AppLike } from "../types/index.ts";
import type { Middleware, Plugin } from "../types/index.ts";
import type { MiddlewareManager } from "../core/middleware.ts";
import type { PluginManager } from "../core/plugin.ts";
import * as path from "@std/path";

/**
 * 查找 main.ts 文件
 * @param appName 应用名称（多应用模式下使用，如 'backend'）
 * @returns main.ts 文件路径，如果找不到返回 null
 */
export async function findMainFile(appName?: string): Promise<string | null> {
  const cwd = Deno.cwd();
  const possiblePaths: string[] = [];

  // 如果指定了应用名称（多应用模式），优先查找应用目录下的 main.ts
  if (appName) {
    possiblePaths.push(
      `${appName}/main.ts`,
      `${appName}/main.js`,
    );
  }

  // 然后查找根目录和 example 目录
  possiblePaths.push(
    "main.ts",
    "main.js",
    "example/main.ts",
    "example/main.js",
  );

  for (const filePath of possiblePaths) {
    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(cwd, filePath);
      const stat = await Deno.stat(fullPath);
      if (stat.isFile) {
        return fullPath;
      }
    } catch {
      // 文件不存在，继续查找
      continue;
    }
  }

  return null;
}

/**
 * 加载 main.ts 文件并获取应用实例
 * @param appName 应用名称（多应用模式下使用，如 'backend'）
 * @returns 应用实例，如果找不到 main.ts 返回 null
 */
export async function loadMainApp(appName?: string): Promise<AppLike | null> {
  try {
    const mainPath = await findMainFile(appName);
    if (!mainPath) {
      return null;
    }

    // 转换为绝对路径
    const absolutePath = path.isAbsolute(mainPath)
      ? mainPath
      : path.resolve(Deno.cwd(), mainPath);

    // 转换为 file:// URL
    const mainUrl = path.toFileUrl(absolutePath).href;

    // 导入 main.ts
    const mainModule = await import(mainUrl);

    // 获取默认导出（应用实例）
    const app: AppLike = mainModule.default || mainModule.app || mainModule;

    // 验证是否是有效的应用实例
    if (
      app && typeof app.use === "function" && typeof app.plugin === "function"
    ) {
      return app;
    }

    return null;
  } catch (error) {
    // 加载失败时静默返回 null（main.ts 是可选的）
    console.warn(
      "⚠️  加载 main.ts 失败:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * 从应用实例中提取中间件
 * @param app 应用实例
 * @returns 中间件数组
 */
export function getMiddlewaresFromApp(app: AppLike): Middleware[] {
  // 从中间件管理器中获取所有中间件
  // AppLike 的 middleware 是 unknown 类型，需要进行类型断言
  const middlewareManager = app.middleware as MiddlewareManager | undefined;
  if (!middlewareManager || typeof middlewareManager.getAll !== "function") {
    return [];
  }
  return middlewareManager.getAll();
}

/**
 * 从应用实例中提取插件
 * @param app 应用实例
 * @returns 插件数组
 */
export function getPluginsFromApp(app: AppLike): Plugin[] {
  // 从插件管理器中获取所有插件
  // AppLike 的 plugins 是 unknown 类型，需要进行类型断言
  const pluginManager = app.plugins as PluginManager | undefined;
  if (!pluginManager || typeof pluginManager.getAll !== "function") {
    return [];
  }
  return pluginManager.getAll();
}
