/**
 * 请求 ID 中间件
 * 为每个请求生成唯一 ID，便于日志追踪和问题排查
 */

import type { Middleware } from '../types/index.ts';
import { crypto } from '@std/crypto';

/**
 * 请求 ID 选项
 */
export interface RequestIdOptions {
  /**
   * 请求 ID 响应头名称（默认 'X-Request-Id'）
   */
  headerName?: string;
  
  /**
   * 是否在响应头中包含请求 ID（默认 true）
   */
  exposeHeader?: boolean;
  
  /**
   * 自定义 ID 生成器
   * 如果不提供，使用默认的 UUID v4 生成器
   */
  generator?: () => string | Promise<string>;
  
  /**
   * 跳过生成请求 ID 的路径（支持 glob 模式）
   */
  skip?: string[];
  
  /**
   * 是否从请求头中读取现有的请求 ID（默认 true）
   * 如果请求头中已有请求 ID，则使用它而不是生成新的
   */
  useHeader?: boolean;
}

/**
 * 生成 UUID v4
 */
function generateUUID(): string {
  // 使用 crypto.randomUUID() 如果可用（Deno 2.x 支持）
  try {
    if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // 如果不可用，使用后备方案
  }
  
  // 后备方案：生成随机 UUID
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  
  // 设置版本（4）和变体位
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // 版本 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // 变体 10
  
  // 转换为 UUID 字符串格式
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * 检查路径是否匹配模式（简单的 glob 匹配）
 */
function matchesPattern(path: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // 精确匹配
    if (pattern === path) {
      return true;
    }
    
    // 前缀匹配
    if (pattern.endsWith('*') && path.startsWith(pattern.slice(0, -1))) {
      return true;
    }
    
    // 后缀匹配
    if (pattern.startsWith('*') && path.endsWith(pattern.slice(1))) {
      return true;
    }
    
    // 通配符匹配（简单实现）
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    if (regex.test(path)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 创建请求 ID 中间件
 * @param options 请求 ID 选项
 * @returns 中间件函数
 */
export function requestId(options: RequestIdOptions = {}): Middleware {
  const {
    headerName = 'X-Request-Id',
    exposeHeader = true,
    generator,
    skip = [],
    useHeader = true,
  } = options;
  
  const generateId = generator || (() => Promise.resolve(generateUUID()));
  
  return async (req, res, next) => {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // 检查是否需要跳过
    if (skip.length > 0 && matchesPattern(path, skip)) {
      await next();
      return;
    }
    
    // 尝试从请求头获取现有的请求 ID
    let requestId: string;
    if (useHeader) {
      const existingId = req.headers.get(headerName.toLowerCase());
      if (existingId) {
        requestId = existingId;
      } else {
        requestId = await generateId();
      }
    } else {
      requestId = await generateId();
    }
    
    // 将请求 ID 附加到请求对象（用于后续中间件和路由使用）
    // 注意：这需要扩展 Request 类型，但为了兼容性，我们使用类型断言
    (req as unknown as { requestId?: string }).requestId = requestId;
    
    // 在响应头中返回请求 ID
    if (exposeHeader) {
      res.setHeader(headerName, requestId);
    }
    
    await next();
  };
}

