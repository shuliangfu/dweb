/**
 * 数学工具
 * 提供数学计算辅助函数
 * 
 * 环境兼容性：
 * - 通用：所有函数都可以在服务端和客户端使用
 */

/**
 * 限制数值范围
 * 将数值限制在指定的最小值和最大值之间
 * 
 * @param value 要限制的数值
 * @param min 最小值
 * @param max 最大值
 * @returns 限制后的数值
 * 
 * @example
 * ```typescript
 * clamp(150, 0, 100); // 100
 * clamp(-10, 0, 100); // 0
 * clamp(50, 0, 100); // 50
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    [min, max] = [max, min];
  }
  return Math.max(min, Math.min(max, value));
}

/**
 * 四舍五入（指定小数位）
 * 将数值四舍五入到指定的小数位数
 * 
 * @param value 要四舍五入的数值
 * @param decimals 小数位数（默认 0）
 * @returns 四舍五入后的数值
 * 
 * @example
 * ```typescript
 * round(3.14159, 2); // 3.14
 * round(3.14159, 0); // 3
 * round(3.5); // 4
 * ```
 */
export function round(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 向下取整（指定小数位）
 * 将数值向下取整到指定的小数位数
 * 
 * @param value 要取整的数值
 * @param decimals 小数位数（默认 0）
 * @returns 向下取整后的数值
 * 
 * @example
 * ```typescript
 * floor(3.14159, 2); // 3.14
 * floor(3.9, 0); // 3
 * ```
 */
export function floor(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.floor(value * factor) / factor;
}

/**
 * 向上取整（指定小数位）
 * 将数值向上取整到指定的小数位数
 * 
 * @param value 要取整的数值
 * @param decimals 小数位数（默认 0）
 * @returns 向上取整后的数值
 * 
 * @example
 * ```typescript
 * ceil(3.14159, 2); // 3.15
 * ceil(3.1, 0); // 4
 * ```
 */
export function ceil(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.ceil(value * factor) / factor;
}

/**
 * 生成随机数（指定范围）
 * 生成指定范围内的随机浮点数
 * 
 * @param min 最小值（默认 0）
 * @param max 最大值（默认 1）
 * @returns 随机数
 * 
 * @example
 * ```typescript
 * random(1, 10); // 1 到 10 之间的随机数
 * random(0, 1); // 0 到 1 之间的随机数
 * random(); // 0 到 1 之间的随机数
 * ```
 */
export function random(min: number = 0, max: number = 1): number {
  if (min > max) {
    [min, max] = [max, min];
  }
  return Math.random() * (max - min) + min;
}

/**
 * 生成随机整数
 * 生成指定范围内的随机整数（包含边界）
 * 
 * @param min 最小值（默认 0）
 * @param max 最大值（默认 100）
 * @returns 随机整数
 * 
 * @example
 * ```typescript
 * randomInt(1, 10); // 1 到 10 之间的随机整数（包含 1 和 10）
 * randomInt(0, 100); // 0 到 100 之间的随机整数
 * ```
 */
export function randomInt(min: number = 0, max: number = 100): number {
  if (min > max) {
    [min, max] = [max, min];
  }
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
 * sum([1, 2, 3, 4, 5]); // 15
 * sum([10, 20, 30]); // 60
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
 * @returns 平均值，如果数组为空返回 0
 * 
 * @example
 * ```typescript
 * average([1, 2, 3, 4, 5]); // 3
 * average([10, 20, 30]); // 20
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
 * max([1, 5, 3, 9, 2]); // 9
 * max([-10, -5, -20]); // -5
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
 * min([1, 5, 3, 9, 2]); // 1
 * min([-10, -5, -20]); // -20
 * ```
 */
export function min(array: number[]): number | undefined {
  if (array.length === 0) {
    return undefined;
  }
  return Math.min(...array);
}

/**
 * 计算百分比
 * 计算一个值相对于总数的百分比
 * 
 * @param value 当前值
 * @param total 总数
 * @param decimals 小数位数（默认 2）
 * @returns 百分比数值（0-100）
 * 
 * @example
 * ```typescript
 * percent(25, 100); // 25
 * percent(1, 3); // 33.33
 * percent(1, 3, 0); // 33
 * ```
 */
export function percent(
  value: number,
  total: number,
  decimals: number = 2,
): number {
  if (total === 0) {
    return 0;
  }
  return round((value / total) * 100, decimals);
}

/**
 * 线性插值
 * 在两个值之间进行线性插值
 * 
 * @param start 起始值
 * @param end 结束值
 * @param t 插值系数（0-1，0 返回 start，1 返回 end）
 * @returns 插值后的数值
 * 
 * @example
 * ```typescript
 * lerp(0, 100, 0.5); // 50
 * lerp(10, 20, 0.3); // 13
 * lerp(0, 100, 0); // 0
 * lerp(0, 100, 1); // 100
 * ```
 */
export function lerp(start: number, end: number, t: number): number {
  // 限制 t 在 0-1 之间
  const clampedT = clamp(t, 0, 1);
  return start + (end - start) * clampedT;
}

/**
 * 计算两点之间的距离
 * 计算二维平面上两点之间的欧几里得距离
 * 
 * @param x1 第一个点的 x 坐标
 * @param y1 第一个点的 y 坐标
 * @param x2 第二个点的 x 坐标
 * @param y2 第二个点的 y 坐标
 * @returns 两点之间的距离
 * 
 * @example
 * ```typescript
 * distance(0, 0, 3, 4); // 5（勾股定理：3-4-5 三角形）
 * ```
 */
export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 判断数值是否在范围内
 * 判断数值是否在指定的最小值和最大值之间（包含边界）
 * 
 * @param value 要判断的数值
 * @param min 最小值
 * @param max 最大值
 * @returns 是否在范围内
 * 
 * @example
 * ```typescript
 * inRange(5, 0, 10); // true
 * inRange(15, 0, 10); // false
 * inRange(0, 0, 10); // true（包含边界）
 * ```
 */
export function inRange(value: number, min: number, max: number): boolean {
  if (min > max) {
    [min, max] = [max, min];
  }
  return value >= min && value <= max;
}

