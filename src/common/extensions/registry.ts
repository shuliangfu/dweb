/**
 * 扩展注册器
 * 管理所有扩展的注册、查询、启用/禁用等操作
 */

import type {
  Extension,
  ExtensionRegistry,
  ExtensionTarget,
  ExtensionType,
} from "./types.ts";

/**
 * 扩展注册器实现类
 * 负责管理框架的所有扩展
 */
export class ExtensionRegistryImpl implements ExtensionRegistry {
  /** 扩展存储映射 */
  private extensions: Map<string, Extension> = new Map();

  /**
   * 注册扩展
   * @param extension 扩展定义
   * @throws {Error} 如果扩展名称已存在
   */
  register(extension: Extension): void {
    if (this.extensions.has(extension.name)) {
      throw new Error(`扩展 "${extension.name}" 已存在`);
    }

    // 设置默认值
    const ext: Extension = {
      enabled: true,
      ...extension,
    };

    this.extensions.set(extension.name, ext);

    // 如果是原生类型扩展，自动应用到原型
    if (ext.target && ext.enabled) {
      this.applyToPrototype(ext);
    }
  }

  /**
   * 获取扩展
   * @param name 扩展名称
   * @returns 扩展定义，如果不存在返回 undefined
   */
  get(name: string): Extension | undefined {
    return this.extensions.get(name);
  }

  /**
   * 获取所有扩展
   * @param type 可选的扩展类型过滤
   * @returns 扩展数组
   */
  getAll(type?: ExtensionType): Extension[] {
    const extensions = Array.from(this.extensions.values());

    if (type) {
      return extensions.filter((ext) => ext.type === type);
    }

    return extensions;
  }

  /**
   * 检查扩展是否存在
   * @param name 扩展名称
   * @returns 是否存在
   */
  has(name: string): boolean {
    return this.extensions.has(name);
  }

  /**
   * 移除扩展
   * @param name 扩展名称
   * @returns 是否成功移除
   */
  remove(name: string): boolean {
    const extension = this.extensions.get(name);
    if (!extension) {
      return false;
    }

    // 如果已应用到原型，需要移除
    if (extension.target) {
      this.removeFromPrototype(extension);
    }

    return this.extensions.delete(name);
  }

  /**
   * 启用扩展
   * @param name 扩展名称
   * @returns 是否成功启用
   */
  enable(name: string): boolean {
    const extension = this.extensions.get(name);
    if (!extension) {
      return false;
    }

    extension.enabled = true;

    // 如果目标类型已定义，应用到原型
    if (extension.target) {
      this.applyToPrototype(extension);
    }

    return true;
  }

  /**
   * 禁用扩展
   * @param name 扩展名称
   * @returns 是否成功禁用
   */
  disable(name: string): boolean {
    const extension = this.extensions.get(name);
    if (!extension) {
      return false;
    }

    extension.enabled = false;

    // 如果目标类型已定义，从原型移除
    if (extension.target) {
      this.removeFromPrototype(extension);
    }

    return true;
  }

  /**
   * 清空所有扩展
   */
  clear(): void {
    // 移除所有原型扩展
    for (const extension of this.extensions.values()) {
      if (extension.target) {
        this.removeFromPrototype(extension);
      }
    }

    this.extensions.clear();
  }

  /**
   * 将扩展应用到原型
   * @param extension 扩展定义
   */
  private applyToPrototype(extension: Extension): void {
    if (!extension.target || !extension.enabled) {
      return;
    }

    const prototype = this.getPrototype(extension.target);
    if (!prototype) {
      return;
    }

    // 检查是否已存在，避免重复添加
    if (prototype[extension.name as keyof typeof prototype]) {
      return;
    }

    // 应用到原型
    (prototype as Record<string, unknown>)[extension.name] = extension.handler;
  }

  /**
   * 从原型移除扩展
   * @param extension 扩展定义
   */
  private removeFromPrototype(extension: Extension): void {
    if (!extension.target) {
      return;
    }

    const prototype = this.getPrototype(extension.target);
    if (!prototype) {
      return;
    }

    // 从原型删除
    delete (prototype as Record<string, unknown>)[extension.name];
  }

  /**
   * 获取目标类型的原型对象
   * @param target 目标类型
   * @returns 原型对象
   */
  private getPrototype(target: ExtensionTarget): unknown {
    switch (target) {
      case "String":
        return String.prototype;
      case "Array":
        return Array.prototype;
      case "Date":
        return Date.prototype;
      case "Object":
        return Object.prototype;
      case "Request":
        return Request.prototype;
      case "Response":
        return Response.prototype;
      case "global":
        return globalThis;
      default:
        return null;
    }
  }
}

/**
 * 全局扩展注册器实例
 */
export const extensionRegistry: ExtensionRegistryImpl =
  new ExtensionRegistryImpl();

/**
 * 注册扩展（便捷函数）
 * @param extension 扩展定义
 */
export function registerExtension(extension: Extension): void {
  extensionRegistry.register(extension);
}

/**
 * 获取扩展（便捷函数）
 * @param name 扩展名称
 * @returns 扩展定义
 */
export function getExtension(name: string): Extension | undefined {
  return extensionRegistry.get(name);
}

/**
 * 检查扩展是否存在（便捷函数）
 * @param name 扩展名称
 * @returns 是否存在
 */
export function hasExtension(name: string): boolean {
  return extensionRegistry.has(name);
}

/**
 * 移除扩展（便捷函数）
 * @param name 扩展名称
 * @returns 是否成功移除
 */
export function removeExtension(name: string): boolean {
  return extensionRegistry.remove(name);
}

/**
 * 启用扩展（便捷函数）
 * @param name 扩展名称
 * @returns 是否成功启用
 */
export function enableExtension(name: string): boolean {
  return extensionRegistry.enable(name);
}

/**
 * 禁用扩展（便捷函数）
 * @param name 扩展名称
 * @returns 是否成功禁用
 */
export function disableExtension(name: string): boolean {
  return extensionRegistry.disable(name);
}
