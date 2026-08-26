/**
 * 配置深度合并（从 config.ts 拆出，行为不变）
 *
 * plugins / middlewares 按 name 替换或追加；params 用普通对象深合并。
 *
 * @module
 */

import type {
  Middleware,
  MiddlewareCondition,
  MiddlewareContext,
} from "@dreamer/middleware";
import type { Plugin } from "@dreamer/plugin";
import type { AppConfig } from "../types/app.ts";

/**
 * 获取插件名称
 *
 * @param plugin 插件对象或路径
 * @returns 插件名称，如果无法获取则返回 null
 */
export function getPluginName(
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
 * 深度合并普通对象（用于 params，无 plugins/middlewares 特殊逻辑）
 */
export function deepMergeParams(
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
