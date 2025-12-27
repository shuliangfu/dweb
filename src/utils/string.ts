/**
 * 字符串处理工具函数
 * 用于字符串转换、格式化等
 */

/**
 * 将短横线格式转换为驼峰格式
 * @param kebabCase 短横线格式的字符串，例如 "get-examples"
 * @returns 驼峰格式的字符串，例如 "getExamples"
 */
export function kebabToCamel(kebabCase: string): string {
  return kebabCase.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
