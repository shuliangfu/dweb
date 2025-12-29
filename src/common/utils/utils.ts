/**
 * 工具函数库
 * 提供常用的工具函数，包括防抖、节流、深拷贝、对象操作等
 *
 * 环境兼容性：
 * - 通用：所有函数都可以在服务端和客户端使用
 */

/**
 * 深拷贝函数
 * 深度克隆对象，包括嵌套对象和数组，返回完全独立的新对象
 *
 * @param value 要克隆的值
 * @returns 克隆后的新值
 *
 * @example
 * ```typescript
 * const obj = { a: 1, b: { c: 2 }, d: [3, 4] };
 * const cloned = deepClone(obj);
 * cloned.b.c = 5;
 * // obj.b.c 仍然是 2，因为进行了深度克隆
 *
 * const date = new Date();
 * const clonedDate = deepClone(date);
 * // clonedDate 是新的 Date 对象
 * ```
 */
export function deepClone<T>(value: T): T {
  // 处理 null 和 undefined
  if (value === null || value === undefined) {
    return value;
  }

  // 处理基本类型
  if (typeof value !== "object") {
    return value;
  }

  // 处理 Date 对象
  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  // 处理 RegExp 对象
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as unknown as T;
  }

  // 处理数组
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as unknown as T;
  }

  // 处理 Map
  if (value instanceof Map) {
    const clonedMap = new Map();
    value.forEach((val, key) => {
      clonedMap.set(deepClone(key), deepClone(val));
    });
    return clonedMap as unknown as T;
  }

  // 处理 Set
  if (value instanceof Set) {
    const clonedSet = new Set();
    value.forEach((val) => {
      clonedSet.add(deepClone(val));
    });
    return clonedSet as unknown as T;
  }

  // 处理普通对象
  if (typeof value === "object") {
    const cloned: Record<string, unknown> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        cloned[key] = deepClone((value as Record<string, unknown>)[key]);
      }
    }
    return cloned as T;
  }

  return value;
}

/**
 * 深度合并对象
 * 深度合并两个对象，嵌套对象会递归合并，返回新的合并对象（原对象不会被修改）
 *
 * @param target 目标对象
 * @param source 源对象
 * @returns 合并后的新对象
 *
 * @example
 * ```typescript
 * const obj1 = { a: 1, b: { c: 2, d: 3 } };
 * const obj2 = { b: { c: 4, e: 5 }, f: 6 };
 * const merged = deepMerge(obj1, obj2);
 * // { a: 1, b: { c: 4, d: 3, e: 5 }, f: 6 }
 * ```
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (isObject(sourceValue) && isObject(targetValue)) {
        // 递归合并嵌套对象
        (output as Record<string, unknown>)[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        );
      } else if (sourceValue !== undefined) {
        // 直接覆盖
        (output as Record<string, unknown>)[key] = sourceValue;
      }
    });
  }

  return output;
}

/**
 * 判断值是否为空
 * 检查值是否为 null、undefined、空字符串、空数组或空对象
 *
 * @param value 要检查的值
 * @returns 是否为空
 *
 * @example
 * ```typescript
 * isEmpty(null); // true
 * isEmpty(undefined); // true
 * isEmpty(''); // true
 * isEmpty('   '); // true
 * isEmpty([]); // true
 * isEmpty({}); // true
 * isEmpty(0); // false
 * isEmpty(false); // false
 * ```
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  return false;
}

/**
 * 深度比较两个值是否相等
 * 递归比较两个值，包括嵌套对象和数组
 *
 * @param a 第一个值
 * @param b 第二个值
 * @returns 是否相等
 *
 * @example
 * ```typescript
 * isEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }); // true
 * isEqual([1, 2, 3], [1, 2, 3]); // true
 * isEqual({ a: 1 }, { a: 2 }); // false
 * ```
 */
export function isEqual(a: unknown, b: unknown): boolean {
  // 严格相等
  if (a === b) {
    return true;
  }

  // 处理 null 和 undefined
  if (a == null || b == null) {
    return a === b;
  }

  // 处理 Date 对象
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // 处理数组
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  // 处理对象
  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (const key of keysA) {
      if (!keysB.includes(key)) {
        return false;
      }
      if (
        !isEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        )
      ) {
        return false;
      }
    }

    return true;
  }

  return false;
}

/**
 * 从对象中选择指定键
 * 从对象中选择指定的键，返回包含这些键的新对象
 *
 * @param obj 源对象
 * @param keys 要选择的键数组
 * @returns 包含指定键的新对象
 *
 * @example
 * ```typescript
 * const user = { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 };
 * const selected = pick(user, ['name', 'email']);
 * // { name: 'Alice', email: 'alice@example.com' }
 * ```
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      (result as Record<string, unknown>)[key as string] = obj[key];
    }
  }
  return result;
}

/**
 * 从对象中排除指定键
 * 从对象中排除指定的键，返回不包含这些键的新对象
 *
 * @param obj 源对象
 * @param keys 要排除的键数组
 * @returns 不包含指定键的新对象
 *
 * @example
 * ```typescript
 * const user = { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 };
 * const omitted = omit(user, ['id', 'age']);
 * // { name: 'Alice', email: 'alice@example.com' }
 * ```
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/**
 * 安全获取嵌套对象属性
 * 使用路径字符串安全地获取嵌套对象的属性值，如果路径不存在则返回默认值
 *
 * @param obj 源对象
 * @param path 属性路径（如 'user.profile.name' 或 ['user', 'profile', 'name']）
 * @param defaultValue 默认值（当路径不存在时返回）
 * @returns 属性值或默认值
 *
 * @example
 * ```typescript
 * const user = { profile: { name: 'Alice' } };
 * getValue(user, 'profile.name'); // 'Alice'
 * getValue(user, 'profile.age', 0); // 0（路径不存在，返回默认值）
 * getValue(user, ['profile', 'name']); // 'Alice'（使用数组路径）
 * ```
 */
export function getValue<T = unknown>(
  obj: unknown,
  path: string | string[],
  defaultValue?: T,
): T {
  if (obj == null) {
    return defaultValue as T;
  }

  const keys = Array.isArray(path) ? path : path.split(".");
  let result: unknown = obj;

  for (const key of keys) {
    if (result == null || typeof result !== "object") {
      return defaultValue as T;
    }
    result = (result as Record<string, unknown>)[key];
    if (result === undefined) {
      return defaultValue as T;
    }
  }

  return (result as T) ?? (defaultValue as T);
}

/**
 * 安全设置嵌套对象属性
 * 使用路径字符串安全地设置嵌套对象的属性值，如果路径不存在则创建
 *
 * @param obj 目标对象
 * @param path 属性路径（如 'user.profile.name' 或 ['user', 'profile', 'name']）
 * @param value 要设置的值
 * @returns 设置后的对象
 *
 * @example
 * ```typescript
 * const user = {};
 * set(user, 'profile.name', 'Alice');
 * // { profile: { name: 'Alice' } }
 *
 * set(user, ['profile', 'age'], 30);
 * // { profile: { name: 'Alice', age: 30 } }
 * ```
 */
export function set<T extends Record<string, unknown>>(
  obj: T,
  path: string | string[],
  value: unknown,
): T {
  const keys = Array.isArray(path) ? path : path.split(".");
  const lastKey = keys.pop();
  if (!lastKey) {
    return obj;
  }

  let current: Record<string, unknown> = obj as Record<string, unknown>;
  for (const key of keys) {
    if (
      !(key in current) || typeof current[key] !== "object" ||
      current[key] === null
    ) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[lastKey] = value;
  return obj;
}

// 注意：chunk, flatten, unique, groupBy 等数组工具函数已移至 array.ts
// 如需使用，请从 @dreamer/dweb/extensions 导入

/**
 * 延迟函数
 * 返回一个 Promise，在指定时间后 resolve
 *
 * @param ms 延迟时间（毫秒）
 * @returns Promise
 *
 * @example
 * ```typescript
 * await sleep(1000); // 等待 1 秒
 * console.log('1 秒后执行');
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * 重试函数包装器
 * 自动重试失败的异步函数
 *
 * @param fn 要重试的异步函数
 * @param options 重试选项
 * @returns 重试后的结果
 *
 * @example
 * ```typescript
 * const result = await retry(
 *   () => fetch('/api/data'),
 *   { times: 3, delay: 1000 }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    times?: number; // 重试次数，默认 3
    delay?: number; // 重试延迟（毫秒），默认 1000
    onRetry?: (error: Error, attempt: number) => void; // 重试回调
  } = {},
): Promise<T> {
  const { times = 3, delay = 1000, onRetry } = options;
  let lastError: Error;

  for (let attempt = 1; attempt <= times; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < times) {
        if (onRetry) {
          onRetry(lastError, attempt);
        }
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}

/**
 * 判断是否为对象
 * 内部辅助函数，用于判断值是否为普通对象
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    !(value instanceof Date) && !(value instanceof RegExp) &&
    !(value instanceof Map) && !(value instanceof Set);
}

/**
 * 安全地根据路径获取对象属性值 (例如: "user.profile.name")
 */
export function getByPath(obj: Record<string, any>, path: string): any {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
}
