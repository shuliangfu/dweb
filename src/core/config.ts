/**
 * 应用配置管理（@dreamer/config 集成）
 *
 * 加载 main.ts、main.{env}.ts、params.ts、params.{env}.ts，深度合并、验证、环境变量支持。
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
import { DwebErrorCode, throwDwebError } from "../utils/errors.ts";
import { $t } from "../utils/i18n.ts";
import { pathToFileURL } from "node:url";
import {
  cwd,
  existsSync,
  getEnv,
  join,
  realPath,
  resolve,
  stat,
} from "./runtime-adapter.ts";
import { isPathWithinProject } from "../utils/path.ts";

/** 入口 main 文件扩展名（预编译，避免重复创建） */
const RE_MAIN_EXT = /main\.(ts|tsx|js|jsx)$/;
/** 单应用开发 + src：/src/main.(ts|tsx|js|jsx) */
const RE_DEV_SINGLE_SRC = /^\/src\/main\.(ts|tsx|js|jsx)$/;
/** 单应用开发 无 src：main.(ts|tsx|js|jsx) */
const RE_DEV_SINGLE_NO_SRC = /^\/?main\.(ts|tsx|js|jsx)$/;
/** 多应用开发 + src：/src/<app>/main.(ts|tsx|js|jsx) */
const RE_DEV_MULTI_SRC = /^\/src\/([^/]+)\/main\.(ts|tsx|js|jsx)$/;
/** 多应用开发 无 src：<app>/main.(ts|tsx|js|jsx) */
const RE_DEV_MULTI_NO_SRC = /^\/?([^/]+)\/main\.(ts|tsx|js|jsx)$/;
/** 单应用生产：/<outputDir>/server.js */
const RE_PROD_SINGLE = /^\/([^/]+)\/server\.js$/;
/** 多应用生产：/<outputDir>/<app>/server.js */
const RE_PROD_MULTI = /^\/([^/]+)\/([^/]+)\/server\.js$/;

/**
 * 从归一化入口路径推断 config 目录（内部使用预编译正则）
 *
 * @param normalized 已去掉 cwd 的路径（相对根）
 * @param hasSrcDir 项目根目录是否存在 src/
 * @returns 推断出的 config 相对路径，或 null
 */
function matchConfigDirFromNormalizedPath(
  normalized: string,
  hasSrcDir: boolean,
): string | null {
  if (RE_MAIN_EXT.test(normalized)) {
    // 开发环境
    if (RE_DEV_SINGLE_SRC.test(normalized)) return join("src", "config");
    if (RE_DEV_SINGLE_NO_SRC.test(normalized)) return join("config");
    const m2 = RE_DEV_MULTI_SRC.exec(normalized);
    if (m2) return join("src", m2[1], "config");
    const m3 = RE_DEV_MULTI_NO_SRC.exec(normalized);
    if (m3) return join(m3[1], "config");
  } else {
    // 生产环境
    const m4 = RE_PROD_SINGLE.exec(normalized);
    if (m4) return hasSrcDir ? join("src", "config") : join("config");
    const m5 = RE_PROD_MULTI.exec(normalized);
    if (m5) {
      const appDir = m5[2];
      return hasSrcDir ? join("src", appDir, "config") : join(appDir, "config");
    }
  }
  return null;
}

/**
 * 从入口模块路径推断 config 目录
 *
 * 单应用：
 * - 开发：src/main.ts → src/config；main.ts → config
 * - 生产：<outputDir>/server.js → src/config（有 src 时）或 config（无 src 时）
 *
 * 多应用：
 * - 开发：src/<app>/main.ts → src/<app>/config；<app>/main.ts → <app>/config
 * - 生产：<outputDir>/<app>/server.js → src/<app>/config（有 src 时）或 <app>/config（无 src 时）
 *
 * @returns 推断出的 config 目录（相对 cwd）
 * @throws 无法推断时抛出 ENTRY_PATH_INVALID 异常，需显式指定 configDirectory
 */
export function inferConfigDirectoryFromEntry(): string {
  try {
    const deno = (globalThis as { Deno?: { mainModule?: string } }).Deno;
    const getPath = (): string | null => {
      if (deno?.mainModule) {
        const url = deno.mainModule;
        return url.startsWith("file://")
          ? decodeURIComponent(url.slice(7))
          : url;
      }
      const proc = (globalThis as { process?: { argv?: string[] } }).process;
      const argv1 = proc?.argv?.[1];
      return argv1 ? resolve(cwd(), argv1) : null;
    };

    const path = getPath();
    if (!path) {
      throwDwebError(DwebErrorCode.ENTRY_PATH_INVALID, {
        reason: $t("errors.entryPathInvalidReasonNoPath"),
        hint: $t("errors.entryPathInvalidHint"),
        path: "unknown",
      });
    }

    const root = cwd();
    const normalized = path.replace(root, "");
    const hasSrcDir = existsSync(resolve(root, "src"));

    const configDir = matchConfigDirFromNormalizedPath(normalized, hasSrcDir);
    if (configDir) {
      return configDir;
    }
  } catch (err) {
    throwDwebError(DwebErrorCode.ENTRY_PATH_INVALID, {
      reason: $t("errors.entryPathInvalidReasonNoMatch"),
      hint: $t("errors.entryPathInvalidHint"),
      path: String(err instanceof Error ? err.message : "unknown"),
    });
  }

  throwDwebError(DwebErrorCode.ENTRY_PATH_INVALID, {
    reason: $t("errors.entryPathInvalidReasonNoMatch"),
    hint: $t("errors.entryPathInvalidHint"),
    path: "unknown",
  });
}

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
 * @returns void
 * @throws {Error} 如果配置项有错误，抛出详细的错误信息
 *
 * @example
 * ```ts
 * validateConfig({ name: "my-app", version: "1.0.0" });
 * ```
 */
export function validateConfig(config: AppConfig): void {
  // 验证基础配置项
  if (config.name !== undefined && typeof config.name !== "string") {
    throwDwebError(DwebErrorCode.CONFIG_NAME_INVALID);
  }
  if (config.version !== undefined && typeof config.version !== "string") {
    throwDwebError(DwebErrorCode.CONFIG_VERSION_INVALID);
  }
  if (
    config.configDirectory !== undefined &&
    typeof config.configDirectory !== "string"
  ) {
    throwDwebError(DwebErrorCode.CONFIG_DIR_INVALID);
  }
  if (config.envPrefix !== undefined && typeof config.envPrefix !== "string") {
    throwDwebError(DwebErrorCode.CONFIG_ENV_PREFIX_INVALID);
  }
  if (config.hotReload !== undefined && typeof config.hotReload !== "boolean") {
    throwDwebError(DwebErrorCode.CONFIG_HOT_RELOAD_INVALID);
  }
  // 验证渲染配置
  if (config.render !== undefined) {
    if (typeof config.render !== "object" || config.render === null) {
      throwDwebError(DwebErrorCode.CONFIG_RENDER_INVALID);
    }
    if (
      config.render.engine !== undefined &&
      !["react", "preact"].includes(config.render.engine)
    ) {
      throwDwebError(DwebErrorCode.CONFIG_RENDER_ENGINE_INVALID);
    }
    if (
      config.render.mode !== undefined &&
      !["ssr", "csr", "ssg", "hybrid"].includes(config.render.mode)
    ) {
      throwDwebError(DwebErrorCode.CONFIG_RENDER_MODE_INVALID);
    }
  }

  // 验证中间件配置（配置中的中间件必须提供名称）
  if (config.middlewares !== undefined) {
    if (!Array.isArray(config.middlewares)) {
      throwDwebError(DwebErrorCode.CONFIG_MIDDLEWARES_INVALID);
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
          throwDwebError(DwebErrorCode.CONFIG_MIDDLEWARE_PATH_NO_NAME, {
            index: String(i),
            path: middlewareConfig,
          });
        }
      } else if (typeof middlewareConfig === "function") {
        // 如果是中间件函数，尝试从函数名获取名称
        middlewareName = middlewareConfig.name || null;

        // 检查是否有名称（函数名也算）
        if (!middlewareName || middlewareName.trim() === "") {
          throwDwebError(DwebErrorCode.CONFIG_MIDDLEWARE_MUST_HAVE_NAME, {
            index: String(i),
          });
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
          throwDwebError(
            DwebErrorCode.CONFIG_MIDDLEWARE_OBJECT_MUST_HAVE_NAME,
            {
              index: String(i),
            },
          );
        }
      } else {
        throwDwebError(DwebErrorCode.CONFIG_MIDDLEWARE_TYPE_INVALID, {
          index: String(i),
        });
      }
    }
  }

  // 验证插件配置（配置中的插件必须提供名称）
  if (config.plugins !== undefined) {
    if (!Array.isArray(config.plugins)) {
      throwDwebError(DwebErrorCode.CONFIG_PLUGINS_INVALID);
    }
    for (let i = 0; i < config.plugins.length; i++) {
      const plugin = config.plugins[i];
      const pluginName = getPluginName(plugin);
      if (!pluginName || pluginName.trim() === "") {
        throwDwebError(DwebErrorCode.CONFIG_PLUGIN_MUST_HAVE_NAME, {
          index: String(i),
        });
      }
    }
  }

  // 验证服务器配置
  if (config.server !== undefined) {
    if (typeof config.server !== "object" || config.server === null) {
      throwDwebError(DwebErrorCode.CONFIG_SERVER_INVALID);
    }
  }

  // 验证路由配置
  if (config.router !== undefined) {
    if (typeof config.router !== "object" || config.router === null) {
      throwDwebError(DwebErrorCode.CONFIG_ROUTER_INVALID);
    }
  }

  // 验证构建配置
  if (config.build !== undefined) {
    if (typeof config.build !== "object" || config.build === null) {
      throwDwebError(DwebErrorCode.CONFIG_BUILD_INVALID);
    }
  }

  // 验证日志配置
  if (config.logger !== undefined) {
    if (typeof config.logger !== "object" || config.logger === null) {
      throwDwebError(DwebErrorCode.CONFIG_LOGGER_INVALID);
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
 *
 * @example
 * ```ts
 * const merged = deepMergeConfig(
 *   { name: "app", plugins: [] },
 *   { version: "1.0.0", plugins: ["@dreamer/dweb-plugin-static"] }
 * );
 * ```
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
 * 使用深度合并，用户只需在 main.dev.ts 中写增量覆盖，无需手动导入合并
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
      config = deepMergeConfig(config, mainConfig as AppConfig);
    }
  }

  // 2. 加载 main.{env}.ts（环境特定配置，深度合并覆盖 main.ts）
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
 * 深度合并普通对象（用于 params，无 plugins/middlewares 特殊逻辑）
 */
function deepMergeParams(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...target };
  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    const sourceValue = source[key];
    const targetValue = result[key];
    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      sourceValue !== null &&
      targetValue &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue) &&
      targetValue !== null
    ) {
      result[key] = deepMergeParams(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      );
    } else {
      result[key] = sourceValue;
    }
  }
  return result;
}

/**
 * 加载业务配置（params.ts、params.{env}.ts）
 * 支持 params.ts、params.dev.ts、params.prod.ts，深度合并，用户只需在 params.dev.ts 中写增量
 *
 * @param directory 配置目录
 * @param env 环境名称（dev、prod 等）
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
