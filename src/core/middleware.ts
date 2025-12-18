/**
 * 中间件系统模块
 * 提供中间件注册和管理功能
 */

import type { Middleware, MiddlewareConfig } from '../types/index.ts';

/**
 * 中间件管理器
 */
export class MiddlewareManager {
  private middlewares: Middleware[] = [];
  
  /**
   * 添加中间件
   * @param middleware 中间件函数或配置对象
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
   * @param middlewares 中间件数组
   */
  addMany(middlewares: (Middleware | MiddlewareConfig)[]): void {
    middlewares.forEach(m => this.add(m));
  }
  
  /**
   * 获取所有中间件
   * @returns 中间件数组
   */
  getAll(): Middleware[] {
    return [...this.middlewares];
  }
  
  /**
   * 清空所有中间件
   */
  clear(): void {
    this.middlewares = [];
  }
}

