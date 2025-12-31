/**
 * 生命周期管理器模块
 * 管理应用的生命周期，统一处理启动、运行、关闭流程
 *
 * @module core/lifecycle-manager
 */

import type { Application } from "./application.ts";
import type { Server } from "./server.ts";
import type { IService } from "./iservice.ts";
import type { ConfigManager } from "./config-manager.ts";
import type { ServiceContainer } from "./service-container.ts";

/**
 * 应用生命周期阶段
 */
export enum LifecyclePhase {
  /** 初始化中 */
  Initializing = "initializing",
  /** 已初始化 */
  Initialized = "initialized",
  /** 启动中 */
  Starting = "starting",
  /** 运行中 */
  Running = "running",
  /** 停止中 */
  Stopping = "stopping",
  /** 已停止 */
  Stopped = "stopped",
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
  /** 是否正在执行停止操作（防止重复调用） */
  private isStopping: boolean = false;

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
      throw new Error("应用未初始化，无法启动");
    }

    this.phase = LifecyclePhase.Starting;

    try {
      // 执行启动前钩子
      await this.executeHooks("onStart");

      // 启动所有注册的服务（除了 Server 和 LifecycleManager，它们会在后面单独处理）
      const serviceContainer = this.application.getService<ServiceContainer>(
        "serviceContainer",
      );
      if (serviceContainer) {
        const tokens = serviceContainer.getRegisteredTokens();
        for (const token of tokens) {
          // 跳过 Server，它会在后面单独启动
          // 跳过 LifecycleManager，因为它就是当前对象，已经在执行 start() 方法
          if (token === "server" || token === "lifecycleManager") {
            continue;
          }

          try {
            const service = serviceContainer.get<any>(token) as
              | IService
              | undefined;
            if (service && typeof service.start === "function") {
              await service.start();
            }
          } catch (error) {
            // 服务启动失败，记录错误但不中断流程
            const message = error instanceof Error
              ? error.message
              : String(error);
            console.warn(`服务 ${String(token)} 启动失败: ${message}`);
          }
        }
      }

      // 启动服务器
      const server = this.application.getService<Server>("server");
      const configManager = this.application.getService<ConfigManager>(
        "configManager",
      );
      const config = configManager.getConfig();

      if (!config.server || !config.server.port) {
        throw new Error("服务器配置无效：缺少 port");
      }

      await server.start(
        config.server.port,
        config.server.host || "127.0.0.1",
        config.server.tls,
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
    // 如果正在执行停止操作，直接返回（防止重复调用）
    if (this.isStopping) {
      return;
    }

    // 如果已经停止，直接返回
    if (this.phase === LifecyclePhase.Stopped) {
      return;
    }

    // 如果不在 Starting 或 Running 状态，直接返回
    // 允许在 Starting 状态下停止（例如启动过程中收到停止信号）
    if (
      this.phase !== LifecyclePhase.Starting &&
      this.phase !== LifecyclePhase.Running
    ) {
      return;
    }

    // 设置停止标志，防止重复调用
    this.isStopping = true;
    this.phase = LifecyclePhase.Stopping;

    try {
      // 执行停止前钩子
      await this.executeHooks("onStop");

      // 先单独关闭服务器（在清理其他服务之前）
      // Server 的关闭可能会等待请求完成，所以需要单独处理
      // 注意：不等待 close() 完成，因为 shutdown() 可能会卡住
      try {
        const server = this.application.getService<Server>("server");
        if (server) {
          // 直接调用 close()，不等待它完成
          // close() 方法会立即返回，shutdown 在后台执行
          server.close().catch(() => {
            // 忽略后台关闭错误
          });
        }
      } catch {
        // 服务器关闭失败，继续清理其他服务
      }

      // 清理资源（包括所有实现了 IService 的服务，如 QueueManager、DatabaseManager 等）
      // 注意：Server 已经在上面单独处理了，这里会跳过
      await this.cleanup();

      this.phase = LifecyclePhase.Stopped;

      // 执行关闭钩子
      await this.executeHooks("onShutdown");
    } catch (error) {
      this.phase = LifecyclePhase.Stopped;
      throw error;
    } finally {
      // 清除停止标志
      this.isStopping = false;
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
        } catch {
          // 忽略错误，不中断流程
        }
      }
    }
  }

  /**
   * 清理资源
   * 清理数据库连接、WebSocket 连接等资源
   */
  private cleanup(): Promise<void> {
    // 清理所有实现了 IService 接口的服务
    // 注意：不等待 destroy() 完成，直接继续执行
    try {
      const serviceContainer = this.application.getService<ServiceContainer>(
        "serviceContainer",
      );

      if (serviceContainer) {
        // 获取所有注册的服务令牌
        const tokens = serviceContainer.getRegisteredTokens();

        // 遍历所有服务，调用实现了 IService 的服务的 destroy 方法
        // 注意：Server 服务已经在 stop() 方法中单独处理，这里跳过
        for (const token of tokens) {
          // 跳过 Server 服务，因为它已经在 stop() 方法中单独处理
          if (token === "server") {
            continue;
          }

          try {
            // 使用 any 类型获取服务，然后检查是否实现了 IService
            const service = serviceContainer.get<any>(token) as
              | IService
              | undefined;
            if (service && typeof service.destroy === "function") {
              // 直接调用 destroy()，不等待它完成（避免阻塞）
              // destroy() 方法应该立即返回 Promise.resolve()
              const destroyResult = service.destroy();

              // 如果返回 Promise，在后台处理，不阻塞主流程
              if (destroyResult instanceof Promise) {
                destroyResult.catch(() => {
                  // 忽略后台销毁错误
                });
              }
            }
          } catch {
            // 忽略获取服务失败或销毁超时的错误（可能服务未初始化或已关闭）
            // 不中断流程，确保其他服务也能被清理
          }
        }

        // 清理服务容器的作用域实例
        serviceContainer.clearScope();
      }
    } catch {
      // 忽略错误，不中断流程
    }

    // TODO: 清理数据库连接
    // TODO: 清理 WebSocket 连接
    // TODO: 清理其他资源

    // 立即返回，不等待任何操作
    return Promise.resolve();
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
