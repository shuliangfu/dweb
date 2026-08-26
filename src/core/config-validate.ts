/**
 * 应用配置校验（从 config.ts 拆出，行为不变）
 *
 * @module
 */

import type { AppConfig } from "../types/app.ts";
import { DwebErrorCode, throwDwebError } from "../utils/errors.ts";
import { getPluginName } from "./config-merge.ts";

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
      !["react", "preact", "view"].includes(config.render.engine)
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

  // 验证构建配置（含 build.client / build.server 形状，减少后续 as 断言依赖）
  if (config.build !== undefined) {
    if (typeof config.build !== "object" || config.build === null) {
      throwDwebError(DwebErrorCode.CONFIG_BUILD_INVALID);
    }
    const b = config.build as Record<string, unknown>;
    if (
      b.client !== undefined &&
      (typeof b.client !== "object" || b.client === null)
    ) {
      throwDwebError(DwebErrorCode.CONFIG_BUILD_INVALID);
    }
    if (
      b.server !== undefined &&
      (typeof b.server !== "object" || b.server === null)
    ) {
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
