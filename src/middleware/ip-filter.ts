/**
 * IP 过滤中间件
 * 支持 IP 白名单和黑名单
 */

import type { Middleware } from '../types/index.ts';

/**
 * IP 过滤选项
 */
export interface IPFilterOptions {
  /**
   * IP 白名单（允许的 IP 列表）
   * 支持单个 IP 或 CIDR 格式（如 '192.168.1.0/24'）
   */
  whitelist?: string[];
  
  /**
   * IP 黑名单（禁止的 IP 列表）
   * 支持单个 IP 或 CIDR 格式
   */
  blacklist?: string[];
  
  /**
   * 是否启用白名单模式（默认 false）
   * true: 只允许白名单中的 IP
   * false: 允许所有 IP，除非在黑名单中
   */
  whitelistMode?: boolean;
  
  /**
   * 跳过过滤的路径（支持 glob 模式）
   */
  skip?: string[];
  
  /**
   * 自定义错误消息
   */
  message?: string;
  
  /**
   * 自定义错误状态码（默认 403）
   */
  statusCode?: number;
  
  /**
   * 获取客户端 IP 的函数（默认使用标准方法）
   */
  getClientIP?: (req: { url: string; headers: Headers }) => string;
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
  
  // 尝试从 CF-Connecting-IP 获取（Cloudflare）
  const cfIP = req.headers.get('cf-connecting-ip');
  if (cfIP) {
    return cfIP;
  }
  
  // 从 URL 中提取（如果可能）
  try {
    const url = new URL(req.url);
    // 注意：这通常不会包含真实的客户端 IP，但作为后备
    return url.hostname || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * 将 IP 地址转换为数字（用于范围比较）
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return 0;
  }
  return (
    parseInt(parts[0], 10) * 256 * 256 * 256 +
    parseInt(parts[1], 10) * 256 * 256 +
    parseInt(parts[2], 10) * 256 +
    parseInt(parts[3], 10)
  );
}

/**
 * 解析 CIDR 格式的 IP 范围
 */
function parseCIDR(cidr: string): { network: number; mask: number } | null {
  const [ip, maskStr] = cidr.split('/');
  if (!ip || !maskStr) {
    return null;
  }
  
  const network = ipToNumber(ip);
  const maskBits = parseInt(maskStr, 10);
  if (isNaN(maskBits) || maskBits < 0 || maskBits > 32) {
    return null;
  }
  
  const mask = (0xffffffff << (32 - maskBits)) >>> 0;
  
  return { network: network & mask, mask };
}

/**
 * 检查 IP 是否在 CIDR 范围内
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  // 如果是精确匹配
  if (ip === cidr) {
    return true;
  }
  
  // 解析 CIDR
  const cidrInfo = parseCIDR(cidr);
  if (!cidrInfo) {
    return false;
  }
  
  const ipNum = ipToNumber(ip);
  if (ipNum === 0) {
    return false;
  }
  
  return (ipNum & cidrInfo.mask) === cidrInfo.network;
}

/**
 * 检查 IP 是否在列表中（支持单个 IP 和 CIDR）
 */
function isIPInList(ip: string, list: string[]): boolean {
  return list.some((item) => {
    if (item.includes('/')) {
      return isIPInCIDR(ip, item);
    }
    return ip === item;
  });
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
 * 创建 IP 过滤中间件
 * @param options IP 过滤选项
 * @returns 中间件函数
 */
export function ipFilter(options: IPFilterOptions = {}): Middleware {
  const {
    whitelist = [],
    blacklist = [],
    whitelistMode = false,
    skip = [],
    message = 'Access denied',
    statusCode = 403,
    getClientIP: customGetClientIP,
  } = options;
  
  const getIP = customGetClientIP || getClientIP;
  
  return async (req, res, next) => {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // 检查是否需要跳过过滤
    if (skip.length > 0 && matchesPattern(path, skip)) {
      await next();
      return;
    }
    
    // 获取客户端 IP
    const clientIP = getIP({ url: req.url, headers: req.headers });
    
    // 如果无法获取 IP，默认允许（可以根据需要修改）
    if (clientIP === 'unknown') {
      // 在严格模式下，未知 IP 应该被拒绝
      if (whitelistMode) {
        res.status = statusCode;
        res.json({ error: message, ip: clientIP });
        return;
      }
      await next();
      return;
    }
    
    // 检查黑名单（优先级最高）
    if (blacklist.length > 0 && isIPInList(clientIP, blacklist)) {
      res.status = statusCode;
      res.json({ error: message, ip: clientIP });
      return;
    }
    
    // 检查白名单模式
    if (whitelistMode) {
      if (whitelist.length === 0 || !isIPInList(clientIP, whitelist)) {
        res.status = statusCode;
        res.json({ error: message, ip: clientIP });
        return;
      }
    }
    
    // 通过验证，继续处理
    await next();
  };
}

