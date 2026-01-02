/**
 * 中间件 - 自定义中间件文档页面
 * 展示如何创建自定义中间件
 */

import DocRenderer from "@components/DocRenderer.tsx";
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

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "创建自定义中间件",
    description: "你可以创建自己的中间件来处理特定的业务逻辑。",
    sections: [
      {
        title: "基本结构",
        blocks: [
          {
            type: "text",
            content: "中间件是一个异步函数，接收 `req`、`res` 和 `next` 三个参数：",
          },
          {
            type: "code",
            code: basicStructureCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "中间件示例",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "响应时间中间件",
            blocks: [
              {
                type: "code",
                code: responseTimeCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "请求 ID 中间件",
            blocks: [
              {
                type: "code",
                code: requestIdCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "条件中间件",
            blocks: [
              {
                type: "code",
                code: conditionalCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "错误处理",
        blocks: [
          {
            type: "text",
            content: "中间件可以捕获和处理错误：",
          },
          {
            type: "code",
            code: errorHandlingCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "提前返回",
        blocks: [
          {
            type: "text",
            content: "中间件可以在不调用 `next()` 的情况下提前返回响应：",
          },
          {
            type: "code",
            code: earlyReturnCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "API 参考",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "Middleware 类型",
            blocks: [
              {
                type: "code",
                code: `type Middleware = (
  req: Request,
  res: Response,
  next: () => Promise<void>
) => Promise<void>;`,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用中间件",
            blocks: [
              {
                type: "code",
                code: `server.use(middleware);`,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "相关文档",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[中间件概述](/docs/middleware)",
              "[路由级中间件](/docs/middleware/route-middleware)",
              "[中间件系统](/docs/core/middleware)",
            ],
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
