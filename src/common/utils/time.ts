/**
 * 时间工具
 * 提供时间计算、转换、判断等功能
 *
 * 环境兼容性：
 * - 通用：所有函数都可以在服务端和客户端使用
 *
 * @module
 */

/**
 * 添加天数
 *
 * @param date 日期对象或时间戳
 * @param days 要添加的天数（可以为负数）
 * @returns 新的日期对象
 *
 * @example
 * ```typescript
 * addDays(new Date(), 7); // 7 天后
 * addDays(new Date(), -1); // 1 天前
 * ```
 */
export function addDays(date: Date | number, days: number): Date {
  const d = date instanceof Date ? date : new Date(date);
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 添加小时
 *
 * @param date 日期对象或时间戳
 * @param hours 要添加的小时数（可以为负数）
 * @returns 新的日期对象
 *
 * @example
 * ```typescript
 * addHours(new Date(), 2); // 2 小时后
 * addHours(new Date(), -1); // 1 小时前
 * ```
 */
export function addHours(date: Date | number, hours: number): Date {
  const d = date instanceof Date ? date : new Date(date);
  const result = new Date(d);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * 添加分钟
 *
 * @param date 日期对象或时间戳
 * @param minutes 要添加的分钟数（可以为负数）
 * @returns 新的日期对象
 *
 * @example
 * ```typescript
 * addMinutes(new Date(), 30); // 30 分钟后
 * addMinutes(new Date(), -15); // 15 分钟前
 * ```
 */
export function addMinutes(date: Date | number, minutes: number): Date {
  const d = date instanceof Date ? date : new Date(date);
  const result = new Date(d);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

/**
 * 添加月数
 *
 * @param date 日期对象或时间戳
 * @param months 要添加的月数（可以为负数）
 * @returns 新的日期对象
 *
 * @example
 * ```typescript
 * addMonths(new Date(), 1); // 1 个月后
 * addMonths(new Date(), -1); // 1 个月前
 * ```
 */
export function addMonths(date: Date | number, months: number): Date {
  const d = date instanceof Date ? date : new Date(date);
  const result = new Date(d);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * 添加年数
 *
 * @param date 日期对象或时间戳
 * @param years 要添加的年数（可以为负数）
 * @returns 新的日期对象
 *
 * @example
 * ```typescript
 * addYears(new Date(), 1); // 1 年后
 * addYears(new Date(), -1); // 1 年前
 * ```
 */
export function addYears(date: Date | number, years: number): Date {
  const d = date instanceof Date ? date : new Date(date);
  const result = new Date(d);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * 计算天数差
 * 计算两个日期之间的天数差
 *
 * @param date1 第一个日期
 * @param date2 第二个日期
 * @returns 天数差（date2 - date1）
 *
 * @example
 * ```typescript
 * diffDays(new Date('2024-01-01'), new Date('2024-01-10'));
 * // 9
 * ```
 */
export function diffDays(date1: Date | number, date2: Date | number): number {
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  const diff = d2.getTime() - d1.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * 计算小时差
 * 计算两个日期之间的小时差
 *
 * @param date1 第一个日期
 * @param date2 第二个日期
 * @returns 小时差（date2 - date1）
 *
 * @example
 * ```typescript
 * diffHours(new Date('2024-01-01 10:00'), new Date('2024-01-01 15:00'));
 * // 5
 * ```
 */
export function diffHours(date1: Date | number, date2: Date | number): number {
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  const diff = d2.getTime() - d1.getTime();
  return Math.floor(diff / (1000 * 60 * 60));
}

/**
 * 计算分钟差
 * 计算两个日期之间的分钟差
 *
 * @param date1 第一个日期
 * @param date2 第二个日期
 * @returns 分钟差（date2 - date1）
 *
 * @example
 * ```typescript
 * diffMinutes(new Date('2024-01-01 10:00'), new Date('2024-01-01 10:30'));
 * // 30
 * ```
 */
export function diffMinutes(
  date1: Date | number,
  date2: Date | number,
): number {
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  const diff = d2.getTime() - d1.getTime();
  return Math.floor(diff / (1000 * 60));
}

/**
 * 计算秒数差
 * 计算两个日期之间的秒数差
 *
 * @param date1 第一个日期
 * @param date2 第二个日期
 * @returns 秒数差（date2 - date1）
 *
 * @example
 * ```typescript
 * diffSeconds(new Date('2024-01-01 10:00:00'), new Date('2024-01-01 10:00:30'));
 * // 30
 * ```
 */
export function diffSeconds(
  date1: Date | number,
  date2: Date | number,
): number {
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  const diff = d2.getTime() - d1.getTime();
  return Math.floor(diff / 1000);
}

/**
 * 判断是否为今天
 *
 * @param date 日期对象或时间戳
 * @returns 是否为今天
 *
 * @example
 * ```typescript
 * isToday(new Date()); // true
 * isToday(new Date('2024-01-01')); // false（假设今天不是 2024-01-01）
 * ```
 */
export function isToday(date: Date | number): boolean {
  const d = date instanceof Date ? date : new Date(date);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

/**
 * 判断是否为昨天
 *
 * @param date 日期对象或时间戳
 * @returns 是否为昨天
 *
 * @example
 * ```typescript
 * const yesterday = addDays(new Date(), -1);
 * isYesterday(yesterday); // true
 * ```
 */
export function isYesterday(date: Date | number): boolean {
  const d = date instanceof Date ? date : new Date(date);
  const yesterday = addDays(new Date(), -1);
  return (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  );
}

/**
 * 判断是否为明天
 *
 * @param date 日期对象或时间戳
 * @returns 是否为明天
 *
 * @example
 * ```typescript
 * const tomorrow = addDays(new Date(), 1);
 * isTomorrow(tomorrow); // true
 * ```
 */
export function isTomorrow(date: Date | number): boolean {
  const d = date instanceof Date ? date : new Date(date);
  const tomorrow = addDays(new Date(), 1);
  return (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  );
}

/**
 * 判断是否为同一天
 * 判断两个日期是否为同一天
 *
 * @param date1 第一个日期
 * @param date2 第二个日期
 * @returns 是否为同一天
 *
 * @example
 * ```typescript
 * isSameDay(new Date('2024-01-01 10:00'), new Date('2024-01-01 15:00'));
 * // true
 * ```
 */
export function isSameDay(date1: Date | number, date2: Date | number): boolean {
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * 格式化为字符串
 * 将日期格式化为指定格式的字符串
 *
 * @param date 日期对象或时间戳
 * @param pattern 格式化模式，支持以下占位符：
 *   - YYYY: 四位年份
 *   - MM: 两位月份（01-12）
 *   - DD: 两位日期（01-31）
 *   - HH: 两位小时（00-23）
 *   - mm: 两位分钟（00-59）
 *   - ss: 两位秒数（00-59）
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  date: Date | number,
  pattern: string = "YYYY-MM-DD HH:mm:ss",
): string {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  return pattern
    .replace("YYYY", String(year))
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hours)
    .replace("mm", minutes)
    .replace("ss", seconds);
}

/**
 * 获取相对时间
 * 计算日期与当前时间的差值，返回人类可读的相对时间描述
 *
 * @param date 日期对象或时间戳
 * @returns 相对时间描述，如 "2小时前"、"3天后" 等
 */
export function timeAgo(date: Date | number): string {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (Math.abs(seconds) < 60) {
    return seconds < 0 ? `${Math.abs(seconds)}秒后` : `${seconds}秒前`;
  } else if (Math.abs(minutes) < 60) {
    return minutes < 0 ? `${Math.abs(minutes)}分钟后` : `${minutes}分钟前`;
  } else if (Math.abs(hours) < 24) {
    return hours < 0 ? `${Math.abs(hours)}小时后` : `${hours}小时前`;
  } else if (Math.abs(days) < 30) {
    return days < 0 ? `${Math.abs(days)}天后` : `${days}天前`;
  } else if (Math.abs(months) < 12) {
    return months < 0 ? `${Math.abs(months)}个月后` : `${months}个月前`;
  } else {
    return years < 0 ? `${Math.abs(years)}年后` : `${years}年前`;
  }
}

/**
 * 获取一天的开始时间
 * 返回指定日期当天的 00:00:00.000
 *
 * @param date 日期对象或时间戳
 * @returns 一天的开始时间
 *
 * @example
 * ```typescript
 * startOfDay(new Date('2024-01-01 15:30:45'));
 * // 2024-01-01 00:00:00.000
 * ```
 */
export function startOfDay(date: Date | number): Date {
  const d = date instanceof Date ? date : new Date(date);
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * 获取一天的结束时间
 * 返回指定日期当天的 23:59:59.999
 *
 * @param date 日期对象或时间戳
 * @returns 一天的结束时间
 *
 * @example
 * ```typescript
 * endOfDay(new Date('2024-01-01 15:30:45'));
 * // 2024-01-01 23:59:59.999
 * ```
 */
export function endOfDay(date: Date | number): Date {
  const d = date instanceof Date ? date : new Date(date);
  const result = new Date(d);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * 获取一周的开始时间
 * 返回指定日期所在周的第一天（周一）的 00:00:00.000
 *
 * @param date 日期对象或时间戳
 * @param weekStartsOn 一周从哪天开始（0=周日，1=周一，默认1）
 * @returns 一周的开始时间
 *
 * @example
 * ```typescript
 * startOfWeek(new Date('2024-01-05')); // 假设是周五
 * // 2024-01-01 00:00:00.000（周一）
 * ```
 */
export function startOfWeek(
  date: Date | number,
  weekStartsOn: number = 1,
): Date {
  const d = date instanceof Date ? date : new Date(date);
  const result = new Date(d);
  const day = result.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * 获取一周的结束时间
 * 返回指定日期所在周的最后一天（周日）的 23:59:59.999
 *
 * @param date 日期对象或时间戳
 * @param weekStartsOn 一周从哪天开始（0=周日，1=周一，默认1）
 * @returns 一周的结束时间
 *
 * @example
 * ```typescript
 * endOfWeek(new Date('2024-01-05')); // 假设是周五
 * // 2024-01-07 23:59:59.999（周日）
 * ```
 */
export function endOfWeek(
  date: Date | number,
  weekStartsOn: number = 1,
): Date {
  const d = date instanceof Date ? date : new Date(date);
  const result = new Date(d);
  const day = result.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  result.setDate(result.getDate() - diff + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * 获取一月的开始时间
 * 返回指定日期所在月的第一天的 00:00:00.000
 *
 * @param date 日期对象或时间戳
 * @returns 一月的开始时间
 *
 * @example
 * ```typescript
 * startOfMonth(new Date('2024-01-15'));
 * // 2024-01-01 00:00:00.000
 * ```
 */
export function startOfMonth(date: Date | number): Date {
  const d = date instanceof Date ? date : new Date(date);
  const result = new Date(d.getFullYear(), d.getMonth(), 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * 获取一月的结束时间
 * 返回指定日期所在月的最后一天的 23:59:59.999
 *
 * @param date 日期对象或时间戳
 * @returns 一月的结束时间
 *
 * @example
 * ```typescript
 * endOfMonth(new Date('2024-01-15'));
 * // 2024-01-31 23:59:59.999
 * ```
 */
export function endOfMonth(date: Date | number): Date {
  const d = date instanceof Date ? date : new Date(date);
  const result = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * 获取一年的开始时间
 * 返回指定日期所在年的第一天的 00:00:00.000
 *
 * @param date 日期对象或时间戳
 * @returns 一年的开始时间
 *
 * @example
 * ```typescript
 * startOfYear(new Date('2024-06-15'));
 * // 2024-01-01 00:00:00.000
 * ```
 */
export function startOfYear(date: Date | number): Date {
  const d = date instanceof Date ? date : new Date(date);
  const result = new Date(d.getFullYear(), 0, 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * 获取一年的结束时间
 * 返回指定日期所在年的最后一天的 23:59:59.999
 *
 * @param date 日期对象或时间戳
 * @returns 一年的结束时间
 *
 * @example
 * ```typescript
 * endOfYear(new Date('2024-06-15'));
 * // 2024-12-31 23:59:59.999
 * ```
 */
export function endOfYear(date: Date | number): Date {
  const d = date instanceof Date ? date : new Date(date);
  const result = new Date(d.getFullYear(), 11, 31);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * 判断日期是否在范围内
 * 判断日期是否在指定的开始和结束日期之间（包含边界）
 *
 * @param date 要判断的日期
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 是否在范围内
 *
 * @example
 * ```typescript
 * isInRange(
 *   new Date('2024-01-15'),
 *   new Date('2024-01-01'),
 *   new Date('2024-01-31')
 * );
 * // true
 * ```
 */
export function isInRange(
  date: Date | number,
  startDate: Date | number,
  endDate: Date | number,
): boolean {
  const d = date instanceof Date ? date : new Date(date);
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}
