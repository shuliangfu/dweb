/**
 * 数组工具
 * 提供数组操作的补充工具函数（与 builtin/array.ts 的扩展方法互补）
 * 
 * 环境兼容性：
 * - 通用：所有函数都可以在服务端和客户端使用
 */

/**
 * 数组分块
 * 将数组分割成指定大小的块
 * 
 * @param array 要分割的数组
 * @param size 每块的大小
 * @returns 分割后的二维数组
 * 
 * @example
 * ```typescript
 * chunk([1, 2, 3, 4, 5], 2);
 * // [[1, 2], [3, 4], [5]]
 * ```
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) {
    return [];
  }

  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 数组扁平化
 * 将嵌套数组扁平化为一维数组
 * 
 * @param array 要扁平化的数组
 * @param depth 扁平化深度（默认 Infinity，完全扁平化）
 * @returns 扁平化后的数组
 * 
 * @example
 * ```typescript
 * flatten([1, [2, 3], [4, [5, 6]]]);
 * // [1, 2, 3, 4, 5, 6]
 * 
 * flatten([1, [2, [3, [4]]]], 2);
 * // [1, 2, 3, [4]]（只扁平化两层）
 * ```
 */
export function flatten<T>(array: unknown[], depth: number = Infinity): T[] {
  const result: T[] = [];

  for (const item of array) {
    if (Array.isArray(item) && depth > 0) {
      result.push(...flatten<T>(item, depth - 1));
    } else {
      result.push(item as T);
    }
  }

  return result;
}

/**
 * 数组去重
 * 去除数组中的重复元素
 * 
 * @param array 要去重的数组
 * @returns 去重后的数组
 * 
 * @example
 * ```typescript
 * unique([1, 2, 2, 3, 3, 3]);
 * // [1, 2, 3]
 * 
 * unique(['a', 'b', 'a', 'c']);
 * // ['a', 'b', 'c']
 * ```
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * 按条件分组
 * 根据指定的键或函数对数组进行分组
 * 
 * @param array 要分组的数组
 * @param keyOrFn 分组键或分组函数
 * @returns 分组后的对象
 * 
 * @example
 * ```typescript
 * const users = [
 *   { id: 1, role: 'admin', name: 'Alice' },
 *   { id: 2, role: 'user', name: 'Bob' },
 *   { id: 3, role: 'admin', name: 'Charlie' },
 * ];
 * 
 * groupBy(users, 'role');
 * // { admin: [{ id: 1, ... }, { id: 3, ... }], user: [{ id: 2, ... }] }
 * 
 * groupBy(users, (user) => user.name.length);
 * // { 5: [{ id: 1, ... }, { id: 2, ... }], 7: [{ id: 3, ... }] }
 * ```
 */
export function groupBy<T>(
  array: T[],
  keyOrFn: string | ((item: T) => string | number),
): Record<string, T[]> {
  const result: Record<string, T[]> = {};

  for (const item of array) {
    const key = typeof keyOrFn === "function"
      ? String(keyOrFn(item))
      : String((item as Record<string, unknown>)[keyOrFn]);

    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }

  return result;
}

/**
 * 按条件排序
 * 根据指定的键或函数对数组进行排序
 * 
 * @param array 要排序的数组
 * @param keyOrFn 排序键或排序函数
 * @param order 排序顺序（'asc' 升序，'desc' 降序，默认 'asc'）
 * @returns 排序后的新数组（原数组不变）
 * 
 * @example
 * ```typescript
 * const users = [
 *   { id: 1, name: 'Alice', age: 30 },
 *   { id: 2, name: 'Bob', age: 25 },
 *   { id: 3, name: 'Charlie', age: 35 },
 * ];
 * 
 * sortBy(users, 'age');
 * // 按年龄升序排序
 * 
 * sortBy(users, (user) => user.name.length, 'desc');
 * // 按名字长度降序排序
 * ```
 */
export function sortBy<T>(
  array: T[],
  keyOrFn: string | ((item: T) => number | string),
  order: "asc" | "desc" = "asc",
): T[] {
  const sorted = [...array];
  const compareFn = typeof keyOrFn === "function" ? keyOrFn : (item: T) => {
    const value = (item as Record<string, unknown>)[keyOrFn];
    return typeof value === "number" || typeof value === "string" ? value : 0;
  };

  sorted.sort((a, b) => {
    const aVal = compareFn(a);
    const bVal = compareFn(b);

    if (aVal < bVal) {
      return order === "asc" ? -1 : 1;
    }
    if (aVal > bVal) {
      return order === "asc" ? 1 : -1;
    }
    return 0;
  });

  return sorted;
}

/**
 * 数组洗牌
 * 随机打乱数组元素的顺序
 * 
 * @param array 要洗牌的数组
 * @returns 洗牌后的新数组（原数组不变）
 * 
 * @example
 * ```typescript
 * shuffle([1, 2, 3, 4, 5]);
 * // [3, 1, 5, 2, 4]（随机顺序）
 * ```
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 随机采样
 * 从数组中随机选择指定数量的元素
 * 
 * @param array 源数组
 * @param count 要选择的数量
 * @returns 随机选择的元素数组
 * 
 * @example
 * ```typescript
 * sample([1, 2, 3, 4, 5], 3);
 * // [2, 5, 1]（随机选择 3 个元素）
 * ```
 */
export function sample<T>(array: T[], count: number): T[] {
  if (count <= 0 || array.length === 0) {
    return [];
  }

  const shuffled = shuffle(array);
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * 数组分割
 * 将数组分割为满足条件和不满足条件的两部分
 * 
 * @param array 要分割的数组
 * @param predicate 分割条件函数
 * @returns 包含两部分数组的元组 [满足条件的数组, 不满足条件的数组]
 * 
 * @example
 * ```typescript
 * partition([1, 2, 3, 4, 5], (n) => n % 2 === 0);
 * // [[2, 4], [1, 3, 5]]
 * ```
 */
export function partition<T>(
  array: T[],
  predicate: (item: T) => boolean,
): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];

  for (const item of array) {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  }

  return [truthy, falsy];
}

/**
 * 数组压缩
 * 将多个数组压缩成一个二维数组，每个子数组包含对应位置的元素
 * 
 * @param arrays 要压缩的数组
 * @returns 压缩后的二维数组
 * 
 * @example
 * ```typescript
 * zip([1, 2, 3], ['a', 'b', 'c']);
 * // [[1, 'a'], [2, 'b'], [3, 'c']]
 * ```
 */
export function zip<T extends unknown[]>(...arrays: T[]): unknown[][] {
  const maxLength = Math.max(...arrays.map((arr) => arr.length));
  const result: unknown[][] = [];

  for (let i = 0; i < maxLength; i++) {
    result.push(arrays.map((arr) => arr[i]));
  }

  return result;
}

/**
 * 数组解压
 * 将压缩后的二维数组解压为多个数组
 * 
 * @param array 要解压的二维数组
 * @returns 解压后的数组元组
 * 
 * @example
 * ```typescript
 * unzip([[1, 'a'], [2, 'b'], [3, 'c']]);
 * // [[1, 2, 3], ['a', 'b', 'c']]
 * ```
 */
export function unzip<T extends unknown[]>(
  array: T[],
): unknown[][] {
  if (array.length === 0) {
    return [];
  }

  const maxLength = Math.max(...array.map((arr) => arr.length));
  const result: unknown[][] = [];

  for (let i = 0; i < maxLength; i++) {
    result.push(array.map((arr) => arr[i]));
  }

  return result;
}

/**
 * 数组交集
 * 获取多个数组的交集（出现在所有数组中的元素）
 * 
 * @param arrays 要计算交集的数组
 * @returns 交集数组
 * 
 * @example
 * ```typescript
 * intersection([1, 2, 3], [2, 3, 4], [3, 4, 5]);
 * // [3]
 * ```
 */
export function intersection<T>(...arrays: T[][]): T[] {
  if (arrays.length === 0) {
    return [];
  }
  if (arrays.length === 1) {
    return unique(arrays[0]);
  }

  let result = unique(arrays[0]);
  for (let i = 1; i < arrays.length; i++) {
    const current = unique(arrays[i]);
    result = result.filter((item) => current.includes(item));
  }

  return result;
}

/**
 * 数组并集
 * 获取多个数组的并集（所有数组中的唯一元素）
 * 
 * @param arrays 要计算并集的数组
 * @returns 并集数组
 * 
 * @example
 * ```typescript
 * union([1, 2, 3], [2, 3, 4], [3, 4, 5]);
 * // [1, 2, 3, 4, 5]
 * ```
 */
export function union<T>(...arrays: T[][]): T[] {
  const result: T[] = [];
  for (const arr of arrays) {
    result.push(...arr);
  }
  return unique(result);
}

/**
 * 数组差集
 * 获取第一个数组相对于其他数组的差集（在第一个数组中但不在其他数组中的元素）
 * 
 * @param array 第一个数组
 * @param arrays 其他数组
 * @returns 差集数组
 * 
 * @example
 * ```typescript
 * difference([1, 2, 3, 4], [2, 3], [3, 4]);
 * // [1]
 * ```
 */
export function difference<T>(array: T[], ...arrays: T[][]): T[] {
  const otherSet = new Set<T>();
  for (const arr of arrays) {
    for (const item of arr) {
      otherSet.add(item);
    }
  }

  return array.filter((item) => !otherSet.has(item));
}

/**
 * 数组求和
 * 计算数组中所有数字的总和
 * 
 * @param array 要计算的数组
 * @returns 总和
 * 
 * @example
 * ```typescript
 * sum([1, 2, 3, 4, 5]);
 * // 15
 * ```
 */
export function sum(array: number[]): number {
  return array.reduce((acc, val) => acc + val, 0);
}

/**
 * 数组平均值
 * 计算数组中所有数字的平均值
 * 
 * @param array 要计算的数组
 * @returns 平均值
 * 
 * @example
 * ```typescript
 * average([1, 2, 3, 4, 5]);
 * // 3
 * ```
 */
export function average(array: number[]): number {
  if (array.length === 0) {
    return 0;
  }
  return sum(array) / array.length;
}

/**
 * 数组最大值
 * 获取数组中的最大值
 * 
 * @param array 要计算的数组
 * @returns 最大值，如果数组为空返回 undefined
 * 
 * @example
 * ```typescript
 * max([1, 5, 3, 9, 2]);
 * // 9
 * ```
 */
export function max(array: number[]): number | undefined {
  if (array.length === 0) {
    return undefined;
  }
  return Math.max(...array);
}

/**
 * 数组最小值
 * 获取数组中的最小值
 * 
 * @param array 要计算的数组
 * @returns 最小值，如果数组为空返回 undefined
 * 
 * @example
 * ```typescript
 * min([1, 5, 3, 9, 2]);
 * // 1
 * ```
 */
export function min(array: number[]): number | undefined {
  if (array.length === 0) {
    return undefined;
  }
  return Math.min(...array);
}

