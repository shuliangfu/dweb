/**
 * @dreamer/logger 集成
 *
 * 初始化日志服务，创建 Logger 实例并注册到容器，提供 getLogger 访问。
 *
 * @module
 */

import { createLogger, type Logger, type LoggerConfig } from "@dreamer/logger";
import type { ServiceContainer } from "@dreamer/service";
import type { AppConfig } from "../types/app.ts";

/**
 * 初始化日志服务
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns 日志实例
 */
export function initializeLogger(
  container: ServiceContainer,
  config: AppConfig,
): Logger {
  // 从配置中获取日志选项
  const loggerConfig = (config.logger || {}) as LoggerConfig;

  // 创建日志实例
  const logger = createLogger({
    level: loggerConfig.level || "info",
    format: loggerConfig.format || "text",
    output: loggerConfig.output,
    filter: loggerConfig.filter,
    ...loggerConfig,
  });

  // 将日志实例注册到服务容器
  container.registerSingleton("logger", () => logger);

  return logger;
}

/**
 * 获取日志实例
 *
 * @param container 服务容器
 * @returns 日志实例
 */
export function getLogger(container: ServiceContainer): Logger {
  return container.get<Logger>("logger");
}
