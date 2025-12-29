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

  console.debug(
    `[findMainFile] 开始查找: appName=${appName}, outDir=${outDir}, cwd=${cwd}, isDev=${isDev}`,
  );

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
            console.debug(`[findMainFile] 在生产环境找到: ${entryPath}`);
            return entryPath;
          }
        }
      } catch (error) {
        console.debug(
          `[findMainFile] 生产环境查找失败: ${dir}, 错误: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        // 忽略错误，继续查找
      }
    }
  }

  const possiblePaths: string[] = [];

  // 如果指定了应用名称（多应用模式），优先查找应用目录下的 main.ts
  if (appName) {
    possiblePaths.push(
      // src 下的多应用结构
      `main.ts`,
      // 兼容根目录多应用结构
      `${appName}/main.ts`,
    );
  }

  for (const filePath of possiblePaths) {
    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(cwd, filePath);
      const stat = await Deno.stat(fullPath);
      if (stat.isFile) {
        console.debug(`[findMainFile] 找到文件: ${fullPath}`);
        return fullPath;
      }
    } catch (error) {
      console.debug(
        `[findMainFile] 文件不存在: ${filePath}, 错误: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // 文件不存在，继续查找
      continue;
    }
  }

  console.debug(`[findMainFile] 未找到 main.ts 文件`);
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
    console.debug(
      `[loadMainApp] 开始查找 main.ts: appName=${appName}, outDir=${outDir}, cwd=${Deno.cwd()}`,
    );
    const mainPath = await findMainFile(appName, outDir);
    if (!mainPath) {
      console.debug(
        `[loadMainApp] 未找到 main.ts 文件: appName=${appName}, outDir=${outDir}`,
      );
      return null;
    }

    console.debug(`[loadMainApp] 找到 main.ts: ${mainPath}`);

    // 转换为绝对路径
    const absolutePath = path.isAbsolute(mainPath)
      ? mainPath
      : path.resolve(Deno.cwd(), mainPath);

    console.debug(`[loadMainApp] 绝对路径: ${absolutePath}`);

    // 转换为 file:// URL
    const mainUrl = path.toFileUrl(absolutePath).href;

    console.debug(`[loadMainApp] 导入 URL: ${mainUrl}`);

    // 导入 main.ts
    const mainModule = await import(mainUrl);

    console.debug(
      `[loadMainApp] 导入成功，模块键: ${Object.keys(mainModule).join(", ")}`,
    );

    // 获取默认导出（应用实例或配置对象）
    // 优先级：default > app > config > appConfig > 整个模块
    let appOrConfig = mainModule.default;
    if (!appOrConfig && mainModule.app) {
      appOrConfig = mainModule.app;
    }
    if (!appOrConfig && mainModule.config) {
      appOrConfig = mainModule.config;
    }
    // 兼容 appConfig 导出（有些项目可能使用 export const appConfig）
    if (!appOrConfig && (mainModule as any).appConfig) {
      appOrConfig = (mainModule as any).appConfig;
    }
    // 如果都没有，检查模块本身是否是配置对象
    if (!appOrConfig && typeof mainModule === "object" && mainModule !== null) {
      // 如果模块本身有 middleware 或 plugins，说明模块本身就是配置对象
      if (
        Array.isArray((mainModule as any).middleware) ||
        Array.isArray((mainModule as any).plugins)
      ) {
        appOrConfig = mainModule as any;
      }
    }

    console.debug(
      `[loadMainApp] 导出对象类型: ${typeof appOrConfig}, 是否为对象: ${
        typeof appOrConfig === "object" && appOrConfig !== null
      }`,
    );

    if (appOrConfig && typeof appOrConfig === "object") {
      console.debug(
        `[loadMainApp] 导出对象键: ${Object.keys(appOrConfig).join(", ")}`,
      );
      console.debug(
        `[loadMainApp] 是否有 middleware: ${
          Array.isArray(appOrConfig.middleware)
        }, 是否有 plugins: ${Array.isArray(appOrConfig.plugins)}`,
      );
      if (Array.isArray(appOrConfig.plugins)) {
        console.debug(
          `[loadMainApp] plugins 数量: ${appOrConfig.plugins.length}`,
        );
        appOrConfig.plugins.forEach((plugin: any, index: number) => {
          console.debug(
            `[loadMainApp] plugin[${index}]: name=${
              plugin.name || "unknown"
            }, onResponse=${!!plugin.onResponse}`,
          );
        });
      }
    }

    // 1. 验证是否是有效的应用实例 (AppLike)
    if (
      appOrConfig && typeof appOrConfig.use === "function" &&
      typeof appOrConfig.plugin === "function"
    ) {
      console.debug(`[loadMainApp] 识别为 AppLike 实例`);
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
        console.debug(
          `[loadMainApp] 识别为 AppConfig（有 middleware 或 plugins）`,
        );
        return appOrConfig as AppConfig;
      }
      // 如果它既不是 AppLike 也不是显式的 AppConfig（没有 middleware/plugins），
      // 但它是一个对象，我们可能需要更宽松的检查，或者假设它就是 Config？
      // 但 main.ts 可能会导出其他东西。
      // 让我们保守一点，只接受有 middleware 或 plugins 的对象，或者显式声明为 config 的（我们无法检查类型声明）。
      // 或者我们可以假设如果它不是 AppLike，且是 main.ts 的 default export，那它就是 Config。
      console.debug(
        `[loadMainApp] 识别为 AppConfig（默认，没有 middleware/plugins）`,
      );
      return appOrConfig as AppConfig;
    }

    console.debug(`[loadMainApp] 无法识别导出对象类型，返回 null`);
    return null;
  } catch (error) {
    // 加载失败时记录详细错误信息
    console.warn(
      "⚠️  加载 main.ts 失败:",
      error instanceof Error ? error.message : String(error),
    );
    if (error instanceof Error && error.stack) {
      console.warn("⚠️  错误堆栈:", error.stack);
    }
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
