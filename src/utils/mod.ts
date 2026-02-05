/**
 * @module @dreamer/dweb/utils
 *
 * @fileoverview 工具模块统一导出
 *
 * 职责：
 * - 统一导出所有工具模块
 * - 提供工具功能的统一访问入口
 * - 简化工具功能的导入路径
 *
 * 功能模块：
 * - Logger：日志工具（应用日志记录、日志级别管理、日志格式化）
 *
 * 使用方式：
 * ```typescript
 * // 导入日志工具
 * import { getLogger, initializeLogger } from "@dreamer/dweb/utils";
 *
 * // 在应用中使用
 * const logger = getLogger(container);
 * logger.info("应用启动成功");
 * logger.error("发生错误:", error);
 * ```
 */

/**
 * 日志工具模块
 * 提供日志服务的初始化、配置和访问功能
 *
 * 功能：
 * - 创建 Logger 实例
 * - 配置日志级别（debug、info、warn、error、fatal）
 * - 配置日志格式和输出目标
 * - 注册到服务容器
 * - 提供统一的日志访问 API
 */
export * from "./logger.ts";
export * from "./runtime.ts";
export * from "./config-loader.ts";
export * from "./errors.ts";
export * from "./i18n.ts";
