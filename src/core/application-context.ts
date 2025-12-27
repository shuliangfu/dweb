/**
 * 应用上下文模块
 * 提供应用状态和服务的统一访问接口
 * 
 * @module core/application-context
 */

import type { AppConfig, AppLike } from '../types/index.ts';
import type { Application } from './application.ts';
import type { Server } from './server.ts';
import type { Router } from './router.ts';
import type { RouteHandler } from './route-handler.ts';
import type { MiddlewareManager } from './middleware.ts';
import type { PluginManager } from './plugin.ts';

/**
 * 应用上下文
 * 提供应用状态和服务的统一访问接口
 * 实现 AppLike 接口，供插件系统使用
 * 
 * @example
 * ```ts
 * import { ApplicationContext } from "@dreamer/dweb/core/application-context";
 * 
 * const context = new ApplicationContext(application);
 * const server = context.server;
 * const router = context.router;
 * ```
 */
export class ApplicationContext implements AppLike {
  /** 应用实例 */
  private application: Application;
  /** 配置对象 */
  private config: AppConfig | null = null;
  /** 是否为生产环境 */
  isProduction: boolean = false;
  
  /** 索引签名（满足 AppLike 接口要求） */
  [key: string]: unknown;

  /**
   * 构造函数
   * 
   * @param application - 应用实例
   */
  constructor(application: Application) {
    this.application = application;
  }

  /**
   * 获取服务器实例
   */
  get server(): Server {
    return this.application.getService<Server>('server');
  }

  /**
   * 获取路由管理器
   */
  get router(): Router {
    return this.application.getService<Router>('router');
  }

  /**
   * 获取路由处理器
   */
  get routeHandler(): RouteHandler {
    return this.application.getService<RouteHandler>('routeHandler');
  }

  /**
   * 获取中间件管理器
   */
  get middleware(): MiddlewareManager {
    return this.application.getService<MiddlewareManager>('middleware');
  }

  /**
   * 获取插件管理器
   */
  get plugins(): PluginManager {
    return this.application.getService<PluginManager>('plugins');
  }

  /**
   * 获取配置
   * 
   * @returns 配置对象
   */
  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('配置未加载，请先初始化应用');
    }
    return this.config;
  }

  /**
   * 设置配置
   * 
   * @param config - 配置对象
   */
  setConfig(config: AppConfig): void {
    this.config = config;
    // 更新生产环境标志
    this.isProduction = config.isProduction ?? false;
  }

  /**
   * 是否为生产环境
   * 
   * @returns 如果是生产环境返回 true，否则返回 false
   */
  isProd(): boolean {
    return this.isProduction;
  }

  /**
   * 设置生产环境标志
   * 
   * @param isProduction - 是否为生产环境
   */
  setIsProduction(isProduction: boolean): void {
    this.isProduction = isProduction;
  }

  /**
   * 获取应用实例（用于扩展）
   */
  getApplication(): Application {
    return this.application;
  }
}
