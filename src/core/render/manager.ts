/**
 * 渲染适配器管理器模块
 * 负责管理多个渲染适配器，支持运行时切换
 *
 * @module core/render/manager
 */

import type { RenderAdapter, RenderEngine } from "./adapter.ts";

/**
 * 渲染适配器管理器
 * 负责管理多个渲染适配器，支持运行时切换
 *
 * @example
 * ```ts
 * import { RenderAdapterManager } from "@dreamer/dweb/core/render/manager";
 * import { PreactRenderAdapter } from "@dreamer/dweb/core/render/preact";
 *
 * const manager = new RenderAdapterManager();
 * manager.register(new PreactRenderAdapter());
 *
 * await manager.setEngine('preact');
 * const adapter = manager.getAdapter();
 * ```
 */
export class RenderAdapterManager {
  /** 已注册的适配器映射表 */
  private adapters = new Map<RenderEngine, RenderAdapter>();
  /** 当前使用的适配器 */
  private currentAdapter: RenderAdapter | null = null;
  /** 默认渲染引擎 */
  private defaultEngine: RenderEngine = "preact";

  /**
   * 注册渲染适配器
   *
   * @param adapter - 渲染适配器实例
   *
   * @example
   * ```ts
   * manager.register(new PreactRenderAdapter());
   * ```
   */
  register(adapter: RenderAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * 设置当前使用的渲染引擎
   *
   * @param engine - 渲染引擎名称
   * @throws {Error} 如果渲染引擎未注册
   *
   * @example
   * ```ts
   * await manager.setEngine('preact');
   * ```
   */
  async setEngine(engine: RenderEngine): Promise<void> {
    const adapter = this.adapters.get(engine);
    if (!adapter) {
      throw new Error(`渲染引擎未注册: ${engine}`);
    }

    // 如果切换引擎，先清理旧的
    if (this.currentAdapter && this.currentAdapter.name !== engine) {
      await this.currentAdapter.destroy?.();
    }

    // 初始化新引擎
    if (!this.currentAdapter || this.currentAdapter.name !== engine) {
      await adapter.initialize?.();
      this.currentAdapter = adapter;
    }
  }

  /**
   * 获取当前渲染适配器
   *
   * @returns 当前渲染适配器
   * @throws {Error} 如果适配器未初始化
   *
   * @example
   * ```ts
   * const adapter = manager.getAdapter();
   * ```
   */
  getAdapter(): RenderAdapter {
    if (!this.currentAdapter) {
      throw new Error("渲染适配器未初始化，请先调用 setEngine()");
    }
    return this.currentAdapter;
  }

  /**
   * 获取默认引擎
   *
   * @returns 默认渲染引擎
   */
  getDefaultEngine(): RenderEngine {
    return this.defaultEngine;
  }

  /**
   * 设置默认引擎
   *
   * @param engine - 默认渲染引擎
   */
  setDefaultEngine(engine: RenderEngine): void {
    this.defaultEngine = engine;
  }

  /**
   * 初始化所有适配器
   * 预加载所有已注册的适配器（可选，用于性能优化）
   *
   * @example
   * ```ts
   * await manager.initializeAll();
   * ```
   */
  async initializeAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.initialize?.();
    }
  }

  /**
   * 清理所有适配器
   * 在应用关闭时调用，清理所有适配器的资源
   *
   * @example
   * ```ts
   * await manager.destroyAll();
   * ```
   */
  async destroyAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.destroy?.();
    }
    this.currentAdapter = null;
  }

  /**
   * 检查适配器是否已注册
   *
   * @param engine - 渲染引擎名称
   * @returns 如果已注册返回 true，否则返回 false
   */
  has(engine: RenderEngine): boolean {
    return this.adapters.has(engine);
  }
}
