/**
 * 示例 API 路由
 * 用于演示各种接口请求
 * 所有请求默认使用 POST 方法
 * 通过 URL 路径指定方法名，必须使用中划线格式（kebab-case）
 * 例如：/api/examples/get-examples
 *
 * ⚠️ 注意：URL 必须使用中划线格式，不允许使用驼峰格式
 * - ✅ 正确：/api/examples/get-examples
 * - ❌ 错误：/api/examples/getExamples（会返回 400 错误）
 */

import type { Request } from "@dreamer/dweb";

/**
 * 获取示例数据列表
 * 访问方式：POST /api/examples/get-examples
 */
export function getExamples(_req: Request) {
  return {
    success: true,
    data: [
      { id: 1, name: "示例 1", description: "这是第一个示例" },
      { id: 2, name: "示例 2", description: "这是第二个示例" },
      { id: 3, name: "示例 3", description: "这是第三个示例" },
    ],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 创建示例数据
 * 访问方式：POST /api/examples/create-example
 */
export function createExample(req: Request) {
  const body = req.body as { name?: string; description?: string };

  if (!body || !body.name) {
    throw new Error("名称不能为空");
  }

  return {
    success: true,
    message: "创建成功",
    data: {
      id: Date.now(),
      name: body.name,
      description: body.description || "",
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * 更新示例数据
 * 访问方式：POST /api/examples/update-example
 */
export function updateExample(req: Request) {
  const body = req.body as { id?: string; name?: string; description?: string };
  const id = req.params.id || body.id;

  if (!id) {
    throw new Error("ID 不能为空");
  }

  return {
    success: true,
    message: "更新成功",
    data: {
      id,
      name: body.name || "更新后的名称",
      description: body.description || "更新后的描述",
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * 删除示例数据
 * 访问方式：POST /api/examples/delete-example
 */
export function deleteExample(req: Request) {
  const id = req.params.id || req.query.id;

  if (!id) {
    throw new Error("ID 不能为空");
  }

  return {
    success: true,
    message: "删除成功",
    deletedId: id,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 模拟延迟响应（用于演示加载状态）
 * 访问方式：POST /api/examples/delayed-response?delay=2000
 */
export async function delayedResponse(req: Request) {
  const delay = parseInt(req.query.delay || "2000", 10);

  await new Promise((resolve) => setTimeout(resolve, delay));

  return {
    success: true,
    message: `延迟 ${delay}ms 后返回`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取计数器值
 * 访问方式：POST /api/examples/get-counter
 */
export function getCounter(_req: Request) {
  return {
    value: Math.floor(Math.random() * 100),
    timestamp: new Date().toISOString(),
  };
}

/**
 * 增加计数器
 * 访问方式：POST /api/examples/increment-counter
 */
export function incrementCounter(req: Request) {
  const body = req.body as { value?: number };
  const currentValue = body.value || 0;

  return {
    success: true,
    value: currentValue + 1,
    timestamp: new Date().toISOString(),
  };
}
