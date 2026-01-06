/**
 * 缓存辅助函数
 * 提供简单的内存缓存功能，支持过期时间（TTL）和自动清理
 *
 * 环境兼容性：
 * - 通用：所有函数都可以在服务端和客户端使用
 *
 * @module
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
export const memoryCache: MemoryCache = new MemoryCache();

/**
 * 设置缓存（便捷函数）
 * 将值存储到内存缓存中，可设置过期时间
 *
 * @param key 缓存键
 * @param value 缓存值
 * @param ttl 过期时间（秒，可选，不设置则永不过期）
 *
 * @example
 * ```typescript
 * setCache('user', { id: 1, name: 'Alice' });
 * setCache('token', 'abc123', 3600); // 1小时后过期
 * ```
 */
export function setCache<T>(key: string, value: T, ttl?: number): void {
  memoryCache.set(key, value, ttl);
}

/**
 * 获取缓存（便捷函数）
 * 从内存缓存中获取值，如果不存在或已过期则返回 undefined
 *
 * @param key 缓存键
 * @returns 缓存值，如果不存在或已过期返回 undefined
 *
 * @example
 * ```typescript
 * const user = getCache<User>('user');
 * if (user) {
 *   console.log(user.name);
 * }
 * ```
 */
export function getCache<T>(key: string): T | undefined {
  return memoryCache.get<T>(key);
}

/**
 * 检查缓存是否存在（便捷函数）
 * 检查指定键的缓存是否存在且未过期
 *
 * @param key 缓存键
 * @returns 是否存在且未过期
 *
 * @example
 * ```typescript
 * if (hasCache('user')) {
 *   const user = getCache('user');
 * }
 * ```
 */
export function hasCache(key: string): boolean {
  return memoryCache.has(key);
}

/**
 * 删除缓存（便捷函数）
 * 从内存缓存中删除指定键的缓存项
 *
 * @param key 缓存键
 * @returns 是否成功删除
 *
 * @example
 * ```typescript
 * deleteCache('user');
 * ```
 */
export function deleteCache(key: string): boolean {
  return memoryCache.delete(key);
}

/**
 * 清空所有缓存（便捷函数）
 * 删除内存缓存中的所有缓存项
 *
 * @example
 * ```typescript
 * clearCache(); // 清空所有缓存
 * ```
 */
export function clearCache(): void {
  memoryCache.clear();
}

/**
 * 缓存装饰器（用于函数结果缓存）
 * 自动缓存函数的结果，避免重复计算
 *
 * @param ttl 过期时间（秒，可选）
 * @param keyGenerator 缓存键生成器（可选，默认使用函数名和参数生成）
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * class ApiService {
 *   @cached(3600) // 缓存1小时
 *   async getUser(id: number) {
 *     return await fetch(`/api/users/${id}`).then(r => r.json());
 *   }
 *
 *   @cached(1800, (id, type) => `user_${id}_${type}`) // 自定义缓存键
 *   async getUserData(id: number, type: string) {
 *     // ...
 *   }
 * }
 * ```
 */
export function cached<T extends (...args: unknown[]) => unknown>(
  ttl?: number,
  keyGenerator?: (...args: Parameters<T>) => string,
): (
  _target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) => void {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
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
