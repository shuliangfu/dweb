/**
 * 安全工具函数
 * 提供输入验证、路径安全等安全相关的工具函数
 */

import * as path from "@std/path";

/**
 * 验证路径是否在允许的目录内（防止路径遍历攻击）
 * @param filePath 要检查的文件路径
 * @param allowedDir 允许的目录
 * @returns 如果路径安全返回 true，否则返回 false
 */
export function isPathSafe(filePath: string, allowedDir: string): boolean {
  try {
    // 规范化路径
    const resolvedFilePath = path.resolve(filePath);
    const resolvedAllowedDir = path.resolve(allowedDir);

    // 检查路径是否在允许的目录内
    // 使用路径分隔符确保跨平台兼容性
    const sep = Deno.build.os === "windows" ? "\\" : "/";
    const normalizedFilePath = resolvedFilePath + sep;
    const normalizedAllowedDir = resolvedAllowedDir + sep;

    return normalizedFilePath.startsWith(normalizedAllowedDir);
  } catch {
    // 路径解析失败，认为不安全
    return false;
  }
}

/**
 * 验证字符串是否为有效的标识符（用于函数名、变量名等）
 * @param str 要验证的字符串
 * @returns 如果是有效标识符返回 true
 */
export function isValidIdentifier(str: string): boolean {
  // 标识符规则：以字母或下划线开头，后面可以是字母、数字、下划线
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str);
}

/**
 * 验证字符串是否为安全的文件名（不包含路径分隔符和特殊字符）
 * @param fileName 要验证的文件名
 * @returns 如果是安全的文件名返回 true
 */
export function isSafeFileName(fileName: string): boolean {
  // 不允许路径分隔符、空字符、控制字符
  if (
    fileName.includes("/") || fileName.includes("\\") ||
    fileName.includes("\0") || fileName.includes("..")
  ) {
    return false;
  }

  // 不允许 Windows 保留名称
  const reservedNames = [
    "CON",
    "PRN",
    "AUX",
    "NUL",
    "COM1",
    "COM2",
    "COM3",
    "COM4",
    "COM5",
    "COM6",
    "COM7",
    "COM8",
    "COM9",
    "LPT1",
    "LPT2",
    "LPT3",
    "LPT4",
    "LPT5",
    "LPT6",
    "LPT7",
    "LPT8",
    "LPT9",
  ];

  const upperName = fileName.toUpperCase().split(".")[0];
  if (reservedNames.includes(upperName)) {
    return false;
  }

  return true;
}

/**
 * 清理和验证路由参数
 * @param params 路由参数对象
 * @returns 清理后的参数对象
 */
export function sanitizeRouteParams(
  params: Record<string, string>,
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    // 验证键名
    if (!isValidIdentifier(key)) {
      continue; // 跳过无效的键名
    }

    // 清理值（移除控制字符，限制长度）
    // 移除控制字符（ASCII 0-31 和 127）
    const controlCharRegex = new RegExp("[\u0000-\u001F\u007F]", "g");
    const cleaned = value
      .replace(controlCharRegex, "")
      .slice(0, 1000); // 限制长度

    sanitized[key] = cleaned;
  }

  return sanitized;
}

/**
 * 验证 API 方法名是否安全
 * @param methodName 方法名
 * @returns 如果方法名安全返回 true
 */
export function isSafeMethodName(methodName: string): boolean {
  // 方法名应该是有效的标识符，且长度合理
  if (methodName.length > 100 || methodName.length === 0) {
    return false;
  }

  // 允许字母、数字、下划线、短横线（用于 kebab-case）
  return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(methodName);
}

/**
 * 验证查询参数值是否安全
 * @param value 查询参数值
 * @returns 如果值安全返回 true
 */
export function isSafeQueryValue(value: string): boolean {
  // 限制长度
  if (value.length > 1000) {
    return false;
  }

  // 不允许明显的注入尝试
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror= 等
    /data:text\/html/i,
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(value));
}
