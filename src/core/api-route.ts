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
 * 查找处理器（支持驼峰和中划线两种格式）
 * 默认优先使用中划线格式（kebab-case），例如 get-user
 * 
 * @param handlers API 路由处理器对象
 * @param methodName 方法名（可能是驼峰或中划线格式）
 * @returns 处理器函数或 null
 */
function findHandler(
  handlers: Record<string, RouteHandler>,
  methodName: string
): RouteHandler | null {
  // 首先尝试直接匹配（可能是中划线或驼峰格式）
  if (handlers[methodName]) {
    return handlers[methodName];
  }
  
  // 如果包含中划线，尝试转换为驼峰格式后匹配（函数名通常是驼峰格式）
  // 例如：get-user -> getUser
  if (methodName.includes('-')) {
    const camelCase = kebabToCamel(methodName);
    if (handlers[camelCase]) {
      return handlers[camelCase];
    }
  }
  
  // 如果是驼峰格式，尝试转换为中划线格式后匹配（支持中划线函数名）
  // 例如：getUser -> get-user
  const kebabCase = methodName.replace(/([A-Z])/g, '-$1').toLowerCase();
  if (kebabCase !== methodName && handlers[kebabCase]) {
    return handlers[kebabCase];
  }
  
  return null;
}

/**
 * 处理方法路由模式的 API 请求
 * 
 * 根据 URL 路径中的方法名查找并执行对应的 API 处理函数。
 * 默认使用中划线格式（kebab-case），例如 /api/users/get-user
 * 同时支持驼峰格式（camelCase），例如 /api/users/getUser
 * 
 * @param handlers - API 路由处理器对象，键为方法名，值为处理函数
 * @param _method - 请求方法（当前未使用，所有请求都使用 POST）
 * @param req - 请求对象
 * @param res - 响应对象（可选）
 * @returns Promise<any> - 处理函数返回的响应数据
 * 
 * @throws {Error} 如果路径格式错误、方法名为空、方法名不安全或未找到对应的处理器
 * 
 * @example
 * ```ts
 * // routes/api/users.ts
 * export function getUser(req: Request) {
 *   return { id: req.query.id, name: "User" };
 * }
 * 
 * // 访问（默认中划线格式）: POST /api/users/get-user?id=123
 * // 也支持驼峰格式: POST /api/users/getUser?id=123
 * ```
 */
export async function handleMethodApiRoute(
  handlers: Record<string, RouteHandler>,
  _method: string,
  req: Request,
  res?: Response
): Promise<any> {
  // 从 URL 路径中获取方法名
  // 默认使用中划线格式（kebab-case），例如 /api/users/get-user
  // 同时支持驼峰格式（camelCase），例如 /api/users/getUser
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(p => p);
  
  // 路径格式必须是：/api/routeName/methodName
  // 默认格式（中划线）：/api/users/get-user
  // 也支持驼峰格式：/api/users/getUser
  // pathParts 应该是 ['api', 'routeName', 'methodName']
  if (pathParts.length < 3) {
    const availableHandlers = Object.keys(handlers).join(', ');
    const { ApiError } = await import('../utils/error.ts');
    throw new ApiError(
      `API 路径格式错误: ${url.pathname}。路径格式应为 /api/routeName/methodName（默认使用中划线格式，例如 /api/users/get-user）`,
      400,
      { availableHandlers, pathname: url.pathname }
    );
  }
  
  // 获取最后一个部分作为方法名
  const methodName = pathParts[pathParts.length - 1];
  
  if (!methodName) {
    const availableHandlers = Object.keys(handlers).join(', ');
    const { ApiError } = await import('../utils/error.ts');
    throw new ApiError(
      `API 方法名不能为空`,
      400,
      { pathname: url.pathname, availableHandlers }
    );
  }
  
  // 安全检查：验证方法名是否安全
  if (!isSafeMethodName(methodName)) {
    const { ApiError } = await import('../utils/error.ts');
    throw new ApiError(
      `API 方法名不安全: ${methodName}`,
      400,
      { methodName }
    );
  }
  
  // 查找对应的处理器（支持驼峰和中划线两种格式，默认使用中划线）
  const handler = findHandler(handlers, methodName);
  
  if (!handler) {
    // 如果没有找到对应的处理器，返回错误
    // 添加调试信息：显示路径部分和可用的处理器
    const availableHandlers = Object.keys(handlers).join(', ');
    const { ApiError } = await import('../utils/error.ts');
    throw new ApiError(
      `未找到 API 方法: ${methodName}`,
      404,
      {
        methodName,
        pathname: url.pathname,
        pathParts: pathParts.join(', '),
        availableHandlers
      }
    );
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
 * - GET /api/users -> index 或 list
 * - GET /api/users/:id -> show 或 get
 * - POST /api/users -> create
 * - PUT /api/users/:id -> update
 * - PATCH /api/users/:id -> update
 * - DELETE /api/users/:id -> destroy 或 delete
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
 * // routes/api/users.ts
 * export function index(req: Request) {
 *   return { users: [...] };
 * }
 * 
 * export function show(req: Request) {
 *   return { user: { id: req.params.id } };
 * }
 * 
 * export function create(req: Request) {
 *   return { success: true };
 * }
 * 
 * // 访问:
 * // GET /api/users -> index
 * // GET /api/users/123 -> show
 * // POST /api/users -> create
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
    const { ApiError } = await import('../utils/error.ts');
    throw new ApiError(
      `RESTful API 路径格式错误: ${url.pathname}。路径格式应为 /api/resource 或 /api/resource/:id`,
      400,
      { pathname: url.pathname }
    );
  }
  
  // 判断是否有 ID 参数（路径长度 >= 3 表示有 ID）
  const hasId = pathParts.length >= 3;
  const httpMethod = method.toUpperCase();
  
  // 根据 HTTP 方法和是否有 ID 来确定处理函数名
  let handlerName: string | null = null;
  
  switch (httpMethod) {
    case 'GET': {
      handlerName = hasId ? 'show' : 'index';
      // 如果 show 不存在，尝试 get
      if (hasId && !handlers[handlerName] && handlers['get']) {
        handlerName = 'get';
      }
      // 如果 index 不存在，尝试 list
      if (!hasId && !handlers[handlerName] && handlers['list']) {
        handlerName = 'list';
      }
      break;
    }
    case 'POST': {
      handlerName = 'create';
      break;
    }
    case 'PUT':
    case 'PATCH': {
      handlerName = 'update';
      break;
    }
    case 'DELETE': {
      handlerName = 'destroy';
      // 如果 destroy 不存在，尝试 delete
      if (!handlers[handlerName] && handlers['delete']) {
        handlerName = 'delete';
      }
      break;
    }
    default: {
      const { ApiError } = await import('../utils/error.ts');
      throw new ApiError(
        `不支持的 HTTP 方法: ${httpMethod}`,
        405,
        { method: httpMethod, pathname: url.pathname }
      );
    }
  }
  
  if (!handlerName) {
    const { ApiError } = await import('../utils/error.ts');
    throw new ApiError(
      `无法确定处理函数`,
      500,
      { method: httpMethod, pathname: url.pathname, hasId }
    );
  }
  
  // 查找对应的处理器
  const handler = handlers[handlerName];
  
  if (!handler) {
    const availableHandlers = Object.keys(handlers).join(', ');
    const { ApiError } = await import('../utils/error.ts');
    throw new ApiError(
      `未找到 RESTful API 处理函数: ${handlerName}`,
      404,
      {
        handlerName,
        method: httpMethod,
        pathname: url.pathname,
        hasId,
        availableHandlers
      }
    );
  }
  
  // 执行处理器
  // 如果处理函数需要 res 参数（参数数量 >= 2），传递 res
  const result = handler.length >= 2 && res ? await handler(req, res) : await handler(req);
  
  return result;
}

/**
 * 处理 API 路由请求（统一入口）
 * 
 * 根据 apiMode 配置选择使用 method 模式或 rest 模式处理请求。
 * 
 * @param handlers - API 路由处理器对象
 * @param method - HTTP 请求方法
 * @param req - 请求对象
 * @param res - 响应对象（可选）
 * @param apiMode - API 路由模式，"method" 或 "rest"，默认为 "method"
 * @returns Promise<any> - 处理函数返回的响应数据
 * 
 * @example
 * ```ts
 * // method 模式（默认使用中划线格式）
 * const result = await handleApiRoute(handlers, "POST", req, res, "method");
 * // 访问: POST /api/users/get-user
 * 
 * // rest 模式
 * const result = await handleApiRoute(handlers, "GET", req, res, "rest");
 * // 访问: GET /api/users
 * ```
 */
export async function handleApiRoute(
  handlers: Record<string, RouteHandler>,
  method: string,
  req: Request,
  res?: Response,
  apiMode: "method" | "rest" = "method"
): Promise<any> {
  if (apiMode === "rest") {
    return await handleRestApiRoute(handlers, method, req, res);
  } else {
    return await handleMethodApiRoute(handlers, method, req, res);
  }
}

