/**
 * 应用配置管理（@dreamer/config 集成）
 *
 * 加载 main.ts、main.{env}.ts、params.ts，合并配置、验证、环境变量支持。
 * 提供 getConfig、getConfigValue、getParams 等配置访问 API。
 *
 * @module
 */

import {
  ConfigManager,
  type ConfigManagerOptions,
  createConfigManager,
} from "@dreamer/config";
import type {
  Middleware,
  MiddlewareCondition,
  MiddlewareContext,
} from "@dreamer/middleware";
import type { Plugin } from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";
import type { AppConfig } from "../types/app.ts";
import { cwd, getEnv, realPath, resolve, stat } from "./runtime-adapter.ts";

/**
 * 加载 TypeScript 模块配置
 *
 * 从 config/main.ts 等文件加载配置，应用名称（name）由此读取。
 * 使用绝对路径 + 规范化的 file:// URL，确保 Deno/Bun 能正确解析。
 */
async function loadModuleConfig(
  filePath: string,
): Promise<Record<string, unknown> | null> {
  try {
    // 相对路径先解析为基于 cwd 的绝对路径
    const absPath = filePath.startsWith("/")
      ? filePath
      : resolve(cwd(), filePath);
    const resolvedPath = await realPath(absPath);
    // 规范化 file:// URL：Windows 反斜杠转正斜杠，确保格式正确
    const normalized = resolvedPath.replace(/\\/g, "/");
    const fileUrl = `file://${
      normalized.startsWith("/") ? "" : "/"
    }${normalized}`;
    const module = await import(fileUrl);
    return module.default || module;
  } catch {
    return null;
  }
}

/**
 * 检查文件是否存在
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取插件名称
 *
 * @param plugin 插件对象或路径
 * @returns 插件名称，如果无法获取则返回 null
 */
function getPluginName(
  plugin: unknown,
): string | null {
  if (typeof plugin === "string") {
    // 如果是字符串路径，尝试从路径提取名称
    const parts = plugin.split("/");
    const lastPart = parts[parts.length - 1];
    return lastPart.replace(/\.(ts|js)$/, "") || null;
  }
  if (plugin && typeof plugin === "object" && "name" in plugin) {
    return String(plugin.name) || null;
  }
  return null;
}

/**
 * 获取中间件名称
 *
 * @param middleware 中间件对象、函数或路径
 * @returns 中间件名称，如果无法获取则返回 null
 */
function getMiddlewareName(
  middleware: unknown,
): string | null {
  if (typeof middleware === "string") {
    // 如果是字符串路径，尝试从路径提取名称
    const parts = middleware.split("/");
    const lastPart = parts[parts.length - 1];
    return lastPart.replace(/\.(ts|js)$/, "") || null;
  }
  if (middleware && typeof middleware === "object") {
    if ("name" in middleware) {
      return String(middleware.name) || null;
    }
    // 如果是函数，尝试从函数名获取
    if (
      "middleware" in middleware && typeof middleware.middleware === "function"
    ) {
      return middleware.middleware.name || null;
    }
  }
  if (typeof middleware === "function") {
    return middleware.name || null;
  }
  return null;
}

/**
 * 验证应用配置
 *
 * 验证所有配置项的正确性，包括：
 * - 基础配置项的类型和值
 * - 中间件配置（必须提供名称）
 * - 插件配置（必须提供名称）
 * - 渲染配置（mode 必须是有效值）
 * - 其他配置项的类型检查
 *
 * 注意：通过配置注册的中间件和插件必须提供 name 属性，用于配置合并时识别重复
 * 通过 app.use() 直接注册的中间件可以不提供 name（允许自动生成）
 *
 * @param config 应用配置
 * @throws {Error} 如果配置项有错误，抛出详细的错误信息
 */
export function validateConfig(config: AppConfig): void {
  // 验证基础配置项
  if (config.name !== undefined && typeof config.name !== "string") {
    throw new Error(`配置项 'name' 必须是字符串类型`);
  }
  if (config.version !== undefined && typeof config.version !== "string") {
    throw new Error(`配置项 'version' 必须是字符串类型`);
  }
  if (
    config.configDirectory !== undefined &&
    typeof config.configDirectory !== "string"
  ) {
    throw new Error(`配置项 'configDirectory' 必须是字符串类型`);
  }
  if (config.envPrefix !== undefined && typeof config.envPrefix !== "string") {
    throw new Error(`配置项 'envPrefix' 必须是字符串类型`);
  }
  if (config.hotReload !== undefined && typeof config.hotReload !== "boolean") {
    throw new Error(`配置项 'hotReload' 必须是布尔类型`);
  }
  // 验证渲染配置
  if (config.render !== undefined) {
    if (typeof config.render !== "object" || config.render === null) {
      throw new Error(`配置项 'render' 必须是对象类型`);
    }
    if (
      config.render.engine !== undefined &&
      !["react", "preact"].includes(config.render.engine)
    ) {
      throw new Error(
        `配置项 'render.engine' 必须是 "react" 或 "preact" 之一`,
      );
    }
    if (
      config.render.mode !== undefined &&
      !["ssr", "csr", "ssg", "hybrid"].includes(config.render.mode)
    ) {
      throw new Error(
        `配置项 'render.mode' 必须是 "ssr"、"csr"、"ssg" 或 "hybrid" 之一`,
      );
    }
  }

  // 验证中间件配置（配置中的中间件必须提供名称）
  if (config.middlewares !== undefined) {
    if (!Array.isArray(config.middlewares)) {
      throw new Error(`配置项 'middlewares' 必须是数组类型`);
    }
    for (let i = 0; i < config.middlewares.length; i++) {
      const middlewareConfig = config.middlewares[i];
      let middlewareName: string | null = null;

      if (typeof middlewareConfig === "string") {
        // 如果是字符串路径，从路径提取名称
        const parts = middlewareConfig.split("/");
        const lastPart = parts[parts.length - 1];
        middlewareName = lastPart.replace(/\.(ts|js)$/, "") || null;

        // 检查是否有名称
        if (!middlewareName || middlewareName.trim() === "") {
          throw new Error(
            `配置中的中间件（索引 ${i}）路径 "${middlewareConfig}" 无法提取名称，请使用对象形式提供明确的 name 属性：` +
              `{ middleware: "${middlewareConfig}", name: "middleware-name" }`,
          );
        }
      } else if (typeof middlewareConfig === "function") {
        // 如果是中间件函数，尝试从函数名获取名称
        middlewareName = middlewareConfig.name || null;

        // 检查是否有名称（函数名也算）
        if (!middlewareName || middlewareName.trim() === "") {
          throw new Error(
            `配置中的中间件（索引 ${i}）必须提供名称（name 属性或函数名），用于配置合并时识别重复。` +
              `请使用对象形式：{ middleware: yourMiddleware, name: "middleware-name" } 或确保中间件函数有名称`,
          );
        }
      } else if (
        typeof middlewareConfig === "object" &&
        middlewareConfig !== null &&
        "middleware" in middlewareConfig
      ) {
        // 如果是带条件的中间件对象，必须提供 name 属性
        if (
          !middlewareConfig.name ||
          typeof middlewareConfig.name !== "string" ||
          middlewareConfig.name.trim() === ""
        ) {
          throw new Error(
            `配置中的中间件（索引 ${i}）对象必须提供 name 属性，用于配置合并时识别重复。` +
              `请使用：{ middleware: yourMiddleware, condition: {...}, name: "middleware-name" }`,
          );
        }
      } else {
        throw new Error(
          `配置中的中间件（索引 ${i}）类型无效，必须是字符串、函数或对象类型`,
        );
      }
    }
  }

  // 验证插件配置（配置中的插件必须提供名称）
  if (config.plugins !== undefined) {
    if (!Array.isArray(config.plugins)) {
      throw new Error(`配置项 'plugins' 必须是数组类型`);
    }
    for (let i = 0; i < config.plugins.length; i++) {
      const plugin = config.plugins[i];
      const pluginName = getPluginName(plugin);
      if (!pluginName || pluginName.trim() === "") {
        throw new Error(
          `配置中的插件（索引 ${i}）必须提供名称，用于配置合并时识别重复。` +
            `请使用对象形式：{ name: "plugin-name", ... } 或字符串路径（可从路径提取名称）`,
        );
      }
    }
  }

  // 验证服务器配置
  if (config.server !== undefined) {
    if (typeof config.server !== "object" || config.server === null) {
      throw new Error(`配置项 'server' 必须是对象类型`);
    }
  }

  // 验证路由配置
  if (config.router !== undefined) {
    if (typeof config.router !== "object" || config.router === null) {
      throw new Error(`配置项 'router' 必须是对象类型`);
    }
  }

  // 验证构建配置
  if (config.build !== undefined) {
    if (typeof config.build !== "object" || config.build === null) {
      throw new Error(`配置项 'build' 必须是对象类型`);
    }
  }

  // 验证日志配置
  if (config.logger !== undefined) {
    if (typeof config.logger !== "object" || config.logger === null) {
      throw new Error(`配置项 'logger' 必须是对象类型`);
    }
  }
}

/**
 * 深度合并配置对象
 *
 * 对于 plugins 和 middlewares 数组，会进行特殊处理：
 * - 如果 name 一致，则按优先级替换（后面的覆盖前面的）
 * - 如果 name 不一致，则追加到数组中
 *
 * @param target 目标配置对象
 * @param source 源配置对象
 * @returns 合并后的配置对象
 */
export function deepMergeConfig(
  target: AppConfig,
  source: AppConfig,
): AppConfig {
  const result = { ...target };

  for (const key in source) {
    if (!(key in source)) continue;

    const sourceValue = source[key];
    const targetValue = result[key];

    // 特殊处理 plugins 数组
    if (key === "plugins" && Array.isArray(sourceValue)) {
      if (!Array.isArray(targetValue)) {
        result[key] = [...sourceValue] as typeof sourceValue;
      } else {
        const mergedPlugins: Array<Plugin | string> = [...targetValue] as Array<
          Plugin | string
        >;
        for (const sourcePlugin of sourceValue) {
          const sourceName = getPluginName(sourcePlugin);
          if (sourceName) {
            // 查找是否有同名的插件
            const existingIndex = mergedPlugins.findIndex((p) =>
              getPluginName(p) === sourceName
            );
            if (existingIndex >= 0) {
              // 替换同名插件（按优先级）
              mergedPlugins[existingIndex] = sourcePlugin as Plugin | string;
            } else {
              // 追加新插件
              mergedPlugins.push(sourcePlugin as Plugin | string);
            }
          } else {
            // 无法获取名称，直接追加
            mergedPlugins.push(sourcePlugin as Plugin | string);
          }
        }
        result[key] = mergedPlugins as typeof sourceValue;
      }
      continue;
    }

    // 特殊处理 middlewares 数组
    if (key === "middlewares" && Array.isArray(sourceValue)) {
      // 定义中间件类型（与 AppConfig 中的类型一致）
      type MiddlewareConfig =
        | Middleware<MiddlewareContext>
        | string
        | {
          middleware: Middleware<MiddlewareContext> | string;
          condition?: MiddlewareCondition;
          name?: string;
        };

      if (!Array.isArray(targetValue)) {
        result[key] = [...sourceValue] as typeof sourceValue;
      } else {
        const mergedMiddlewares: Array<MiddlewareConfig> = [
          ...targetValue,
        ] as Array<MiddlewareConfig>;
        for (const sourceMiddleware of sourceValue) {
          const sourceName = getMiddlewareName(sourceMiddleware);
          if (sourceName) {
            // 查找是否有同名的中间件
            const existingIndex = mergedMiddlewares.findIndex((m) =>
              getMiddlewareName(m) === sourceName
            );
            if (existingIndex >= 0) {
              // 替换同名中间件（按优先级）
              mergedMiddlewares[existingIndex] =
                sourceMiddleware as MiddlewareConfig;
            } else {
              // 追加新中间件
              mergedMiddlewares.push(sourceMiddleware as MiddlewareConfig);
            }
          } else {
            // 无法获取名称，直接追加
            mergedMiddlewares.push(sourceMiddleware as MiddlewareConfig);
          }
        }
        result[key] = mergedMiddlewares as typeof sourceValue;
      }
      continue;
    }

    // 对于其他对象类型，进行深度合并
    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMergeConfig(
        targetValue as AppConfig,
        sourceValue as AppConfig,
      ) as typeof sourceValue;
    } else {
      // 其他情况直接覆盖
      result[key] = sourceValue;
    }
  }

  return result;
}

/**
 * 加载框架配置（main.ts 系列）
 * 支持：main.ts, main.{env}.ts
 *
 * @param directory 配置目录
 * @param env 环境名称
 * @returns 合并后的框架配置对象（AppConfig）
 */
async function loadMainConfig(
  directory: string,
  env: string,
): Promise<AppConfig> {
  let config: AppConfig = {};

  // 1. 加载 main.ts（基础框架配置）
  const mainPath = `${directory}/main.ts`;
  if (await fileExists(mainPath)) {
    const mainConfig = await loadModuleConfig(mainPath);
    if (mainConfig) {
      config = { ...config, ...mainConfig } as AppConfig;
    }
  }

  // 2. 加载 main.{env}.ts（环境特定框架配置，覆盖 main.ts）
  const envMainPath = `${directory}/main.${env}.ts`;
  if (await fileExists(envMainPath)) {
    const envConfig = await loadModuleConfig(envMainPath);
    if (envConfig) {
      config = { ...config, ...envConfig } as AppConfig;
    }
  }

  return config;
}

/**
 * 加载业务配置（params.ts）
 *
 * @param directory 配置目录
 * @returns 业务配置对象
 */
async function loadParamsConfig(
  directory: string,
): Promise<Record<string, unknown>> {
  const paramsPath = `${directory}/params.ts`;
  if (await fileExists(paramsPath)) {
    const paramsConfig = await loadModuleConfig(paramsPath);
    if (paramsConfig) {
      return paramsConfig;
    }
  }
  return {};
}

/**
 * 初始化配置管理器
 *
 * 配置加载优先级（从低到高）：
 * 1. common/config/main.ts（公共框架配置）
 * 2. 应用/config/main.ts（应用框架配置）
 * 3. 入口文件 main.ts 传入的配置（最高优先级）
 *
 * 本地配置文件（main.ts、params.ts）通过动态 import 加载，不会触发依赖下载。
 *
 * @param container 服务容器
 * @param options 配置选项
 * @returns 配置管理器实例
 */
export async function initializeConfigManager(
  container: ServiceContainer,
  options: ConfigManagerOptions & { directories?: string[] } = {},
): Promise<ConfigManager> {
  // 默认同时检查 ./config 与 ./src/config，兼容两种项目结构
  const directories = options.directories || ["./config", "./src/config"];
  // 直接从环境变量读取（兼容 Deno、Bun 和 Node.js）
  const env = getEnv("DENO_ENV") ||
    getEnv("BUN_ENV") ||
    getEnv("NODE_ENV") || "dev";

  // 加载框架配置（按优先级从低到高）
  let mainConfig: AppConfig = {};

  // 1. 先加载 common/config/main.ts（公共配置，优先级最低）
  const commonConfigPaths = [
    "./src/common/config",
    "./common/config",
  ];

  for (const commonPath of commonConfigPaths) {
    const commonConfig = await loadMainConfig(commonPath, env);
    if (Object.keys(commonConfig).length > 0) {
      mainConfig = deepMergeConfig(mainConfig, commonConfig);
      break;
    }
  }

  // 2. 加载应用自己的 config/main.ts（应用配置，优先级中等）
  for (const dir of directories) {
    const dirConfig = await loadMainConfig(dir, env);
    mainConfig = deepMergeConfig(mainConfig, dirConfig);
  }

  // 加载业务配置（params.ts）
  let paramsConfig: Record<string, unknown> = {};

  for (const commonPath of commonConfigPaths) {
    const commonParams = await loadParamsConfig(commonPath);
    if (Object.keys(commonParams).length > 0) {
      paramsConfig = { ...paramsConfig, ...commonParams };
      break;
    }
  }
  for (const dir of directories) {
    const dirConfig = await loadParamsConfig(dir);
    paramsConfig = { ...paramsConfig, ...dirConfig };
  }

  // 创建配置管理器实例（用于环境变量和配置管理）
  const configManager = createConfigManager({
    directories,
    env,
    envPrefix: options.envPrefix,
    hotReload: options.hotReload,
    onUpdate: options.onUpdate,
  });

  // 加载配置（会加载 mod.ts 或 config.json）
  await configManager.load();

  // 将框架配置合并到配置管理器（框架配置优先级高于 mod.ts/config.json）
  const existingConfig = configManager.getAll();
  mainConfig = deepMergeConfig(mainConfig, existingConfig as AppConfig);

  // 验证所有配置项（自动验证，确保配置正确性）
  validateConfig(mainConfig);

  // 将业务配置存储到 params key 下
  if (Object.keys(paramsConfig).length > 0) {
    configManager.set("params", paramsConfig);
  }

  // 将配置管理器注册到服务容器
  container.registerSingleton("configManager", () => configManager);

  // 将框架配置对象注册到服务容器（方便直接获取框架配置）
  container.registerSingleton("config", () => {
    return mainConfig as AppConfig;
  });

  // 将业务配置注册到服务容器（方便直接获取业务配置）
  container.registerSingleton("params", () => {
    return paramsConfig;
  });

  return configManager;
}

/**
 * 获取配置管理器实例
 *
 * @param container 服务容器
 * @returns 配置管理器实例
 */
export function getConfigManager(container: ServiceContainer): ConfigManager {
  return container.get<ConfigManager>("configManager");
}

/**
 * 获取配置对象
 *
 * @param container 服务容器
 * @returns 配置对象
 */
export function getConfig(container: ServiceContainer): AppConfig {
  return container.get<AppConfig>("config");
}

/**
 * 获取配置值
 *
 * @param container 服务容器
 * @param key 配置键（支持点号分隔的路径，如 "app.name"）
 * @param defaultValue 默认值（可选）
 * @returns 配置值
 */
export function getConfigValue<T = unknown>(
  container: ServiceContainer,
  key: string,
  defaultValue?: T,
): T {
  const configManager = getConfigManager(container);
  return configManager.get<T>(key, defaultValue);
}

/**
 * 获取业务配置对象
 * 业务配置来自 config/params.ts
 *
 * @param container 服务容器
 * @returns 业务配置对象
 */
export function getParams(
  container: ServiceContainer,
): Record<string, unknown> {
  return container.get<Record<string, unknown>>("params");
}

/**
 * 获取业务配置值
 *
 * @param container 服务容器
 * @param key 配置键（支持点号分隔的路径，如 "member.levels.bronze.name"）
 * @param defaultValue 默认值（可选）
 * @returns 配置值
 */
export function getParamValue<T = unknown>(
  container: ServiceContainer,
  key: string,
  defaultValue?: T,
): T {
  const params = getParams(container);
  const keys = key.split(".");
  let current: unknown = params;

  for (const k of keys) {
    if (current && typeof current === "object" && k in current) {
      current = (current as Record<string, unknown>)[k];
    } else {
      return defaultValue as T;
    }
  }

  return (current as T) ?? (defaultValue as T);
}

/**
 * 获取业务配置对象（getParams 的别名，保持向后兼容）
 *
 * @deprecated 使用 getParams 代替
 * @param container 服务容器
 * @returns 业务配置对象
 */
export function getBusinessConfig(
  container: ServiceContainer,
): Record<string, unknown> {
  return getParams(container);
}

/**
 * 获取业务配置值（getParamValue 的别名，保持向后兼容）
 *
 * @deprecated 使用 getParamValue 代替
 * @param container 服务容器
 * @param key 配置键（支持点号分隔的路径）
 * @param defaultValue 默认值（可选）
 * @returns 配置值
 */
export function getBusinessConfigValue<T = unknown>(
  container: ServiceContainer,
  key: string,
  defaultValue?: T,
): T {
  return getParamValue(container, key, defaultValue);
}
