/**
 * Array 内置扩展
 * 为 Array 类型提供实用的扩展方法
 */

import { registerExtension } from "../registry.ts";

/**
 * 初始化 Array 扩展
 * 注册所有 Array 类型的扩展方法
 */
export function initArrayExtensions(): void {
  /**
   * 按条件分组
   * 根据指定的键或函数对数组元素进行分组
   *
   * @param {string | ((item: T) => string)} key - 分组键（对象属性名）或分组函数
   * @returns {Record<string, T[]>} 分组后的对象，键为分组值，值为该组的所有元素
   *
   * @example
   * ```typescript
   * // 按对象属性分组
   * const users = [
   *   { name: 'Alice', role: 'admin' },
   *   { name: 'Bob', role: 'user' },
   *   { name: 'Charlie', role: 'admin' }
   * ];
   * users.groupBy('role');
   * // { admin: [{ name: 'Alice', role: 'admin' }, { name: 'Charlie', role: 'admin' }], user: [{ name: 'Bob', role: 'user' }] }
   *
   * // 按函数分组
   * [1, 2, 3, 4, 5].groupBy(n => n % 2 === 0 ? 'even' : 'odd');
   * // { even: [2, 4], odd: [1, 3, 5] }
   * ```
   */
  registerExtension({
    name: "groupBy",
    type: "method",
    target: "Array",
    handler: function <T>(
      this: T[],
      key: string | ((item: T) => string),
    ): Record<string, T[]> {
      const result: Record<string, T[]> = {};
      const getKey = typeof key === "string"
        ? (item: T) => (item as Record<string, unknown>)[key] as string
        : key;

      for (const item of this) {
        const groupKey = String(getKey(item));
        if (!result[groupKey]) {
          result[groupKey] = [];
        }
        result[groupKey].push(item);
      }

      return result;
    },
    description: "按指定键或函数对数组进行分组",
  });

  /**
   * 去重
   * 移除数组中的重复元素，使用 Set 进行去重
   *
   * @returns {T[]} 去重后的新数组
   *
   * @example
   * ```typescript
   * [1, 2, 2, 3, 3, 3].unique(); // [1, 2, 3]
   * ['a', 'b', 'a', 'c'].unique(); // ['a', 'b', 'c']
   * ```
   */
  registerExtension({
    name: "unique",
    type: "method",
    target: "Array",
    handler: function <T>(this: T[]): T[] {
      return Array.from(new Set(this));
    },
    description: "移除数组中的重复元素",
  });

  /**
   * 按条件去重
   * 根据指定的键或函数对数组进行去重，保留第一次出现的元素
   *
   * @param {string | ((item: T) => unknown)} key - 去重键（对象属性名）或去重函数
   * @returns {T[]} 去重后的新数组
   *
   * @example
   * ```typescript
   * // 按对象属性去重
   * const users = [
   *   { id: 1, name: 'Alice' },
   *   { id: 2, name: 'Bob' },
   *   { id: 1, name: 'Alice' }
   * ];
   * users.uniqueBy('id');
   * // [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
   *
   * // 按函数去重
   * [{ x: 1, y: 2 }, { x: 1, y: 3 }, { x: 2, y: 2 }].uniqueBy(item => item.x);
   * // [{ x: 1, y: 2 }, { x: 2, y: 2 }]
   * ```
   */
  registerExtension({
    name: "uniqueBy",
    type: "method",
    target: "Array",
    handler: function <T>(
      this: T[],
      key: string | ((item: T) => unknown),
    ): T[] {
      const seen = new Set<unknown>();
      const getKey = typeof key === "string"
        ? (item: T) => (item as Record<string, unknown>)[key]
        : key;

      return this.filter((item) => {
        const itemKey = getKey(item);
        if (seen.has(itemKey)) {
          return false;
        }
        seen.add(itemKey);
        return true;
      });
    },
    description: "按指定键或函数对数组进行去重",
  });

  /**
   * 分块
   * 将数组分割成指定大小的块
   *
   * @param {number} size - 每个块的大小
   * @returns {T[][]} 分割后的二维数组
   *
   * @example
   * ```typescript
   * [1, 2, 3, 4, 5, 6, 7].chunk(3);
   * // [[1, 2, 3], [4, 5, 6], [7]]
   *
   * [1, 2, 3, 4].chunk(2);
   * // [[1, 2], [3, 4]]
   * ```
   */
  registerExtension({
    name: "chunk",
    type: "method",
    target: "Array",
    handler: function <T>(this: T[], size: number): T[][] {
      const chunks: T[][] = [];
      for (let i = 0; i < this.length; i += size) {
        chunks.push(this.slice(i, i + size));
      }
      return chunks;
    },
    description: "将数组分割成指定大小的块",
  });

  /**
   * 扁平化
   * 将嵌套数组扁平化到指定深度
   *
   * @param {number} [depth=1] - 扁平化的深度，默认为 1
   * @returns {unknown[]} 扁平化后的数组
   *
   * @example
   * ```typescript
   * [1, [2, 3], [4, [5, 6]]].flatten();
   * // [1, 2, 3, 4, [5, 6]]
   *
   * [1, [2, 3], [4, [5, 6]]].flatten(2);
   * // [1, 2, 3, 4, 5, 6]
   *
   * [[1, 2], [3, 4]].flatten();
   * // [1, 2, 3, 4]
   * ```
   */
  registerExtension({
    name: "flatten",
    type: "method",
    target: "Array",
    handler: function (this: unknown[], depth: number = 1): unknown[] {
      if (depth === 0) return this;

      // 内部递归函数
      const flattenRecursive = (
        arr: unknown[],
        currentDepth: number,
      ): unknown[] => {
        return arr.reduce<unknown[]>((acc, val) => {
          if (Array.isArray(val) && currentDepth > 0) {
            acc.push(...flattenRecursive(val, currentDepth - 1));
          } else {
            acc.push(val);
          }
          return acc;
        }, []);
      };

      return flattenRecursive(this, depth);
    },
    description: "扁平化数组到指定深度",
  });

  /**
   * 按条件排序
   * 根据指定的键或函数对数组进行排序
   *
   * @param {string | ((item: T) => unknown)} key - 排序键（对象属性名）或排序函数
   * @param {'asc' | 'desc'} [order='asc'] - 排序顺序，'asc' 为升序，'desc' 为降序，默认为 'asc'
   * @returns {T[]} 排序后的新数组（原数组不会被修改）
   *
   * @example
   * ```typescript
   * // 按对象属性排序
   * const users = [
   *   { name: 'Bob', age: 30 },
   *   { name: 'Alice', age: 25 },
   *   { name: 'Charlie', age: 35 }
   * ];
   * users.sortBy('age');
   * // [{ name: 'Alice', age: 25 }, { name: 'Bob', age: 30 }, { name: 'Charlie', age: 35 }]
   *
   * users.sortBy('age', 'desc');
   * // [{ name: 'Charlie', age: 35 }, { name: 'Bob', age: 30 }, { name: 'Alice', age: 25 }]
   *
   * // 按函数排序
   * [3, 1, 4, 1, 5].sortBy(n => n);
   * // [1, 1, 3, 4, 5]
   * ```
   */
  registerExtension({
    name: "sortBy",
    type: "method",
    target: "Array",
    handler: function <T>(
      this: T[],
      key: string | ((item: T) => unknown),
      order: "asc" | "desc" = "asc",
    ): T[] {
      const getValue = typeof key === "string"
        ? (item: T) => (item as Record<string, unknown>)[key]
        : key;
      const sorted = [...this].sort((a, b) => {
        const aVal = getValue(a);
        const bVal = getValue(b);
        if (aVal === bVal) return 0;

        // 处理 unknown 类型的比较
        if (typeof aVal === "number" && typeof bVal === "number") {
          const comparison = aVal > bVal ? 1 : -1;
          return order === "asc" ? comparison : -comparison;
        }

        if (typeof aVal === "string" && typeof bVal === "string") {
          const comparison = aVal > bVal ? 1 : -1;
          return order === "asc" ? comparison : -comparison;
        }

        // 其他类型转换为字符串比较
        const aStr = String(aVal);
        const bStr = String(bVal);
        const comparison = aStr > bStr ? 1 : -1;
        return order === "asc" ? comparison : -comparison;
      });
      return sorted;
    },
    description: "按指定键或函数对数组进行排序",
  });

  /**
   * 获取第一个元素或默认值
   * 获取数组的第一个元素，如果数组为空则返回默认值
   *
   * @param {T} [defaultValue] - 数组为空时返回的默认值
   * @returns {T | undefined} 第一个元素或默认值，如果数组为空且未提供默认值则返回 undefined
   *
   * @example
   * ```typescript
   * [1, 2, 3].firstOrDefault(); // 1
   * [].firstOrDefault(); // undefined
   * [].firstOrDefault(0); // 0
   * ['a', 'b'].firstOrDefault('default'); // 'a'
   * ```
   */
  registerExtension({
    name: "firstOrDefault",
    type: "method",
    target: "Array",
    handler: function <T>(this: T[], defaultValue?: T): T | undefined {
      return this.length > 0 ? this[0] : defaultValue;
    },
    description: "获取数组的第一个元素，如果数组为空则返回默认值",
  });

  /**
   * 获取最后一个元素或默认值
   * 获取数组的最后一个元素，如果数组为空则返回默认值
   *
   * @param {T} [defaultValue] - 数组为空时返回的默认值
   * @returns {T | undefined} 最后一个元素或默认值，如果数组为空且未提供默认值则返回 undefined
   *
   * @example
   * ```typescript
   * [1, 2, 3].lastOrDefault(); // 3
   * [].lastOrDefault(); // undefined
   * [].lastOrDefault(0); // 0
   * ['a', 'b'].lastOrDefault('default'); // 'b'
   * ```
   */
  registerExtension({
    name: "lastOrDefault",
    type: "method",
    target: "Array",
    handler: function <T>(this: T[], defaultValue?: T): T | undefined {
      return this.length > 0 ? this[this.length - 1] : defaultValue;
    },
    description: "获取数组的最后一个元素，如果数组为空则返回默认值",
  });

  /**
   * 检查是否为空数组
   * 检查数组是否为空（长度为 0）
   *
   * @returns {boolean} 如果数组为空则返回 true，否则返回 false
   *
   * @example
   * ```typescript
   * [].isEmpty(); // true
   * [1, 2, 3].isEmpty(); // false
   * ```
   */
  registerExtension({
    name: "isEmpty",
    type: "method",
    target: "Array",
    handler: function <T>(this: T[]): boolean {
      return this.length === 0;
    },
    description: "检查数组是否为空",
  });

  /**
   * 随机打乱
   * 使用 Fisher-Yates 洗牌算法随机打乱数组元素
   *
   * @returns {T[]} 打乱后的新数组（原数组不会被修改）
   *
   * @example
   * ```typescript
   * [1, 2, 3, 4, 5].shuffle();
   * // 可能返回 [3, 1, 5, 2, 4] 或其他随机顺序
   *
   * const arr = [1, 2, 3];
   * const shuffled = arr.shuffle();
   * // arr 仍然是 [1, 2, 3]
   * // shuffled 是打乱后的数组
   * ```
   */
  registerExtension({
    name: "shuffle",
    type: "method",
    target: "Array",
    handler: function <T>(this: T[]): T[] {
      const shuffled = [...this];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    },
    description: "随机打乱数组元素",
  });
}
