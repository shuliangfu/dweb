/**
 * 运行时适配器统一导出
 *
 * 职责：
 * - 统一导出 @dreamer/runtime-adapter 中需要使用的 API
 * - 避免在项目中直接使用 @dreamer/runtime-adapter
 * - 提供统一的导入入口
 *
 * 使用方式：
 * ```typescript
 * import { exit, getEnv } from "./runtime-adapter.ts";
 * ```
 */

// 导出进程工具 API
export * from "@dreamer/runtime-adapter";
