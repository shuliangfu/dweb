/**
 * @dreamer/service 集成
 *
 * 初始化服务容器（ServiceContainer），注册默认服务，提供依赖注入能力。
 *
 * @module
 */

import { createServiceContainer, ServiceContainer } from "@dreamer/service";

/**
 * 初始化服务容器
 *
 * 创建 ServiceContainer 实例并注册默认服务（如容器自身）。
 *
 * @returns 服务容器实例
 *
 * @example
 * ```ts
 * const container = initializeServiceContainer();
 * container.registerSingleton("myService", () => new MyService());
 * ```
 */
export function initializeServiceContainer(): ServiceContainer {
  // 创建服务容器实例
  const container = createServiceContainer();

  // 将容器自身注册为单例服务，方便其他模块获取
  container.registerSingleton("serviceContainer", () => container);

  return container;
}

/**
 * 获取服务容器实例（从容器中获取）
 *
 * @param container 服务容器
 * @returns 服务容器实例
 *
 * @example
 * ```ts
 * const svc = getServiceContainer(container);
 * const logger = svc.get("logger");
 * ```
 */
export function getServiceContainer(
  container: ServiceContainer,
): ServiceContainer {
  return container.get<ServiceContainer>("serviceContainer");
}
