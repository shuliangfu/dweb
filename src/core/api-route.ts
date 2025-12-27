/**
 * API 路由处理模块
 * 支持两种 API 路由模式：
 * 1. method 模式（默认）：通过 URL 路径指定方法名，默认使用中划线格式，例如 /api/users/get-user
 * 2. rest 模式：基于 HTTP 方法和资源路径的 RESTful API，例如 GET /api/users, POST /api/users
 * 
 * @module core/api-route
 */

import type { Request, Response, RouteHandler } from '../types/index.ts';
import { isSafeMethodName } from '../utils/security.ts';

/**
 * 加载 API 路由模块
 * 
 * 从指定文件路径加载 API 路由模块，返回所有导出的路由处理函数。
 * 
 * @param filePath - API 路由文件路径（相对路径或绝对路径）
 * @returns Promise<Record<string, RouteHandler>> - API 路由处理函数对象
 * 
 * @throws {Error} 如果文件加载失败或路径无效
 * 
 * @example
 * ```ts
 * import { loadApiRoute } from "@dreamer/dweb";
 * 
 * const handlers = await loadApiRoute("routes/api/users.ts");
 * // handlers = { getUser: Function, createUser: Function, ... }
 * ```
 */
export async function loadApiRoute(filePath: string): Promise<Record<string, RouteHandler>> {
  try {
    // 将文件路径转换为绝对路径
    // filePath 可能是相对路径（如 routes/api/test.ts）或绝对路径
    let modulePath: string;
    if (filePath.startsWith("file://")) {
      modulePath = filePath;
    } else if (filePath.startsWith("/")) {
      // 绝对路径，直接添加 file:// 前缀
      modulePath = `file://${filePath}`;
    } else {
      // 相对路径，需要拼接当前工作目录
      modulePath = `file://${Deno.cwd()}/${filePath}`;
    }
    const module = await import(modulePath);
    
    // 获取所有导出函数（排除默认导出）
    const handlers: Record<string, RouteHandler> = {};
    
    for (const [key, value] of Object.entries(module)) {
      // 跳过默认导出和特殊导出
      if (key === 'default' || key.startsWith('_')) {
        continue;
      }
      
      // 只导出函数
      if (typeof value === 'function') {
        handlers[key] = value as RouteHandler;
      }
    }
    
    return handlers;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`加载 API 路由失败: ${filePath}, ${message}`);
  }
}

import { kebabToCamel } from "../utils/string.ts";

/**
 * 检查字符串是否为驼峰格式（包含大写字母）
 * 
 * @param str - 要检查的字符串
 * @returns 如果是驼峰格式返回 true，否则返回 false
 */
function isCamelCase(str: string): boolean {
  return /[A-Z]/.test(str);
}

/**
 * 查找处理器（只支持中划线格式 URL，函数名可以是驼峰格式）
 * URL 必须使用中划线格式（kebab-case），例如 get-user
 * 函数名可以是驼峰格式（camelCase），例如 getUser
 * 
 * @param handlers API 路由处理器对象
 * @param methodName 方法名（必须是中划线格式）
 * @returns 处理器函数或 null
 */
function findHandler(
  handlers: Record<string, RouteHandler>,
  methodName: string
): RouteHandler | null {
  // 首先尝试直接匹配（支持中划线格式的函数名）
  if (handlers[methodName]) {
    return handlers[methodName];
  }
  
  // 如果 URL 是中划线格式，转换为驼峰格式后匹配（函数名通常是驼峰格式）
  // 例如：get-user -> getUser
  if (methodName.includes('-')) {
    const camelCase = kebabToCamel(methodName);
    if (handlers[camelCase]) {
      return handlers[camelCase];
    }
  }
  
  return null;
}

/**
 * 返回错误响应给客户端（如果 res 存在）
 * 
 * @param res - 响应对象（可选）
 * @param statusCode - HTTP 状态码
 * @param errorMessage - 错误消息
 * @param errorDetails - 错误详情（可选）
 * @returns 如果 res 存在，返回 null（已设置响应）；否则返回错误对象
 */
function returnErrorResponse(
  res: Response | undefined,
  statusCode: number,
  errorMessage: string,
  errorDetails?: Record<string, unknown>
): null | { success: false; error: string; details?: Record<string, unknown> } {
  if (res) {
    // 如果 res 存在，直接设置响应并返回 null
    res.status = statusCode;
    res.json({
      success: false,
      error: errorMessage,
      ...(errorDetails && { details: errorDetails }),
    });
    return null;
  }
  // 如果 res 不存在，返回错误对象（让调用者处理）
  return {
    success: false,
    error: errorMessage,
    ...(errorDetails && { details: errorDetails }),
  };
}

/**
 * 处理方法路由模式的 API 请求
 * 
 * 根据 URL 路径中的方法名查找并执行对应的 API 处理函数。
 * URL 必须使用中划线格式（kebab-case），例如 /api/users/get-user
 * 函数名可以是驼峰格式（camelCase），例如 getUser
 * 
 * @param handlers - API 路由处理器对象，键为方法名，值为处理函数
 * @param _method - 请求方法（当前未使用，所有请求都使用 POST）
 * @param req - 请求对象
 * @param res - 响应对象（可选）
 * @returns Promise<any> - 处理函数返回的响应数据，如果发生错误且 res 存在则返回 null
 * 
 * @example
 * ```ts
 * // routes/api/users.ts
 * export function getUser(req: Request) {
 *   return { id: req.query.id, name: "User" };
 * }
 * 
 * // 访问（必须使用中划线格式）: POST /api/users/get-user?id=123
 * // 不允许驼峰格式: POST /api/users/getUser (会返回 400 错误)
 * ```
 */
export async function handleMethodApiRoute(
  handlers: Record<string, RouteHandler>,
  _method: string,
  req: Request,
  res?: Response
): Promise<any> {
  // 从 URL 路径中获取方法名
  // URL 必须使用中划线格式（kebab-case），例如 /api/users/get-user
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(p => p);
  
  // 路径格式必须是：/api/routeName/methodName
  // 必须使用中划线格式：/api/users/get-user
  // pathParts 应该是 ['api', 'routeName', 'methodName']
  if (pathParts.length < 3) {
    const availableHandlers = Object.keys(handlers).join(', ');
    const errorResponse = returnErrorResponse(
      res,
      400,
      `API 路径格式错误: ${url.pathname}。路径格式应为 /api/routeName/methodName（必须使用中划线格式，例如 /api/users/get-user）`,
      { availableHandlers, pathname: url.pathname }
    );
    if (errorResponse === null) {
      return null; // 响应已设置，直接返回
    }
    // 如果 res 不存在，抛出错误（向后兼容）
    const { ApiError } = await import('../utils/error.ts');
    throw new ApiError(errorResponse.error, 400, errorResponse.details);
  }
  
  // 获取最后一个部分作为方法名
  const methodName = pathParts[pathParts.length - 1];
  
  if (!methodName) {
    const availableHandlers = Object.keys(handlers).join(', ');
    const errorResponse = returnErrorResponse(
      res,
      400,
      `API 方法名不能为空`,
      { pathname: url.pathname, availableHandlers }
    );
    if (errorResponse === null) {
      return null; // 响应已设置，直接返回
    }
    // 如果 res 不存在，抛出错误（向后兼容）
    const { ApiError } = await import('../utils/error.ts');
    throw new ApiError(errorResponse.error, 400, errorResponse.details);
  }
  
  // 检查方法名是否使用了驼峰格式（不允许）
  if (isCamelCase(methodName)) {
    const kebabCase = methodName.replace(/([A-Z])/g, '-$1').toLowerCase();
    const errorResponse = returnErrorResponse(
      res,
      400,
      `API 方法名必须使用中划线格式（kebab-case），不允许使用驼峰格式（camelCase）。请使用 /api/${pathParts.slice(1, -1).join('/')}/${kebabCase} 替代 ${url.pathname}`,
      { 
        methodName,
        suggestedPath: `/api/${pathParts.slice(1, -1).join('/')}/${kebabCase}`,
        pathname: url.pathname
      }
    );
    if (errorResponse === null) {
      return null; // 响应已设置，直接返回
    }
    // 如果 res 不存在，抛出错误（向后兼容）
    const { ApiError } = await import('../utils/error.ts');
    throw new ApiError(errorResponse.error, 400, errorResponse.details);
  }
  
  // 安全检查：验证方法名是否安全
  if (!isSafeMethodName(methodName)) {
    const errorResponse = returnErrorResponse(
      res,
      400,
      `API 方法名不安全: ${methodName}`,
      { methodName }
    );
    if (errorResponse === null) {
      return null; // 响应已设置，直接返回
    }
    // 如果 res 不存在，抛出错误（向后兼容）
    const { ApiError } = await import('../utils/error.ts');
    throw new ApiError(errorResponse.error, 400, errorResponse.details);
  }
  
  // 查找对应的处理器（URL 必须是中划线格式，函数名可以是驼峰格式）
  const handler = findHandler(handlers, methodName);
  
  if (!handler) {
    // 如果没有找到对应的处理器，返回错误
    // 添加调试信息：显示路径部分和可用的处理器
    const availableHandlers = Object.keys(handlers).join(', ');
    const errorResponse = returnErrorResponse(
      res,
      404,
      `未找到 API 方法: ${methodName}`,
      {
        methodName,
        pathname: url.pathname,
        pathParts: pathParts.join(', '),
        availableHandlers
      }
    );
    if (errorResponse === null) {
      return null; // 响应已设置，直接返回
    }
    // 如果 res 不存在，抛出错误（向后兼容）
    const { ApiError } = await import('../utils/error.ts');
    throw new ApiError(errorResponse.error, 404, errorResponse.details);
  }
  
  // 执行处理器
  // 如果处理函数需要 res 参数（参数数量 >= 2），传递 res
  const result = handler.length >= 2 && res ? await handler(req, res) : await handler(req);
  
  return result;
}

/**
 * 处理 RESTful 模式的 API 请求
 * 
 * 根据 HTTP 方法和资源路径映射到对应的处理函数：
 * 
 * 支持两种命名方式：
 * 1. 直接使用 HTTP 方法名（推荐）：
 *    - GET /api/users -> GET
 *    - GET /api/users/:id -> GET_ID
 *    - POST /api/users -> POST
 *    - PUT /api/users/:id -> PUT_ID
 *    - PATCH /api/users/:id -> PATCH_ID
 *    - DELETE /api/users/:id -> DELETE_ID
 * 
 * 2. 标准 RESTful 命名（备选）：
 *    - GET /api/users -> index 或 list
 *    - GET /api/users/:id -> show 或 get
 *    - POST /api/users -> create
 *    - PUT /api/users/:id -> update
 *    - PATCH /api/users/:id -> update
 *    - DELETE /api/users/:id -> destroy 或 delete
 * 
 * @param handlers - API 路由处理器对象，键为方法名，值为处理函数
 * @param method - HTTP 请求方法（GET, POST, PUT, PATCH, DELETE）
 * @param req - 请求对象
 * @param res - 响应对象（可选）
 * @returns Promise<any> - 处理函数返回的响应数据
 * 
 * @throws {Error} 如果路径格式错误或未找到对应的处理器
 * 
 * @example
 * ```ts
 * // 方式 1：直接使用 HTTP 方法名（推荐）
 * // routes/api/users.ts
 * export function GET(req: Request) {
 *   return { users: [...] };
 * }
 * 
 * export function GET_ID(req: Request) {
 *   return { user: { id: req.params.id } };
 * }
 * 
 * export function POST(req: Request) {
 *   return { success: true };
 * }
 * 
 * // 访问:
 * // GET /api/users -> GET
 * // GET /api/users/123 -> GET_ID
 * // POST /api/users -> POST
 * 
 * // 方式 2：使用标准 RESTful 命名
 * export function index(req: Request) {
 *   return { users: [...] };
 * }
 * 
 * export function show(req: Request) {
 *   return { user: { id: req.params.id } };
 * }
 * 
 * // 访问:
 * // GET /api/users -> index
 * // GET /api/users/123 -> show
 * ```
 */
export async function handleRestApiRoute(
  handlers: Record<string, RouteHandler>,
  method: string,
  req: Request,
  res?: Response
): Promise<any> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(p => p);
  
  // RESTful 路径格式：/api/resource 或 /api/resource/:id
  // pathParts 应该是 ['api', 'resource'] 或 ['api', 'resource', 'id']
  if (pathParts.length < 2 || pathParts[0] !== 'api') {
    const errorResponse = returnErrorResponse(
      res,
      400,
      `RESTful API 路径格式错误: ${url.pathname}。路径格式应为 /api/resource 或 /api/resource/:id`,
      { pathname: url.pathname }
    );
    if (errorResponse === null) {
      return null; // 响应已设置，直接返回
    }
    // 如果 res 不存在，抛出错误（向后兼容）
    const { ApiError } = await import('../utils/error.ts');
    throw new ApiError(errorResponse.error, 400, errorResponse.details);
  }
  
  // 判断是否有 ID 参数（路径长度 >= 3 表示有 ID）
  const hasId = pathParts.length >= 3;
  const httpMethod = method.toUpperCase();
  
  // 根据 HTTP 方法和是否有 ID 来确定处理函数名
  let handlerName: string | null = null;
  
  switch (httpMethod) {
    case 'GET': {
      // 优先尝试直接使用 HTTP 方法名（如果路径有 ID，尝试 GET_ID）
      if (hasId && handlers['GET_ID']) {
        handlerName = 'GET_ID';
      } else if (!hasId && handlers['GET']) {
        handlerName = 'GET';
      } else {
        // 回退到标准 RESTful 命名
        handlerName = hasId ? 'show' : 'index';
        // 如果 show 不存在，尝试 get
        if (hasId && !handlers[handlerName] && handlers['get']) {
          handlerName = 'get';
        }
        // 如果 index 不存在，尝试 list
        if (!hasId && !handlers[handlerName] && handlers['list']) {
          handlerName = 'list';
        }
      }
      break;
    }
    case 'POST': {
      // 优先尝试直接使用 HTTP 方法名
      if (handlers['POST']) {
        handlerName = 'POST';
      } else {
        // 回退到标准 RESTful 命名
        handlerName = 'create';
      }
      break;
    }
    case 'PUT':
    case 'PATCH': {
      // 优先尝试直接使用 HTTP 方法名（如果路径有 ID，尝试 PUT_ID 或 PATCH_ID）
      const methodName = hasId ? `${httpMethod}_ID` : httpMethod;
      if (handlers[methodName]) {
        handlerName = methodName;
      } else {
        // 回退到标准 RESTful 命名
        handlerName = 'update';
      }
      break;
    }
    case 'DELETE': {
      // 优先尝试直接使用 HTTP 方法名（如果路径有 ID，尝试 DELETE_ID）
      if (hasId && handlers['DELETE_ID']) {
        handlerName = 'DELETE_ID';
      } else if (handlers['DELETE']) {
        handlerName = 'DELETE';
      } else {
        // 回退到标准 RESTful 命名
        handlerName = 'destroy';
        // 如果 destroy 不存在，尝试 delete
        if (!handlers[handlerName] && handlers['delete']) {
          handlerName = 'delete';
        }
      }
      break;
    }
    default: {
      const errorResponse = returnErrorResponse(
        res,
        405,
        `不支持的 HTTP 方法: ${httpMethod}`,
        { method: httpMethod, pathname: url.pathname }
      );
      if (errorResponse === null) {
        return null; // 响应已设置，直接返回
      }
      // 如果 res 不存在，抛出错误（向后兼容）
      const { ApiError } = await import('../utils/error.ts');
      throw new ApiError(errorResponse.error, 405, errorResponse.details);
    }
  }
  
  if (!handlerName) {
    const errorResponse = returnErrorResponse(
      res,
      500,
      `无法确定处理函数`,
      { method: httpMethod, pathname: url.pathname, hasId }
    );
    if (errorResponse === null) {
      return null; // 响应已设置，直接返回
    }
    // 如果 res 不存在，抛出错误（向后兼容）
    const { ApiError } = await import('../utils/error.ts');
    throw new ApiError(errorResponse.error, 500, errorResponse.details);
  }
  
  // 查找对应的处理器
  const handler = handlers[handlerName];
  
  if (!handler) {
    const availableHandlers = Object.keys(handlers).join(', ');
    const errorResponse = returnErrorResponse(
      res,
      404,
      `未找到 RESTful API 处理函数: ${handlerName}`,
      {
        handlerName,
        method: httpMethod,
        pathname: url.pathname,
        hasId,
        availableHandlers
      }
    );
    if (errorResponse === null) {
      return null; // 响应已设置，直接返回
    }
    // 如果 res 不存在，抛出错误（向后兼容）
    const { ApiError } = await import('../utils/error.ts');
    throw new ApiError(errorResponse.error, 404, errorResponse.details);
  }
  
  // 执行处理器
  // 如果处理函数需要 res 参数（参数数量 >= 2），传递 res
  const result = handler.length >= 2 && res ? await handler(req, res) : await handler(req);
  
  return result;
}

/**
 * 处理 API 路由请求（统一入口）
 * 
 * 根据 apiMode 配置选择使用 method 模式或 restful 模式处理请求。
 * method 模式下，URL 必须使用中划线格式（kebab-case）。
 * 
 * @param handlers - API 路由处理器对象
 * @param method - HTTP 请求方法
 * @param req - 请求对象
 * @param res - 响应对象（可选）
 * @param apiMode - API 路由模式，"method" 或 "restful"，默认为 "method"
 * @returns Promise<any> - 处理函数返回的响应数据
 * 
 * @example
 * ```ts
 * // method 模式（必须使用中划线格式）
 * const result = await handleApiRoute(handlers, "POST", req, res, "method");
 * // 访问: POST /api/users/get-user（正确）
 * // 不允许: POST /api/users/getUser（会返回 400 错误）
 * 
 * // restful 模式
 * const result = await handleApiRoute(handlers, "GET", req, res, "restful");
 * // 访问: GET /api/users
 * ```
 */
export async function handleApiRoute(
  handlers: Record<string, RouteHandler>,
  method: string,
  req: Request,
  res?: Response,
  apiMode: "method" | "restful" = "method"
): Promise<any> {
  if (apiMode === "restful") {
    return await handleRestApiRoute(handlers, method, req, res);
  } else {
    return await handleMethodApiRoute(handlers, method, req, res);
  }
}

