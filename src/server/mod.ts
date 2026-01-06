/**
 * 服务器模块
 * 导出服务器相关的功能，包括开发服务器、生产服务器和构建功能
 *
 * 此模块提供三个主要功能：
 *
 * **开发服务器（dev）**
 * - 支持热模块替换（HMR）的开发环境
 * - 自动重新编译和刷新
 * - 开发时的错误提示和调试支持
 *
 * **生产服务器（prod）**
 * - 优化的生产环境服务器
 * - 静态资源服务
 * - 性能优化和缓存策略
 *
 * **构建功能（build）**
 * - 项目代码编译和打包
 * - 静态资源处理和优化
 * - 构建缓存管理
 *
 * @example
 * ```typescript
 * import { startDevServer, startProdServer, build } from "@dreamer/dweb/server";
 *
 * // 开发模式
 * await startDevServer();
 *
 * // 生产模式
 * await startProdServer();
 *
 * // 构建项目
 * await build();
 * ```
 */

export * from "./prod.ts";
export * from "./dev.ts";
export * from "./build/build.ts";
