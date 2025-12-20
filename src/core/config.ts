/**
 * 配置管理模块
 * 负责读取和解析 dweb.config.ts 配置文件
 * 
 * @module core/config
 */

import type { DWebConfig, AppConfig } from '../types/index.ts';

import { findConfigFile } from "../utils/file.ts";


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
  appName?: string
): Promise<{ config: AppConfig; configDir: string }> {
  try {
    const originalCwd = Deno.cwd();

    // 如果没有提供路径，自动查找
    if (!configPath) {
      const foundPath = await findConfigFile();
      if (!foundPath) {
        throw new Error('未找到 dweb.config.ts 文件，请确保在项目根目录或 example 目录下运行');
      }
      configPath = foundPath;
    }

    // 如果配置文件在子目录中，切换到该目录
    const configDir = configPath.includes('/')
      ? configPath.substring(0, configPath.lastIndexOf('/'))
      : originalCwd;

    if (configDir !== originalCwd && configDir !== '.') {
      Deno.chdir(configDir);
    }

    // 读取配置文件（使用相对于配置目录的路径）
    const configFileName = configPath.includes('/')
      ? configPath.substring(configPath.lastIndexOf('/') + 1)
      : configPath;
    const configUrl = new URL(configFileName, `file://${Deno.cwd()}/`).href;
    const configModule = await import(configUrl);

    // 获取默认导出
    const config: DWebConfig = configModule.default || configModule;

    // 如果是多应用模式
    if (isMultiAppMode(config)) {
      // 如果指定了应用名称，查找对应的应用配置
        if (appName) {
          const matchedApp = config.apps?.find((app) => app.name === appName);
        if (!matchedApp) {
          throw new Error(`未找到应用 "${appName}"，可用应用: ${config.apps?.map((app) => app.name).join(', ') || '无'}`);
        }
        
            // 合并应用配置和顶层配置，返回 AppConfig
            const mergedConfig: AppConfig = {
              name: matchedApp.name,
              basePath: matchedApp.basePath || '/',
              renderMode: matchedApp.renderMode, // 应用级别的 renderMode
              server: matchedApp.server,
              routes: matchedApp.routes,
              cookie: matchedApp.cookie || config.cookie,
              session: matchedApp.session || config.session,
              middleware: [...(config.middleware || []), ...(matchedApp.middleware || [])],
              plugins: [...(config.plugins || []), ...(matchedApp.plugins || [])],
              build: matchedApp.build,
              dev: config.dev,
              // 合并 static：优先使用应用配置，否则使用顶层配置
              static: matchedApp.static || config.static,
            };
            // 验证合并后的单应用配置
            validateConfig(mergedConfig);
            return { config: mergedConfig, configDir: Deno.cwd() };
      } else {
        // 多应用模式下，如果没有指定应用名称，抛出错误
      throw new Error(
          `多应用模式下，请指定应用名称。例如: deno run -A src/cli.ts dev:backend\n可用应用: ${config.apps?.map((app) => app.name).join(', ') || '无'}`
      );
      }
    }

    // 验证配置
    validateConfig(config);

    // 单应用模式，直接返回（已经是 AppConfig）
    return { config: config as AppConfig, configDir: Deno.cwd() };
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
  if (!config || typeof config !== 'object') {
    throw new Error('配置文件不能为空');
  }

  const configObj = config as Record<string, unknown>;

  // 单应用模式
  const server = configObj.server as { port?: number } | undefined;
  if (!server || !server.port) {
    throw new Error('单应用模式下，必须配置 server.port');
  }
  if (!configObj.routes) {
    throw new Error('单应用模式下，必须配置 routes');
  }
  const build = configObj.build as { outDir?: string } | undefined;
  if (!build || !build.outDir) {
    throw new Error('单应用模式下，必须配置 build.outDir');
  }
}

/**
 * 判断是否为多应用模式
 * 
 * 通过检查配置对象是否包含 `apps` 属性来判断是否为多应用模式。
 * 
 * @param config - 配置对象
 * @returns config is AppConfig - 类型守卫，如果返回 true，则 config 是多应用配置
 * 
 * @example
 * ```ts
 * import { isMultiAppMode } from "@dreamer/dweb";
 * 
 * if (isMultiAppMode(config)) {
 *   // config 是多应用配置，包含 apps 数组
 *   console.log("多应用模式，应用数量:", config.apps.length);
 * } else {
 *   // config 是单应用配置
 *   console.log("单应用模式");
 * }
 * ```
 */
export function isMultiAppMode(config: DWebConfig): config is AppConfig {
  return 'apps' in config && Array.isArray(config.apps);
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
    | { dir: string; ignore?: string[]; cache?: boolean; priority?: 'specific-first' | 'order' }
): { dir: string; ignore?: string[]; cache?: boolean; priority?: 'specific-first' | 'order' } {
  if (typeof routes === 'string') {
    return { dir: routes };
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
 * 
 * @example
 * ```ts
 * import { mergeConfig } from "@dreamer/dweb";
 * 
 * const base = { 
 *   server: { port: 3000 },
 *   cookie: { secret: "base-secret" },
 * };
 * const app = {
 *   server: { port: 3001, host: "localhost" },
 *   routes: { dir: "routes" },
 *   cookie: { secret: "app-secret", httpOnly: true },
 * };
 * 
 * const merged = mergeConfig(base, app);
 * // { 
 * //   server: { port: 3001, host: "localhost" },
 * //   routes: { dir: "routes" },
 * //   cookie: { secret: "app-secret", httpOnly: true }
 * // }
 * ```
 */
export function mergeConfig(
  baseConfig: Partial<AppConfig>,
  appConfig: AppConfig
): AppConfig {
  const merged = { ...baseConfig };

  // 深度合并对象配置
  if (baseConfig.cookie && appConfig.cookie) {
    merged.cookie = { ...baseConfig.cookie, ...appConfig.cookie };
  } else if (appConfig.cookie) {
    merged.cookie = appConfig.cookie;
  }

  if (baseConfig.session && appConfig.session) {
    merged.session = { ...baseConfig.session, ...appConfig.session };
  } else if (appConfig.session) {
    merged.session = appConfig.session;
  }

  if (baseConfig.routes && appConfig.routes) {
    const baseRoutes = normalizeRouteConfig(baseConfig.routes);
    const appRoutes = normalizeRouteConfig(appConfig.routes);
    merged.routes = { ...baseRoutes, ...appRoutes };
  } else if (appConfig.routes) {
    merged.routes = appConfig.routes;
  } else if (baseConfig.routes) {
    merged.routes = baseConfig.routes;
  }

  // 合并数组配置（中间件和插件）
  if (baseConfig.middleware || appConfig.middleware) {
    merged.middleware = [...(baseConfig.middleware || []), ...(appConfig.middleware || [])];
  }

  if (baseConfig.plugins || appConfig.plugins) {
    merged.plugins = [...(baseConfig.plugins || []), ...(appConfig.plugins || [])];
  }

  // 应用配置覆盖基础配置
  // 确保 routes 不为 undefined（appConfig.routes 是必需的）
  const finalRoutes = merged.routes || appConfig.routes;
  if (!finalRoutes) {
    throw new Error('应用配置必须包含 routes');
  }

  return {
    ...merged,
    ...appConfig,
    // 确保这些配置不被覆盖
    cookie: merged.cookie,
    session: merged.session,
    routes: finalRoutes,
    middleware: merged.middleware,
    plugins: merged.plugins,
  };
}
