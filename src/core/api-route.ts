/**
 * API 路由处理模块
 * 处理 API 路由（通过 URL 路径指定方法名）
 */

import type { Request, RouteHandler } from '../types/index.ts';
import { isSafeMethodName } from '../utils/security.ts';

/**
 * 加载 API 路由模块
 * @param filePath 文件路径
 * @returns API 路由导出对象
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
 * 查找处理器（支持驼峰和短横线两种格式）
 * @param handlers API 路由处理器对象
 * @param methodName 方法名（可能是驼峰或短横线格式）
 * @returns 处理器函数或 null
 */
function findHandler(
  handlers: Record<string, RouteHandler>,
  methodName: string
): RouteHandler | null {
  // 首先尝试直接匹配（驼峰格式）
  if (handlers[methodName]) {
    return handlers[methodName];
  }
  
  // 如果包含短横线，尝试转换为驼峰格式后匹配
  if (methodName.includes('-')) {
    const camelCase = kebabToCamel(methodName);
    if (handlers[camelCase]) {
      return handlers[camelCase];
    }
  }
  
  // 如果已经是驼峰格式，尝试转换为短横线格式后匹配（反向转换）
  // 例如：getExamples -> get-examples
  const kebabCase = methodName.replace(/([A-Z])/g, '-$1').toLowerCase();
  if (kebabCase !== methodName && handlers[kebabCase]) {
    return handlers[kebabCase];
  }
  
  return null;
}

/**
 * 处理 API 路由请求
 * @param handlers API 路由处理器对象
 * @param method 请求方法（所有请求都使用 POST）
 * @param req 请求对象
 * @returns 响应数据
 */
export async function handleApiRoute(
  handlers: Record<string, RouteHandler>,
  _method: string,
  req: Request
): Promise<any> {
  // 从 URL 路径中获取方法名
  // 支持两种格式：
  // - 驼峰格式：/api/examples/getExamples
  // - 短横线格式：/api/examples/get-examples
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(p => p);
  
  // 路径格式必须是：/api/routeName/methodName
  // 例如：/api/examples/getExamples 或 /api/examples/get-examples
  // pathParts 应该是 ['api', 'routeName', 'methodName']
  if (pathParts.length < 3) {
    const availableHandlers = Object.keys(handlers).join(', ');
    throw new Error(`API 路径格式错误: ${url.pathname}。路径格式应为 /api/routeName/methodName，可用处理器: [${availableHandlers}]`);
  }
  
  // 获取最后一个部分作为方法名
  const methodName = pathParts[pathParts.length - 1];
  
  if (!methodName) {
    const availableHandlers = Object.keys(handlers).join(', ');
    throw new Error(`API 方法名不能为空。路径: ${url.pathname}，可用处理器: [${availableHandlers}]`);
  }
  
  // 安全检查：验证方法名是否安全
  if (!isSafeMethodName(methodName)) {
    throw new Error(`API 方法名不安全: ${methodName}`);
  }
  
  // 查找对应的处理器（支持驼峰和短横线两种格式）
  const handler = findHandler(handlers, methodName);
  
  if (!handler) {
    // 如果没有找到对应的处理器，返回错误
    // 添加调试信息：显示路径部分和可用的处理器
    const availableHandlers = Object.keys(handlers).join(', ');
    throw new Error(`未找到 API 方法: ${methodName}。路径: ${url.pathname}，路径部分: [${pathParts.join(', ')}]，可用处理器: [${availableHandlers}]`);
  }
  
  // 执行处理器
  const result = await handler(req);
  
  return result;
}

