/**
 * 中间件系统模块
 * 提供中间件注册和管理功能
 *
 * @module core/middleware
 */

import type { Middleware, MiddlewareConfig } from "../common/types/index.ts";
import { BaseManager } from "./base-manager.ts";
import type { IService } from "./iservice.ts";

/**
 * 中间件管理器
 *
 * 负责管理中间件链，支持添加、批量添加、获取和清空中间件。
 * 继承 BaseManager 以获得统一的生命周期管理。
 *
 * @example
 * ```ts
 * import { MiddlewareManager } from "@dreamer/dweb";
 * import { logger, cors } from "@dreamer/dweb";
 *
 * const manager = new MiddlewareManager();
 * await manager.initialize();
 *
 * manager.add(logger());
 * manager.add(cors({ origin: "*" }));
 *
 * const middlewares = manager.getAll();
 *
 * await manager.start();
 * ```
 */
/**
 * 中间件注册信息（内部使用）
 */
interface MiddlewareRegistration {
  /** 中间件名称（可选） */
  name?: string;
  /** 中间件处理函数 */
  handler: Middleware;
  /** 中间件配置选项 */
  options?: Record<string, unknown>;
}

export class MiddlewareManager extends BaseManager implements IService {
  private middlewares: MiddlewareRegistration[] = [];

  /**
   * 构造函数
   */
  constructor() {
    super("MiddlewareManager");
  }

  /**
   * 添加中间件
   *
   * 将中间件添加到中间件链中。中间件会按照添加顺序执行。
   *
   * @param middleware - 中间件函数或配置对象
   *
   * @example
   * ```ts
   * const manager = new MiddlewareManager();
   *
   * // 添加函数形式的中间件
   * manager.add(async (req, res, next) => {
   *   console.log("请求:", req.url);
   *   await next();
   * });
   *
   * // 添加配置对象形式的中间件
   * manager.add({ name: "my-middleware", handler: myMiddleware });
   * ```
   */
  add(middleware: Middleware | MiddlewareConfig): void {
    // 获取中间件名称（如果存在），用于去重检查
    const middlewareName = typeof middleware === "function"
      ? undefined
      : middleware.name;

    // 检查是否已经注册了同名中间件，避免重复注册
    if (
      middlewareName && this.middlewares.some((m) => m.name === middlewareName)
    ) {
      // 如果已经存在同名中间件，跳过注册（避免重复执行）
      console.warn(`中间件 ${middlewareName} 已存在，跳过注册`);
      return;
    }

    if (typeof middleware === "function") {
      this.middlewares.push({
        handler: middleware,
      });
    } else {
      this.middlewares.push({
        name: middleware.name,
        handler: middleware.handler,
        options: middleware.options,
      });
    }
  }

  /**
   * 批量添加中间件
   *
   * 一次性添加多个中间件到中间件链中。
   *
   * @param middlewares - 中间件数组
   *
   * @example
   * ```ts
   * manager.addMany([
   *   logger(),
   *   cors({ origin: "*" }),
   * ]);
   * ```
   */
  addMany(middlewares: (Middleware | MiddlewareConfig)[]): void {
    middlewares.forEach((m) => this.add(m));
  }

  /**
   * 获取所有中间件处理函数
   *
   * 返回当前注册的所有中间件的处理函数数组（用于执行中间件链）。
   * 如果需要获取完整的配置信息（包括名称和选项），请使用 `getAllConfigs()` 方法。
   *
   * @returns 中间件处理函数数组的副本
   *
   * @example
   * ```ts
   * // 获取所有中间件处理函数（用于执行）
   * const middlewares = manager.getAll();
   * console.log(`当前有 ${middlewares.length} 个中间件`);
   *
   * // 如果需要完整配置信息，使用 getAllConfigs()
   * const allConfigs = manager.getAllConfigs();
   * allConfigs.forEach((config) => {
   *   console.log(`中间件: ${config.name || "未命名"}`);
   * });
   * ```
   */
  getAll(): Middleware[] {
    return this.middlewares.map((m) => m.handler);
  }

  /**
   * 根据名称获取中间件
   *
   * 通过中间件的名称查找并返回对应的中间件配置信息（包括名称、处理函数和配置选项）。
   * 如果中间件没有名称或名称不匹配，返回 undefined。
   *
   * @param name - 中间件名称
   * @returns 中间件配置对象，如果未找到则返回 undefined
   *
   * @example
   * ```ts
   * // 注册带名称的中间件
   * manager.add({ name: "logger", handler: logger(), options: { format: "dev" } });
   *
   * // 获取中间件（包含完整信息）
   * const loggerConfig = manager.get("logger");
   * if (loggerConfig) {
   *   console.log("中间件名称:", loggerConfig.name);
   *   console.log("中间件配置:", loggerConfig.options);
   *   // 使用中间件处理函数
   *   await loggerConfig.handler(req, res, next);
   * }
   * ```
   */
  get(name: string): MiddlewareConfig | undefined {
    const registration = this.middlewares.find((m) => m.name === name);
    if (!registration) {
      return undefined;
    }
    return {
      name: registration.name,
      handler: registration.handler,
      options: registration.options,
    };
  }

  /**
   * 根据索引获取中间件
   *
   * 通过索引位置获取中间件配置信息（包括名称、处理函数和配置选项）。
   *
   * @param index - 中间件在数组中的索引位置
   * @returns 中间件配置对象，如果索引无效则返回 undefined
   *
   * @example
   * ```ts
   * // 获取第一个中间件（包含完整信息）
   * const firstMiddleware = manager.getByIndex(0);
   * if (firstMiddleware) {
   *   console.log("中间件名称:", firstMiddleware.name);
   *   console.log("中间件配置:", firstMiddleware.options);
   * }
   *
   * // 获取最后一个中间件
   * const lastMiddleware = manager.getByIndex(manager.getAll().length - 1);
   * ```
   */
  getByIndex(index: number): MiddlewareConfig | undefined {
    if (index < 0 || index >= this.middlewares.length) {
      return undefined;
    }
    const registration = this.middlewares[index];
    return {
      name: registration.name,
      handler: registration.handler,
      options: registration.options,
    };
  }

  /**
   * 获取所有中间件的完整配置信息
   *
   * 返回当前注册的所有中间件的完整配置信息（包括名称、处理函数和配置选项）。
   *
   * @returns 中间件配置数组的副本
   *
   * @example
   * ```ts
   * const allConfigs = manager.getAllConfigs();
   * allConfigs.forEach((config) => {
   *   console.log(`中间件: ${config.name || "未命名"}`);
   *   console.log("配置选项:", config.options);
   * });
   * ```
   */
  getAllConfigs(): MiddlewareConfig[] {
    return this.middlewares.map((m) => ({
      name: m.name,
      handler: m.handler,
      options: m.options,
    }));
  }

  /**
   * 检查中间件是否存在
   *
   * 根据名称检查中间件是否已注册。
   *
   * @param name - 中间件名称
   * @returns 如果中间件存在返回 true，否则返回 false
   *
   * @example
   * ```ts
   * if (manager.has("logger")) {
   *   const loggerMiddleware = manager.get("logger");
   * }
   * ```
   */
  has(name: string): boolean {
    return this.middlewares.some((m) => m.name === name);
  }

  /**
   * 清空所有中间件
   *
   * 移除所有已注册的中间件。
   *
   * @example
   * ```ts
   * manager.clear(); // 清空所有中间件
   * ```
   */
  clear(): void {
    this.middlewares = [];
  }
}
