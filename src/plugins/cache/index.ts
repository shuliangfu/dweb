/**
 * 缓存插件
 * 提供内存、Redis 和文件缓存支持
 */

import type { AppLike, Plugin } from "../../common/types/index.ts";
import type { CacheConfig, CacheOptions, CachePluginOptions } from "./types.ts";
import * as path from "@std/path";
import { ensureDir } from "@std/fs/ensure-dir";
import { crypto } from "@std/crypto";

/**
 * 内存缓存实现（使用改进的 LRU 策略）
 */
class MemoryCache {
  private cache: Map<string, { value: unknown; expires: number }> = new Map();
  private maxSize: number;
  private maxEntries: number;
  private accessOrder: string[] = [];
  private cleanupInterval?: number;

  constructor(maxSize: number = 100 * 1024 * 1024, maxEntries: number = 1000) { // 默认 100MB, 1000 条目
    this.maxSize = maxSize;
    this.maxEntries = maxEntries;

    // 定期清理过期项（每 5 分钟）
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000) as unknown as number;
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (item.expires > 0 && Date.now() > item.expires) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    // 更新访问顺序（LRU）
    this.updateAccessOrder(key);

    return item.value as T;
  }

  async set(key: string, value: unknown, ttl: number = 0): Promise<void> {
    const expires = ttl > 0 ? Date.now() + ttl * 1000 : 0;

    if (this.cache.has(key)) {
      // 更新现有项
      this.cache.set(key, { value, expires });
      this.updateAccessOrder(key);
    } else {
      // 添加新项
      // 如果超过最大条目数，删除最久未使用的项
      if (this.cache.size >= this.maxEntries) {
        const oldestKey = this.accessOrder.shift();
        if (oldestKey) {
          this.cache.delete(oldestKey);
        }
      }

      this.cache.set(key, { value, expires });
      this.accessOrder.push(key);
    }
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (item.expires > 0 && now > item.expires) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    this.accessOrder = [];
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    // 检查是否过期
    if (item.expires > 0 && Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

/**
 * 文件缓存实现
 */
class FileCache {
  private cacheDir: string;

  constructor(cacheDir: string = ".cache") {
    this.cacheDir = cacheDir;
  }

  /**
   * 获取缓存文件路径
   */
  private getCacheFilePath(key: string): string {
    // 使用 key 的 hash 作为文件名，避免文件名冲突
    const hash = this.hashKey(key);
    return path.join(this.cacheDir, `${hash}.json`);
  }

  /**
   * 生成 key 的 hash
   */
  private async hashKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
      .substring(0, 16);
  }

  /**
   * 同步版本的 hash（用于同步方法）
   */
  private hashKeySync(key: string): string {
    // 简化实现：使用简单的 hash
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(16, "0");
  }

  /**
   * 获取缓存文件路径（同步版本）
   */
  private getCacheFilePathSync(key: string): string {
    const hash = this.hashKeySync(key);
    return path.join(this.cacheDir, `${hash}.json`);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const filePath = this.getCacheFilePathSync(key);

      // 检查文件是否存在
      try {
        await Deno.stat(filePath);
      } catch {
        return null;
      }

      // 读取文件
      const content = await Deno.readTextFile(filePath);
      const data = JSON.parse(content);

      // 检查是否过期
      if (data.expires > 0 && Date.now() > data.expires) {
        // 过期，删除文件
        try {
          await Deno.remove(filePath);
        } catch {
          // 忽略删除错误
        }
        return null;
      }

      return data.value as T;
    } catch {
      // 文件读取失败或解析失败
      return null;
    }
  }

  async set(key: string, value: unknown, ttl: number = 0): Promise<void> {
    try {
      // 确保缓存目录存在
      await ensureDir(this.cacheDir);

      const filePath = this.getCacheFilePathSync(key);
      const expires = ttl > 0 ? Date.now() + ttl * 1000 : 0;

      const data = {
        key,
        value,
        expires,
        createdAt: Date.now(),
      };

      // 写入文件
      await Deno.writeTextFile(filePath, JSON.stringify(data));
    } catch (error) {
      console.error("[File Cache] 写入缓存失败:", error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getCacheFilePathSync(key);
      await Deno.remove(filePath);
    } catch {
      // 文件不存在，忽略错误
    }
  }

  async clear(): Promise<void> {
    try {
      // 删除缓存目录中的所有文件
      for await (const entry of Deno.readDir(this.cacheDir)) {
        if (entry.isFile && entry.name.endsWith(".json")) {
          try {
            await Deno.remove(path.join(this.cacheDir, entry.name));
          } catch {
            // 忽略删除错误
          }
        }
      }
    } catch {
      // 目录不存在，忽略错误
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const filePath = this.getCacheFilePathSync(key);
      await Deno.stat(filePath);

      // 检查是否过期
      const content = await Deno.readTextFile(filePath);
      const data = JSON.parse(content);

      if (data.expires > 0 && Date.now() > data.expires) {
        await Deno.remove(filePath);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Redis 缓存实现（简化版，需要实际 Redis 客户端）
 */
class RedisCache {
  private config: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  private client: unknown = null; // Redis 客户端（类型由 Redis 库定义）

  constructor(
    config: { host: string; port: number; password?: string; db?: number },
  ) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // 这里需要实际的 Redis 客户端实现
    // 例如使用 npm:redis 或 deno.land/x/redis
    // 为了简化，这里只提供接口
    console.warn("[Cache Plugin] Redis 缓存需要安装 Redis 客户端库");
  }

  async get<T>(_key: string): Promise<T | null> {
    if (!this.client) {
      await this.connect();
    }
    // 实际实现需要调用 Redis GET 命令
    return null;
  }

  async set(_key: string, _value: unknown, _ttl: number = 0): Promise<void> {
    if (!this.client) {
      await this.connect();
    }
    // 实际实现需要调用 Redis SET 命令
  }

  async delete(_key: string): Promise<void> {
    if (!this.client) {
      await this.connect();
    }
    // 实际实现需要调用 Redis DEL 命令
  }

  async clear(): Promise<void> {
    if (!this.client) {
      await this.connect();
    }
    // 实际实现需要调用 Redis FLUSHDB 命令
  }

  async has(_key: string): Promise<boolean> {
    if (!this.client) {
      await this.connect();
    }
    // 实际实现需要调用 Redis EXISTS 命令
    return false;
  }
}

/**
 * 缓存管理器
 */
export class CacheManager {
  private store: MemoryCache | RedisCache | FileCache;
  private keyPrefix: string;
  private defaultTTL: number;

  constructor(config: CacheConfig = {}) {
    const storeType = config?.store || "memory";
    const defaultTTL = config?.defaultTTL || 3600; // 默认 1 小时
    const keyPrefix = config?.keyPrefix || "cache:";
    const maxEntries = config?.maxEntries || 1000; // 最大条目数（减少内存占用）

    if (storeType === "redis") {
      if (!config?.redis) {
        throw new Error("Redis 缓存需要配置 redis 选项");
      }
      this.store = new RedisCache(config.redis);
    } else if (storeType === "file") {
      const cacheDir = config?.cacheDir || ".cache";
      this.store = new FileCache(cacheDir);
    } else {
      // 内存缓存：使用改进的 LRU 策略，减少内存占用
      this.store = new MemoryCache(config?.maxSize, maxEntries);
    }

    this.keyPrefix = keyPrefix;
    this.defaultTTL = defaultTTL;
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    if (options?.force) {
      return null;
    }
    return await this.store.get<T>(this.getKey(key));
  }

  async set(
    key: string,
    value: unknown,
    options?: CacheOptions,
  ): Promise<void> {
    const ttl = options?.ttl ?? this.defaultTTL;
    await this.store.set(this.getKey(key), value, ttl);
  }

  async delete(key: string): Promise<void> {
    await this.store.delete(this.getKey(key));
  }

  async clear(): Promise<void> {
    await this.store.clear();
  }

  async has(key: string): Promise<boolean> {
    return await this.store.has(this.getKey(key));
  }

  /**
   * 获取或设置缓存（如果不存在则执行函数获取值）
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T> | T,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    const value = await fn();
    await this.set(key, value, options);
    return value;
  }

  /**
   * 销毁缓存管理器，清理所有资源
   */
  destroy(): void {
    if (this.store && typeof (this.store as any).destroy === "function") {
      (this.store as any).destroy();
    }
  }
}

/**
 * 创建缓存插件
 */
export function cache(options: CachePluginOptions = {}): Plugin {
  let cacheManager: CacheManager | null = null;

  return {
    name: "cache",
    config: options as unknown as Record<string, unknown>,

    /**
     * 初始化钩子 - 创建缓存管理器
     */
    async onInit(app: AppLike) {
      try {
        cacheManager = new CacheManager(options.config);
        // 将缓存管理器存储到 app 中，供其他代码使用
        (app as any).cache = cacheManager;
        console.log(
          `✅ [Cache Plugin] 缓存初始化成功 (${
            options.config?.store || "memory"
          })`,
        );
      } catch (error) {
        console.error("❌ [Cache Plugin] 缓存初始化失败:", error);
      }
    },
  };
}

// 导出类型和类
export type {
  CacheConfig,
  CacheOptions,
  CachePluginOptions,
  CacheStore,
} from "./types.ts";
