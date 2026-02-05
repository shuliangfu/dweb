/**
 * @dreamer/lifecycle 集成
 *
 * 初始化生命周期管理（LifecycleManager），注册 init/start/stop 等钩子，
 * 协调应用启动与关闭流程。
 *
 * @module
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
 *
 * @example
 * ```ts
 * const lm = initializeLifecycle(container, config);
 * lm.on("start", () => console.log("started"));
 * ```
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
 *
 * @example
 * ```ts
 * const lm = getLifecycleManager(container);
 * const stage = lm.getStage();
 * ```
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
 * @returns void
 *
 * @example
 * ```ts
 * registerLifecycleHook(container, "start", async () => {
 *   console.log("应用已启动");
 * });
 * ```
 */
export function registerLifecycleHook(
  container: ServiceContainer,
  stage: LifecycleStage,
  hook: LifecycleHook,
): void {
  const lifecycleManager = getLifecycleManager(container);
  lifecycleManager.on(stage, hook);
}
