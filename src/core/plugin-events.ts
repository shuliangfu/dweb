/**
 * @module @dreamer/dweb/core/plugin-events
 *
 * 插件事件系统
 *
 * 提供应用级别的事件钩子，让插件可以响应应用生命周期事件
 * 包括事件触发函数和插件事件中间件
 */

import type { HttpContext } from "@dreamer/server";
import type { ServiceContainer } from "@dreamer/service";
import { getLogger } from "../utils/logger.ts";
import { getPluginManager } from "./plugin.ts";

/**
 * 触发插件事件
 *
 * @param container 服务容器
 * @param eventName 事件名称
 * @param args 事件参数
 */
export async function emitPluginEvent(
  container: ServiceContainer,
  eventName: string,
  ...args: unknown[]
): Promise<void> {
  const pluginManager = getPluginManager(container);
  const plugins = pluginManager.getRegisteredPlugins();

  for (const pluginName of plugins) {
    const plugin = pluginManager.getPlugin(pluginName);
    if (!plugin) continue;

    const state = pluginManager.getState(pluginName);
    if (state !== "active") continue; // 只触发已激活的插件

    // 根据事件名称调用对应的钩子
    const hook = (plugin as unknown as Record<string, unknown>)[eventName];
    if (typeof hook === "function") {
      try {
        await hook(...args, container);
      } catch (error) {
        // 使用 logger 记录错误（如果 logger 已注册，使用 logger；否则使用 console 作为后备）
        if (container.has("logger")) {
          const logger = getLogger(container);
          logger.error(
            `插件 ${pluginName} 的 ${eventName} 钩子执行失败:`,
            error,
          );
        } else {
          // logger 未初始化时，使用 console 作为后备
          console.error(
            `插件 ${pluginName} 的 ${eventName} 钩子执行失败:`,
            error,
          );
        }
      }
    }
  }
}

/**
 * 触发 onInit 事件（应用初始化完成）
 */
export async function emitOnInit(container: ServiceContainer): Promise<void> {
  await emitPluginEvent(container, "onInit");
}

/**
 * 触发 onRequest 事件（请求处理前）
 * 若某插件返回 Response，则直接返回该 Response（用于短路后续中间件，如 Tailwind 开发态 /assets/tailwind.css）
 *
 * @returns 第一个返回 Response 的插件的响应，否则 undefined
 */
export async function emitOnRequest(
  container: ServiceContainer,
  ctx: HttpContext,
): Promise<Response | undefined> {
  const pluginManager = getPluginManager(container);
  const plugins = pluginManager.getRegisteredPlugins();

  for (const pluginName of plugins) {
    const plugin = pluginManager.getPlugin(pluginName);
    if (!plugin) continue;

    const state = pluginManager.getState(pluginName);
    if (state !== "active") continue;

    const hook = (plugin as unknown as Record<string, unknown>).onRequest;
    if (typeof hook !== "function") continue;

    try {
      const result = await hook(ctx, container);
      if (result instanceof Response) {
        return result;
      }
    } catch (error) {
      if (container.has("logger")) {
        const logger = getLogger(container);
        logger.error(
          `插件 ${pluginName} 的 onRequest 钩子执行失败:`,
          error,
        );
      } else {
        console.error(
          `插件 ${pluginName} 的 onRequest 钩子执行失败:`,
          error,
        );
      }
    }
  }
  return undefined;
}

/**
 * 触发 onResponse 事件（请求处理完成后）
 */
export async function emitOnResponse(
  container: ServiceContainer,
  ctx: HttpContext,
): Promise<void> {
  await emitPluginEvent(container, "onResponse", ctx);
}

/**
 * 触发 onBuild 事件（构建开始前）
 */
export async function emitOnBuild(
  container: ServiceContainer,
  options: {
    mode: "dev" | "prod";
    target?: "client" | "server";
  },
): Promise<void> {
  await emitPluginEvent(container, "onBuild", options);
}

/**
 * 触发 onBuildComplete 事件（构建完成后）
 */
export async function emitOnBuildComplete(
  container: ServiceContainer,
  result: {
    outputFiles?: string[];
    errors?: unknown[];
    warnings?: unknown[];
  },
): Promise<void> {
  await emitPluginEvent(container, "onBuildComplete", result);
}

/**
 * 触发 onStart 事件（应用启动时）
 */
export async function emitOnStart(container: ServiceContainer): Promise<void> {
  await emitPluginEvent(container, "onStart");
}

/**
 * 触发 onStop 事件（应用停止时）
 */
export async function emitOnStop(container: ServiceContainer): Promise<void> {
  await emitPluginEvent(container, "onStop");
}

/**
 * 触发 onShutdown 事件（应用关闭时）
 */
export async function emitOnShutdown(
  container: ServiceContainer,
): Promise<void> {
  await emitPluginEvent(container, "onShutdown");
}

/**
 * 触发 onError 事件（请求处理出错时）
 *
 * @param container 服务容器
 * @param error 错误对象
 * @param ctx HTTP 上下文
 * @returns 错误响应（如果插件返回了响应）
 */
export async function emitOnError(
  container: ServiceContainer,
  error: Error,
  ctx: HttpContext,
): Promise<Response | undefined> {
  const pluginManager = getPluginManager(container);
  const plugins = pluginManager.getRegisteredPlugins();

  for (const pluginName of plugins) {
    const plugin = pluginManager.getPlugin(pluginName);
    if (!plugin) continue;

    const state = pluginManager.getState(pluginName);
    if (state !== "active") continue;

    const hook = (plugin as unknown as Record<string, unknown>)["onError"];
    if (typeof hook === "function") {
      try {
        const response = await hook(error, ctx, container);
        // 如果插件返回了 Response，则使用该响应
        if (response instanceof Response) {
          return response;
        }
      } catch (hookError) {
        if (container.has("logger")) {
          const logger = getLogger(container);
          logger.error(
            `插件 ${pluginName} 的 onError 钩子执行失败:`,
            hookError,
          );
        } else {
          console.error(
            `插件 ${pluginName} 的 onError 钩子执行失败:`,
            hookError,
          );
        }
      }
    }
  }
  return undefined;
}

/**
 * 路由定义类型
 */
export interface RouteDefinition {
  /** 路由路径 */
  path: string;
  /** HTTP 方法 */
  method?: string;
  /** 路由处理器 */
  handler?: unknown;
  /** 路由元数据 */
  meta?: Record<string, unknown>;
}

/**
 * 触发 onRoute 事件（路由注册时）
 * 允许插件修改路由定义
 *
 * @param container 服务容器
 * @param routes 路由定义列表
 * @returns 修改后的路由定义列表
 */
export async function emitOnRoute(
  container: ServiceContainer,
  routes: RouteDefinition[],
): Promise<RouteDefinition[]> {
  const pluginManager = getPluginManager(container);
  const plugins = pluginManager.getRegisteredPlugins();
  let currentRoutes = [...routes];

  for (const pluginName of plugins) {
    const plugin = pluginManager.getPlugin(pluginName);
    if (!plugin) continue;

    const state = pluginManager.getState(pluginName);
    if (state !== "active") continue;

    const hook = (plugin as unknown as Record<string, unknown>)["onRoute"];
    if (typeof hook === "function") {
      try {
        const modifiedRoutes = await hook(currentRoutes, container);
        // 如果插件返回了路由列表，则使用修改后的路由
        if (Array.isArray(modifiedRoutes)) {
          currentRoutes = modifiedRoutes;
        }
      } catch (error) {
        if (container.has("logger")) {
          const logger = getLogger(container);
          logger.error(
            `插件 ${pluginName} 的 onRoute 钩子执行失败:`,
            error,
          );
        } else {
          console.error(
            `插件 ${pluginName} 的 onRoute 钩子执行失败:`,
            error,
          );
        }
      }
    }
  }
  return currentRoutes;
}

/**
 * 健康状态类型
 */
export interface HealthStatus {
  /** 整体状态 */
  status: "healthy" | "degraded" | "unhealthy";
  /** 各组件状态 */
  components?: Record<string, {
    status: "healthy" | "degraded" | "unhealthy";
    message?: string;
  }>;
  /** 时间戳 */
  timestamp?: number;
}

/**
 * 触发 onHealthCheck 事件（健康检查时）
 *
 * @param container 服务容器
 * @returns 聚合后的健康状态
 */
export async function emitOnHealthCheck(
  container: ServiceContainer,
): Promise<HealthStatus> {
  const pluginManager = getPluginManager(container);
  const plugins = pluginManager.getRegisteredPlugins();
  const components: HealthStatus["components"] = {};
  let overallStatus: HealthStatus["status"] = "healthy";

  for (const pluginName of plugins) {
    const plugin = pluginManager.getPlugin(pluginName);
    if (!plugin) continue;

    const state = pluginManager.getState(pluginName);
    if (state !== "active") continue;

    const hook =
      (plugin as unknown as Record<string, unknown>)["onHealthCheck"];
    if (typeof hook === "function") {
      try {
        const status = await hook(container);
        if (status && typeof status === "object" && "status" in status) {
          const pluginStatus = status as HealthStatus;
          // 合并组件状态
          if (pluginStatus.components) {
            Object.assign(components, pluginStatus.components);
          } else {
            components[pluginName] = {
              status: pluginStatus.status,
            };
          }
          // 更新整体状态（降级）
          if (pluginStatus.status === "unhealthy") {
            overallStatus = "unhealthy";
          } else if (
            pluginStatus.status === "degraded" && overallStatus === "healthy"
          ) {
            overallStatus = "degraded";
          }
        }
      } catch (error) {
        // 健康检查失败，标记为不健康
        components[pluginName] = {
          status: "unhealthy",
          message: error instanceof Error ? error.message : String(error),
        };
        overallStatus = "unhealthy";
      }
    }
  }

  return {
    status: overallStatus,
    components: Object.keys(components).length > 0 ? components : undefined,
    timestamp: Date.now(),
  };
}

/**
 * 触发 onHotReload 事件（热重载完成时）
 *
 * @param container 服务容器
 * @param changedFiles 变更的文件列表
 */
export async function emitOnHotReload(
  container: ServiceContainer,
  changedFiles: string[],
): Promise<void> {
  await emitPluginEvent(container, "onHotReload", changedFiles);
}
