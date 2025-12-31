/**
 * 基础管理器模块
 * 提供所有管理器的通用功能和生命周期管理
 *
 * @module core/base-manager
 */

import type { IService } from "./iservice.ts";

/**
 * 服务状态枚举
 */
export enum ServiceState {
  /** 未初始化 */
  Uninitialized = "uninitialized",
  /** 已初始化 */
  Initialized = "initialized",
  /** 运行中 */
  Running = "running",
  /** 已停止 */
  Stopped = "stopped",
  /** 已销毁 */
  Destroyed = "destroyed",
}

/**
 * 基础管理器类
 * 所有管理器都应该继承此类，以获得统一的生命周期管理和通用功能
 *
 * @example
 * ```ts
 * class MyManager extends BaseManager {
 *   constructor() {
 *     super('MyManager');
 *   }
 *
 *   protected async onInitialize(): Promise<void> {
 *     // 自定义初始化逻辑
 *   }
 *
 *   protected async onStart(): Promise<void> {
 *     // 自定义启动逻辑
 *   }
 *
 *   protected async onStop(): Promise<void> {
 *     // 自定义停止逻辑
 *   }
 *
 *   protected async onDestroy(): Promise<void> {
 *     // 自定义清理逻辑
 *   }
 * }
 * ```
 */
export abstract class BaseManager implements IService {
  /** 服务名称 */
  public readonly name: string;
  /** 服务状态 */
  protected state: ServiceState = ServiceState.Uninitialized;
  /** 初始化时间戳 */
  protected initializedAt?: number;
  /** 启动时间戳 */
  protected startedAt?: number;

  /**
   * 构造函数
   *
   * @param name - 管理器名称
   */
  constructor(name: string) {
    this.name = name;
  }

  /**
   * 初始化管理器
   * 调用子类的 onInitialize 方法
   *
   * @throws {Error} 如果初始化失败或超时
   */
  async initialize(): Promise<void> {
    if (this.state !== ServiceState.Uninitialized) {
      throw new Error(`${this.name} 已经初始化，无法重复初始化`);
    }

    try {
      // 为 onInitialize 添加超时保护（30秒）
      const initPromise = this.onInitialize();
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(
          () => reject(new Error(`${this.name} 初始化超时（30秒）`)),
          30000,
        );
      });

      await Promise.race([initPromise, timeoutPromise]);
      this.state = ServiceState.Initialized;
      this.initializedAt = Date.now();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${this.name} 初始化失败: ${message}`);
    }
  }

  /**
   * 启动管理器
   * 调用子类的 onStart 方法
   *
   * @throws {Error} 如果启动失败或超时
   */
  async start(): Promise<void> {
    if (this.state === ServiceState.Uninitialized) {
      // 如果未初始化，先初始化
      await this.initialize();
    }

    if (
      this.state !== ServiceState.Initialized &&
      this.state !== ServiceState.Stopped
    ) {
      throw new Error(
        `${this.name} 状态不正确，无法启动。当前状态: ${this.state}`,
      );
    }

    try {
      // 为 onStart 添加超时保护（30秒）
      const startPromise = this.onStart();
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(
          () => reject(new Error(`${this.name} 启动超时（30秒）`)),
          30000,
        );
      });

      await Promise.race([startPromise, timeoutPromise]);
      this.state = ServiceState.Running;
      this.startedAt = Date.now();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${this.name} 启动失败: ${message}`);
    }
  }

  /**
   * 停止管理器
   * 调用子类的 onStop 方法
   *
   * @throws {Error} 如果停止失败或超时
   */
  async stop(): Promise<void> {
    if (this.state !== ServiceState.Running) {
      // 如果不在运行状态，直接返回
      return;
    }

    try {
      // 为 onStop 添加超时保护（10秒）
      const stopPromise = this.onStop();
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(
          () => reject(new Error(`${this.name} 停止超时（10秒）`)),
          10000,
        );
      });

      await Promise.race([stopPromise, timeoutPromise]);
      this.state = ServiceState.Stopped;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${this.name} 停止失败: ${message}`);
    }
  }

  /**
   * 销毁管理器
   * 调用子类的 onDestroy 方法
   *
   * @throws {Error} 如果销毁失败
   */
  destroy(): Promise<void> {
    // 如果正在运行，先停止（添加超时保护，但不阻塞）
    if (this.state === ServiceState.Running) {
      // 在后台停止，不等待
      this.stop().catch(() => {
        // 忽略后台停止错误
      });
    }

    try {
      // 调用 onDestroy，但不等待它完成（避免阻塞）
      const destroyResult = this.onDestroy();

      // 如果 onDestroy 返回 Promise，在后台处理，不阻塞主流程
      if (destroyResult instanceof Promise) {
        // 在后台等待，但不阻塞
        destroyResult.catch(() => {
          // 忽略后台销毁错误
        });
      }

      // 立即更新状态，不等待 onDestroy 完成
      this.state = ServiceState.Destroyed;
      // 立即返回 resolved Promise
      return Promise.resolve();
    } catch {
      // 即使失败也更新状态，避免阻塞
      this.state = ServiceState.Destroyed;
      // 立即返回 resolved Promise
      return Promise.resolve();
    }
  }

  /**
   * 获取服务名称
   *
   * @returns 服务名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 检查服务是否已初始化
   *
   * @returns 如果服务已初始化返回 true，否则返回 false
   */
  isInitialized(): boolean {
    return this.state !== ServiceState.Uninitialized;
  }

  /**
   * 检查服务是否正在运行
   *
   * @returns 如果服务正在运行返回 true，否则返回 false
   */
  isRunning(): boolean {
    return this.state === ServiceState.Running;
  }

  /**
   * 获取服务状态
   *
   * @returns 当前服务状态
   */
  getState(): ServiceState {
    return this.state;
  }

  /**
   * 获取初始化时间戳
   *
   * @returns 初始化时间戳（如果已初始化）
   */
  getInitializedAt(): number | undefined {
    return this.initializedAt;
  }

  /**
   * 获取启动时间戳
   *
   * @returns 启动时间戳（如果已启动）
   */
  getStartedAt(): number | undefined {
    return this.startedAt;
  }

  /**
   * 初始化钩子
   * 子类可以重写此方法来实现自定义初始化逻辑
   *
   * @protected
   */
  protected async onInitialize(): Promise<void> {
    // 默认实现为空，子类可以重写
  }

  /**
   * 启动钩子
   * 子类可以重写此方法来实现自定义启动逻辑
   *
   * @protected
   */
  protected async onStart(): Promise<void> {
    // 默认实现为空，子类可以重写
  }

  /**
   * 停止钩子
   * 子类可以重写此方法来实现自定义停止逻辑
   *
   * @protected
   */
  protected async onStop(): Promise<void> {
    // 默认实现为空，子类可以重写
  }

  /**
   * 销毁钩子
   * 子类可以重写此方法来实现自定义清理逻辑
   *
   * @protected
   */
  protected async onDestroy(): Promise<void> {
    // 默认实现为空，子类可以重写
  }
}
