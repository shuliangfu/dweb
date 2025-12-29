/**
 * 缓存适配器模块
 * 提供统一的缓存接口和实现
 */

/**
 * 缓存选项
 */
export interface CacheOptions {
  /**
   * 过期时间（秒）
   */
  ttl?: number;
}

/**
 * 缓存适配器接口
 */
export interface CacheAdapter {
  /**
   * 获取缓存
   * @param key 缓存键
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param options 选项
   */
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): Promise<void>;

  /**
   * 清空缓存
   */
  clear(): Promise<void>;

  /**
   * 是否存在缓存
   * @param key 缓存键
   */
  has(key: string): Promise<boolean>;
}

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

/**
 * Redis 缓存适配器（预留接口）
 * 实际使用时需要注入 Redis 客户端
 */
export class RedisCacheAdapter implements CacheAdapter {
  private client: any; // 这里的 client 应该是 Redis 客户端实例

  constructor(client: any) {
    this.client = client;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) throw new Error("Redis client not initialized");
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    if (!this.client) throw new Error("Redis client not initialized");
    const stringValue = JSON.stringify(value);
    if (options?.ttl) {
      await this.client.setex(key, options.ttl, stringValue);
    } else {
      await this.client.set(key, stringValue);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) throw new Error("Redis client not initialized");
    await this.client.del(key);
  }

  async clear(): Promise<void> {
    if (!this.client) throw new Error("Redis client not initialized");
    await this.client.flushdb();
  }

  async has(key: string): Promise<boolean> {
    if (!this.client) throw new Error("Redis client not initialized");
    const exists = await this.client.exists(key);
    return exists === 1;
  }
}
