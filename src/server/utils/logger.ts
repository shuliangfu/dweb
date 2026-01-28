/**
 * 日志工具模块
 * 提供统一的日志接口，方便在整个框架中使用
 *
 * 注意：必须使用 Proxy 委托到 getLogger()，否则在模块加载时得到的
 * logger 是默认实例（无 file 等配置），应用 init 后 setLogger 的实例不会被使用。
 */

import { getLogger, type Logger } from "../../features/logger.ts";

/**
 * 始终使用当前默认日志器（应用 init 后 setLogger 设置的实例）
 * 每次访问方法时委托给 getLogger()，确保使用配置了 file/控制台 的 Logger
 *
 * @example
 * ```typescript
 * import { logger } from '@dreamer/dweb';
 *
 * logger.info('服务器启动', { port: 3000 });
 * logger.error('请求失败', error, { url: req.url });
 * ```
 */
export const logger: Logger = new Proxy({} as Logger, {
  get(_target, prop: string) {
    return (getLogger() as unknown as Record<string, unknown>)[prop];
  },
});
