/**
 * 示例 API 路由
 * 通过 URL 路径指定方法名，支持驼峰格式和短横线格式
 * 例如：POST /api/test/getUser 或 POST /api/test/get-user
 */

import type { Request } from '@dreamer/dweb';

/**
 * 测试方法
 * 访问方式：POST /api/test/test
 */
export function test(req: Request) {
  return {
    success: true,
    message: 'API 测试成功',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  };
}

/**
 * 获取用户信息
 * 访问方式：POST /api/test/getUser?id=123 或 POST /api/test/get-user?id=123
 */
export function getUser(req: Request) {
  const userId = req.query.id || '1';
  
  return {
    success: true,
    data: {
      id: userId,
      name: '测试用户',
      email: 'test@example.com',
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * 创建数据
 * 访问方式：POST /api/test/createData 或 POST /api/test/create-data
 */
export function createData(req: Request) {
  const body = req.body as { name?: string; description?: string };
  
  return {
    success: true,
    message: '创建成功',
    data: {
      id: Date.now(),
      name: body?.name || '未命名',
      description: body?.description || '',
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * 获取示例数据列表
 * 访问方式：POST /api/test/getData 或 POST /api/test/get-data
 */
export function getData(_req: Request) {
  return {
    success: true,
    message: '获取数据成功',
    data: [
      {
        id: 1,
        name: '示例项目 1',
        description: '这是第一个示例项目，展示了如何使用 DWeb 框架构建 Web 应用',
        createdAt: new Date(Date.now() - 86400000).toISOString() // 1天前
      },
      {
        id: 2,
        name: '示例项目 2',
        description: '这是第二个示例项目，演示了 API 接口的调用和数据展示',
        createdAt: new Date(Date.now() - 43200000).toISOString() // 12小时前
      },
      {
        id: 3,
        name: '示例项目 3',
        description: '这是第三个示例项目，展示了前端交互和状态管理的实现',
        createdAt: new Date().toISOString() // 现在
      }
    ],
    timestamp: new Date().toISOString()
  };
}
