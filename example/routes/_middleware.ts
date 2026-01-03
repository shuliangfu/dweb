/**
 * 路由中间件
 * 这个中间件会应用到所有路由请求
 *
 * 支持三种导出方式：
 * 1. 默认导出单个中间件函数
 * 2. 默认导出中间件配置对象（MiddlewareConfig）
 * 3. 默认导出中间件数组（多个中间件按顺序执行，支持函数和配置对象混合）
 */

// import testMiddleware1 from "../middleware/test-1.ts";
// import testMiddleware2 from "../middleware/test-2.ts";
import type { MiddlewareConfig } from "@dreamer/dweb";

/**
 * 方式 1：导出中间件函数（简单形式）
 * 这个中间件会记录所有请求的日志，并在响应头中添加自定义头
 */
// const routeMiddleware: Middleware = async (req, res, next, app) => {
//   // 请求处理前的逻辑
//   const startTime = Date.now();
//   const url = new URL(req.url);

//   // 记录请求信息
//   console.log(`[路由中间件] ${req.method} ${url.pathname} - 开始处理`);

//   // 添加自定义响应头
//   res.setHeader('X-Route-Middleware', 'processed');
//   res.setHeader('X-Request-Time', new Date().toISOString());

//   // 调用下一个中间件或路由处理器
//   await next();

//   // 请求处理后的逻辑
//   const duration = Date.now() - startTime;
//   console.log(`[路由中间件] ${req.method} ${url.pathname} - 处理完成 (${duration}ms)`);

//   // 添加处理时间到响应头
//   res.setHeader('X-Processing-Time', `${duration}ms`);
// };

/**
 * 方式 2：导出中间件配置对象（MiddlewareConfig 形式）
 * 这种方式可以给中间件命名，并传递配置选项
 *
 * 注意：handler 函数的签名是 (req, res, next, app)
 * - req: 请求对象
 * - res: 响应对象
 * - next: 下一个中间件或路由处理器的函数
 * - app: 应用上下文对象（AppLike），可以访问应用配置、服务等
 */
const routeMiddleware: MiddlewareConfig = {
  name: "route-middleware",
  options: {},
  handler: async (req, res, next, _app) => {
    // ============================================
    // 【请求处理前】- next() 之前的代码
    // ============================================
    // 这部分代码会在请求处理之前执行
    // 执行顺序：从上到下，在调用 next() 之前
    //
    // 适用场景：
    // - 记录请求开始时间
    // - 验证请求权限
    // - 修改请求对象
    // - 设置响应头（在响应发送前）
    // - 日志记录
    // ============================================

    const startTime = Date.now();
    const url = new URL(req.url);

    // 记录请求信息（请求开始）
    console.log(`[路由中间件] ${req.method} ${url.pathname} - 开始处理`);

    // 可以使用 app 对象访问应用配置和服务
    // 例如：const config = app.getConfig?.();
    // 例如：const logger = app.getService?.('logger');

    // 添加自定义响应头（在响应发送前设置）
    res.setHeader("X-Route-Middleware", "processed");
    res.setHeader("X-Request-Time", new Date().toISOString());

    // ============================================
    // 【关键点】调用 next() 方法
    // ============================================
    // next() 会暂停当前中间件的执行，转而去执行：
    // 1. 下一个中间件（如果还有）
    // 2. 或者路由处理器（如果所有中间件都执行完了）
    //
    // 执行流程：
    // - 调用 next() → 执行下一个中间件/路由处理器
    // - 下一个中间件/路由处理器执行完成后
    // - 控制权返回到当前中间件
    // - 继续执行 next() 后面的代码
    // ============================================
    await next();

    // ============================================
    // 【请求处理后】- next() 之后的代码
    // ============================================
    // 这部分代码会在请求处理完成后执行
    // 执行顺序：从下到上（后进先出），在所有后续中间件和路由处理器完成后
    //
    // 适用场景：
    // - 计算处理时间
    // - 记录响应日志
    // - 修改响应内容（在响应发送前）
    // - 清理资源
    // - 统计信息
    //
    // 注意：此时响应可能已经生成，但还没有发送给客户端
    // 可以修改响应头，但修改响应体可能无效（取决于响应是否已发送）
    // ============================================

    const duration = Date.now() - startTime;
    console.log(
      `[路由中间件] ${req.method} ${url.pathname} - 处理完成 (${duration}ms)`,
    );

    // 添加处理时间到响应头（在响应发送前）
    res.setHeader("X-Processing-Time", `${duration}ms`);
  },
};

/**
 * 方式 3：导出中间件数组
 * 中间件会按数组顺序执行，支持函数和配置对象混合使用：
 * 1. testMiddleware1 - 记录请求信息（函数形式）
 * 2. testMiddleware2 - 添加时间戳（函数形式）
 * 3. routeMiddleware - 主路由中间件（配置对象形式）
 */
// export default [testMiddleware1, testMiddleware2, routeMiddleware];

/**
 * 导出单个中间件配置对象
 * 也可以导出单个中间件函数或配置对象
 *
 * ============================================
 * 中间件执行流程示例（假设有 3 个中间件）：
 * ============================================
 *
 * 请求到达
 *   ↓
 * 中间件1 - next() 之前的代码执行
 *   ↓
 * 调用 next() → 进入中间件2
 *   ↓
 * 中间件2 - next() 之前的代码执行
 *   ↓
 * 调用 next() → 进入中间件3
 *   ↓
 * 中间件3 - next() 之前的代码执行
 *   ↓
 * 调用 next() → 进入路由处理器
 *   ↓
 * 路由处理器执行（生成响应）
 *   ↓
 * 返回到中间件3 - next() 之后的代码执行
 *   ↓
 * 返回到中间件2 - next() 之后的代码执行
 *   ↓
 * 返回到中间件1 - next() 之后的代码执行
 *   ↓
 * 响应发送给客户端
 *
 * ============================================
 * 执行顺序总结：
 * ============================================
 * 1. 所有中间件的 next() 之前代码（从上到下）
 * 2. 路由处理器
 * 3. 所有中间件的 next() 之后代码（从下到上，后进先出）
 *
 * 这就像"洋葱模型"：一层一层进入，然后一层一层返回
 */
export default [routeMiddleware];
