/**
 * 开发服务器模块
 * 提供开发环境服务器和热更新功能
 *
 * 注意：此模块已重构为使用 Application 类
 * 为了保持向后兼容，仍然导出 startDevServer 函数
 */

import type { AppConfig } from "../common/types/index.ts";
import { Application } from "../core/application.ts";
import { ConfigManager } from "../core/config-manager.ts";

/**
 * 启动开发服务器
 * 使用 Application 类来启动开发环境服务器
 *
 * @param config 配置对象（单应用配置）
 *
 * @example
 * ```ts
 * import { startDevServer } from "@dreamer/dweb";
 *
 * await startDevServer({
 *   server: { port: 3000 },
 *   routes: { dir: "routes" },
 *   // ... 其他配置
 * });
 * ```
 */
export async function startDevServer(config: AppConfig): Promise<void> {
  try {
    Deno.env.set("DENO_ENV", "development");
  } catch {
    // ignore env set errors
  }
  // 确保配置为开发环境
  const devConfig: AppConfig = {
    ...config,
    isProduction: false,
  };

  // 创建 Application 实例（不指定配置文件路径，使用程序化配置）
  const app = new Application(undefined, config.name);

  // 加载配置（先加载默认配置，然后合并传入的配置）
  const configManager = app.getService<ConfigManager>("configManager") as any;
  try {
    await configManager.load();
  } catch {
    // 如果加载失败（配置文件不存在），使用传入的配置
  }

  // 设置配置
  if (configManager && typeof configManager.setConfig === "function") {
    // 如果已加载配置，合并配置；否则直接设置
    if (configManager.isLoaded()) {
      const existingConfig = configManager.getConfig();
      configManager.setConfig(configManager.merge(existingConfig, devConfig));
    } else {
      configManager.setConfig(devConfig);
    }
  }

  // 获取最终配置（用于验证）
  const finalConfig = configManager.getConfig() || devConfig;

  // 验证配置：SSR 模式不允许开启预加载
  // 预加载功能需要客户端路由支持，而 SSR 模式是纯服务端渲染，不支持客户端路由
  const renderMode = finalConfig.render?.mode || "ssr"; // 默认是 ssr
  const prefetchEnabled = finalConfig.prefetch?.enabled !== false; // 默认是 true

  if (renderMode === "ssr" && prefetchEnabled) {
    throw new Error(
      `\n❌ 配置错误：渲染模式为 SSR 时不允许开启预加载功能\n\n` +
        `   原因：预加载功能需要客户端路由支持，而 SSR 模式是纯服务端渲染，不支持客户端路由。\n\n` +
        `   解决方案（二选一）：\n` +
        `   1. 将 dweb.config.ts 中的 prefetch.enabled 设置为 false\n` +
        `   2. 将 render.mode 设置为 'csr' 或 'hybrid'\n\n` +
        `   当前配置：\n` +
        `   - render.mode = '${renderMode}'\n` +
        `   - prefetch.enabled = ${prefetchEnabled}\n`,
    );
  }

  // 初始化应用
  await app.initialize();

  // 启动应用（会自动处理开发环境的 HMR、文件监听、自动打开浏览器等）
  await app.start();
}
