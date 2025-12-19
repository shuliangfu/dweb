/**
 * 缓存插件类型定义
 */

/**
 * 缓存存储类型
 */
export type CacheStore = 'memory' | 'redis';

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 存储类型 */
  store?: CacheStore;
  /** Redis 配置（如果使用 Redis） */
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  /** 默认过期时间（秒） */
  defaultTTL?: number;
  /** 最大缓存大小（内存缓存，字节） */
  maxSize?: number;
  /** 缓存键前缀 */
  keyPrefix?: string;
}

/**
 * 缓存选项
 */
export interface CacheOptions {
  /** 过期时间（秒） */
  ttl?: number;
  /** 是否强制刷新 */
  force?: boolean;
}

/**
 * 缓存插件选项
 */
export interface CachePluginOptions {
  /** 缓存配置 */
  config?: CacheConfig;
}

