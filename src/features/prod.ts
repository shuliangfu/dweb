/**
 * 生产服务器模块
 * 提供生产环境服务器
 * 
 * 注意：此模块已重构为使用 Application 类
 * 为了保持向后兼容，仍然导出 startProdServer 函数
 */

import type { AppConfig } from "../types/index.ts";
import { Application } from "../core/application.ts";

/**
 * 启动生产服务器
 * 使用 Application 类来启动生产环境服务器
 * 
 * @param config 配置对象（单应用配置）
 * 
 * @example
 * ```ts
 * import { startProdServer } from "@dreamer/dweb";
 * 
 * await startProdServer({
 *   server: { port: 3000 },
 *   routes: { dir: "routes" },
 *   build: { outDir: "dist" },
 *   // ... 其他配置
 * });
 * ```
 */
export async function startProdServer(config: AppConfig): Promise<void> {
  // 验证必需配置
  if (!config.routes) {
    throw new Error("路由配置 (routes) 是必需的");
  }
  if (!config.build) {
    throw new Error("构建配置 (build) 是必需的");
  }
  if (!config.server) {
    throw new Error("服务器配置 (server) 是必需的");
  }

  // 确保配置为生产环境
  const prodConfig: AppConfig = {
    ...config,
    isProduction: true,
  };

  // 创建 Application 实例（不指定配置文件路径，使用程序化配置）
  const app = new Application(undefined, config.name);
  
  // 加载配置（先加载默认配置，然后合并传入的配置）
  const configManager = app.getService('configManager') as any;
  try {
    await configManager.load();
  } catch {
    // 如果加载失败（配置文件不存在），使用传入的配置
  }
  
  // 设置配置
  if (configManager && typeof configManager.setConfig === 'function') {
    // 如果已加载配置，合并配置；否则直接设置
    if (configManager.isLoaded()) {
      const existingConfig = configManager.getConfig();
      configManager.setConfig(configManager.merge(existingConfig, prodConfig));
    } else {
      configManager.setConfig(prodConfig);
    }
  }

  // 初始化应用
  await app.initialize();

  // 启动应用（会自动处理生产环境的 TLS 验证、优雅关闭等）
  await app.start();
}
