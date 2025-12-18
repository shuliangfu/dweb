/**
 * 配置管理模块
 * 负责读取和解析 dweb.config.ts 配置文件
 */

import type { DWebConfig, AppConfig } from '../types/index.ts';

import { findConfigFile } from "../utils/file.ts";


/**
 * 加载配置文件
 * @param configPath 配置文件路径，如果不提供则自动查找
 * @param appName 应用名称（可选，用于多应用模式），例如 "backend"
 * @returns 配置对象和配置文件所在目录（总是返回单应用配置）
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
              server: matchedApp.server,
              routes: matchedApp.routes,
              cookie: matchedApp.cookie || config.cookie,
              session: matchedApp.session || config.session,
              middleware: [...(config.middleware || []), ...(matchedApp.middleware || [])],
              plugins: [...(config.plugins || []), ...(matchedApp.plugins || [])],
              build: matchedApp.build,
              dev: config.dev,
              staticDir: matchedApp.staticDir || config.staticDir || 'public',
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
 * @param config 配置对象
 * @returns 是否为多应用模式
 */
export function isMultiAppMode(config: DWebConfig): config is AppConfig {
  return 'apps' in config && Array.isArray(config.apps);
}

/**
 * 规范化路由配置
 * @param routes 路由配置（可能是字符串或对象）
 * @returns 规范化的路由配置对象
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
 * @param baseConfig 基础配置（顶层配置）
 * @param appConfig 应用配置
 * @returns 合并后的配置
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
