/**
 * 缓存适配器接口
 */

/**
 * 缓存适配器接口
 * 支持不同的缓存后端（Memory、Redis 等）
 */
export interface CacheAdapter {
  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存值或 null
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒，可选）
   * @param tags 标签数组（可选，用于批量删除）
   * @returns 是否设置成功
   */
  set(key: string, value: any, ttl?: number, tags?: string[]): Promise<boolean>;

  /**
   * 删除缓存
   * @param key 缓存键
   * @returns 是否删除成功
   */
  delete(key: string): Promise<boolean>;

  /**
   * 清空所有缓存
   * @returns 是否清空成功
   */
  clear(): Promise<boolean>;

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  has(key: string): Promise<boolean>;

  /**
   * 批量删除缓存（通过标签）
   * @param tags 标签数组
   * @returns 删除的键数量
   */
  deleteByTags(tags: string[]): Promise<number>;
}

