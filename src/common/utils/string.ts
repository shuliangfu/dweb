/**
 * 字符串处理工具函数
 * 提供字符串转换、格式化、大小写转换等功能
 *
 * 环境兼容性：
 * - 通用：所有函数都可以在服务端和客户端使用
 *
 * 主要功能：
 * - **大小写转换**：首字母大写（capitalize）
 * - **命名风格转换**：驼峰命名（toCamelCase）、短横线命名（toKebabCase）、蛇形命名（toSnakeCase）
 * - **命名风格互转**：短横线转驼峰（kebabToCamel）
 *
 * @example
 * ```typescript
 * import { toCamelCase, toKebabCase, capitalize } from "@dreamer/dweb/utils/string";
 *
 * toCamelCase("hello-world"); // "helloWorld"
 * toKebabCase("helloWorld"); // "hello-world"
 * capitalize("hello"); // "Hello"
 * ```
 */

/**
 * 首字母大写
 * 将字符串的首字母转换为大写，其余字母转换为小写
 * @param str 字符串
 * @returns 转换后的字符串
 */
export function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * 转换为驼峰格式
 * 将短横线、下划线或空格分隔的字符串转换为驼峰格式（camelCase）
 * @param str 字符串
 * @returns 驼峰格式的字符串
 */
export function toCamelCase(str: string): string {
  return str.replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""));
}

/**
 * 转换为短横线格式
 * 将驼峰、下划线或空格分隔的字符串转换为短横线格式（kebab-case）
 * @param str 字符串
 * @returns 短横线格式的字符串
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * 转换为下划线格式
 * 将驼峰、短横线或空格分隔的字符串转换为下划线格式（snake_case）
 * @param str 字符串
 * @returns 下划线格式的字符串
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

/**
 * 将短横线格式转换为驼峰格式
 * @deprecated 请使用 toCamelCase
 * @param kebabCase 短横线格式的字符串，例如 "get-examples"
 * @returns 驼峰格式的字符串，例如 "getExamples"
 */
export function kebabToCamel(kebabCase: string): string {
  return toCamelCase(kebabCase);
}
