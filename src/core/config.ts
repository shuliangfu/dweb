/**
 * 配置管理模块
 * 负责读取和解析 dweb.config.ts 配置文件
 *
 * @module core/config
 */

import type { AppConfig, DWebConfig } from "../common/types/index.ts";
import * as path from "@std/path";
import { deepMerge } from "../common/utils/utils.ts";

import { findConfigFile } from "../server/utils/file.ts";

/**
 * 加载配置文件
 *
 * 从指定路径加载 DWeb 配置文件，支持单应用和多应用模式。
 * 如果未提供路径，会自动查找配置文件。
 *
 * @param configPath - 配置文件路径（可选，如果不提供则自动查找 'dweb.config.ts'）
 * @param appName - 应用名称（可选，用于多应用模式），例如 "backend"
 * @returns Promise<{ config: AppConfig; configDir: string }> - 配置对象和配置文件所在目录
 *
 * @throws {Error} 如果配置文件不存在、格式错误或应用名称不存在（多应用模式）
 *
 * @example
 * ```ts
 * import { loadConfig } from "@dreamer/dweb";
 *
 * // 单应用模式
 * const { config, configDir } = await loadConfig();
 *
 * // 多应用模式
 * const { config, configDir } = await loadConfig("dweb.config.ts", "app1");
 * ```
 */
export async function loadConfig(
  configPath?: string,
  appName?: string,
): Promise<{ config: AppConfig; configDir: string }> {
  try {
    const originalCwd = Deno.cwd();

    // 如果没有提供路径，自动查找
    if (!configPath) {
      const foundPath = await findConfigFile();
      if (!foundPath) {
        throw new Error(
          "未找到 dweb.config.ts 文件，请确保在项目根目录或 example 目录下运行",
        );
      }
      configPath = foundPath;
    }

    // 如果配置文件在子目录中，切换到该目录
    const configDir = configPath.includes("/")
      ? configPath.substring(0, configPath.lastIndexOf("/"))
      : originalCwd;

    if (configDir !== originalCwd && configDir !== ".") {
      Deno.chdir(configDir);
    }

    // 读取配置文件（使用相对于配置目录的路径）
    const configFileName = configPath.includes("/")
      ? configPath.substring(configPath.lastIndexOf("/") + 1)
      : configPath;
    const configUrl = new URL(configFileName, `file://${Deno.cwd()}/`).href;
    const configModule = await import(configUrl);

    // 获取默认导出
    const config: DWebConfig = configModule.default || configModule;

    // 验证配置
    let finalConfig: AppConfig;

    // 如果是多应用模式
    const isMultiApp = "apps" in config && Array.isArray(config.apps);
    if (isMultiApp) {
      // 如果指定了应用名称，查找对应的应用配置
      if (appName) {
        const matchedApp = config.apps?.find((app) => app.name === appName);
        if (!matchedApp) {
          throw new Error(
            `未找到应用 "${appName}"，可用应用: ${
              config.apps?.map((app) => app.name).join(", ") || "无"
            }`,
          );
        }

        // 合并应用配置和顶层配置，返回 AppConfig
        // 注意：database 配置只能来自根配置，子应用配置中不允许包含 database
        console.debug(
          `[Config] 合并应用配置: appName=${matchedApp.name}, basePlugins=${
            config.plugins?.length || 0
          }, appPlugins=${matchedApp.plugins?.length || 0}`,
        );
        finalConfig = mergeConfig(config, matchedApp as AppConfig);
        console.debug(
          `[Config] 合并后插件数量: ${finalConfig.plugins?.length || 0}`,
        );

        // 强制 database 配置只能来自根配置
        finalConfig.database = config.database;

        // 确保 name 和 basePath 正确
        finalConfig.name = matchedApp.name;
        if (matchedApp.basePath) {
          finalConfig.basePath = matchedApp.basePath;
        } else if (!finalConfig.basePath) {
          finalConfig.basePath = "/";
        }
      } else {
        // 多应用模式下，如果没有指定应用名称，抛出错误
        throw new Error(
          `多应用模式下，请指定应用名称。例如: deno run -A src/cli.ts dev:backend\n可用应用: ${
            config.apps?.map((app) => app.name).join(", ") || "无"
          }`,
        );
      }
    } else {
      finalConfig = config as AppConfig;
    }

    // 尝试加载并合并 main.ts 中的配置（如果有）
    // 优先级：main.ts > appConfig > baseConfig
    try {
      const { loadMainApp } = await import("../server/utils/app.ts");
      const mainAppOrConfig = await loadMainApp(
        finalConfig.name,
        finalConfig.build?.outDir,
      );

      if (mainAppOrConfig && typeof mainAppOrConfig === "object") {
        // 检查是否为 AppConfig (具有 middleware 或 plugins 数组，且不是 AppLike 实例)
        // AppLike 实例通常有 use 和 plugin 方法
        const isAppLike = typeof (mainAppOrConfig as any).use === "function" &&
          typeof (mainAppOrConfig as any).plugin === "function";

        if (!isAppLike) {
          const mainConfig = mainAppOrConfig as AppConfig;
          // 合并 main.ts 配置到 finalConfig
          // 注意：这里 finalConfig 作为 baseConfig，mainConfig 作为 appConfig
          // 所以 main.ts 的配置会追加到 finalConfig 的配置后面
          finalConfig = mergeConfig(finalConfig, mainConfig);
          console.debug(
            `[Config] 合并 main.ts 配置: plugins=${
              mainConfig.plugins?.length || 0
            }, middleware=${mainConfig.middleware?.length || 0}`,
          );
        }
      }
    } catch (error) {
      // 记录 main.ts 加载错误，但不抛出异常（main.ts 是可选的）
      console.warn(
        "[Config] 加载 main.ts 失败:",
        error instanceof Error ? error.message : String(error),
      );
    }

    // 验证合并后的配置
    validateConfig(finalConfig);

    return { config: finalConfig, configDir: Deno.cwd() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`加载配置文件失败: ${message}`);
  }
}

/**
 * 验证配置
 * @param config 配置对象
 */
function validateConfig(config: unknown): void {
  if (!config || typeof config !== "object") {
    throw new Error("配置文件不能为空");
  }

  const configObj = config as Record<string, unknown>;

  // 单应用模式
  const server = configObj.server as { port?: number } | undefined;
  if (!server || !server.port) {
    throw new Error("单应用模式下，必须配置 server.port");
  }
  if (!configObj.routes) {
    throw new Error("单应用模式下，必须配置 routes");
  }
  const build = configObj.build as { outDir?: string } | undefined;
  if (!build || !build.outDir) {
    throw new Error("单应用模式下，必须配置 build.outDir");
  }
}

/**
 * 判断是否为多应用模式
 *
 * 直接读取 dweb.config.ts 文件，检查配置是否包含 `apps` 属性来判断是否为多应用模式。
 *
 * @returns Promise<boolean> - 如果返回 true，则是多应用模式
 *
 * @example
 * ```ts
 * import { isMultiAppMode } from "@dreamer/dweb";
 *
 * if (await isMultiAppMode()) {
 *   // 多应用模式
 *   console.log("多应用模式");
 * } else {
 *   // 单应用模式
 *   console.log("单应用模式");
 * }
 * ```
 */
export async function isMultiAppMode(): Promise<boolean> {
  try {
    const configPath = await findConfigFile();
    if (!configPath) {
      return false;
    }

    const configUrl = new URL(configPath, `file://${Deno.cwd()}/`).href;

    // 动态导入配置文件
    const configModule = await import(configUrl);

    const config: DWebConfig = configModule.default || configModule;

    return "apps" in config && Array.isArray(config.apps);
  } catch {
    // 如果读取失败，返回 false（单应用模式）
    return false;
  }
}

/**
 * 规范化路由配置
 *
 * 将字符串形式的路由配置转换为对象形式，或确保对象配置包含所有必需的字段。
 *
 * @param routes - 路由配置，可以是字符串（目录路径）或配置对象
 * @returns 规范化后的路由配置对象
 *
 * @example
 * ```ts
 * import { normalizeRouteConfig } from "@dreamer/dweb";
 *
 * // 字符串形式
 * const config1 = normalizeRouteConfig("routes");
 * // { dir: "routes", ignore: undefined, cache: undefined, priority: undefined }
 *
 * // 对象形式
 * const config2 = normalizeRouteConfig({
 *   dir: "routes",
 *   ignore: ["**\/*.test.ts"],
 *   priority: "specific-first",
 * });
 * ```
 */
export function normalizeRouteConfig(
  routes:
    | string
    | {
      dir: string;
      ignore?: string[];
      cache?: boolean;
      priority?: "specific-first" | "order";
      apiDir?: string;
    },
): {
  dir: string;
  ignore?: string[];
  cache?: boolean;
  priority?: "specific-first" | "order";
  apiDir?: string;
} {
  if (typeof routes === "string") {
    return { dir: routes };
  }
  // 如果没有配置 apiDir，默认使用 routes/api
  if (!routes.apiDir) {
    routes.apiDir = path.join(routes.dir, "api");
  }
  return routes;
}

/**
 * 合并配置（用于多应用模式）
 *
 * 将基础配置和应用配置合并，应用配置会覆盖基础配置中的相同字段。
 * 对于对象类型的配置（如 cookie、session），会进行深度合并。
 *
 * @param baseConfig - 基础配置（顶层配置，部分配置）
 * @param appConfig - 应用配置（完整配置）
 * @returns 合并后的完整配置对象
 */
export function mergeConfig(
  baseConfig: Partial<AppConfig>,
  appConfig: AppConfig,
): AppConfig {
  // 先保存数组配置（在 deepMerge 之前），因为 deepMerge 会覆盖数组
  const baseMiddleware = (baseConfig.middleware || []) as any[];
  const appMiddleware = (appConfig.middleware || []) as any[];
  const basePlugins = (baseConfig.plugins || []) as any[];
  const appPlugins = (appConfig.plugins || []) as any[];

  // 使用 deepMerge 进行基础合并
  // deepMerge 会递归合并所有嵌套对象（如 cookie、session、build、static、dev、render、prefetch、websocket、graphql、logging、cache、security、database 等）
  // 对于基本类型（如 name、basePath、isProduction），会直接覆盖
  // 对于数组类型（如 middleware、plugins），deepMerge 会直接覆盖，所以我们需要特殊处理
  const merged = deepMerge(
    baseConfig as Record<string, unknown>,
    appConfig as Record<string, unknown>,
  ) as AppConfig;

  // 特殊处理：数组配置（中间件和插件）需要拼接而不是覆盖
  // 注意：deepMerge 会直接覆盖数组，所以我们需要在这里重新合并数组
  // 使用之前保存的数组配置，确保不会重复
  // 去重：根据插件的 name 属性去重，保留第一个出现的
  if (baseMiddleware.length > 0 || appMiddleware.length > 0) {
    const allMiddleware = [...baseMiddleware, ...appMiddleware];
    // 中间件去重：根据 name 属性（如果有）或函数引用去重
    const uniqueMiddleware: any[] = [];
    const seenMiddlewareNames = new Set<string>();
    const seenMiddlewareFuncs = new WeakSet<(...args: any[]) => any>();
    for (const middleware of allMiddleware) {
      let shouldAdd = false;
      if (
        middleware && typeof middleware === "object" && "name" in middleware
      ) {
        const name = (middleware as any).name;
        if (name && !seenMiddlewareNames.has(name)) {
          seenMiddlewareNames.add(name);
          shouldAdd = true;
        }
      } else if (typeof middleware === "function") {
        if (!seenMiddlewareFuncs.has(middleware)) {
          seenMiddlewareFuncs.add(middleware);
          shouldAdd = true;
        }
      } else {
        // 其他类型，直接添加
        shouldAdd = true;
      }
      if (shouldAdd) {
        uniqueMiddleware.push(middleware);
      }
    }
    merged.middleware = uniqueMiddleware;
    console.debug(
      `[mergeConfig] 合并中间件: base=${baseMiddleware.length}, app=${appMiddleware.length}, 去重后=${merged.middleware.length}`,
    );
  }

  if (basePlugins.length > 0 || appPlugins.length > 0) {
    const allPlugins = [...basePlugins, ...appPlugins];
    // 插件去重：根据插件的 name 属性去重，保留第一个出现的
    const uniquePlugins: any[] = [];
    const seenPluginNames = new Set<string>();
    for (const plugin of allPlugins) {
      const pluginName = (plugin as any)?.name;
      if (pluginName && !seenPluginNames.has(pluginName)) {
        seenPluginNames.add(pluginName);
        uniquePlugins.push(plugin);
      } else if (!pluginName) {
        // 没有 name 的插件，直接添加（可能是配置对象）
        uniquePlugins.push(plugin);
      }
      // 如果有 name 且已存在，跳过（去重）
    }
    merged.plugins = uniquePlugins;
    console.debug(
      `[mergeConfig] 合并插件: base=${basePlugins.length}, app=${appPlugins.length}, 去重后=${merged.plugins.length}`,
    );
    // 调试：打印每个插件的名称
    merged.plugins.forEach((plugin: any, index: number) => {
      console.debug(
        `[mergeConfig] plugin[${index}]: name=${plugin.name || "unknown"}`,
      );
    });
  }

  // 特殊处理：路由配置规范化
  if (merged.routes) {
    merged.routes = normalizeRouteConfig(merged.routes);
  }

  // 确保 routes 不为 undefined
  if (!merged.routes) {
    throw new Error("应用配置必须包含 routes");
  }

  // 删除 apps 字段
  delete merged.apps;

  return merged;
}
