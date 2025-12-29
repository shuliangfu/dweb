/**
 * 内存缓存适配器实现
 */

import type { CacheAdapter } from "./cache-adapter.ts";

/**
 * 缓存项
 */
interface CacheItem {
  value: any;
  expiresAt: number | null;
  tags: string[];
}

/**
 * 内存缓存适配器
 */
export class MemoryCacheAdapter implements CacheAdapter {
  private cache: Map<string, CacheItem> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> Set<key>

  /**
   * 获取缓存值
   */
  get<T = any>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) {
      return Promise.resolve(null);
    }

    // 检查是否过期
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.removeFromTags(key, item.tags);
      return Promise.resolve(null);
    }

    return Promise.resolve(item.value as T);
  }

  /**
   * 设置缓存值
   */
  set(
    key: string,
    value: any,
    ttl?: number,
    tags: string[] = [],
  ): Promise<boolean> {
    const expiresAt = ttl ? Date.now() + ttl * 1000 : null;

    // 如果键已存在，先删除旧的标签索引
    const oldItem = this.cache.get(key);
    if (oldItem) {
      this.removeFromTags(key, oldItem.tags);
    }

    const item: CacheItem = {
      value,
      expiresAt,
      tags,
    };

    this.cache.set(key, item);

    // 添加到标签索引
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }

    return Promise.resolve(true);
  }

  /**
   * 删除缓存
   */
  delete(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (item) {
      this.removeFromTags(key, item.tags);
      this.cache.delete(key);
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  /**
   * 清空所有缓存
   */
  clear(): Promise<boolean> {
    this.cache.clear();
    this.tagIndex.clear();
    return Promise.resolve(true);
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) {
      return Promise.resolve(false);
    }

    // 检查是否过期
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.removeFromTags(key, item.tags);
      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  }

  /**
   * 批量删除缓存（通过标签）
   */
  async deleteByTags(tags: string[]): Promise<number> {
    let deletedCount = 0;

    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        for (const key of keys) {
          if (await this.delete(key)) {
            deletedCount++;
          }
        }
        this.tagIndex.delete(tag);
      }
    }

    return deletedCount;
  }

  /**
   * 从标签索引中移除键
   */
  private removeFromTags(key: string, tags: string[]): void {
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.cache.delete(key);
        this.removeFromTags(key, item.tags);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; tagCount: number } {
    return {
      size: this.cache.size,
      tagCount: this.tagIndex.size,
    };
  }
}
