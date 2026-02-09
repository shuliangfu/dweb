/**
 * @dreamer/logger 集成
 *
 * 初始化日志服务，创建 Logger 实例并注册到容器，提供 getLogger 访问。
 *
 * @module
 */

import { createLogger, type Logger, type LoggerConfig } from "@dreamer/logger";
import type { ServiceContainer } from "@dreamer/service";
import { getEnv, isTerminal } from "../core/runtime-adapter.ts";
import type { AppConfig } from "../types/app.ts";

/**
 * 初始化日志服务
 *
 * 格式优先级：
 * 1. 环境变量 DWEB_LOG_FORMAT（text|json|color）强制覆盖
 * 2. 命令行执行（TTY）时：强制 text 格式、不显示时间，便于交互式查看
 * 3. 非 TTY（管道/重定向/CI）时：使用配置的 format 和 showTime
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns 日志实例
 *
 * @example
 * ```ts
 * const logger = initializeLogger(container, config);
 * logger.info("应用启动");
 * ```
 */
export function initializeLogger(
  container: ServiceContainer,
  config: AppConfig,
): Logger {
  // 从配置中获取日志选项
  const loggerConfig = (config.logger || {}) as LoggerConfig;

  // 1. 环境变量 DWEB_LOG_FORMAT 可强制指定格式（解决 IDE/deno task 下 isTerminal 为 false 的情况）
  const envFormat = getEnv("DWEB_LOG_FORMAT");
  const forceTextByEnv = envFormat?.toLowerCase() === "text";
  const forceJsonByEnv = envFormat?.toLowerCase() === "json";
  const forceColorByEnv = envFormat?.toLowerCase() === "color";

  // 2. 命令行执行（TTY）时：text 格式、不显示时间；非 TTY 使用配置
  const tty = isTerminal();
  const useTextFormat = tty || forceTextByEnv;

  const baseConfig: LoggerConfig = {
    level: loggerConfig.level || "info",
    output: loggerConfig.output,
    filter: loggerConfig.filter,
    ...loggerConfig,
  };
  if (forceJsonByEnv) {
    baseConfig.format = "json";
  } else if (forceColorByEnv) {
    baseConfig.format = "color";
  } else if (useTextFormat) {
    baseConfig.format = "text";
    baseConfig.showTime = false;
  }
  
  const logger = createLogger(baseConfig);

  // 将日志实例注册到服务容器
  container.registerSingleton("logger", () => logger);

  return logger;
}

/**
 * 获取日志实例
 *
 * @param container 服务容器
 * @returns 日志实例
 *
 * @example
 * ```ts
 * const logger = getLogger(container);
 * logger.info("请求处理完成");
 * ```
 */
export function getLogger(container: ServiceContainer): Logger {
  return container.get<Logger>("logger");
}
