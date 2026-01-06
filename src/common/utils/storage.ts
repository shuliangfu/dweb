/**
 * 存储工具
 * 封装 localStorage 和 sessionStorage，提供自动 JSON 序列化、过期时间等功能
 *
 * 环境兼容性：
 * - 客户端：所有函数都可以在浏览器环境使用
 * - 服务端：在服务端环境会静默失败或返回默认值（不会抛出错误）
 *
 * @module
 */

import { IS_CLIENT } from "../constants.ts";

/**
 * 存储类型
 */
export type StorageType = "localStorage" | "sessionStorage";

/**
 * 带过期时间的存储项接口
 */
interface StorageItem<T> {
  value: T;
  expiresAt?: number; // 过期时间戳（毫秒）
}

/**
 * 获取存储对象（localStorage 或 sessionStorage）
 * 内部辅助函数
 *
 * @param type 存储类型
 * @returns Storage 对象或 null（服务端环境）
 */
function getStorageObject(type: StorageType): Storage | null {
  if (typeof globalThis === "undefined") {
    return null;
  }

  try {
    if (type === "localStorage") {
      return globalThis.localStorage || null;
    } else {
      return globalThis.sessionStorage || null;
    }
  } catch {
    // 某些浏览器在隐私模式下访问 localStorage 会抛出错误
    return null;
  }
}

/**
 * 设置存储
 * 自动将值序列化为 JSON 字符串存储
 *
 * @param key 存储键
 * @param value 存储值（会自动序列化为 JSON）
 * @param type 存储类型，默认 'localStorage'
 * @returns 是否设置成功
 *
 * @example
 * ```typescript
 * // 存储对象
 * setStorage('user', { id: 1, name: 'Alice' });
 *
 * // 存储数组
 * setStorage('items', [1, 2, 3]);
 *
 * // 存储到 sessionStorage
 * setStorage('token', 'abc123', 'sessionStorage');
 * ```
 */
export function setStorage(
  key: string,
  value: unknown,
  type: StorageType = "localStorage",
): boolean {
  if (!IS_CLIENT) {
    throw new Error("setStorage 只能在客户端环境使用");
  }
  const storage = getStorageObject(type);
  if (!storage) {
    return false;
  }

  try {
    const item: StorageItem<unknown> = {
      value,
    };
    storage.setItem(key, JSON.stringify(item));
    return true;
  } catch (error) {
    console.warn(`[Storage] 设置存储失败 (${type}):`, error);
    return false;
  }
}

/**
 * 获取存储
 * 自动将 JSON 字符串反序列化为原始值
 *
 * @param key 存储键
 * @param type 存储类型，默认 'localStorage'
 * @returns 存储值，如果不存在或已过期返回 undefined
 *
 * @example
 * ```typescript
 * const user = getStorage('user');
 * // { id: 1, name: 'Alice' }
 *
 * const token = getStorage('token', 'sessionStorage');
 * ```
 */
export function getStorage<T = unknown>(
  key: string,
  type: StorageType = "localStorage",
): T | undefined {
  if (!IS_CLIENT) {
    throw new Error("getStorage 只能在客户端环境使用");
  }
  const storage = getStorageObject(type);
  if (!storage) {
    return undefined;
  }

  try {
    const itemStr = storage.getItem(key);
    if (!itemStr) {
      return undefined;
    }

    const item: StorageItem<T> = JSON.parse(itemStr);

    // 检查是否过期
    if (item.expiresAt && Date.now() > item.expiresAt) {
      // 已过期，删除该项
      removeStorage(key, type);
      return undefined;
    }

    return item.value;
  } catch (error) {
    console.warn(`[Storage] 获取存储失败 (${type}):`, error);
    return undefined;
  }
}

/**
 * 删除存储
 *
 * @param key 存储键
 * @param type 存储类型，默认 'localStorage'
 * @returns 是否删除成功
 *
 * @example
 * ```typescript
 * removeStorage('user');
 * removeStorage('token', 'sessionStorage');
 * ```
 */
export function removeStorage(
  key: string,
  type: StorageType = "localStorage",
): boolean {
  if (!IS_CLIENT) {
    throw new Error("removeStorage 只能在客户端环境使用");
  }
  const storage = getStorageObject(type);
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[Storage] 删除存储失败 (${type}):`, error);
    return false;
  }
}

/**
 * 清空存储
 * 清空指定类型的所有存储项
 *
 * @param type 存储类型，默认 'localStorage'
 * @returns 是否清空成功
 *
 * @example
 * ```typescript
 * clearStorage(); // 清空 localStorage
 * clearStorage('sessionStorage'); // 清空 sessionStorage
 * ```
 */
export function clearStorage(type: StorageType = "localStorage"): boolean {
  if (!IS_CLIENT) {
    throw new Error("clearStorage 只能在客户端环境使用");
  }
  const storage = getStorageObject(type);
  if (!storage) {
    return false;
  }

  try {
    storage.clear();
    return true;
  } catch (error) {
    console.warn(`[Storage] 清空存储失败 (${type}):`, error);
    return false;
  }
}

/**
 * 检查存储是否存在
 *
 * @param key 存储键
 * @param type 存储类型，默认 'localStorage'
 * @returns 是否存在
 *
 * @example
 * ```typescript
 * if (hasStorage('user')) {
 *   const user = getStorage('user');
 * }
 * ```
 */
export function hasStorage(
  key: string,
  type: StorageType = "localStorage",
): boolean {
  if (!IS_CLIENT) {
    throw new Error("hasStorage 只能在客户端环境使用");
  }
  const storage = getStorageObject(type);
  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * 获取所有存储键
 *
 * @param type 存储类型，默认 'localStorage'
 * @returns 所有键的数组
 *
 * @example
 * ```typescript
 * const keys = getStorageKeys();
 * // ['user', 'token', 'settings']
 * ```
 */
export function getStorageKeys(type: StorageType = "localStorage"): string[] {
  if (!IS_CLIENT) {
    throw new Error("getStorageKeys 只能在客户端环境使用");
  }
  const storage = getStorageObject(type);
  if (!storage) {
    return [];
  }

  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) {
        keys.push(key);
      }
    }
    return keys;
  } catch {
    return [];
  }
}

/**
 * 设置带过期时间的存储
 * 存储的值会在指定时间后自动过期
 *
 * @param key 存储键
 * @param value 存储值
 * @param ttl 过期时间（秒）
 * @param type 存储类型，默认 'localStorage'
 * @returns 是否设置成功
 *
 * @example
 * ```typescript
 * // 存储 token，1 小时后过期
 * setStorageWithExpiry('token', 'abc123', 3600);
 *
 * // 存储临时数据，5 分钟后过期
 * setStorageWithExpiry('temp', { data: 'xxx' }, 300);
 * ```
 */
export function setStorageWithExpiry(
  key: string,
  value: unknown,
  ttl: number,
  type: StorageType = "localStorage",
): boolean {
  if (!IS_CLIENT) {
    throw new Error("setStorageWithExpiry 只能在客户端环境使用");
  }
  const storage = getStorageObject(type);
  if (!storage) {
    return false;
  }

  try {
    const item: StorageItem<unknown> = {
      value,
      expiresAt: Date.now() + ttl * 1000,
    };
    storage.setItem(key, JSON.stringify(item));
    return true;
  } catch (error) {
    console.warn(`[Storage] 设置存储失败 (${type}):`, error);
    return false;
  }
}

/**
 * 获取带过期时间的存储
 * 自动检查是否过期，如果过期则删除并返回 undefined
 *
 * @param key 存储键
 * @param type 存储类型，默认 'localStorage'
 * @returns 存储值，如果不存在或已过期返回 undefined
 *
 * @example
 * ```typescript
 * const token = getStorageWithExpiry('token');
 * if (!token) {
 *   // token 不存在或已过期，需要重新获取
 * }
 * ```
 */
export function getStorageWithExpiry<T = unknown>(
  key: string,
  type: StorageType = "localStorage",
): T | undefined {
  if (!IS_CLIENT) {
    throw new Error("getStorageWithExpiry 只能在客户端环境使用");
  }
  return getStorage<T>(key, type);
}

/**
 * 获取存储大小（字节）
 * 计算指定键的存储项占用的字节数
 *
 * @param key 存储键
 * @param type 存储类型，默认 'localStorage'
 * @returns 存储大小（字节）
 *
 * @example
 * ```typescript
 * const size = getStorageSize('user');
 * console.log(`用户数据占用 ${size} 字节`);
 * ```
 */
export function getStorageSize(
  key: string,
  type: StorageType = "localStorage",
): number {
  if (!IS_CLIENT) {
    throw new Error("getStorageSize 只能在客户端环境使用");
  }
  const storage = getStorageObject(type);
  if (!storage) {
    return 0;
  }

  try {
    const itemStr = storage.getItem(key);
    if (!itemStr) {
      return 0;
    }
    // 计算字符串的字节长度（UTF-8 编码）
    return new Blob([itemStr]).size;
  } catch {
    return 0;
  }
}

/**
 * 获取所有存储的总大小（字节）
 * 计算指定类型所有存储项的总字节数
 *
 * @param type 存储类型，默认 'localStorage'
 * @returns 总大小（字节）
 *
 * @example
 * ```typescript
 * const totalSize = getTotalStorageSize();
 * console.log(`localStorage 总占用 ${totalSize} 字节`);
 * ```
 */
export function getTotalStorageSize(
  type: StorageType = "localStorage",
): number {
  if (!IS_CLIENT) {
    throw new Error("getTotalStorageSize 只能在客户端环境使用");
  }
  const storage = getStorageObject(type);
  if (!storage) {
    return 0;
  }

  try {
    let totalSize = 0;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) {
        const itemStr = storage.getItem(key);
        if (itemStr) {
          totalSize += new Blob([itemStr]).size;
        }
      }
    }
    return totalSize;
  } catch {
    return 0;
  }
}
