/**
 * 性能优化工具函数
 */

import { IS_SERVER } from "../constants.ts";

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
  if (!IS_SERVER) {
    throw new Error("getMemoryUsage 只能在服务端环境使用");
  }
  if (!Deno.memoryUsage) {
    throw new Error("Deno.memoryUsage 不可用");
  }
  return Deno.memoryUsage();
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
