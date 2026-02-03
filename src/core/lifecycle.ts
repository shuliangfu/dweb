/**
 * @dreamer/lifecycle 集成
 *
 * 职责：
 * - 初始化生命周期管理
 * - 注册生命周期钩子
 * - 协调应用启动和关闭
 *
 * 功能：
 * - 创建 LifecycleManager 实例
 * - 注册生命周期钩子
 * - 管理应用状态转换
 */

import {
  type LifecycleHook,
  LifecycleManager,
  type LifecycleStage,
} from "@dreamer/lifecycle";
import type { ServiceContainer } from "@dreamer/service";
import type { AppConfig } from "../types/app.ts";

/**
 * 初始化生命周期管理
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns 生命周期管理器实例
 */
export function initializeLifecycle(
  container: ServiceContainer,
  config: AppConfig,
): LifecycleManager {
  // 从配置中获取生命周期选项
  const lifecycleConfig = (config.lifecycle || {}) as {
    autoEmitEvents?: boolean;
    timeout?: number;
  };

  // 创建生命周期管理器实例
  const lifecycleManager = new LifecycleManager({
    autoEmitEvents: lifecycleConfig.autoEmitEvents !== false,
    timeout: lifecycleConfig.timeout || 0,
  });

  // 将生命周期管理器注册到服务容器
  container.registerSingleton("lifecycleManager", () => lifecycleManager);

  return lifecycleManager;
}

/**
 * 获取生命周期管理器实例
 *
 * @param container 服务容器
 * @returns 生命周期管理器实例
 */
export function getLifecycleManager(
  container: ServiceContainer,
): LifecycleManager {
  return container.get<LifecycleManager>("lifecycleManager");
}

/**
 * 注册生命周期钩子
 *
 * @param container 服务容器
 * @param stage 生命周期阶段
 * @param hook 钩子函数
 */
export function registerLifecycleHook(
  container: ServiceContainer,
  stage: LifecycleStage,
  hook: LifecycleHook,
): void {
  const lifecycleManager = getLifecycleManager(container);
  lifecycleManager.on(stage, hook);
}
