/**
 * Store 客户端访问模块
 * 提供类型安全的 Store 访问接口
 */

import type { Store } from "./types.ts";

/**
 * 获取 Store 实例
 * @returns Store 实例，如果不在客户端环境则返回 null
 */
export function getStore(): Store | null {
	if (typeof globalThis === "undefined" || !globalThis.window) {
		console.warn("[Store Client] 无法获取 Store 实例：不在客户端环境");
    return null;
  }

  const win = globalThis.window as Window & {
    __STORE__?: Store;
	};
	
  return win.__STORE__ || null;
}

/**
 * 获取 Store 状态
 * @returns 当前状态，如果 Store 不存在则返回 null
 */
export function getStoreState<T = Record<string, unknown>>(): T | null {
  const store = getStore();
  if (!store) {
    return null;
  }
  return store.getState() as T;
}

/**
 * 更新 Store 状态
 * @param updater 状态更新函数或新状态对象
 */
export function setStoreState<T = Record<string, unknown>>(
  updater: Partial<T> | ((prev: T) => Partial<T>),
): void {
  const store = getStore();
  if (!store) {
    console.warn("[Store Client] 无法更新状态：不在客户端环境或 Store 未初始化");
    return;
  }
  store.setState(updater as any);
}

/**
 * 订阅 Store 状态变化
 * @param listener 状态变化监听器
 * @returns 取消订阅函数
 */
export function subscribeStore<T = Record<string, unknown>>(
  listener: (state: T) => void,
): (() => void) | null {
  const store = getStore();
  if (!store) {
    console.warn("[Store Client] 无法订阅状态变化：不在客户端环境或 Store 未初始化");
    return null;
  }
  return store.subscribe(listener as any);
}

/**
 * 重置 Store 状态
 */
export function resetStore(): void {
  const store = getStore();
  if (!store) {
    console.warn("[Store Client] 无法重置状态：不在客户端环境或 Store 未初始化");
    return;
  }
  store.reset();
}

