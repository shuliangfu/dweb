/**
 * 内存缓存适配器
 * 使用 Map 实现的内存缓存，支持 TTL（过期时间）
 */

import type { CacheAdapter, CacheOptions } from "./adapter.ts";

/**
 * 内存缓存适配器
 */
export class MemoryCacheAdapter implements CacheAdapter {
  private cache: Map<string, { value: any; expiry: number | null }> = new Map();

  get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) {
      return Promise.resolve(null);
    }

    if (item.expiry && item.expiry < Date.now()) {
      this.cache.delete(key);
      return Promise.resolve(null);
    }

    return Promise.resolve(item.value as T);
  }

  set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    let expiry: number | null = null;
    if (options?.ttl) {
      expiry = Date.now() + options.ttl * 1000;
    }

    this.cache.set(key, { value, expiry });
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.cache.delete(key);
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.cache.clear();
    return Promise.resolve();
  }

  has(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) {
      return Promise.resolve(false);
    }

    if (item.expiry && item.expiry < Date.now()) {
      this.cache.delete(key);
      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  }
}
