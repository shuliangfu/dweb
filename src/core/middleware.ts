/**
 * 中间件系统模块
 * 提供中间件注册和管理功能
 * 
 * @module core/middleware
 */

import type { Middleware, MiddlewareConfig } from '../types/index.ts';
import { BaseManager } from './base-manager.ts';
import type { IService } from './iservice.ts';

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
export class MiddlewareManager extends BaseManager implements IService {
  private middlewares: Middleware[] = [];

  /**
   * 构造函数
   */
  constructor() {
    super('MiddlewareManager');
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
    if (typeof middleware === 'function') {
      this.middlewares.push(middleware);
    } else {
      this.middlewares.push(middleware.handler);
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
    middlewares.forEach(m => this.add(m));
  }
  
  /**
   * 获取所有中间件
   * 
   * 返回当前注册的所有中间件的副本。
   * 
   * @returns 中间件数组的副本
   * 
   * @example
   * ```ts
   * const middlewares = manager.getAll();
   * console.log(`当前有 ${middlewares.length} 个中间件`);
   * ```
   */
  getAll(): Middleware[] {
    return [...this.middlewares];
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

