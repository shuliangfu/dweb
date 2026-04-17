/**
 * @fileoverview 将 `App` 的服务容器暴露给仅服务端使用的 API 路由（如队列投递示例）。
 * 在 `main.ts` 的 `init` 中注入；请勿在客户端代码中引用本模块。
 */

import type { ServiceContainer } from "@dreamer/service";

/** 当前运行中的应用容器（由 main.ts 在 init 时设置） */
let devContainer: ServiceContainer | undefined;

/**
 * 保存应用服务容器引用，供 `/api/dev/*` 等路由在请求处理时访问已注册的队列等服务。
 *
 * @param container `App` 实例的 `container`
 */
export function setQueueDevContainer(container: ServiceContainer): void {
  devContainer = container;
}

/**
 * 获取已注入的服务容器；若尚未初始化则返回 `undefined`。
 *
 * @returns 服务容器或 `undefined`
 */
export function getQueueDevContainer(): ServiceContainer | undefined {
  return devContainer;
}
