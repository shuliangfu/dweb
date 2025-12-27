/**
 * 扩展系统类型定义
 * 定义扩展系统的核心类型和接口
 */

/**
 * 扩展类型枚举
 */
export type ExtensionType = "method" | "helper" | "utility";

/**
 * 扩展目标类型（用于原生类型扩展）
 */
export type ExtensionTarget =
  | "String"
  | "Array"
  | "Date"
  | "Object"
  | "Request"
  | "Response"
  | "global";

/**
 * 扩展定义接口
 */
export interface Extension {
  /** 扩展名称（唯一标识） */
  name: string;
  /** 扩展类型 */
  type: ExtensionType;
  /** 扩展目标（如果是原生类型扩展） */
  target?: ExtensionTarget;
  /** 扩展处理函数 */
  handler: Function;
  /** 扩展描述 */
  description?: string;
  /** 扩展版本 */
  version?: string;
  /** 是否启用（默认启用） */
  enabled?: boolean;
}

/**
 * 扩展注册器接口
 */
export interface ExtensionRegistry {
  /** 注册扩展 */
  register(extension: Extension): void;
  /** 获取扩展 */
  get(name: string): Extension | undefined;
  /** 获取所有扩展 */
  getAll(type?: ExtensionType): Extension[];
  /** 检查扩展是否存在 */
  has(name: string): boolean;
  /** 移除扩展 */
  remove(name: string): boolean;
  /** 启用扩展 */
  enable(name: string): boolean;
  /** 禁用扩展 */
  disable(name: string): boolean;
  /** 清空所有扩展 */
  clear(): void;
}

/**
 * 字符串扩展方法类型
 */
export interface StringExtensions {
  /** 首字母大写 */
  capitalize(): string;
  /** 转换为驼峰格式 */
  toCamelCase(): string;
  /** 转换为短横线格式 */
  toKebabCase(): string;
  /** 转换为下划线格式 */
  toSnakeCase(): string;
  /** 转换为标题格式 */
  toTitleCase(): string;
  /** 移除首尾空白并压缩中间空白 */
  trimAll(): string;
  /** 检查是否为空字符串 */
  isEmpty(): boolean;
  /** 检查是否为有效邮箱 */
  isEmail(): boolean;
  /** 检查是否为有效URL */
  isUrl(): boolean;
  /** 截断字符串 */
  truncate(length: number, suffix?: string): string;
  /** 移除HTML标签 */
  stripHtml(): string;
}

/**
 * 数组扩展方法类型
 */
export interface ArrayExtensions<T> {
  /** 按条件分组 */
  groupBy(key: string | ((item: T) => string)): Record<string, T[]>;
  /** 去重 */
  unique(): T[];
  /** 按条件去重 */
  uniqueBy(key: string | ((item: T) => unknown)): T[];
  /** 分块 */
  chunk(size: number): T[][];
  /** 扁平化 */
  flatten(depth?: number): unknown[];
  /** 按条件排序 */
  sortBy(key: string | ((item: T) => unknown), order?: "asc" | "desc"): T[];
  /** 获取第一个元素或默认值 */
  firstOrDefault(defaultValue?: T): T | undefined;
  /** 获取最后一个元素或默认值 */
  lastOrDefault(defaultValue?: T): T | undefined;
  /** 检查是否为空数组 */
  isEmpty(): boolean;
  /** 随机打乱 */
  shuffle(): T[];
}

/**
 * 日期扩展方法类型
 */
export interface DateExtensions {
  /** 格式化为字符串 */
  format(pattern?: string): string;
  /** 获取相对时间（如：2小时前） */
  fromNow(): string;
  /** 检查是否为今天 */
  isToday(): boolean;
  /** 检查是否为昨天 */
  isYesterday(): boolean;
  /** 检查是否为明天 */
  isTomorrow(): boolean;
  /** 检查是否为本周 */
  isThisWeek(): boolean;
  /** 检查是否为本月 */
  isThisMonth(): boolean;
  /** 检查是否为今年 */
  isThisYear(): boolean;
  /** 获取开始时间（天） */
  startOfDay(): Date;
  /** 获取结束时间（天） */
  endOfDay(): Date;
  /** 添加天数 */
  addDays(days: number): Date;
  /** 添加月数 */
  addMonths(months: number): Date;
  /** 添加年数 */
  addYears(years: number): Date;
}

/**
 * 对象扩展方法类型
 */
export interface ObjectExtensions {
  /** 选择指定键 */
  pick(keys: string[]): Record<string, unknown>;
  /** 排除指定键 */
  omit(keys: string[]): Record<string, unknown>;
  /** 深度克隆 */
  deepClone(): unknown;
  /** 深度合并 */
  deepMerge(source: Record<string, unknown>): Record<string, unknown>;
  /** 检查是否为空对象 */
  isEmpty(): boolean;
  /** 获取嵌套值 */
  get(path: string, defaultValue?: unknown): unknown;
  /** 设置嵌套值 */
  set(path: string, value: unknown): void;
}
