/**
 * Redis 缓存适配器
 * 实际使用时需要注入 Redis 客户端
 */

import type { CacheAdapter, CacheOptions } from "./adapter.ts";

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
