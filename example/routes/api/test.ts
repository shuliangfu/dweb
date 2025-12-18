/**
 * 测试 API 路由
 * 通过 URL 路径指定方法名
 */

import type { Request } from '@dreamer/dweb';

/**
 * 测试方法
 */
export function test(req: Request) {
  return {
    message: 'API 测试成功',
    method: req.method,
    url: req.url,
    query: req.query,
    timestamp: new Date().toISOString()
  };
}

/**
 * 获取用户信息
 */
export function getUser(req: Request) {
  const userId = req.query.id || req.params.id || '1';
  
  return {
    id: userId,
    name: '测试用户',
    email: 'test@example.com',
    createdAt: new Date().toISOString()
  };
}

/**
 * 登录方法
 */
export async function login(req: Request) {
  const body = req.body as { username?: string; password?: string };
  
  if (!body || !body.username || !body.password) {
    throw new Error('用户名和密码不能为空');
  }
  
  // 创建 Session
  if (req.createSession) {
    const session = await req.createSession({
      userId: '123',
      username: body.username,
      loginTime: new Date().toISOString()
    });
    
    return {
      success: true,
      message: '登录成功',
      sessionId: session.id
    };
  }
  
  return {
    success: true,
    message: '登录成功（Session 未启用）'
  };
}

/**
 * 登出方法
 */
export async function logout(req: Request) {
  if (req.session && req.session.destroy) {
    await req.session.destroy();
  }
  
  return {
    success: true,
    message: '登出成功'
  };
}

