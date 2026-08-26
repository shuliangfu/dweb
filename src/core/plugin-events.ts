/**
 * 插件事件系统
 *
 * 框架中所有插件事件的唯一入口。提供：
 * - emitOnXxx：各生命周期/请求阶段的事件触发函数
 * - pluginEvents：统一命名空间，框架应通过此对象调用事件
 *
 * 中间件（pluginEventsMiddleware、createHealthCheckMiddleware）在 middleware.ts 中实现。
 *
 * @module
 */

import type { SocketContext } from "@dreamer/plugin";
import type { HttpContext } from "@dreamer/server";
import type { ServiceContainer } from "@dreamer/service";
import { $tr } from "../utils/i18n.ts";
import { getLogger } from "../utils/logger.ts";
import { getPluginManager } from "./plugin.ts";

/**
 * 触发插件事件
 *
 * 按插件注册顺序依次执行（不并行），因插件间可能存在隐式依赖（如 A 初始化后 B 依赖其状态），
 * 且 onRequest 等事件需支持短路返回，并行会破坏语义。参见 OPTIMIZATION_ANALYSIS.md。
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
        const msg = $tr("log.pluginHookFailed", {
          pluginName,
          eventName,
        });
        if (container.has("logger")) {
          const logger = getLogger(container);
          logger.error(`${msg}:`, error);
        } else {
          // logger 未初始化时，使用 console 作为后备
          console.error(`${msg}:`, error);
        }
      }
    }
  }
}

/**
 * 触发 onInit 事件（应用初始化完成）
 *
 * @param container 服务容器
 * @returns Promise<void>
 */
export async function emitOnInit(container: ServiceContainer): Promise<void> {
  await emitPluginEvent(container, "onInit");
}

/**
 * 触发 onRequest 事件（请求处理前）
 *
 * 若某插件返回 Response，则直接返回该 Response（用于短路后续中间件，如 Tailwind 开发态 /assets/tailwind.css）
 *
 * @param container 服务容器
 * @param ctx HTTP 上下文
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
      const msg = $tr("log.pluginHookFailed", {
        pluginName,
        eventName: "onRequest",
      });
      if (container.has("logger")) {
        const logger = getLogger(container);
        logger.error(`${msg}:`, error);
      } else {
        console.error(`${msg}:`, error);
      }
    }
  }
  return undefined;
}

/**
 * 触发 onResponse 事件（请求处理完成后）
 *
 * @param container 服务容器
 * @param ctx HTTP 上下文
 * @returns Promise<void>
 */
export async function emitOnResponse(
  container: ServiceContainer,
  ctx: HttpContext,
): Promise<void> {
  await emitPluginEvent(container, "onResponse", ctx);
}

/**
 * 触发 onRequestEnd（耗时观测）：插件钩子 + 可选 AppConfig.onRequestEnd
 */
export async function emitOnRequestEnd(
  container: ServiceContainer,
  info: {
    path: string;
    method: string;
    status: number;
    durationMs: number;
  },
): Promise<void> {
  await emitPluginEvent(container, "onRequestEnd", info);
  if (!container.has("config")) return;
  const config = container.get<{
    onRequestEnd?: (i: typeof info) => void | Promise<void>;
  }>("config");
  if (typeof config?.onRequestEnd === "function") {
    try {
      await config.onRequestEnd(info);
    } catch (error) {
      if (container.has("logger")) {
        getLogger(container).error("onRequestEnd failed:", error);
      } else {
        console.error("onRequestEnd failed:", error);
      }
    }
  }
}

/**
 * 触发 onBuild 事件（构建开始前）
 *
 * @param container 服务容器
 * @param options 构建选项（mode、target）
 * @returns Promise<void>
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
 *
 * @param container 服务容器
 * @param result 构建结果（outputFiles、errors、warnings）
 * @returns Promise<void>
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
 *
 * @param container 服务容器
 * @returns Promise<void>
 */
export async function emitOnStart(container: ServiceContainer): Promise<void> {
  await emitPluginEvent(container, "onStart");
}

/**
 * 触发 onStop 事件（应用停止时）
 *
 * @param container 服务容器
 * @returns Promise<void>
 */
export async function emitOnStop(container: ServiceContainer): Promise<void> {
  await emitPluginEvent(container, "onStop");
}

/**
 * 触发 onShutdown 事件（应用关闭时）
 *
 * @param container 服务容器
 * @returns Promise<void>
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
        const msg = $tr("log.pluginHookFailed", {
          pluginName,
          eventName: "onError",
        });
        if (container.has("logger")) {
          const logger = getLogger(container);
          logger.error(`${msg}:`, hookError);
        } else {
          console.error(`${msg}:`, hookError);
        }
      }
    }
  }
  return undefined;
}

/**
 * 路由定义类型
 *
 * 供 onRoute 插件事件使用，描述路由路径、方法、处理器及元数据。
 *
 * @example
 * ```ts
 * const routes: RouteDefinition[] = [
 *   { path: "/", method: "GET", meta: { file: "index.tsx" } },
 *   { path: "/about", meta: { file: "about.tsx" } },
 * ];
 * ```
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
        const msg = $tr("log.pluginHookFailed", {
          pluginName,
          eventName: "onRoute",
        });
        if (container.has("logger")) {
          const logger = getLogger(container);
          logger.error(`${msg}:`, error);
        } else {
          console.error(`${msg}:`, error);
        }
      }
    }
  }
  return currentRoutes;
}

/**
 * 健康状态类型
 *
 * 供 onHealthCheck 插件事件使用，描述整体及各组件的健康状态。
 *
 * @example
 * ```ts
 * const status: HealthStatus = {
 *   status: "healthy",
 *   components: { db: { status: "healthy" } },
 *   timestamp: Date.now(),
 * };
 * ```
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

/**
 * 触发 onSocket 事件（Socket 连接建立时）
 *
 * 在 Socket.IO 或 WebSocket 连接建立时调用，通知插件进行认证、记录等。
 *
 * @param container 服务容器
 * @param ctx Socket 上下文（WebSocketContext 或 SocketIOContext）
 */
export async function emitOnSocket(
  container: ServiceContainer,
  ctx: SocketContext,
): Promise<void> {
  if (!container.has("pluginManager")) return;
  const pluginManager = getPluginManager(container);
  await pluginManager.triggerSocket(ctx);
}

/**
 * 触发 onSocketClose 事件（Socket 连接关闭时）
 *
 * @param container 服务容器
 * @param ctx Socket 上下文
 */
export async function emitOnSocketClose(
  container: ServiceContainer,
  ctx: SocketContext,
): Promise<void> {
  if (!container.has("pluginManager")) return;
  const pluginManager = getPluginManager(container);
  await pluginManager.triggerSocketClose(ctx);
}

// ============================================================================
// 统一命名空间：框架应通过 pluginEvents 调用，避免分散导入
// ============================================================================

/**
 * 插件事件统一入口
 *
 * 框架中需要触发插件事件时，应从此对象调用，保持单一入口。
 *
 * @example
 * ```ts
 * import { pluginEvents } from "./plugin-events.ts";
 * await pluginEvents.emitOnInit(container);
 * await pluginEvents.emitOnStart(container);
 * ```
 */
export const pluginEvents = {
  emitOnInit,
  emitOnRequest,
  emitOnResponse,
  emitOnRequestEnd,
  emitOnBuild,
  emitOnBuildComplete,
  emitOnStart,
  emitOnStop,
  emitOnShutdown,
  emitOnError,
  emitOnRoute,
  emitOnHealthCheck,
  emitOnHotReload,
  emitOnSocket,
  emitOnSocketClose,
} as const;
