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
