/**
 * 应用配置管理（@dreamer/config 集成）
 *
 * 加载 main.ts、main.{env}.ts、params.ts、params.{env}.ts，深度合并、验证、环境变量支持。
 * 提供 getConfig、getConfigValue、getParams 等配置访问 API。
 *
 * infer / validate / merge 逻辑见同目录 `config-infer`、`config-validate`、`config-merge`。
 *
 * @module
 */

import {
  ConfigManager,
  type ConfigManagerOptions,
  createConfigManager,
  preloadDotEnvSync,
} from "@dreamer/config";
import type { ServiceContainer } from "@dreamer/service";
import { pathToFileURL } from "node:url";
import type { AppConfig } from "../types/app.ts";
import { isPathWithinProject } from "../utils/path.ts";
import { configProfileFromRuntimeEnv } from "../utils/runtime.ts";
import { cwd, realPath, resolve, stat } from "./runtime-adapter.ts";
import { deepMergeConfig, deepMergeParams } from "./config-merge.ts";
import { validateConfig } from "./config-validate.ts";
import { preloadProjectEnvSync } from "../utils/env-loader.ts";

export { inferConfigDirectoryFromEntry } from "./config-infer.ts";
export { deepMergeConfig } from "./config-merge.ts";
export { validateConfig } from "./config-validate.ts";

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
    const absPath = filePath.startsWith("/")
      ? filePath
      : resolve(cwd(), filePath);
    const resolvedPath = await realPath(absPath);
    // 热重载时仅加载项目目录内的配置，防止加载任意路径
    if (!isPathWithinProject(resolvedPath)) {
      return null;
    }
    const fileUrl = pathToFileURL(resolvedPath).href;
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
 * 加载框架配置（main.ts 系列）
 * 使用深度合并：`main.ts` →（`env` 为 `build`/`start` 时）`main.prod.ts` → `main.{env}.ts`。
 * `env` 由 {@link configProfileFromRuntimeEnv} 提供，与 `RUNTIME_ENV` 一致（`dev` | `build` | `start`）。
 *
 * @param directory 配置目录
 * @param env 与 `RUNTIME_ENV` 对应的 `dev` / `build` / `start`
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
      config = deepMergeConfig(config, mainConfig as AppConfig);
    }
  }

  // 2. build / start：先合并 main.prod（与仅维护 main.prod 的约定兼容），再由 main.build / main.start 覆盖
  if (env === "build" || env === "start") {
    const prodPath = `${directory}/main.prod.ts`;
    if (await fileExists(prodPath)) {
      const prodConfig = await loadModuleConfig(prodPath);
      if (prodConfig) {
        config = deepMergeConfig(config, prodConfig as AppConfig);
      }
    }
  }

  // 3. 加载 main.{env}.ts
  const envMainPath = `${directory}/main.${env}.ts`;
  if (await fileExists(envMainPath)) {
    const envConfig = await loadModuleConfig(envMainPath);
    if (envConfig) {
      config = deepMergeConfig(config, envConfig as AppConfig);
    }
  }

  return config;
}

/**
 * 加载业务配置（params.ts、params.{env}.ts），合并顺序与 {@link loadMainConfig} 一致
 * （`build`/`start` 时先合 `params.prod.ts` 再合 `params.{env}.ts`）。
 *
 * @param directory 配置目录
 * @param env 与 `RUNTIME_ENV` 一致
 * @returns 合并后的业务配置对象
 */
async function loadParamsConfig(
  directory: string,
  env: string,
): Promise<Record<string, unknown>> {
  let params: Record<string, unknown> = {};
  const paramsPath = `${directory}/params.ts`;
  if (await fileExists(paramsPath)) {
    const baseParams = await loadModuleConfig(paramsPath);
    if (baseParams && typeof baseParams === "object") {
      params = deepMergeParams(params, baseParams as Record<string, unknown>);
    }
  }
  if (env === "build" || env === "start") {
    const prodPath = `${directory}/params.prod.ts`;
    if (await fileExists(prodPath)) {
      const prodParams = await loadModuleConfig(prodPath);
      if (prodParams && typeof prodParams === "object") {
        params = deepMergeParams(params, prodParams as Record<string, unknown>);
      }
    }
  }
  const envParamsPath = `${directory}/params.${env}.ts`;
  if (await fileExists(envParamsPath)) {
    const envParams = await loadModuleConfig(envParamsPath);
    if (envParams && typeof envParams === "object") {
      params = deepMergeParams(params, envParams as Record<string, unknown>);
    }
  }
  return params;
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
 *
 * @example
 * ```ts
 * const container = initializeServiceContainer();
 * const configManager = await initializeConfigManager(container, {
 *   directories: ["./config"],
 * });
 * ```
 */
export async function initializeConfigManager(
  container: ServiceContainer,
  options: ConfigManagerOptions & { directories?: string[] } = {},
): Promise<ConfigManager> {
  // 默认同时检查 ./config 与 ./src/config，兼容两种项目结构
  const directories = options.directories || ["./config", "./src/config"];
  /**
   * 自动探测并合并当前项目所有分层 .env（.env、.env.local、.env.[mode]、.env.[mode].local 等）
   * 使 `getEnv` 在加载 `config/main.ts` 时可用；`main`/`params` 分层名由 {@link configProfileFromRuntimeEnv} 仅根据 `RUNTIME_ENV` 决定。
   */
  preloadProjectEnvSync({ extraDirectories: directories, override: false });
  preloadDotEnvSync([".", ...directories], { override: false });
  const env = configProfileFromRuntimeEnv();

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

  // 加载业务配置（params.ts、params.{env}.ts）
  let paramsConfig: Record<string, unknown> = {};

  for (const commonPath of commonConfigPaths) {
    const commonParams = await loadParamsConfig(commonPath, env);
    if (Object.keys(commonParams).length > 0) {
      paramsConfig = deepMergeParams(paramsConfig, commonParams);
      break;
    }
  }
  for (const dir of directories) {
    const dirConfig = await loadParamsConfig(dir, env);
    paramsConfig = deepMergeParams(paramsConfig, dirConfig);
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
 *
 * @example
 * ```ts
 * const configManager = getConfigManager(container);
 * const value = configManager.get("app.name");
 * ```
 */
export function getConfigManager(container: ServiceContainer): ConfigManager {
  return container.get<ConfigManager>("configManager");
}

/**
 * 获取配置对象
 *
 * @param container 服务容器
 * @returns 应用配置对象（AppConfig）
 *
 * @example
 * ```ts
 * const config = getConfig(container);
 * console.log(config.name, config.version);
 * ```
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
 *
 * @example
 * ```ts
 * const name = getConfigValue<string>(container, "app.name", "default");
 * ```
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
 *
 * 业务配置来自 config/params.ts。
 *
 * @param container 服务容器
 * @returns 业务配置对象
 *
 * @example
 * ```ts
 * const params = getParams(container);
 * const timeout = params.api?.timeout;
 * ```
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
 * @param key 配置键（支持点号分隔的路径，如 "api.timeout"、"pagination.defaultPageSize"）
 * @param defaultValue 默认值（可选）
 * @returns 配置值
 *
 * @example
 * ```ts
 * const timeout = getParamValue<number>(container, "api.timeout", 30000);
 * ```
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
