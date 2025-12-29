/**
 * 应用加载工具
 * 用于加载 main.ts 文件并获取应用实例中的中间件和插件
 */

import type { AppConfig, AppLike } from "../../common/types/index.ts";
import type { Middleware, Plugin } from "../../common/types/index.ts";
import type { MiddlewareManager } from "../../core/middleware.ts";
import type { PluginManager } from "../../core/plugin.ts";
import * as path from "@std/path";

/**
 * 查找 main.ts 文件
 * @param appName 应用名称（多应用模式下使用，如 'backend'）
 * @returns main.ts 文件路径，如果找不到返回 null
 */
export async function findMainFile(
  appName?: string,
  outDir?: string,
): Promise<string | null> {
  const cwd = Deno.cwd();
  const isDev = Deno.env.get("DENO_ENV") === "development";

  if (!isDev && outDir) {
    const distDirs = [
      appName ? `${outDir}/${appName}` : null,
      outDir,
    ].filter(Boolean) as string[];

    for (const dir of distDirs) {
      try {
        const manifestPath = path.join(cwd, dir, "manifest.json");
        const content = await Deno.readTextFile(manifestPath);
        const manifest = JSON.parse(content);

        if (manifest.entry) {
          const entryPath = path.join(cwd, dir, manifest.entry);
          const stat = await Deno.stat(entryPath);
          if (stat.isFile) {
            return entryPath;
          }
        }
      } catch {
        // 忽略错误，继续查找
      }
    }
  }

  const possiblePaths: string[] = [];

  // 如果指定了应用名称（多应用模式），优先查找应用目录下的 main.ts
  if (appName) {
    possiblePaths.push(
      // src 下的多应用结构
      `src/${appName}/main.ts`,
      `src/${appName}/main.js`,
      // 兼容根目录多应用结构
      `${appName}/main.ts`,
      `${appName}/main.js`,
    );
  }

  // 然后查找根目录和 example 目录
  possiblePaths.push(
    // 优先 src 目录
    "src/main.ts",
    "src/main.js",
    // 兼容根目录
    "main.ts",
    "main.js",
    // 示例项目两种结构
    "src/example/main.ts",
    "src/example/main.js",
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
 * 加载 main.ts 文件并获取应用实例或配置对象
 * @param appName 应用名称（多应用模式下使用，如 'backend'）
 * @param outDir 构建输出目录（可选，默认为 "dist"）
 * @returns 应用实例或配置对象，如果找不到 main.ts 返回 null
 */
export async function loadMainApp(
  appName?: string,
  outDir?: string,
): Promise<AppLike | AppConfig | null> {
  try {
    const mainPath = await findMainFile(appName, outDir);
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

    // 获取默认导出（应用实例或配置对象）
    const appOrConfig = mainModule.default || mainModule.app ||
      mainModule.config || mainModule;

    // 1. 验证是否是有效的应用实例 (AppLike)
    if (
      appOrConfig && typeof appOrConfig.use === "function" &&
      typeof appOrConfig.plugin === "function"
    ) {
      return appOrConfig as AppLike;
    }

    // 2. 验证是否是配置对象 (AppConfig)
    // 检查是否包含 plugins 或 middleware 数组，或者是空对象（如果用户只配置了其他选项）
    // 为了安全起见，我们至少要求它是一个对象
    if (appOrConfig && typeof appOrConfig === "object") {
      // 简单的鸭子类型检查：如果有 middleware 或 plugins 数组，或者它看起来像个配置对象
      if (
        Array.isArray(appOrConfig.middleware) ||
        Array.isArray(appOrConfig.plugins)
      ) {
        return appOrConfig as AppConfig;
      }
      // 如果它既不是 AppLike 也不是显式的 AppConfig（没有 middleware/plugins），
      // 但它是一个对象，我们可能需要更宽松的检查，或者假设它就是 Config？
      // 但 main.ts 可能会导出其他东西。
      // 让我们保守一点，只接受有 middleware 或 plugins 的对象，或者显式声明为 config 的（我们无法检查类型声明）。
      // 或者我们可以假设如果它不是 AppLike，且是 main.ts 的 default export，那它就是 Config。
      return appOrConfig as AppConfig;
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
