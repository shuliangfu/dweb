/**
 * 安全中间件
 * 提供 XSS、CSRF 防护和安全头部设置
 */

import type { Middleware } from '../types/index.ts';
import { crypto } from '@std/crypto';

/**
 * 安全选项
 */
export interface SecurityOptions {
  /**
   * 是否启用 XSS 防护（默认 true）
   */
  xssProtection?: boolean;
  
  /**
   * 是否启用 CSRF 防护（默认 true）
   */
  csrfProtection?: boolean;
  
  /**
   * CSRF Token Cookie 名称（默认 '_csrf'）
   */
  csrfCookieName?: string;
  
  /**
   * CSRF Token 请求头名称（默认 'X-CSRF-Token'）
   */
  csrfHeaderName?: string;
  
  /**
   * CSRF Token 表单字段名称（默认 '_csrf'）
   */
  csrfFieldName?: string;
  
  /**
   * 需要 CSRF 验证的方法（默认 ['POST', 'PUT', 'DELETE', 'PATCH']）
   */
  csrfMethods?: string[];
  
  /**
   * 跳过 CSRF 验证的路径（支持 glob 模式）
   */
  csrfSkip?: string[];
  
  /**
   * 内容安全策略（CSP）
   */
  contentSecurityPolicy?: string | {
    defaultSrc?: string[];
    scriptSrc?: string[];
    styleSrc?: string[];
    imgSrc?: string[];
    connectSrc?: string[];
    fontSrc?: string[];
    objectSrc?: string[];
    mediaSrc?: string[];
    frameSrc?: string[];
    baseUri?: string[];
    formAction?: string[];
    frameAncestors?: string[];
    upgradeInsecureRequests?: boolean;
  };
  
  /**
   * 是否启用严格传输安全（HSTS）（默认 false，生产环境建议 true）
   */
  hsts?: boolean | {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  
  /**
   * X-Frame-Options（默认 'SAMEORIGIN'）
   */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  
  /**
   * X-Content-Type-Options（默认 'nosniff'）
   */
  contentTypeOptions?: 'nosniff' | 'none';
  
  /**
   * X-XSS-Protection（默认 '1; mode=block'）
   */
  xssProtectionHeader?: string;
  
  /**
   * Referrer-Policy（默认 'no-referrer'）
   */
  referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
  
  /**
   * Permissions-Policy（功能策略）
   */
  permissionsPolicy?: Record<string, string[]>;
}

/**
 * 生成 CSRF Token
 * @returns CSRF Token
 */
function generateCSRFToken(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  
  // 将随机字节转换为十六进制字符串
  const hex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return hex;
}

/**
 * 验证 CSRF Token
 * @param token1 第一个 token
 * @param token2 第二个 token
 * @returns 是否匹配
 */
function verifyCSRFToken(token1: string, token2: string): boolean {
  // 使用时间安全的比较，防止时序攻击
  if (token1.length !== token2.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < token1.length; i++) {
    result |= token1.charCodeAt(i) ^ token2.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * 检查路径是否匹配 glob 模式（简单实现）
 * @param path 路径
 * @param patterns glob 模式数组
 * @returns 是否匹配
 */
function matchesPattern(path: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // 简单的 glob 匹配实现
    const regex = new RegExp(
      '^' + pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.')
        .replace(/\./g, '\\.') + '$'
    );
    
    if (regex.test(path)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 构建 CSP 头部值
 * @param csp CSP 配置
 * @returns CSP 头部值
 */
function buildCSPHeader(csp: SecurityOptions['contentSecurityPolicy']): string {
  if (typeof csp === 'string') {
    return csp;
  }
  
  if (!csp) {
    return '';
  }
  
  const directives: string[] = [];
  
  if (csp.defaultSrc) {
    directives.push(`default-src ${csp.defaultSrc.join(' ')}`);
  }
  if (csp.scriptSrc) {
    directives.push(`script-src ${csp.scriptSrc.join(' ')}`);
  }
  if (csp.styleSrc) {
    directives.push(`style-src ${csp.styleSrc.join(' ')}`);
  }
  if (csp.imgSrc) {
    directives.push(`img-src ${csp.imgSrc.join(' ')}`);
  }
  if (csp.connectSrc) {
    directives.push(`connect-src ${csp.connectSrc.join(' ')}`);
  }
  if (csp.fontSrc) {
    directives.push(`font-src ${csp.fontSrc.join(' ')}`);
  }
  if (csp.objectSrc) {
    directives.push(`object-src ${csp.objectSrc.join(' ')}`);
  }
  if (csp.mediaSrc) {
    directives.push(`media-src ${csp.mediaSrc.join(' ')}`);
  }
  if (csp.frameSrc) {
    directives.push(`frame-src ${csp.frameSrc.join(' ')}`);
  }
  if (csp.baseUri) {
    directives.push(`base-uri ${csp.baseUri.join(' ')}`);
  }
  if (csp.formAction) {
    directives.push(`form-action ${csp.formAction.join(' ')}`);
  }
  if (csp.frameAncestors) {
    directives.push(`frame-ancestors ${csp.frameAncestors.join(' ')}`);
  }
  if (csp.upgradeInsecureRequests) {
    directives.push('upgrade-insecure-requests');
  }
  
  return directives.join('; ');
}

/**
 * 构建 Permissions-Policy 头部值
 * @param policy 权限策略配置
 * @returns Permissions-Policy 头部值
 */
function buildPermissionsPolicyHeader(policy: Record<string, string[]>): string {
  const directives: string[] = [];
  
  for (const [feature, allowlist] of Object.entries(policy)) {
    if (allowlist.length === 0) {
      directives.push(`${feature}=()`);
    } else {
      directives.push(`${feature}=(${allowlist.join(' ')})`);
    }
  }
  
  return directives.join(', ');
}

/**
 * 创建安全中间件
 * @param options 安全选项
 * @returns 中间件函数
 */
export function security(options: SecurityOptions = {}): Middleware {
  const {
    xssProtection = true,
    csrfProtection = true,
    csrfCookieName = '_csrf',
    csrfHeaderName = 'X-CSRF-Token',
    csrfFieldName = '_csrf',
    csrfMethods = ['POST', 'PUT', 'DELETE', 'PATCH'],
    csrfSkip = [],
    contentSecurityPolicy,
    hsts = false,
    frameOptions = 'SAMEORIGIN',
    contentTypeOptions = 'nosniff',
    xssProtectionHeader = '1; mode=block',
    referrerPolicy = 'no-referrer',
    permissionsPolicy,
  } = options;
  
  return async (req, res, next) => {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // 设置安全头部
    if (frameOptions) {
      res.setHeader('X-Frame-Options', frameOptions);
    }
    
    if (contentTypeOptions) {
      res.setHeader('X-Content-Type-Options', contentTypeOptions);
    }
    
    if (xssProtection && xssProtectionHeader) {
      res.setHeader('X-XSS-Protection', xssProtectionHeader);
    }
    
    if (referrerPolicy) {
      res.setHeader('Referrer-Policy', referrerPolicy);
    }
    
    if (contentSecurityPolicy) {
      const cspValue = buildCSPHeader(contentSecurityPolicy);
      if (cspValue) {
        res.setHeader('Content-Security-Policy', cspValue);
      }
    }
    
    if (hsts) {
      if (typeof hsts === 'boolean') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      } else {
        const parts: string[] = [];
        if (hsts.maxAge) {
          parts.push(`max-age=${hsts.maxAge}`);
        }
        if (hsts.includeSubDomains) {
          parts.push('includeSubDomains');
        }
        if (hsts.preload) {
          parts.push('preload');
        }
        if (parts.length > 0) {
          res.setHeader('Strict-Transport-Security', parts.join('; '));
        }
      }
    }
    
    if (permissionsPolicy) {
      const policyValue = buildPermissionsPolicyHeader(permissionsPolicy);
      if (policyValue) {
        res.setHeader('Permissions-Policy', policyValue);
      }
    }
    
    // CSRF 防护
    if (csrfProtection && csrfMethods.includes(req.method)) {
      // 检查是否需要跳过 CSRF 验证
      if (csrfSkip.length > 0 && matchesPattern(path, csrfSkip)) {
        await next();
        return;
      }
      
      // 获取客户端发送的 CSRF Token
      const headerToken = req.headers.get(csrfHeaderName.toLowerCase());
      const bodyToken = req.body && typeof req.body === 'object' 
        ? (req.body as Record<string, unknown>)[csrfFieldName] as string | undefined
        : undefined;
      const queryToken = req.query[csrfFieldName];
      const clientToken = headerToken || bodyToken || queryToken || '';
      
      // 获取服务器存储的 CSRF Token
      const serverToken = req.getCookie(csrfCookieName) || '';
      
      // 验证 Token
      if (!clientToken || !serverToken || !verifyCSRFToken(clientToken, serverToken)) {
        res.status = 403;
        res.json({ error: 'CSRF token validation failed' });
        return;
      }
    }
    
      // 为需要 CSRF 保护的请求生成并设置 CSRF Token
    if (csrfProtection) {
      const existingToken = req.getCookie(csrfCookieName);
      if (!existingToken) {
        const token = generateCSRFToken();
        res.setCookie(csrfCookieName, token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        });
      }
    }
    
    await next();
  };
}

