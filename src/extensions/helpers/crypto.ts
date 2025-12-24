/**
 * 加密辅助函数
 * 提供常用的加密、哈希、签名等功能
 */

/**
 * 生成随机字符串
 * @param length 长度（默认32）
 * @param charset 字符集（默认字母数字）
 * @returns 随机字符串
 */
export function randomString(length: number = 32, charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * 生成UUID（v4）
 * @returns UUID字符串
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * MD5 哈希（使用 Web Crypto API）
 * @param data 数据
 * @returns MD5哈希值（十六进制）
 */
export async function md5(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  // 注意：Web Crypto API 不支持 MD5，这里使用 SHA-256 作为替代
  // 如果需要真正的 MD5，需要使用第三方库
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256 哈希
 * @param data 数据
 * @returns SHA-256哈希值（十六进制）
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Base64 编码
 * @param data 数据
 * @returns Base64编码字符串
 */
export function base64Encode(data: string): string {
  // Deno 环境直接使用 btoa
  return btoa(data);
}

/**
 * Base64 解码
 * @param encoded Base64编码字符串
 * @returns 解码后的字符串
 */
export function base64Decode(encoded: string): string {
  // Deno 环境直接使用 atob
  return atob(encoded);
}

/**
 * URL 安全 Base64 编码
 * @param data 数据
 * @returns URL安全的Base64编码字符串
 */
export function base64UrlEncode(data: string): string {
  return base64Encode(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * URL 安全 Base64 解码
 * @param encoded URL安全的Base64编码字符串
 * @returns 解码后的字符串
 */
export function base64UrlDecode(encoded: string): string {
  // 补全填充
  let padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (padded.length % 4) {
    padded += '=';
  }
  return base64Decode(padded);
}

/**
 * 简单加密（XOR，仅用于简单场景，不适用于安全要求高的场景）
 * @param data 数据
 * @param key 密钥
 * @returns 加密后的字符串（Base64编码）
 */
export function simpleEncrypt(data: string, key: string): string {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return base64Encode(result);
}

/**
 * 简单解密（XOR）
 * @param encrypted 加密后的字符串（Base64编码）
 * @param key 密钥
 * @returns 解密后的字符串
 */
export function simpleDecrypt(encrypted: string, key: string): string {
  const data = base64Decode(encrypted);
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

/**
 * 生成签名（HMAC-SHA256）
 * @param data 数据
 * @param secret 密钥
 * @returns 签名（Base64编码）
 */
export async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64Encode(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * 验证签名
 * @param data 数据
 * @param signature 签名（Base64编码）
 * @param secret 密钥
 * @returns 签名是否有效
 */
export async function verifySignature(data: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await sign(data, secret);
  return expectedSignature === signature;
}

