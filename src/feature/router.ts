/**
 * @dreamer/router 集成
 *
 * 初始化文件路由系统，扫描路由、匹配分发、解析参数，触发 onRoute 插件事件。
 * 导出 initializeRouter、getRouter。
 *
 * @module
 */

import {
  createRouter,
  type Route,
  type Router,
  type RouterOptions,
} from "@dreamer/router";
import type { ServiceContainer } from "@dreamer/service";
import { pluginEvents, type RouteDefinition } from "../core/plugin-events.ts";
import type { AppConfig } from "../types/app.ts";

/**
 * 初始化路由系统
 *
 * 扫描 routesDir 下的路由文件，创建 Router 实例并注册到容器。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns 路由实例
 *
 * @example
 * ```ts
 * const router = await initializeRouter(container, config);
 * const match = router.match("/users/1");
 * ```
 */
export async function initializeRouter(
  container: ServiceContainer,
  config: AppConfig,
): Promise<Router> {
  // 从配置中获取路由选项（engine、ssr 由 render 提供，服务端路由不接收）
  const routerConfig = (config.router || {}) as RouterOptions;
  const router = createRouter({
    routesDir: routerConfig.routesDir || "./src/routes",
    apiMode: routerConfig.apiMode || "restful",
    debug: routerConfig.debug === true,
  });

  // 扫描路由文件
  await router.scan();

  // 获取当前路由列表并触发 onRoute 事件
  // 通知插件路由已扫描完成（文件路由系统不支持动态修改）
  const routes = router.getRoutes();
  if (routes && routes.length > 0) {
    // 转换为 RouteDefinition 格式（只读，供插件查看）
    const routeDefinitions: RouteDefinition[] = routes.map((route: Route) => ({
      path: route.path,
      meta: {
        file: route.file,
        fullPath: route.fullPath,
        type: route.type,
        isApi: route.isApi,
        isSpecial: route.isSpecial,
        specialType: route.specialType,
      },
    }));

    // 触发 onRoute 事件（通知插件）
    await pluginEvents.emitOnRoute(container, routeDefinitions);
  }

  // 将路由注册到服务容器
  container.registerSingleton("router", () => router);

  return router;
}

/**
 * 获取路由实例
 *
 * @param container 服务容器
 * @returns 路由实例
 *
 * @example
 * ```ts
 * const router = getRouter(container);
 * const match = router.match("/users/1");
 * ```
 */
export function getRouter(container: ServiceContainer): Router {
  return container.get<Router>("router");
}
