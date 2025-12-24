/**
 * 缓存辅助函数
 * 提供简单的内存缓存功能
 */

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

/**
 * 内存缓存管理器
 */
class MemoryCache {
  private cache: Map<string, CacheItem<unknown>> = new Map();

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒，默认不过期）
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = ttl ? Date.now() + ttl * 1000 : Number.MAX_SAFE_INTEGER;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存值，如果不存在或已过期返回 undefined
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) {
      return undefined;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value as T;
  }

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @returns 是否存在且未过期
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存
   * @param key 缓存键
   * @returns 是否成功删除
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取所有缓存键
   * @returns 缓存键数组
   */
  keys(): string[] {
    // 清理过期项
    this.cleanup();
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存大小
   * @returns 缓存项数量
   */
  size(): number {
    this.cleanup();
    return this.cache.size;
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * 全局内存缓存实例
 */
export const memoryCache = new MemoryCache();

/**
 * 设置缓存（便捷函数）
 * @param key 缓存键
 * @param value 缓存值
 * @param ttl 过期时间（秒）
 */
export function setCache<T>(key: string, value: T, ttl?: number): void {
  memoryCache.set(key, value, ttl);
}

/**
 * 获取缓存（便捷函数）
 * @param key 缓存键
 * @returns 缓存值
 */
export function getCache<T>(key: string): T | undefined {
  return memoryCache.get<T>(key);
}

/**
 * 检查缓存是否存在（便捷函数）
 * @param key 缓存键
 * @returns 是否存在
 */
export function hasCache(key: string): boolean {
  return memoryCache.has(key);
}

/**
 * 删除缓存（便捷函数）
 * @param key 缓存键
 * @returns 是否成功删除
 */
export function deleteCache(key: string): boolean {
  return memoryCache.delete(key);
}

/**
 * 清空所有缓存（便捷函数）
 */
export function clearCache(): void {
  memoryCache.clear();
}

/**
 * 缓存装饰器（用于函数结果缓存）
 * @param ttl 过期时间（秒）
 * @param keyGenerator 缓存键生成器（可选）
 * @returns 装饰器函数
 */
export function cached<T extends (...args: unknown[]) => unknown>(
  ttl?: number,
  keyGenerator?: (...args: Parameters<T>) => string
): (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => void {
  return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value as T;

    descriptor.value = function (this: unknown, ...args: Parameters<T>) {
      const cacheKey = keyGenerator
        ? keyGenerator(...args)
        : `${propertyKey}_${JSON.stringify(args)}`;

      // 检查缓存
      const cached = memoryCache.get<ReturnType<T>>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      // 执行原方法
      const result = originalMethod.apply(this, args);

      // 缓存结果（如果是 Promise，需要等待）
      if (result instanceof Promise) {
        return result.then((value) => {
          memoryCache.set(cacheKey, value, ttl);
          return value;
        });
      } else {
        memoryCache.set(cacheKey, result, ttl);
        return result;
      }
    } as T;

    return descriptor;
  };
}

