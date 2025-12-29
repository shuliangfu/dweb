/**
 * 中间件 - 自定义中间件文档页面
 * 展示如何创建自定义中间件
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "创建自定义中间件 - DWeb 框架文档",
  description: "如何创建自定义中间件来处理特定的业务逻辑",
};

export default function CustomMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本结构
  const basicStructureCode =
    `import type { Middleware } from "@dreamer/dweb";

const myMiddleware: Middleware = async (req, res, next) => {
  // 请求前处理
  const start = Date.now();

  // 调用下一个中间件
  await next();

  // 响应后处理
  const duration = Date.now() - start;
  res.setHeader("X-Response-Time", \`\${duration}ms\`);
};

server.use(myMiddleware);`;

  // 响应时间中间件
  const responseTimeCode =
    `import type { Middleware } from "@dreamer/dweb";

const responseTime: Middleware = async (req, res, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  res.setHeader("X-Response-Time", \`\${duration}ms\`);
};

server.use(responseTime);`;

  // 请求 ID 中间件
  const requestIdCode =
    `import type { Middleware } from "@dreamer/dweb";
import { randomUUID } from "@std/uuid";

const requestId: Middleware = async (req, res, next) => {
  const id = randomUUID();
  res.setHeader("X-Request-ID", id);
  // 将 ID 附加到请求对象（如果需要）
  (req as any).id = id;
  await next();
};

server.use(requestId);`;

  // 条件中间件
  const conditionalCode =
    `import type { Middleware } from "@dreamer/dweb";

const conditionalMiddleware = (condition: (req: Request) => boolean) => {
  const middleware: Middleware = async (req, res, next) => {
    if (condition(req)) {
      // 执行特定逻辑
      res.setHeader("X-Conditional", "matched");
    }
    await next();
  };
  return middleware;
};

// 只在特定路径应用
server.use(conditionalMiddleware((req) => {
  return new URL(req.url).pathname.startsWith("/api");
}));`;

  // 错误处理
  const errorHandlingCode =
    `import type { Middleware } from "@dreamer/dweb";

const errorHandling: Middleware = async (req, res, next) => {
  try {
    await next();
  } catch (error) {
    console.error("中间件错误:", error);
    res.status = 500;
    res.json({ error: "Internal Server Error" });
  }
};

server.use(errorHandling);`;

  // 提前返回
  const earlyReturnCode =
    `import type { Middleware } from "@dreamer/dweb";

const authCheck: Middleware = async (req, res, next) => {
  const token = req.headers.get("Authorization");
  if (!token) {
    res.status = 401;
    res.json({ error: "Unauthorized" });
    return; // 不调用 next()，提前返回
  }
  await next();
};

server.use(authCheck);`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        创建自定义中间件
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        你可以创建自己的中间件来处理特定的业务逻辑。
      </p>

      {/* 基本结构 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本结构
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          中间件是一个异步函数，接收{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            req
          </code>、<code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            res
          </code>{" "}
          和{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            next
          </code>{" "}
          三个参数：
        </p>
        <CodeBlock code={basicStructureCode} language="typescript" />
      </section>

      {/* 中间件示例 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          中间件示例
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          响应时间中间件
        </h3>
        <CodeBlock code={responseTimeCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          请求 ID 中间件
        </h3>
        <CodeBlock code={requestIdCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          条件中间件
        </h3>
        <CodeBlock code={conditionalCode} language="typescript" />
      </section>

      {/* 错误处理 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          错误处理
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          中间件可以捕获和处理错误：
        </p>
        <CodeBlock code={errorHandlingCode} language="typescript" />
      </section>

      {/* 提前返回 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          提前返回
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          中间件可以在不调用{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            next()
          </code>{" "}
          的情况下提前返回响应：
        </p>
        <CodeBlock code={earlyReturnCode} language="typescript" />
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          Middleware 类型
        </h3>
        <CodeBlock
          code={`type Middleware = (
  req: Request,
  res: Response,
  next: () => Promise<void>
) => Promise<void>;`}
          language="typescript"
        />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          使用中间件
        </h3>
        <CodeBlock code={`server.use(middleware);`} language="typescript" />
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
              href="/docs/middleware/route-middleware"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              路由级中间件
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
