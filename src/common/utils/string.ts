/**
 * 字符串处理工具函数
 * 用于字符串转换、格式化等
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
