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
   * @throws {Error} 如果初始化失败
   */
  async initialize(): Promise<void> {
    if (this.state !== ServiceState.Uninitialized) {
      throw new Error(`${this.name} 已经初始化，无法重复初始化`);
    }

    try {
      await this.onInitialize();
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
   * @throws {Error} 如果启动失败
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
      await this.onStart();
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
   * @throws {Error} 如果停止失败
   */
  async stop(): Promise<void> {
    if (this.state !== ServiceState.Running) {
      // 如果不在运行状态，直接返回
      return;
    }

    try {
      await this.onStop();
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
  async destroy(): Promise<void> {
    // 如果正在运行，先停止
    if (this.state === ServiceState.Running) {
      await this.stop();
    }

    try {
      await this.onDestroy();
      this.state = ServiceState.Destroyed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${this.name} 销毁失败: ${message}`);
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
