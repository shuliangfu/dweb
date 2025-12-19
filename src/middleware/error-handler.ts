/**
 * 统一错误处理中间件
 * 捕获和处理应用程序中的错误，提供统一的错误响应格式
 */

import type { Middleware } from '../types/index.ts';

/**
 * 错误处理选项
 */
export interface ErrorHandlerOptions {
  /**
   * 是否在开发环境中显示详细错误信息（默认 true）
   */
  debug?: boolean;
  
  /**
   * 自定义错误格式化函数
   */
  formatError?: (error: Error, req: { url: string; method: string }) => {
    error: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
  
  /**
   * 错误日志记录函数
   */
  onError?: (error: Error, req: { url: string; method: string }) => void;
  
  /**
   * 默认错误消息（当无法获取错误消息时使用）
   */
  defaultMessage?: string;
  
  /**
   * 是否记录错误堆栈（默认在开发环境中记录）
   */
  logStack?: boolean;
  
  /**
   * 跳过错误处理的路径（支持 glob 模式）
   */
  skip?: string[];
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
 * 获取错误状态码
 */
function getErrorStatusCode(error: Error & { statusCode?: number; status?: number }): number {
  if (error.statusCode) {
    return error.statusCode;
  }
  if (error.status) {
    return error.status;
  }
  
  // 根据错误名称推断状态码
  const errorName = error.name.toLowerCase();
  if (errorName.includes('not found')) {
    return 404;
  }
  if (errorName.includes('unauthorized') || errorName.includes('forbidden')) {
    return 403;
  }
  if (errorName.includes('bad request') || errorName.includes('validation')) {
    return 400;
  }
  
  // 默认 500
  return 500;
}

/**
 * 格式化错误响应
 */
function formatErrorResponse(
  error: Error,
  req: { url: string; method: string },
  options: ErrorHandlerOptions
): {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
} {
  const statusCode = getErrorStatusCode(error);
  const isDebug = options.debug !== false; // 默认 true
  
  const baseResponse = {
    error: error.name || 'Error',
    message: error.message || options.defaultMessage || 'An error occurred',
    statusCode,
  };
  
  // 在调试模式下，添加详细信息
  if (isDebug) {
    return {
      ...baseResponse,
      details: {
        stack: options.logStack !== false ? error.stack : undefined,
        url: req.url,
        method: req.method,
      },
    };
  }
  
  // 生产环境：只返回基本信息，隐藏敏感信息
  if (statusCode >= 500) {
    // 服务器错误：不暴露详细信息
    return {
      ...baseResponse,
      message: 'Internal server error',
    };
  }
  
  return baseResponse;
}

/**
 * 创建错误处理中间件
 * @param options 错误处理选项
 * @returns 中间件函数
 */
export function errorHandler(options: ErrorHandlerOptions = {}): Middleware {
  const {
    debug = true,
    formatError,
    onError,
    defaultMessage = 'An error occurred',
    logStack = true,
    skip = [],
  } = options;
  
  return async (req, res, next) => {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // 检查是否需要跳过错误处理
    if (skip.length > 0 && matchesPattern(path, skip)) {
      await next();
      return;
    }
    
    try {
      await next();
    } catch (error) {
      // 确保错误是 Error 对象
      const err = error instanceof Error ? error : new Error(String(error));
      
      // 记录错误
      if (onError) {
        onError(err, { url: req.url, method: req.method });
      } else {
        // 默认错误日志
        console.error('[Error Handler]', {
          error: err.message,
          stack: logStack ? err.stack : undefined,
          url: req.url,
          method: req.method,
        });
      }
      
      // 格式化错误响应
      const errorResponse = formatError
        ? formatError(err, { url: req.url, method: req.method })
        : formatErrorResponse(err, { url: req.url, method: req.method }, { debug, logStack, defaultMessage });
      
      // 设置响应
      res.status = errorResponse.statusCode;
      res.json(errorResponse);
    }
  };
}

