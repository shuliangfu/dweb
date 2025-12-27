/**
 * 加密辅助函数
 * 提供常用的加密、哈希、签名等功能
 *
 * 环境兼容性：
 * - 通用：所有函数都可以在服务端和客户端使用
 * - 注意：部分函数依赖 Web Crypto API，需要现代浏览器或 Deno 环境
 */

/**
 * 生成随机字符串
 * 生成指定长度的随机字符串
 *
 * @param length 长度（默认32）
 * @param charset 字符集（默认字母数字）
 * @returns 随机字符串
 *
 * @example
 * ```typescript
 * randomString(16); // 生成16位随机字符串
 * randomString(8, '0123456789'); // 生成8位随机数字
 * ```
 */
export function randomString(
  length: number = 32,
  charset: string =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * 生成UUID（v4）
 * 生成符合 UUID v4 标准的唯一标识符
 *
 * @returns UUID字符串
 *
 * @example
 * ```typescript
 * const id = generateUUID();
 * // '550e8400-e29b-41d4-a716-446655440000'
 * ```
 */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * MD5 哈希（使用 Web Crypto API）
 * 注意：Web Crypto API 不支持 MD5，这里使用 SHA-256 作为替代
 * 如果需要真正的 MD5，需要使用第三方库
 *
 * @param data 数据
 * @returns 哈希值（十六进制，实际为 SHA-256）
 *
 * @example
 * ```typescript
 * const hash = await md5('hello world');
 * // 返回 SHA-256 哈希值
 * ```
 */
export async function md5(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(data),
  );
  // 注意：Web Crypto API 不支持 MD5，这里使用 SHA-256 作为替代
  // 如果需要真正的 MD5，需要使用第三方库
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * SHA-256 哈希
 * 使用 Web Crypto API 计算字符串的 SHA-256 哈希值
 *
 * @param data 数据
 * @returns SHA-256哈希值（十六进制）
 *
 * @example
 * ```typescript
 * const hash = await sha256('hello world');
 * // 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
 * ```
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(data),
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Base64 编码
 * 将字符串编码为 Base64 格式
 *
 * @param data 数据
 * @returns Base64编码字符串
 *
 * @example
 * ```typescript
 * base64Encode('Hello World');
 * // 'SGVsbG8gV29ybGQ='
 * ```
 */
export function base64Encode(data: string): string {
  // Deno 环境直接使用 btoa
  return btoa(data);
}

/**
 * Base64 解码
 * 将 Base64 编码的字符串解码为原始字符串
 *
 * @param encoded Base64编码字符串
 * @returns 解码后的字符串
 *
 * @example
 * ```typescript
 * base64Decode('SGVsbG8gV29ybGQ=');
 * // 'Hello World'
 * ```
 */
export function base64Decode(encoded: string): string {
  // Deno 环境直接使用 atob
  return atob(encoded);
}

/**
 * URL 安全 Base64 编码
 * 将字符串编码为 URL 安全的 Base64 格式（替换 + 为 -，/ 为 _，移除 =）
 *
 * @param data 数据
 * @returns URL安全的Base64编码字符串
 *
 * @example
 * ```typescript
 * base64UrlEncode('Hello World');
 * // 'SGVsbG8gV29ybGQ'（无填充）
 * ```
 */
export function base64UrlEncode(data: string): string {
  return base64Encode(data).replace(/\+/g, "-").replace(/\//g, "_").replace(
    /=/g,
    "",
  );
}

/**
 * URL 安全 Base64 解码
 * 将 URL 安全的 Base64 编码字符串解码为原始字符串
 *
 * @param encoded URL安全的Base64编码字符串
 * @returns 解码后的字符串
 *
 * @example
 * ```typescript
 * base64UrlDecode('SGVsbG8gV29ybGQ');
 * // 'Hello World'
 * ```
 */
export function base64UrlDecode(encoded: string): string {
  // 补全填充
  let padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) {
    padded += "=";
  }
  return base64Decode(padded);
}

/**
 * 简单加密（XOR）
 * 使用 XOR 算法进行简单加密，仅用于简单场景，不适用于安全要求高的场景
 *
 * @param data 数据
 * @param key 密钥
 * @returns 加密后的字符串（Base64编码）
 *
 * @example
 * ```typescript
 * const encrypted = simpleEncrypt('Hello World', 'secret');
 * // 返回 Base64 编码的加密字符串
 * ```
 */
export function simpleEncrypt(data: string, key: string): string {
  let result = "";
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(
      data.charCodeAt(i) ^ key.charCodeAt(i % key.length),
    );
  }
  return base64Encode(result);
}

/**
 * 简单解密（XOR）
 * 使用 XOR 算法解密 simpleEncrypt 加密的字符串
 *
 * @param encrypted 加密后的字符串（Base64编码）
 * @param key 密钥
 * @returns 解密后的字符串
 *
 * @example
 * ```typescript
 * const decrypted = simpleDecrypt(encrypted, 'secret');
 * // 'Hello World'
 * ```
 */
export function simpleDecrypt(encrypted: string, key: string): string {
  const data = base64Decode(encrypted);
  let result = "";
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(
      data.charCodeAt(i) ^ key.charCodeAt(i % key.length),
    );
  }
  return result;
}

/**
 * 生成签名（HMAC-SHA256）
 * 使用 HMAC-SHA256 算法生成数据签名
 *
 * @param data 数据
 * @param secret 密钥
 * @returns 签名（Base64编码）
 *
 * @example
 * ```typescript
 * const signature = await sign('Hello World', 'secret');
 * // 返回 Base64 编码的签名
 * ```
 */
export async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64Encode(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * 验证签名
 * 验证数据的签名是否有效
 *
 * @param data 数据
 * @param signature 签名（Base64编码）
 * @param secret 密钥
 * @returns 签名是否有效
 *
 * @example
 * ```typescript
 * const isValid = await verifySignature('Hello World', signature, 'secret');
 * if (isValid) {
 *   // 签名有效
 * }
 * ```
 */
export async function verifySignature(
  data: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const expectedSignature = await sign(data, secret);
  return expectedSignature === signature;
}
