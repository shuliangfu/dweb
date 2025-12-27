/**
 * 生命周期管理器模块
 * 管理应用的生命周期，统一处理启动、运行、关闭流程
 * 
 * @module core/lifecycle-manager
 */

import type { Application } from './application.ts';
import type { Server } from './server.ts';
import type { ConfigManager } from './config-manager.ts';

/**
 * 应用生命周期阶段
 */
export enum LifecyclePhase {
  /** 初始化中 */
  Initializing = 'initializing',
  /** 已初始化 */
  Initialized = 'initialized',
  /** 启动中 */
  Starting = 'starting',
  /** 运行中 */
  Running = 'running',
  /** 停止中 */
  Stopping = 'stopping',
  /** 已停止 */
  Stopped = 'stopped',
}

/**
 * 生命周期钩子
 * 允许在应用生命周期的不同阶段执行自定义逻辑
 */
export interface LifecycleHooks {
  /** 初始化钩子，在应用初始化时调用 */
  onInitialize?: () => Promise<void> | void;
  /** 启动前钩子，在应用启动前调用 */
  onStart?: () => Promise<void> | void;
  /** 停止前钩子，在应用停止前调用 */
  onStop?: () => Promise<void> | void;
  /** 关闭钩子，在应用关闭时调用 */
  onShutdown?: () => Promise<void> | void;
}

/**
 * 生命周期管理器
 * 管理应用的生命周期，统一处理启动、运行、关闭流程
 * 
 * @example
 * ```ts
 * import { LifecycleManager } from "@dreamer/dweb/core/lifecycle-manager";
 * 
 * const lifecycleManager = new LifecycleManager(application);
 * 
 * // 注册生命周期钩子
 * lifecycleManager.registerHooks({
 *   onStart: async () => {
 *     console.log('应用启动中...');
 *   },
 *   onStop: async () => {
 *     console.log('应用停止中...');
 *   },
 * });
 * 
 * // 启动应用
 * await lifecycleManager.start();
 * ```
 */
export class LifecycleManager {
  /** 应用实例 */
  private application: Application;
  /** 当前生命周期阶段 */
  private phase: LifecyclePhase = LifecyclePhase.Initializing;
  /** 生命周期钩子列表 */
  private hooks: LifecycleHooks[] = [];

  /**
   * 构造函数
   * 
   * @param application - 应用实例
   */
  constructor(application: Application) {
    this.application = application;
  }

  /**
   * 注册生命周期钩子
   * 
   * @param hooks - 生命周期钩子对象
   * 
   * @example
   * ```ts
   * lifecycleManager.registerHooks({
   *   onStart: async () => {
   *     console.log('应用启动');
   *   },
   * });
   * ```
   */
  registerHooks(hooks: LifecycleHooks): void {
    this.hooks.push(hooks);
  }

  /**
   * 启动应用
   * 执行启动流程：执行启动钩子 -> 启动服务器 -> 更新状态
   * 
   * @throws {Error} 如果应用未初始化
   * 
   * @example
   * ```ts
   * await lifecycleManager.start();
   * ```
   */
  async start(): Promise<void> {
    if (this.phase !== LifecyclePhase.Initialized) {
      throw new Error('应用未初始化，无法启动');
    }

    this.phase = LifecyclePhase.Starting;

    try {
      // 执行启动前钩子
      await this.executeHooks('onStart');

      // 启动服务器
      const server = this.application.getService<Server>('server');
      const configManager = this.application.getService<ConfigManager>('configManager');
      const config = configManager.getConfig();
      
      if (!config.server || !config.server.port) {
        throw new Error('服务器配置无效：缺少 port');
      }

      await server.start(
        config.server.port,
        config.server.host || 'localhost',
        config.server.tls
      );

      this.phase = LifecyclePhase.Running;

      // 执行启动后钩子（可以再次调用 onStart，表示启动完成）
      // 这里可以根据需要调整钩子执行时机
    } catch (error) {
      this.phase = LifecyclePhase.Stopped;
      throw error;
    }
  }

  /**
   * 停止应用
   * 执行停止流程：执行停止钩子 -> 停止服务器 -> 清理资源 -> 更新状态
   * 
   * @example
   * ```ts
   * await lifecycleManager.stop();
   * ```
   */
  async stop(): Promise<void> {
    if (this.phase !== LifecyclePhase.Running) {
      // 如果不在运行状态，直接返回
      return;
    }

    this.phase = LifecyclePhase.Stopping;

    try {
      // 执行停止前钩子
      await this.executeHooks('onStop');

      // 停止服务器
      const server = this.application.getService<Server>('server');
      await server.close();

      // 清理资源
      await this.cleanup();

      this.phase = LifecyclePhase.Stopped;

      // 执行关闭钩子
      await this.executeHooks('onShutdown');
    } catch (error) {
      this.phase = LifecyclePhase.Stopped;
      throw error;
    }
  }

  /**
   * 执行生命周期钩子
   * 
   * @param hookName - 钩子名称
   */
  private async executeHooks(hookName: keyof LifecycleHooks): Promise<void> {
    for (const hooks of this.hooks) {
      const hook = hooks[hookName];
      if (hook) {
        try {
          await hook();
        } catch (error) {
          // 记录错误但不中断流程
          console.error(`生命周期钩子 ${hookName} 执行失败:`, error);
        }
      }
    }
  }

  /**
   * 清理资源
   * 清理数据库连接、WebSocket 连接等资源
   */
  private async cleanup(): Promise<void> {
    // TODO: 清理数据库连接
    // TODO: 清理 WebSocket 连接
    // TODO: 清理其他资源
    
    // 清理服务容器的作用域实例
    const serviceContainer = this.application.getService('serviceContainer');
    if (serviceContainer && typeof serviceContainer.clearScope === 'function') {
      serviceContainer.clearScope();
    }
  }

  /**
   * 获取当前生命周期阶段
   * 
   * @returns 当前生命周期阶段
   */
  getPhase(): LifecyclePhase {
    return this.phase;
  }

  /**
   * 设置生命周期阶段（内部使用）
   * 
   * @param phase - 生命周期阶段
   */
  setPhase(phase: LifecyclePhase): void {
    this.phase = phase;
  }
}
