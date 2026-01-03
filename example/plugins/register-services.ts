/**
 * 服务注册辅助函数
 * 简化在插件中注册多个服务的流程
 */

import type { Application, ServiceConfig } from "@dreamer/dweb";
import { ServiceLifetime } from "@dreamer/dweb";

/**
 * 注册多个服务
 *
 * @param application - Application 实例
 * @param services - 服务配置数组
 *
 * @example
 * ```ts
 * import { registerServices } from './utils/register-services.ts';
 * import { UserService } from './services/user.ts';
 * import { OrderService } from './services/order.ts';
 *
 * app.plugin({
 *   name: 'register-services',
 *   onInit: (app) => {
 *     const application = app.getApplication?.();
 *     if (application) {
 *       registerServices(application, [
 *         { name: 'userService', factory: () => new UserService() },
 *         { name: 'orderService', factory: () => new OrderService() },
 *       ]);
 *     }
 *   },
 * });
 * ```
 */
export function registerServices(
  application: Application,
  services: ServiceConfig[],
): void {
  for (const service of services) {
    application.registerService(
      service.name,
      service.factory,
      service.lifetime || ServiceLifetime.Singleton,
    );
    // console.log(`✅ 服务已注册: ${service.name}`);
  }
}

/**
 * 创建服务注册插件
 * 更简洁的方式，直接返回插件对象
 *
 * @param services - 服务配置数组
 * @returns 插件对象
 *
 * @example
 * ```ts
 * import { createServicePlugin } from './utils/register-services.ts';
 * import { UserService } from './services/user.ts';
 * import { OrderService } from './services/order.ts';
 *
 * app.plugin(createServicePlugin([
 *   { name: 'userService', factory: () => new UserService() },
 *   { name: 'orderService', factory: () => new OrderService() },
 * ]));
 * ```
 */
export function createServicePlugin(services: ServiceConfig[]) {
  return {
    name: "register-services",
    onInit: (app: { getApplication?: () => Application }) => {
      const application = app.getApplication?.();
      if (application) {
        registerServices(application, services);
      }
    },
  };
}
