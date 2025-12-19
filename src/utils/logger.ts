/**
 * 日志工具模块
 * 提供统一的日志接口，方便在整个框架中使用
 */

import { getLogger, type Logger } from '../features/logger.ts';

/**
 * 获取默认日志器实例
 * 
 * 该函数返回框架的默认日志器实例，所有日志调用都应该通过这个实例进行。
 * 这样可以统一控制日志级别、格式和输出目标。
 * 
 * @returns 默认日志器实例
 * 
 * @example
 * ```typescript
 * import { logger } from '@dreamer/dweb';
 * 
 * logger.info('服务器启动', { port: 3000 });
 * logger.error('请求失败', error, { url: req.url });
 * logger.warn('缓存过期', { key: 'user:123' });
 * logger.debug('调试信息', { data: someData });
 * ```
 */
export const logger: Logger = getLogger();

