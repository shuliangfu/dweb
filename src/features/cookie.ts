/**
 * Cookie 管理模块
 * 提供 Cookie 的设置、读取、删除功能
 */

import type { CookieOptions } from "../common/types/index.ts";

/**
 * Cookie 管理器
 */
export class CookieManager {
  private secret?: string;

  constructor(secret?: string) {
    this.secret = secret;
  }

  /**
   * 设置 Cookie（异步版本，支持签名）
   * @param name Cookie 名称
   * @param value Cookie 值
   * @param options Cookie 选项
   * @returns Cookie 字符串
   */
  async setAsync(
    name: string,
    value: string,
    options: CookieOptions = {},
  ): Promise<string> {
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    // 如果配置了签名密钥，对 Cookie 进行签名
    if (this.secret) {
      const signature = await this.sign(value);
      cookie = `${cookie}.${signature}`;
    }

    return this.buildCookieString(cookie, options);
  }

  /**
   * 设置 Cookie（同步版本，不支持签名）
   * @param name Cookie 名称
   * @param value Cookie 值
   * @param options Cookie 选项
   * @returns Cookie 字符串
   */
  set(name: string, value: string, options: CookieOptions = {}): string {
    const cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    return this.buildCookieString(cookie, options);
  }

  /**
   * 构建 Cookie 字符串
   * @param cookie Cookie 基础字符串
   * @param options Cookie 选项
   * @returns 完整的 Cookie 字符串
   */
  private buildCookieString(cookie: string, options: CookieOptions): string {
    // 设置路径
    if (options.path) {
      cookie += `; Path=${options.path}`;
    } else {
      cookie += "; Path=/";
    }

    // 设置域名
    if (options.domain) {
      cookie += `; Domain=${options.domain}`;
    }

    // 设置过期时间
    if (options.expires) {
      cookie += `; Expires=${options.expires.toUTCString()}`;
    } else if (options.maxAge) {
      cookie += `; Max-Age=${options.maxAge}`;
    }

    // 设置 Secure
    if (options.secure) {
      cookie += "; Secure";
    }

    // 设置 HttpOnly
    if (options.httpOnly !== false) {
      cookie += "; HttpOnly";
    }

    // 设置 SameSite
    if (options.sameSite) {
      cookie += `; SameSite=${options.sameSite}`;
    }

    return cookie;
  }

  /**
   * 解析 Cookie 字符串（同步版本，不支持签名验证）
   * @param cookieHeader Cookie 头字符串
   * @returns Cookie 对象
   */
  parse(cookieHeader: string | null): Record<string, string> {
    const cookies: Record<string, string> = {};

    if (!cookieHeader) {
      return cookies;
    }

    cookieHeader.split(";").forEach((cookie) => {
      const [name, value] = cookie.trim().split("=");
      if (name && value) {
        const decodedName = decodeURIComponent(name);
        const decodedValue = decodeURIComponent(value);
        cookies[decodedName] = decodedValue;
      }
    });

    return cookies;
  }

  /**
   * 删除 Cookie
   * @param name Cookie 名称
   * @param options Cookie 选项
   * @returns Cookie 字符串
   */
  delete(name: string, options: CookieOptions = {}): string {
    return this.set(name, "", {
      ...options,
      maxAge: 0,
      expires: new Date(0),
    });
  }

  /**
   * 签名 Cookie 值
   * @param value Cookie 值
   * @returns 签名
   */
  private async sign(value: string): Promise<string> {
    if (!this.secret) {
      return "";
    }

    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.secret);
    const valueData = encoder.encode(value);

    // 使用 Web Crypto API 进行 HMAC-SHA256 签名
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign("HMAC", key, valueData);
    const hashArray = Array.from(new Uint8Array(signature));
    return btoa(String.fromCharCode(...hashArray)).replace(/[+/=]/g, "");
  }

  /**
   * 验证 Cookie 签名
   * @param value Cookie 值
   * @param signature 签名
   * @returns 是否验证通过
   */
  private async verify(value: string, signature: string): Promise<boolean> {
    if (!this.secret) {
      return false;
    }

    const expectedSignature = await this.sign(value);
    return expectedSignature === signature;
  }

  /**
   * 解析 Cookie 字符串（异步版本，支持签名验证）
   * @param cookieHeader Cookie 头字符串
   * @returns Cookie 对象
   */
  async parseAsync(
    cookieHeader: string | null,
  ): Promise<Record<string, string>> {
    const cookies: Record<string, string> = {};

    if (!cookieHeader) {
      return cookies;
    }

    for (const cookie of cookieHeader.split(";")) {
      const [name, value] = cookie.trim().split("=");
      if (name && value) {
        const decodedName = decodeURIComponent(name);
        let decodedValue = decodeURIComponent(value);

        // 如果 Cookie 被签名，验证签名
        if (this.secret && decodedValue.includes(".")) {
          const [actualValue, signature] = decodedValue.split(".");
          if (await this.verify(actualValue, signature)) {
            decodedValue = actualValue;
          } else {
            // 签名验证失败，忽略这个 Cookie
            continue;
          }
        }

        cookies[decodedName] = decodedValue;
      }
    }

    return cookies;
  }
}
