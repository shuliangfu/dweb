/**
 * 插件系统模块
 * 提供插件注册和生命周期管理
 *
 * @module core/plugin
 */

import type {
  AppConfig,
  AppLike,
  BuildConfig,
  Plugin,
  Request,
  Response,
} from "../common/types/index.ts";
import { BaseManager } from "./base-manager.ts";
import type { IService } from "./iservice.ts";

/**
 * 插件管理器
 *
 * 负责管理插件的注册和生命周期钩子的执行。
 * 继承 BaseManager 以获得统一的生命周期管理。
 *
 * @example
 * ```ts
 * import { PluginManager } from "@dreamer/dweb";
 * import { tailwind } from "@dreamer/dweb";
 *
 * const manager = new PluginManager();
 * await manager.initialize();
 *
 * manager.register(tailwind({ version: "v4" }));
 *
 * await manager.executeOnInit({ server, router, routeHandler });
 *
 * await manager.start();
 * ```
 */
export class PluginManager extends BaseManager implements IService {
  private plugins: Plugin[] = [];

  /**
   * 构造函数
   */
  constructor() {
    super("PluginManager");
  }

  /**
   * 注册插件
   *
   * 将插件注册到插件管理器中。插件可以是完整的插件对象，也可以是包含名称和配置的对象。
   *
   * @param plugin - 插件对象或插件配置对象
   *
   * @example
   * ```ts
   * const manager = new PluginManager();
   *
   * // 注册完整插件对象
   * manager.register({
   *   name: "my-plugin",
   *   onInit: async (app) => { \/* ... *\/ },
   * });
   *
   * // 注册配置对象
   * manager.register({ name: "my-plugin", config: { enabled: true } });
   * ```
   */
  register(
    plugin: Plugin | { name: string; config?: Record<string, unknown> },
  ): void {
    // 获取插件名称，用于去重检查
    const pluginName = (plugin as Plugin).name ||
      (plugin as { name: string }).name;

    // 检查是否已经注册了同名插件，避免重复注册
    if (pluginName && this.plugins.some((p) => p.name === pluginName)) {
      // 如果已经存在同名插件，跳过注册（避免重复执行钩子）
      return;
    }

    if (
      "onInit" in plugin || "onRequest" in plugin || "onResponse" in plugin ||
      "onError" in plugin || "onBuild" in plugin || "onStart" in plugin
    ) {
      // 完整的插件对象
      this.plugins.push(plugin as Plugin);
    } else {
      // 插件配置对象，需要转换为插件对象
      this.plugins.push({
        name: plugin.name,
        config: plugin.config,
      } as Plugin);
    }
  }

  /**
   * 批量注册插件
   *
   * 一次性注册多个插件。
   *
   * @param plugins - 插件数组
   *
   * @example
   * ```ts
   * manager.registerMany([
   *   tailwind({ version: "v4" }),
   *   customPlugin({ enabled: true }),
   * ]);
   * ```
   */
  registerMany(
    plugins: (Plugin | { name: string; config?: Record<string, any> })[],
  ): void {
    plugins.forEach((p) => this.register(p));
  }

  /**
   * 执行初始化钩子
   * @param app 应用实例
   */
  async executeOnInit(app: AppLike, config: AppConfig): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onInit) {
        await plugin.onInit(app, config);
      }
    }
  }

  /**
   * 执行请求钩子
   * @param req 请求对象
   * @param res 响应对象
   */
  async executeOnRequest(req: Request, res: Response): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onRequest) {
        await plugin.onRequest(req, res);
      }
    }
  }

  /**
   * 执行响应钩子
   * @param req 请求对象
   * @param res 响应对象
   */
  async executeOnResponse(req: Request, res: Response): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onResponse) {
        try {
          await plugin.onResponse(req, res);
        } catch (error) {
          console.error(
            `[Plugin Manager] 插件 "${plugin.name}" 的 onResponse 钩子执行失败:`,
            error instanceof Error ? error.message : String(error),
          );
          if (error instanceof Error && error.stack) {
            console.error(`[Plugin Manager] 错误堆栈:`, error.stack);
          }
        }
      }
    }
  }

  /**
   * 执行错误钩子
   * @param err 错误对象
   * @param req 请求对象
   * @param res 响应对象
   */
  async executeOnError(err: Error, req: Request, res: Response): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onError) {
        await plugin.onError(err, req, res);
      }
    }
  }

  /**
   * 执行构建钩子
   * @param config 构建配置
   */
  async executeOnBuild(config: BuildConfig): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onBuild) {
        await plugin.onBuild(config);
      }
    }
  }

  /**
   * 执行启动钩子
   * @param app 应用实例
   */
  async executeOnStart(app: AppLike): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onStart) {
        await plugin.onStart(app);
      }
    }
  }

  /**
   * 获取所有插件
   * @returns 插件数组
   */
  getAll(): Plugin[] {
    return [...this.plugins];
  }

  /**
   * 根据名称获取插件
   *
   * 通过插件的名称查找并返回对应的插件对象。
   * 如果插件不存在，返回 undefined。
   *
   * @param name - 插件名称
   * @returns 插件对象，如果未找到则返回 undefined
   *
   * @example
   * ```ts
   * // 注册插件
   * manager.register({
   *   name: "tailwind",
   *   onInit: async (app) => { /* ... *\/ },
   * });
   *
   * // 获取插件
   * const tailwindPlugin = manager.get("tailwind");
   * if (tailwindPlugin) {
   *   // 使用插件
   *   console.log("Tailwind 插件配置:", tailwindPlugin.config);
   * }
   * ```
   */
  get(name: string): Plugin | undefined {
    return this.plugins.find((p) => p.name === name);
  }

  /**
   * 根据索引获取插件
   *
   * 通过索引位置获取插件对象。
   *
   * @param index - 插件在数组中的索引位置
   * @returns 插件对象，如果索引无效则返回 undefined
   *
   * @example
   * ```ts
   * // 获取第一个插件
   * const firstPlugin = manager.getByIndex(0);
   *
   * // 获取最后一个插件
   * const lastPlugin = manager.getByIndex(manager.getAll().length - 1);
   * ```
   */
  getByIndex(index: number): Plugin | undefined {
    if (index < 0 || index >= this.plugins.length) {
      return undefined;
    }
    return this.plugins[index];
  }

  /**
   * 检查插件是否存在
   *
   * 根据名称检查插件是否已注册。
   *
   * @param name - 插件名称
   * @returns 如果插件存在返回 true，否则返回 false
   *
   * @example
   * ```ts
   * if (manager.has("tailwind")) {
   *   const tailwindPlugin = manager.get("tailwind");
   * }
   * ```
   */
  has(name: string): boolean {
    return this.plugins.some((p) => p.name === name);
  }

  /**
   * 清空所有插件
   */
  clear(): void {
    this.plugins = [];
  }
}
