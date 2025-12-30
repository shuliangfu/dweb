/**
 * 文件缓存适配器
 * 将缓存数据存储到文件系统中
 */

import type { CacheAdapter, CacheOptions } from "./adapter.ts";
import * as path from "@std/path";
import { ensureDir } from "@std/fs/ensure-dir";

/**
 * 文件缓存适配器
 * 将缓存数据存储到文件系统中，支持 TTL（过期时间）
 */
export class FileCacheAdapter implements CacheAdapter {
  private cacheDir: string;
  private defaultTTL?: number;

  /**
   * @param cacheDir 缓存目录路径（默认：.cache）
   * @param defaultTTL 默认过期时间（秒）
   */
  constructor(cacheDir: string = ".cache", defaultTTL?: number) {
    this.cacheDir = cacheDir;
    this.defaultTTL = defaultTTL;
  }

  /**
   * 获取缓存文件路径
   */
  private getCacheFilePath(key: string): string {
    // 使用 key 的哈希值作为文件名，避免特殊字符问题
    const hash = this.hashKey(key);
    return path.join(this.cacheDir, `${hash}.json`);
  }

  /**
   * 简单的哈希函数（用于生成文件名）
   */
  private hashKey(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 读取缓存文件
   */
  private async readCacheFile(filePath: string): Promise<
    {
      value: any;
      expiry: number | null;
    } | null
  > {
    try {
      const content = await Deno.readTextFile(filePath);
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * 写入缓存文件
   */
  private async writeCacheFile(
    filePath: string,
    value: any,
    expiry: number | null,
  ): Promise<void> {
    await ensureDir(path.dirname(filePath));
    const content = JSON.stringify({ value, expiry });
    await Deno.writeTextFile(filePath, content);
  }

  async get<T>(key: string): Promise<T | null> {
    const filePath = this.getCacheFilePath(key);
    const item = await this.readCacheFile(filePath);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (item.expiry && item.expiry < Date.now()) {
      // 删除过期文件
      try {
        await Deno.remove(filePath);
      } catch {
        // 忽略删除失败
      }
      return null;
    }

    return item.value as T;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const filePath = this.getCacheFilePath(key);
    let expiry: number | null = null;

    const ttl = options?.ttl || this.defaultTTL;
    if (ttl) {
      expiry = Date.now() + ttl * 1000;
    }

    await this.writeCacheFile(filePath, value, expiry);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getCacheFilePath(key);
    try {
      await Deno.remove(filePath);
    } catch {
      // 忽略删除失败（文件可能不存在）
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
            // 忽略删除失败
          }
        }
      }
    } catch {
      // 忽略目录不存在等错误
    }
  }

  async has(key: string): Promise<boolean> {
    const filePath = this.getCacheFilePath(key);
    const item = await this.readCacheFile(filePath);

    if (!item) {
      return false;
    }

    // 检查是否过期
    if (item.expiry && item.expiry < Date.now()) {
      // 删除过期文件
      try {
        await Deno.remove(filePath);
      } catch {
        // 忽略删除失败
      }
      return false;
    }

    return true;
  }
}
