/**
 * 中间件 - 路由级中间件文档页面
 * 展示如何使用 _middleware.ts 文件创建路由级中间件
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "路由级中间件 - DWeb 框架文档",
  description: "使用 _middleware.ts 文件为特定路径及其子路径应用中间件",
};

export default function RouteMiddlewarePage() {
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

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "路由级中间件 (_middleware.ts)",
    description:
      "DWeb 框架支持路由级中间件，通过创建 `_middleware.ts` 文件，可以为特定路径及其子路径应用中间件。",
    sections: [
      {
        title: "基本概念",
        blocks: [
          {
            type: "text",
            content:
              "路由中间件文件使用 `_middleware.ts` 命名约定，放置在路由目录中。中间件会自动应用到该目录及其所有子目录的请求。",
          },
        ],
      },
      {
        title: "中间件文件结构",
        blocks: [
          {
            type: "code",
            code: fileStructureCode,
            language: "text",
          },
        ],
      },
      {
        title: "中间件继承顺序",
        blocks: [
          {
            type: "text",
            content: "当访问 `/users/123` 时，中间件的执行顺序为：",
          },
          {
            type: "list",
            ordered: true,
            items: [
              "`routes/_middleware.ts`（根中间件）",
              "`routes/users/_middleware.ts`（用户路由中间件）",
            ],
          },
          {
            type: "text",
            content: "中间件会按照从根到具体路径的顺序执行。",
          },
        ],
      },
      {
        title: "创建路由中间件",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "单个中间件",
            blocks: [
              {
                type: "code",
                code: singleMiddlewareCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "多个中间件（数组）",
            blocks: [
              {
                type: "code",
                code: multipleMiddlewareCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "路由中间件示例",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "认证中间件",
            blocks: [
              {
                type: "code",
                code: authMiddlewareCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "请求日志中间件",
            blocks: [
              {
                type: "code",
                code: apiLoggerCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "速率限制中间件",
            blocks: [
              {
                type: "code",
                code: rateLimitCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "中间件执行顺序",
        blocks: [
          {
            type: "text",
            content: "路由中间件会在以下时机执行：",
          },
          {
            type: "list",
            ordered: true,
            items: [
              "**全局中间件**（通过 `server.use()` 添加）",
              "**路由中间件**（从根到具体路径，按路径层级顺序）",
              "**路由处理器**（页面组件或 API 处理器）",
            ],
          },
        ],
      },
      {
        title: "路由中间件 vs 全局中间件",
        blocks: [
          {
            type: "text",
            content:
              "| 特性 | 路由中间件 (_middleware.ts) | 全局中间件 (server.use()) |\n|------|---------------------------|--------------------------|\n| 作用范围 | 特定路径及其子路径 | 所有请求 |\n| 配置位置 | 路由目录中 | main.ts 或配置文件中 |\n| 路径匹配 | 自动匹配路径层级 | 需要手动配置路径匹配 |\n| 适用场景 | 路径特定的逻辑（如认证、日志） | 全局功能（如 CORS、压缩） |",
          },
        ],
      },
      {
        title: "最佳实践",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**使用路由中间件处理路径特定的逻辑**：认证和授权、路径特定的日志记录、路径特定的速率限制",
              "**使用全局中间件处理通用功能**：CORS 配置、全局错误处理",
              "**合理组织中间件**：将认证中间件放在需要保护的路径、将日志中间件放在需要记录的路径、避免在根路径放置过多中间件",
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
              "[创建自定义中间件](/docs/middleware/custom)",
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
