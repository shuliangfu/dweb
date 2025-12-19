/**
 * 错误处理工具模块
 * 提供统一的错误类型和错误处理函数
 * 
 * @module utils/error
 */

/**
 * 框架错误基类
 * 所有框架相关的错误都应该继承此类
 */
export class DWebError extends Error {
  /** 错误代码 */
  public readonly code: string;
  /** HTTP 状态码 */
  public readonly statusCode: number;
  /** 错误详情 */
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'DWEB_ERROR',
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DWebError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    // 确保错误堆栈正确
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DWebError);
    }
  }
}

/**
 * 配置错误
 * 用于配置相关的错误
 */
export class ConfigError extends DWebError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', 500, details);
    this.name = 'ConfigError';
  }
}

/**
 * 路由错误
 * 用于路由相关的错误
 */
export class RouteError extends DWebError {
  constructor(message: string, statusCode: number = 404, details?: Record<string, unknown>) {
    super(message, 'ROUTE_ERROR', statusCode, details);
    this.name = 'RouteError';
  }
}

/**
 * 渲染错误
 * 用于渲染相关的错误
 */
export class RenderError extends DWebError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'RENDER_ERROR', 500, details);
    this.name = 'RenderError';
  }
}

/**
 * API 错误
 * 用于 API 路由相关的错误
 */
export class ApiError extends DWebError {
  constructor(message: string, statusCode: number = 400, details?: Record<string, unknown>) {
    super(message, 'API_ERROR', statusCode, details);
    this.name = 'ApiError';
  }
}

/**
 * 构建错误
 * 用于构建相关的错误
 */
export class BuildError extends DWebError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'BUILD_ERROR', 500, details);
    this.name = 'BuildError';
  }
}

/**
 * 格式化错误信息
 * 将错误对象格式化为可读的字符串
 * 
 * @param error 错误对象
 * @param includeStack 是否包含堆栈信息
 * @returns 格式化后的错误信息
 */
export function formatError(error: unknown, includeStack: boolean = false): string {
  if (error instanceof DWebError) {
    let message = `${error.name} [${error.code}]: ${error.message}`;
    if (error.details && Object.keys(error.details).length > 0) {
      message += `\n详情: ${JSON.stringify(error.details, null, 2)}`;
    }
    if (includeStack && error.stack) {
      message += `\n堆栈:\n${error.stack}`;
    }
    return message;
  }
  
  if (error instanceof Error) {
    let message = `${error.name}: ${error.message}`;
    if (error.cause) {
      message += `\n原因: ${error.cause}`;
    }
    if (includeStack && error.stack) {
      message += `\n堆栈:\n${error.stack}`;
    }
    return message;
  }
  
  return String(error);
}

/**
 * 记录错误到控制台
 * 提供统一的错误日志格式
 * 
 * @param error 错误对象
 * @param context 错误上下文信息
 */
export function logError(
  error: unknown,
  context?: {
    request?: { url?: string; method?: string };
    route?: { path?: string; filePath?: string; type?: string };
    [key: string]: unknown;
  }
): void {
  // 使用统一的日志系统
  const logger = getLogger();
  
  // 构建错误上下文数据
  const errorData: Record<string, unknown> = {};
  
  if (context) {
    if (context.request) {
      errorData.requestUrl = context.request.url || 'N/A';
      errorData.requestMethod = context.request.method || 'N/A';
    }
    if (context.route) {
      errorData.routePath = context.route.path || 'N/A';
      errorData.routeFile = context.route.filePath || 'N/A';
      errorData.routeType = context.route.type || 'N/A';
    }
    // 添加其他上下文信息
    for (const [key, value] of Object.entries(context)) {
      if (key !== 'request' && key !== 'route' && value !== undefined) {
        errorData[key] = value;
      }
    }
  }
  
  // 构建错误消息
  let errorMessage = '发生错误';
  let errorObj: Error | undefined;
  
  if (error instanceof DWebError) {
    errorMessage = `[${error.code}] ${error.message}`;
    errorObj = error;
    errorData.errorType = error.name;
    errorData.errorCode = error.code;
    errorData.statusCode = error.statusCode;
    if (error.details && Object.keys(error.details).length > 0) {
      errorData.errorDetails = error.details;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorObj = error;
    errorData.errorType = error.name;
    if (error.cause) {
      errorData.errorCause = error.cause;
    }
  } else {
    errorMessage = String(error);
    errorData.errorContent = error;
  }
  
  // 使用日志系统记录错误
  logger.error(errorMessage, errorObj, errorData);
}

/**
 * 获取错误的 HTTP 状态码
 * 
 * @param error 错误对象
 * @returns HTTP 状态码
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof DWebError) {
    return error.statusCode;
  }
  if (error instanceof Error && 'statusCode' in error) {
    return (error as { statusCode: number }).statusCode;
  }
  return 500;
}

/**
 * 获取错误消息
 * 
 * @param error 错误对象
 * @returns 错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

