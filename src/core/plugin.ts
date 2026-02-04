/**
 * @dreamer/plugin 集成
 *
 * 初始化插件系统（PluginManager），注册插件，管理安装与激活生命周期。
 *
 * @module
 */

import {
  type Plugin,
  PluginManager,
  type PluginManagerOptions,
} from "@dreamer/plugin";
import type { ServiceContainer } from "@dreamer/service";

/**
 * 初始化插件系统
 *
 * @param container 服务容器
 * @param options 插件管理器配置选项
 * @returns 插件管理器实例
 */
export function initializePlugin(
  container: ServiceContainer,
  options: PluginManagerOptions = {},
): PluginManager {
  // 创建插件管理器实例
  const pluginManager = new PluginManager(container, {
    autoActivate: options.autoActivate ?? false,
    continueOnError: options.continueOnError ?? true,
    enableHotReload: options.enableHotReload ?? false,
    hotReloadInterval: options.hotReloadInterval ?? 1000,
    resourceLimits: options.resourceLimits,
  });

  // 将插件管理器注册到服务容器
  container.registerSingleton("pluginManager", () => pluginManager);

  return pluginManager;
}

/**
 * 获取插件管理器实例
 *
 * @param container 服务容器
 * @returns 插件管理器实例
 */
export function getPluginManager(container: ServiceContainer): PluginManager {
  return container.get<PluginManager>("pluginManager");
}

/**
 * 注册并激活插件
 *
 * @param container 服务容器
 * @param plugin 插件对象
 */
export async function registerPlugin(
  container: ServiceContainer,
  plugin: Plugin,
): Promise<void> {
  const pluginManager = getPluginManager(container);

  // 注册插件
  pluginManager.register(plugin);

  // 安装并激活插件（触发 onInit 钩子）
  await pluginManager.install(plugin.name);
  await pluginManager.activate(plugin.name);
}
