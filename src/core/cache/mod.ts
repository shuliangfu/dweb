/**
 * 缓存模块统一导出
 * 导出所有缓存相关的类型和实现
 */

// 导出接口和类型
export type { CacheAdapter, CacheOptions } from "./adapter.ts";

// 导出所有缓存适配器实现
export { MemoryCacheAdapter } from "./memory.ts";
export { RedisCacheAdapter } from "./redis.ts";
export { FileCacheAdapter } from "./file.ts";

// 导出 LRU 缓存（主要用于模块编译缓存）
export { LRUCache } from "./lru.ts";
