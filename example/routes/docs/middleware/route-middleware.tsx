/**
 * 中间件 - 路由级中间件文档页面
 * 展示如何使用 _middleware.ts 文件创建路由级中间件
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "路由级中间件 - DWeb 框架文档",
  description: "使用 _middleware.ts 文件为特定路径及其子路径应用中间件",
};

export default function RouteMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 中间件文件结构
  const fileStructureCode = `routes/
├── _middleware.ts        # 根中间件（应用到所有路由）
├── index.tsx
├── users/
│   ├── _middleware.ts    # 用户路由中间件（应用到 /users 下的所有路由）
│   ├── index.tsx         # /users
│   └── [id].tsx          # /users/:id
└── api/
    └── _middleware.ts    # API 路由中间件（应用到 /api 下的所有路由）`;

  // 单个中间件
  const singleMiddlewareCode = `// routes/_middleware.ts
import type { Middleware } from "@dreamer/dweb";

const routeMiddleware: Middleware = async (req, res, next) => {
  // 请求处理前的逻辑
  const startTime = Date.now();
  const url = new URL(req.url);

  console.log(\`[路由中间件] \${req.method} \${url.pathname} - 开始处理\`);

  // 添加自定义响应头
  res.setHeader("X-Route-Middleware", "processed");
  res.setHeader("X-Request-Time", new Date().toISOString());

  // 调用下一个中间件或路由处理器
  await next();

  // 请求处理后的逻辑
  const duration = Date.now() - startTime;
  console.log(
    \`[路由中间件] \${req.method} \${url.pathname} - 处理完成 (\${duration}ms)\`,
  );

  // 添加处理时间到响应头
  res.setHeader("X-Processing-Time", \`\${duration}ms\`);
};

export default routeMiddleware;`;

  // 多个中间件
  const multipleMiddlewareCode = `// routes/users/_middleware.ts
import type { Middleware } from "@dreamer/dweb";
import { auth } from "@dreamer/dweb";

// 认证中间件（只应用到 /users 路径）
const userAuthMiddleware: Middleware = async (req, res, next) => {
  const token = req.headers.get("Authorization");
  if (!token) {
    res.status = 401;
    res.json({ error: "Authentication required" });
    return;
  }
  // 验证 token...
  await next();
};

// 日志中间件
const userLoggerMiddleware: Middleware = async (req, res, next) => {
  console.log(\`[用户路由] \${req.method} \${req.url}\`);
  await next();
};

// 导出中间件数组，按顺序执行
export default [userAuthMiddleware, userLoggerMiddleware];`;

  // 认证中间件示例
  const authMiddlewareCode = `// routes/admin/_middleware.ts
import type { Middleware } from "@dreamer/dweb";

const adminAuthMiddleware: Middleware = async (req, res, next) => {
  // 检查用户是否已登录
  const session = await req.getSession?.();
  if (!session || !session.user) {
    res.status = 401;
    res.redirect("/login");
    return;
  }

  // 检查用户权限
  if (session.user.role !== "admin") {
    res.status = 403;
    res.json({ error: "Forbidden: Admin access required" });
    return;
  }

  await next();
};

export default adminAuthMiddleware;`;

  // 请求日志中间件
  const apiLoggerCode = `// routes/api/_middleware.ts
import type { Middleware } from "@dreamer/dweb";

const apiLoggerMiddleware: Middleware = async (req, res, next) => {
  const startTime = Date.now();
  const url = new URL(req.url);

  // 记录请求信息
  console.log(\`[API] \${req.method} \${url.pathname}\`, {
    query: url.search,
    ip: req.headers.get("x-forwarded-for") || "unknown",
  });

  await next();

  // 记录响应信息
  const duration = Date.now() - startTime;
  console.log(
    \`[API] \${req.method} \${url.pathname} - \${res.status} (\${duration}ms)\`,
  );
};

export default apiLoggerMiddleware;`;

  // 速率限制中间件
  const rateLimitCode = `// routes/api/_middleware.ts
import type { Middleware } from "@dreamer/dweb";

// 简单的内存速率限制
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const apiRateLimitMiddleware: Middleware = async (req, res, next) => {
  const clientId = req.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 分钟
  const maxRequests = 100; // 最多 100 次请求

  const record = rateLimitMap.get(clientId);

  if (record && record.resetTime > now) {
    if (record.count >= maxRequests) {
      res.status = 429;
      res.json({ error: "Too many requests" });
      return;
    }
    record.count++;
  } else {
    rateLimitMap.set(clientId, {
      count: 1,
      resetTime: now + windowMs,
    });
  }

  await next();
};

export default apiRateLimitMiddleware;`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        路由级中间件 (_middleware.ts)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 框架支持路由级中间件，通过创建{" "}
        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
          _middleware.ts
        </code>{" "}
        文件， 可以为特定路径及其子路径应用中间件。
      </p>

      {/* 基本概念 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本概念
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          路由中间件文件使用{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            _middleware.ts
          </code>{" "}
          命名约定，放置在路由目录中。
          中间件会自动应用到该目录及其所有子目录的请求。
        </p>
      </section>

      {/* 中间件文件结构 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          中间件文件结构
        </h2>
        <CodeBlock code={fileStructureCode} language="text" />
      </section>

      {/* 中间件继承顺序 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          中间件继承顺序
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          当访问{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            /users/123
          </code>{" "}
          时，中间件的执行顺序为：
        </p>
        <ol className="list-decimal list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              routes/_middleware.ts
            </code>（根中间件）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              routes/users/_middleware.ts
            </code>（用户路由中间件）
          </li>
        </ol>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
          中间件会按照从根到具体路径的顺序执行。
        </p>
      </section>

      {/* 创建路由中间件 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          创建路由中间件
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          单个中间件
        </h3>
        <CodeBlock code={singleMiddlewareCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          多个中间件（数组）
        </h3>
        <CodeBlock code={multipleMiddlewareCode} language="typescript" />
      </section>

      {/* 路由中间件示例 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          路由中间件示例
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          认证中间件
        </h3>
        <CodeBlock code={authMiddlewareCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          请求日志中间件
        </h3>
        <CodeBlock code={apiLoggerCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          速率限制中间件
        </h3>
        <CodeBlock code={rateLimitCode} language="typescript" />
      </section>

      {/* 中间件执行顺序 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          中间件执行顺序
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          路由中间件会在以下时机执行：
        </p>
        <ol className="list-decimal list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <strong>全局中间件</strong>（通过{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              server.use()
            </code>{" "}
            添加）
          </li>
          <li>
            <strong>路由中间件</strong>（从根到具体路径，按路径层级顺序）
          </li>
          <li>
            <strong>路由处理器</strong>（页面组件或 API 处理器）
          </li>
        </ol>
      </section>

      {/* 路由中间件 vs 全局中间件 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          路由中间件 vs 全局中间件
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  特性
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  路由中间件 (_middleware.ts)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  全局中间件 (server.use())
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  作用范围
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  特定路径及其子路径
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  所有请求
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  配置位置
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  路由目录中
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  main.ts 或配置文件中
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  路径匹配
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  自动匹配路径层级
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  需要手动配置路径匹配
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  适用场景
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  路径特定的逻辑（如认证、日志）
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  全局功能（如 CORS、压缩）
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 最佳实践 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          最佳实践
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <strong>
              使用路由中间件处理路径特定的逻辑
            </strong>：认证和授权、路径特定的日志记录、路径特定的速率限制
          </li>
          <li>
            <strong>使用全局中间件处理通用功能</strong>：CORS 配置、全局错误处理
          </li>
          <li>
            <strong>
              合理组织中间件
            </strong>：将认证中间件放在需要保护的路径、将日志中间件放在需要记录的路径、避免在根路径放置过多中间件
          </li>
        </ul>
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/middleware"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              中间件概述
            </a>
          </li>
          <li>
            <a
              href="/docs/middleware/custom"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              创建自定义中间件
            </a>
          </li>
          <li>
            <a
              href="/docs/core/middleware"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              中间件系统
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}
