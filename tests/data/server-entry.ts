/**
 * 测试用服务端入口文件
 * 用于构建测试的输入
 */

// 模拟服务端入口
console.log("Server started");

/**
 * 处理请求的函数
 * @param req - 请求对象
 * @returns 响应对象
 */
export function handleRequest(req: Request): Response {
  const url = new URL(req.url);
  return new Response(`Hello from ${url.pathname}`);
}

/**
 * 服务器配置
 */
export const config = {
  port: 3000,
  host: "localhost",
};

// 默认导出
export default {
  handleRequest,
  config,
};
