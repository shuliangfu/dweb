/**
 * Object 内置扩展
 * 为 Object 类型提供实用的扩展方法
 */

import { registerExtension } from '../registry.ts';

/**
 * 初始化 Object 扩展
 * 注册所有 Object 类型的扩展方法
 */
export function initObjectExtensions(): void {
  /**
   * 选择指定键
   * 从对象中选择指定的键，返回包含这些键的新对象
   * 
   * @param {string[]} keys - 要选择的键数组
   * @returns {Record<string, unknown>} 包含指定键的新对象
   * 
   * @example
   * ```typescript
   * const user = { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 };
   * user.pick(['name', 'email']);
   * // { name: 'Alice', email: 'alice@example.com' }
   * ```
   */
  registerExtension({
    name: 'pick',
    type: 'method',
    target: 'Object',
    handler: function (this: Record<string, unknown>, keys: string[]): Record<string, unknown> {
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        if (key in this) {
          result[key] = this[key];
        }
      }
      return result;
    },
    description: '从对象中选择指定的键',
  });

  /**
   * 排除指定键
   * 从对象中排除指定的键，返回不包含这些键的新对象
   * 
   * @param {string[]} keys - 要排除的键数组
   * @returns {Record<string, unknown>} 排除指定键后的新对象
   * 
   * @example
   * ```typescript
   * const user = { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 };
   * user.omit(['id', 'age']);
   * // { name: 'Alice', email: 'alice@example.com' }
   * 
   * const config = { host: 'localhost', port: 3000, debug: true };
   * config.omit(['debug']);
   * // { host: 'localhost', port: 3000 }
   * ```
   */
  registerExtension({
    name: 'omit',
    type: 'method',
    target: 'Object',
    handler: function (this: Record<string, unknown>, keys: string[]): Record<string, unknown> {
      const result: Record<string, unknown> = { ...this };
      for (const key of keys) {
        delete result[key];
      }
      return result;
    },
    description: '从对象中排除指定的键',
  });

  /**
   * 深度克隆
   * 深度克隆对象，包括嵌套对象和数组，返回完全独立的新对象
   * 
   * @returns {unknown} 克隆后的新对象
   * 
   * @example
   * ```typescript
   * const obj = { a: 1, b: { c: 2 }, d: [3, 4] };
   * const cloned = obj.deepClone();
   * cloned.b.c = 5;
   * // obj.b.c 仍然是 2，因为进行了深度克隆
   * 
   * const date = new Date();
   * const clonedDate = date.deepClone();
   * // clonedDate 是新的 Date 对象
   * ```
   */
  registerExtension({
    name: 'deepClone',
    type: 'method',
    target: 'Object',
    handler: function (this: unknown): unknown {
      // 内部递归函数
      const cloneRecursive = (value: unknown): unknown => {
        if (value === null || typeof value !== 'object') {
          return value;
        }

        if (value instanceof Date) {
          return new Date(value.getTime());
        }

        if (value instanceof Array) {
          return (value as unknown[]).map((item) => cloneRecursive(item));
        }

        if (typeof value === 'object') {
          const cloned: Record<string, unknown> = {};
          for (const key in value as Record<string, unknown>) {
            cloned[key] = cloneRecursive((value as Record<string, unknown>)[key]);
          }
          return cloned;
        }

        return value;
      };

      return cloneRecursive(this);
    },
    description: '深度克隆对象',
  });

  /**
   * 深度合并
   * 深度合并两个对象，嵌套对象会递归合并，返回新的合并对象（原对象不会被修改）
   * 
   * @param {Record<string, unknown>} source - 要合并的源对象
   * @returns {Record<string, unknown>} 合并后的新对象
   * 
   * @example
   * ```typescript
   * const obj1 = { a: 1, b: { c: 2, d: 3 } };
   * const obj2 = { b: { c: 4, e: 5 }, f: 6 };
   * obj1.deepMerge(obj2);
   * // { a: 1, b: { c: 4, d: 3, e: 5 }, f: 6 }
   * 
   * const defaultConfig = { host: 'localhost', port: 3000, db: { name: 'test' } };
   * const userConfig = { port: 8080, db: { host: '127.0.0.1' } };
   * defaultConfig.deepMerge(userConfig);
   * // { host: 'localhost', port: 8080, db: { name: 'test', host: '127.0.0.1' } }
   * ```
   */
  registerExtension({
    name: 'deepMerge',
    type: 'method',
    target: 'Object',
    handler: function (this: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
      // 内部递归函数
      const mergeRecursive = (
        target: Record<string, unknown>,
        source: Record<string, unknown>
      ): Record<string, unknown> => {
        const result: Record<string, unknown> = { ...target };

        for (const key in source) {
          const sourceValue = source[key];
          const targetValue = result[key];

          if (
            sourceValue &&
            typeof sourceValue === 'object' &&
            !Array.isArray(sourceValue) &&
            targetValue &&
            typeof targetValue === 'object' &&
            !Array.isArray(targetValue)
          ) {
            result[key] = mergeRecursive(
              targetValue as Record<string, unknown>,
              sourceValue as Record<string, unknown>
            );
          } else {
            result[key] = sourceValue;
          }
        }

        return result;
      };

      return mergeRecursive(this, source);
    },
    description: '深度合并对象',
  });

  /**
   * 检查是否为空对象
   * 检查对象是否为空（没有任何属性）
   * 
   * @returns {boolean} 如果对象为空（无属性）则返回 true，否则返回 false
   * 
   * @example
   * ```typescript
   * ({}).isEmpty(); // true
   * ({ name: 'Alice' }).isEmpty(); // false
   * 
   * const obj = {};
   * obj.isEmpty(); // true
   * obj.name = 'Alice';
   * obj.isEmpty(); // false
   * ```
   */
  registerExtension({
    name: 'isEmpty',
    type: 'method',
    target: 'Object',
    handler: function (this: Record<string, unknown>): boolean {
      return Object.keys(this).length === 0;
    },
    description: '检查对象是否为空（无属性）',
  });

  /**
   * 获取嵌套值
   * 通过点分隔的路径字符串获取嵌套对象的值
   * 
   * @param {string} path - 点分隔的路径，如 "user.profile.name"
   * @param {unknown} [defaultValue] - 如果路径不存在时返回的默认值
   * @returns {unknown} 路径对应的值，如果路径不存在则返回默认值
   * 
   * @example
   * ```typescript
   * const obj = { user: { profile: { name: 'Alice' } } };
   * obj.get('user.profile.name'); // 'Alice'
   * obj.get('user.profile.age', 0); // 0（路径不存在，返回默认值）
   * obj.get('user.email'); // undefined
   * ```
   */
  registerExtension({
    name: 'get',
    type: 'method',
    target: 'Object',
    handler: function (this: Record<string, unknown>, path: string, defaultValue?: unknown): unknown {
      const keys = path.split('.');
      // 使用对象引用而不是直接赋值 this
      const target = this as Record<string, unknown>;
      let current: unknown = target;

      for (const key of keys) {
        if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
          current = (current as Record<string, unknown>)[key];
        } else {
          return defaultValue;
        }
      }

      return current;
    },
    description: '通过路径获取嵌套对象的值',
  });

  /**
   * 设置嵌套值
   * 通过点分隔的路径字符串设置嵌套对象的值，如果路径不存在会自动创建
   * 
   * @param {string} path - 点分隔的路径，如 "user.profile.name"
   * @param {unknown} value - 要设置的值
   * @returns {void}
   * 
   * @example
   * ```typescript
   * const obj: Record<string, unknown> = {};
   * obj.set('user.profile.name', 'Alice');
   * // obj = { user: { profile: { name: 'Alice' } } }
   * 
   * const config: Record<string, unknown> = { db: { host: 'localhost' } };
   * config.set('db.port', 3000);
   * // config = { db: { host: 'localhost', port: 3000 } }
   * 
   * config.set('cache.enabled', true);
   * // config = { db: { ... }, cache: { enabled: true } }
   * ```
   */
  registerExtension({
    name: 'set',
    type: 'method',
    target: 'Object',
    handler: function (this: Record<string, unknown>, path: string, value: unknown): void {
      const keys = path.split('.');
      const lastKey = keys.pop()!;
      // 使用对象引用而不是直接赋值 this
      const target = this as Record<string, unknown>;
      let current: Record<string, unknown> = target;

      for (const key of keys) {
        if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
          current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
      }

      current[lastKey] = value;
    },
    description: '通过路径设置嵌套对象的值',
  });
}

