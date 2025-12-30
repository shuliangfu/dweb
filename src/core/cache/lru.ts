/**
 * LRU (Least Recently Used) 缓存实现
 * 用于缓存编译结果等需要限制内存占用的数据
 */
export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  /**
   * @param capacity 最大缓存条目数
   */
  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  /**
   * 获取缓存值
   * 如果存在，将其移动到最近使用（Map 的末尾）
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    const value = this.cache.get(key)!;
    // 重新插入以更新顺序
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * 设置缓存值
   * 如果超出容量，删除最久未使用的条目（Map 的头部）
   */
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // 删除第一个键（最久未使用）
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  /**
   * 删除指定缓存
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取当前缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有缓存 key（用于遍历和匹配）
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * 检查缓存中是否存在指定 key
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }
}
