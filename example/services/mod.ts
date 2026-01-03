/**
 * 服务模块统一导出
 * 导出所有服务及其配置，方便批量注册
 */

import { type ServiceConfig, ServiceLifetime } from "@dreamer/dweb";
import { UserService } from "./user.ts";
import { OrderService } from "./order.ts";
import { ProductService } from "./product.ts";
import { EmailService } from "./email.ts";

// 导出所有服务类（供直接使用）
export { UserService } from "./user.ts";
export { OrderService } from "./order.ts";
export { ProductService } from "./product.ts";
export { EmailService } from "./email.ts";

// 导出服务类型
export type { User } from "./user.ts";
export type { Order } from "./order.ts";
export type { Product } from "./product.ts";
export type { EmailOptions } from "./email.ts";

/**
 * 服务配置数组
 * 用于批量注册服务到服务容器
 *
 * @example
 * ```ts
 * import { services } from './services/mod.ts';
 * import { createServicePlugin } from './utils/register-services.ts';
 *
 * app.plugin(createServicePlugin(services));
 * ```
 */
export const services: ServiceConfig[] = [
  // 单例服务（默认）
  { name: "userService", factory: () => new UserService() },
  { name: "orderService", factory: () => new OrderService() },
  { name: "productService", factory: () => new ProductService() },

  // 瞬态服务（每次获取都创建新实例，适合 EmailService 这种需要独立状态的服务）
  {
    name: "emailService",
    factory: () => new EmailService(),
    lifetime: ServiceLifetime.Transient,
  },
];
