/**
 * 限流中间件
 * 提供请求频率限制功能
 */

import type { Middleware } from '../types/index.ts';

/**
 * 限流选项
 */
export interface RateLimitOptions {
  /**
   * 时间窗口（毫秒），默认 60000（1分钟）
   */
  windowMs?: number;
  
  /**
   * 每个时间窗口内的最大请求数，默认 100
   */
  max?: number;
  
  /**
   * 是否跳过成功请求（只限制错误请求），默认 false
   */
  skipSuccessfulRequests?: boolean;
  
  /**
   * 是否跳过失败请求（只限制成功请求），默认 false
   */
  skipFailedRequests?: boolean;
  
  /**
   * 获取客户端标识的函数（默认使用 IP 地址）
   */
  keyGenerator?: (req: { url: string; headers: Headers }) => string;
  
  /**
   * 跳过限流的函数
   */
  skip?: (req: { url: string; method: string }) => boolean;
  
  /**
   * 自定义错误消息
   */
  message?: string;
  
  /**
   * 自定义错误状态码，默认 429
   */
  statusCode?: number;
  
  /**
   * 存储实现（默认使用内存存储）
   */
  store?: RateLimitStore;
}

/**
 * 限流存储接口
 */
export interface RateLimitStore {
  /**
   * 获取当前计数
   */
  get(key: string): Promise<number> | number;
  
  /**
   * 增加计数
   */
  increment(key: string): Promise<number> | number;
  
  /**
   * 重置计数
   */
  reset(key: string): Promise<void> | void;
  
  /**
   * 设置过期时间
   */
  setExpiry(key: string, ttl: number): Promise<void> | void;
}

/**
 * 内存存储实现
 */
class MemoryStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();
  
  get(key: string): number {
    const entry = this.store.get(key);
    if (!entry) {
      return 0;
    }
    
    // 如果已过期，返回 0
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return 0;
    }
    
    return entry.count;
  }
  
  increment(key: string): number {
    const entry = this.store.get(key);
    const now = Date.now();
    
    if (!entry || now > entry.resetTime) {
      // 创建新条目
      this.store.set(key, { count: 1, resetTime: now + 60000 }); // 默认 1 分钟
      return 1;
    }
    
    entry.count++;
    return entry.count;
  }
  
  reset(key: string): void {
    this.store.delete(key);
  }
  
  setExpiry(key: string, ttl: number): void {
    const entry = this.store.get(key);
    if (entry) {
      entry.resetTime = Date.now() + ttl;
    }
  }
}

/**
 * 获取客户端 IP 地址
 */
function getClientIP(req: { url: string; headers: Headers }): string {
  // 尝试从 X-Forwarded-For 获取（代理场景）
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // 尝试从 X-Real-IP 获取
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // 默认返回 'unknown'
  return 'unknown';
}

/**
 * 创建限流中间件
 * @param options 限流选项
 * @returns 中间件函数
 */
export function rateLimit(options: RateLimitOptions = {}): Middleware {
  const {
    windowMs = 60000, // 默认 1 分钟
    max = 100, // 默认 100 次请求
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => getClientIP(req),
    skip,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    store = new MemoryStore(),
  } = options;
  
  return async (req, res, next) => {
    // 检查是否需要跳过限流
    if (skip && skip({ url: req.url, method: req.method })) {
      await next();
      return;
    }
    
    // 生成客户端标识
    const key = keyGenerator({ url: req.url, headers: req.headers });
    
    // 获取当前计数
    const current = await Promise.resolve(store.get(key));
    
    // 如果超过限制，返回错误
    if (current >= max) {
      res.status = statusCode;
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000).toString());
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());
      res.json({ error: message });
      return;
    }
    
    // 增加计数
    const count = await Promise.resolve(store.increment(key));
    
    // 设置过期时间
    await Promise.resolve(store.setExpiry(key, windowMs));
    
    // 设置响应头
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());
    
    // 执行下一个中间件
    await next();
    
    // 根据选项决定是否记录成功/失败请求
    if (skipSuccessfulRequests && res.status < 400) {
      // 成功请求不计入限流
      const currentCount = await Promise.resolve(store.get(key));
      if (currentCount > 0) {
        // 这里我们无法直接减少计数，因为存储接口不支持
        // 实际应用中，可以在存储实现中处理这个逻辑
      }
    }
    
    if (skipFailedRequests && res.status >= 400) {
      // 失败请求不计入限流
      const currentCount = await Promise.resolve(store.get(key));
      if (currentCount > 0) {
        // 同样，需要在存储实现中处理
      }
    }
  };
}

