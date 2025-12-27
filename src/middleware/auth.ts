/**
 * 认证中间件
 * 提供 JWT 认证支持
 */

import type { Middleware } from "../types/index.ts";
import { crypto } from "@std/crypto";

/**
 * JWT 载荷接口
 */
export interface JWTPayload {
  [key: string]: unknown;
  sub?: string; // 主题（通常是用户 ID）
  exp?: number; // 过期时间
  iat?: number; // 签发时间
  iss?: string; // 签发者
  aud?: string; // 受众
}

/**
 * 认证选项
 */
export interface AuthOptions {
  /**
   * JWT 密钥（必需）
   */
  secret: string;

  /**
   * Token 在请求头中的名称（默认 'Authorization'）
   */
  headerName?: string;

  /**
   * Token 前缀（默认 'Bearer '）
   */
  tokenPrefix?: string;

  /**
   * Token 在 Cookie 中的名称（可选）
   */
  cookieName?: string;

  /**
   * 跳过认证的路径（支持 glob 模式）
   */
  skip?: string[];

  /**
   * 验证 Token 的函数（可选，默认使用内置验证）
   */
  verifyToken?: (token: string, secret: string) => Promise<JWTPayload | null>;

  /**
   * 自定义错误处理
   */
  onError?: (error: Error, req: { url: string; method: string }) => void;
}

/**
 * Base64 URL 编码
 */
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Base64 URL 解码
 */
function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(padding);
  const binary = atob(padded);
  return new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
}

/**
 * 生成 JWT Token
 * @param payload 载荷数据
 * @param secret 密钥
 * @param expiresIn 过期时间（秒），默认 3600（1小时）
 * @returns JWT Token
 */
export async function signJWT(
  payload: JWTPayload,
  secret: string,
  expiresIn: number = 3600,
): Promise<string> {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  // 添加过期时间
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  // 编码头部和载荷
  const encodedHeader = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header)),
  );
  const encodedPayload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(jwtPayload)),
  );

  // 创建签名
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signatureInput),
  );
  const encodedSignature = base64UrlEncode(new Uint8Array(signature));

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * 验证 JWT Token
 * @param token JWT Token
 * @param secret 密钥
 * @returns 载荷数据或 null
 */
export async function verifyJWT(
  token: string,
  secret: string,
): Promise<JWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    // 验证签名
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const signature = base64UrlDecode(encodedSignature);
    // 创建新的 Uint8Array 以确保类型兼容
    const signatureBuffer = new Uint8Array(signature);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBuffer,
      new TextEncoder().encode(signatureInput),
    );

    if (!isValid) {
      return null;
    }

    // 解码载荷
    const payloadBytes = base64UrlDecode(encodedPayload);
    const payloadJson = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(payloadJson) as JWTPayload;

    // 验证过期时间
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * 检查路径是否匹配 glob 模式
 */
function matchesPattern(path: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const regex = new RegExp(
      "^" + pattern
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*")
        .replace(/\?/g, ".")
        .replace(/\./g, "\\.") +
        "$",
    );

    if (regex.test(path)) {
      return true;
    }
  }

  return false;
}

/**
 * 创建认证中间件
 * @param options 认证选项
 * @returns 中间件函数
 */
export function auth(options: AuthOptions): Middleware {
  const {
    secret,
    headerName = "Authorization",
    tokenPrefix = "Bearer ",
    cookieName,
    skip = [],
    verifyToken = verifyJWT,
    onError,
  } = options;

  if (!secret) {
    throw new Error("JWT secret is required");
  }

  return async (req, res, next) => {
    const url = new URL(req.url);
    const path = url.pathname;

    // 检查是否需要跳过认证
    if (skip.length > 0 && matchesPattern(path, skip)) {
      await next();
      return;
    }

    // 从请求头获取 Token
    let token: string | null = null;
    const authHeader = req.headers.get(headerName.toLowerCase());
    if (authHeader && authHeader.startsWith(tokenPrefix)) {
      token = authHeader.slice(tokenPrefix.length);
    }

    // 如果请求头没有，尝试从 Cookie 获取
    if (!token && cookieName) {
      token = req.getCookie(cookieName);
    }

    // 如果没有 Token，返回 401
    if (!token) {
      res.status = 401;
      res.setHeader("WWW-Authenticate", `Bearer realm="API"`);
      res.json({ error: "Authentication required" });
      if (onError) {
        onError(new Error("No token provided"), {
          url: req.url,
          method: req.method,
        });
      }
      return;
    }

    // 验证 Token
    try {
      const payload = await verifyToken(token, secret);

      if (!payload) {
        res.status = 401;
        res.setHeader("WWW-Authenticate", `Bearer realm="API"`);
        res.json({ error: "Invalid or expired token" });
        if (onError) {
          onError(new Error("Invalid token"), {
            url: req.url,
            method: req.method,
          });
        }
        return;
      }

      // 将用户信息附加到请求对象
      // 注意：Request 接口可能需要扩展以支持 user 属性
      (req as unknown as { user?: JWTPayload }).user = payload;

      await next();
    } catch (error) {
      res.status = 401;
      res.json({ error: "Token verification failed" });
      if (onError) {
        onError(
          error instanceof Error
            ? error
            : new Error("Token verification failed"),
          { url: req.url, method: req.method },
        );
      }
    }
  };
}
