/**
 * 请求参数安全过滤
 *
 * 对用户可控的 params、query 做校验/过滤，防止原型污染、非法键名等，
 * 确保传入 pageProps 的数据安全。
 */

/** 需过滤的危险键名（防止原型污染等） */
const DANGEROUS_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

/**
 * 过滤 params/query 中的危险键，保留安全键值对
 *
 * - 过滤 __proto__、constructor、prototype 等危险键
 * - 过滤含 NUL 字符的键名
 * - 值保持原样（params 通常为 string，query 可能为 string | string[]）
 *
 * @param obj 原始 params 或 query
 * @returns 过滤后的安全对象
 */
export function sanitizeRequestParams<T extends Record<string, unknown>>(
  obj: T | Record<string, string> | undefined | null,
): T {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return {} as T;
  }
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (DANGEROUS_KEYS.has(k)) continue;
    if (typeof k !== "string" || k.includes("\0")) continue;
    result[k] = v;
  }
  return result as T;
}
