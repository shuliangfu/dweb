/**
 * 插件系统模块
 * 提供插件注册和生命周期管理
 */

import type { Plugin, Request, Response } from '../types/index.ts';

/**
 * 插件管理器
 */
export class PluginManager {
  private plugins: Plugin[] = [];
  
  /**
   * 注册插件
   * @param plugin 插件对象或插件配置
   */
  register(plugin: Plugin | { name: string; config?: Record<string, any> }): void {
    if ('onInit' in plugin || 'onRequest' in plugin || 'onResponse' in plugin || 'onError' in plugin || 'onBuild' in plugin || 'onStart' in plugin) {
      // 完整的插件对象
      this.plugins.push(plugin as Plugin);
    } else {
      // 插件配置对象，需要转换为插件对象
      this.plugins.push({
        name: plugin.name,
        config: plugin.config
      } as Plugin);
    }
  }
  
  /**
   * 批量注册插件
   * @param plugins 插件数组
   */
  registerMany(plugins: (Plugin | { name: string; config?: Record<string, any> })[]): void {
    plugins.forEach(p => this.register(p));
  }
  
  /**
   * 执行初始化钩子
   * @param app 应用实例
   */
  async executeOnInit(app: any): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onInit) {
        await plugin.onInit(app);
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
        await plugin.onResponse(req, res);
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
  async executeOnBuild(config: any): Promise<void> {
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
  async executeOnStart(app: any): Promise<void> {
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
   * 清空所有插件
   */
  clear(): void {
    this.plugins = [];
  }
}

