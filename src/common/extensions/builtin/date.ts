/**
 * Date 内置扩展
 * 为 Date 类型提供实用的扩展方法
 */

import { registerExtension } from "../registry.ts";
import { formatDate, timeAgo } from "../../utils/time.ts";

/**
 * 初始化 Date 扩展
 * 注册所有 Date 类型的扩展方法
 */
export function initDateExtensions(): void {
  /**
   * 格式化为字符串
   * 将日期格式化为指定格式的字符串
   *
   * @param {string} [pattern='YYYY-MM-DD HH:mm:ss'] - 格式化模式，支持以下占位符：
   *   - YYYY: 四位年份
   *   - MM: 两位月份（01-12）
   *   - DD: 两位日期（01-31）
   *   - HH: 两位小时（00-23）
   *   - mm: 两位分钟（00-59）
   *   - ss: 两位秒数（00-59）
   * @returns {string} 格式化后的日期字符串
   *
   * @example
   * ```typescript
   * const date = new Date(2024, 0, 15, 14, 30, 45);
   * date.format(); // "2024-01-15 14:30:45"
   * date.format('YYYY-MM-DD'); // "2024-01-15"
   * date.format('YYYY年MM月DD日'); // "2024年01月15日"
   * ```
   */
  registerExtension({
    name: "format",
    type: "method",
    target: "Date",
    handler: function (
      this: Date,
      pattern: string = "YYYY-MM-DD HH:mm:ss",
    ): string {
      return formatDate(this, pattern);
    },
    description: "格式化日期为字符串，支持 YYYY-MM-DD HH:mm:ss 格式",
  });

  /**
   * 获取相对时间
   * 计算日期与当前时间的差值，返回人类可读的相对时间描述
   *
   * @returns {string} 相对时间描述，如 "2小时前"、"3天后" 等
   *
   * @example
   * ```typescript
   * const date = new Date();
   * date.setHours(date.getHours() - 2);
   * date.fromNow(); // "2小时前"
   *
   * const future = new Date();
   * future.setDate(future.getDate() + 5);
   * future.fromNow(); // "5天后"
   * ```
   */
  registerExtension({
    name: "fromNow",
    type: "method",
    target: "Date",
    handler: function (this: Date): string {
      return timeAgo(this);
    },
    description: "获取相对时间描述（如：2小时前）",
  });

  /**
   * 检查是否为今天
   * 判断日期是否为今天（只比较年月日，不考虑时间）
   *
   * @returns {boolean} 如果日期是今天则返回 true，否则返回 false
   *
   * @example
   * ```typescript
   * const today = new Date();
   * today.isToday(); // true
   *
   * const yesterday = new Date();
   * yesterday.setDate(yesterday.getDate() - 1);
   * yesterday.isToday(); // false
   *
   * const todayMorning = new Date(2024, 0, 15, 8, 0, 0);
   * const todayEvening = new Date(2024, 0, 15, 20, 0, 0);
   * todayMorning.isToday(); // true（如果今天是 2024-01-15）
   * todayEvening.isToday(); // true（如果今天是 2024-01-15）
   * ```
   */
  registerExtension({
    name: "isToday",
    type: "method",
    target: "Date",
    handler: function (this: Date): boolean {
      const today = new Date();
      return (
        this.getFullYear() === today.getFullYear() &&
        this.getMonth() === today.getMonth() &&
        this.getDate() === today.getDate()
      );
    },
    description: "检查日期是否为今天",
  });

  /**
   * 检查是否为昨天
   * 判断日期是否为昨天（只比较年月日，不考虑时间）
   *
   * @returns {boolean} 如果日期是昨天则返回 true，否则返回 false
   *
   * @example
   * ```typescript
   * const yesterday = new Date();
   * yesterday.setDate(yesterday.getDate() - 1);
   * yesterday.isYesterday(); // true
   *
   * const today = new Date();
   * today.isYesterday(); // false
   *
   * const twoDaysAgo = new Date();
   * twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
   * twoDaysAgo.isYesterday(); // false
   * ```
   */
  registerExtension({
    name: "isYesterday",
    type: "method",
    target: "Date",
    handler: function (this: Date): boolean {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return (
        this.getFullYear() === yesterday.getFullYear() &&
        this.getMonth() === yesterday.getMonth() &&
        this.getDate() === yesterday.getDate()
      );
    },
    description: "检查日期是否为昨天",
  });

  /**
   * 检查是否为明天
   * 判断日期是否为明天（只比较年月日，不考虑时间）
   *
   * @returns {boolean} 如果日期是明天则返回 true，否则返回 false
   *
   * @example
   * ```typescript
   * const tomorrow = new Date();
   * tomorrow.setDate(tomorrow.getDate() + 1);
   * tomorrow.isTomorrow(); // true
   *
   * const today = new Date();
   * today.isTomorrow(); // false
   *
   * const twoDaysLater = new Date();
   * twoDaysLater.setDate(twoDaysLater.getDate() + 2);
   * twoDaysLater.isTomorrow(); // false
   * ```
   */
  registerExtension({
    name: "isTomorrow",
    type: "method",
    target: "Date",
    handler: function (this: Date): boolean {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return (
        this.getFullYear() === tomorrow.getFullYear() &&
        this.getMonth() === tomorrow.getMonth() &&
        this.getDate() === tomorrow.getDate()
      );
    },
    description: "检查日期是否为明天",
  });

  /**
   * 检查是否为本周
   * 判断日期是否在本周（从周日开始到周六结束）
   *
   * @returns {boolean} 如果日期在本周则返回 true，否则返回 false
   *
   * @example
   * ```typescript
   * const today = new Date();
   * today.isThisWeek(); // true
   *
   * const lastWeek = new Date();
   * lastWeek.setDate(lastWeek.getDate() - 7);
   * lastWeek.isThisWeek(); // false
   *
   * const nextWeek = new Date();
   * nextWeek.setDate(nextWeek.getDate() + 7);
   * nextWeek.isThisWeek(); // false
   * ```
   */
  registerExtension({
    name: "isThisWeek",
    type: "method",
    target: "Date",
    handler: function (this: Date): boolean {
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return this >= weekStart && this <= weekEnd;
    },
    description: "检查日期是否在本周",
  });

  /**
   * 检查是否为本月
   * 判断日期是否在本月（只比较年月，不考虑日期）
   *
   * @returns {boolean} 如果日期在本月则返回 true，否则返回 false
   *
   * @example
   * ```typescript
   * const today = new Date();
   * today.isThisMonth(); // true
   *
   * const lastMonth = new Date();
   * lastMonth.setMonth(lastMonth.getMonth() - 1);
   * lastMonth.isThisMonth(); // false
   *
   * const nextMonth = new Date();
   * nextMonth.setMonth(nextMonth.getMonth() + 1);
   * nextMonth.isThisMonth(); // false
   * ```
   */
  registerExtension({
    name: "isThisMonth",
    type: "method",
    target: "Date",
    handler: function (this: Date): boolean {
      const now = new Date();
      return this.getFullYear() === now.getFullYear() &&
        this.getMonth() === now.getMonth();
    },
    description: "检查日期是否在本月",
  });

  /**
   * 检查是否为今年
   * 判断日期是否在今年（只比较年份）
   *
   * @returns {boolean} 如果日期在今年则返回 true，否则返回 false
   *
   * @example
   * ```typescript
   * const today = new Date();
   * today.isThisYear(); // true
   *
   * const lastYear = new Date();
   * lastYear.setFullYear(lastYear.getFullYear() - 1);
   * lastYear.isThisYear(); // false
   *
   * const nextYear = new Date();
   * nextYear.setFullYear(nextYear.getFullYear() + 1);
   * nextYear.isThisYear(); // false
   * ```
   */
  registerExtension({
    name: "isThisYear",
    type: "method",
    target: "Date",
    handler: function (this: Date): boolean {
      const now = new Date();
      return this.getFullYear() === now.getFullYear();
    },
    description: "检查日期是否在今年",
  });

  /**
   * 获取开始时间（天）
   * 获取当天的开始时间（00:00:00.000），返回新的日期对象（原日期不会被修改）
   *
   * @returns {Date} 当天的开始时间（00:00:00.000）
   *
   * @example
   * ```typescript
   * const date = new Date(2024, 0, 15, 14, 30, 45);
   * date.startOfDay(); // 2024-01-15 00:00:00.000
   *
   * const now = new Date();
   * const start = now.startOfDay();
   * // start 是今天的 00:00:00
   * // now 仍然是原来的时间
   * ```
   */
  registerExtension({
    name: "startOfDay",
    type: "method",
    target: "Date",
    handler: function (this: Date): Date {
      const date = new Date(this);
      date.setHours(0, 0, 0, 0);
      return date;
    },
    description: "获取当天的开始时间（00:00:00）",
  });

  /**
   * 获取结束时间（天）
   * 获取当天的结束时间（23:59:59.999），返回新的日期对象（原日期不会被修改）
   *
   * @returns {Date} 当天的结束时间（23:59:59.999）
   *
   * @example
   * ```typescript
   * const date = new Date(2024, 0, 15, 14, 30, 45);
   * date.endOfDay(); // 2024-01-15 23:59:59.999
   *
   * const now = new Date();
   * const end = now.endOfDay();
   * // end 是今天的 23:59:59.999
   * // now 仍然是原来的时间
   * ```
   */
  registerExtension({
    name: "endOfDay",
    type: "method",
    target: "Date",
    handler: function (this: Date): Date {
      const date = new Date(this);
      date.setHours(23, 59, 59, 999);
      return date;
    },
    description: "获取当天的结束时间（23:59:59）",
  });

  /**
   * 添加天数
   * 在当前日期基础上添加指定的天数，返回新的日期对象（原日期不会被修改）
   *
   * @param {number} days - 要添加的天数，可以为负数（表示减去天数）
   * @returns {Date} 新的日期对象
   *
   * @example
   * ```typescript
   * const date = new Date(2024, 0, 15);
   * date.addDays(5); // 2024-01-20
   * date.addDays(-3); // 2024-01-12
   * ```
   */
  registerExtension({
    name: "addDays",
    type: "method",
    target: "Date",
    handler: function (this: Date, days: number): Date {
      const date = new Date(this);
      date.setDate(date.getDate() + days);
      return date;
    },
    description: "添加指定天数",
  });

  /**
   * 添加月数
   * 在当前日期基础上添加指定的月数，返回新的日期对象（原日期不会被修改）
   *
   * @param {number} months - 要添加的月数，可以为负数（表示减去月数）
   * @returns {Date} 新的日期对象
   *
   * @example
   * ```typescript
   * const date = new Date(2024, 0, 15);
   * date.addMonths(2); // 2024-03-15
   * date.addMonths(-1); // 2023-12-15
   * ```
   */
  registerExtension({
    name: "addMonths",
    type: "method",
    target: "Date",
    handler: function (this: Date, months: number): Date {
      const date = new Date(this);
      date.setMonth(date.getMonth() + months);
      return date;
    },
    description: "添加指定月数",
  });

  /**
   * 添加年数
   * 在当前日期基础上添加指定的年数，返回新的日期对象（原日期不会被修改）
   *
   * @param {number} years - 要添加的年数，可以为负数（表示减去年数）
   * @returns {Date} 新的日期对象
   *
   * @example
   * ```typescript
   * const date = new Date(2024, 0, 15);
   * date.addYears(1); // 2025-01-15
   * date.addYears(-2); // 2022-01-15
   * ```
   */
  registerExtension({
    name: "addYears",
    type: "method",
    target: "Date",
    handler: function (this: Date, years: number): Date {
      const date = new Date(this);
      date.setFullYear(date.getFullYear() + years);
      return date;
    },
    description: "添加指定年数",
  });
}
