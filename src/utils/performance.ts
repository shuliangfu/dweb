/**
 * 性能优化工具函数
 */

/**
 * 改进的 LRU 缓存实现（用于内存优化）
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;
  private accessOrder: K[];

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = [];
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      // 更新访问顺序
      this.updateAccessOrder(key);
      return this.cache.get(key);
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // 更新现有值
      this.cache.set(key, value);
      this.updateAccessOrder(key);
    } else {
      // 添加新值
      if (this.cache.size >= this.maxSize) {
        // 删除最久未使用的项
        const oldestKey = this.accessOrder.shift();
        if (oldestKey) {
          this.cache.delete(oldestKey);
        }
      }
      this.cache.set(key, value);
      this.accessOrder.push(key);
    }
  }

  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  size(): number {
    return this.cache.size;
  }

  private updateAccessOrder(key: K): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }
}

/**
 * 防抖函数（用于优化频繁调用）
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait) as unknown as number;
  };
}

/**
 * 节流函数（用于限制调用频率）
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 批量处理函数（用于优化大量数据处理）
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R> | R,
  batchSize: number = 10,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}

/**
 * 内存使用监控
 */
export function getMemoryUsage(): {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
} {
  if (typeof Deno !== "undefined" && Deno.memoryUsage) {
    return Deno.memoryUsage();
  }
  // 浏览器环境或 Deno 不可用时的降级处理
  return {
    rss: 0,
    heapTotal: 0,
    heapUsed: 0,
    external: 0,
  };
}

/**
 * 格式化内存大小
 */
export function formatMemorySize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
