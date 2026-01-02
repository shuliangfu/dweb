/**
 * 核心模块 - 中间件系统文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "中间件系统 - DWeb 框架文档",
  description: "DWeb 框架的中间件系统介绍",
};

export default function CoreMiddlewarePage({
  params: _params,
  query: _query,
  data: _data,
}: PageProps) {
  const middlewareCode = `import type { Middleware } from '@dreamer/dweb';

const myMiddleware: Middleware = async (req, res, next) => {
  // 请求前处理
  console.log('Before:', req.url);
  
  // 调用下一个中间件
  await next();
  
  // 响应后处理
  console.log('After:', res.status);
};`;

  const useMiddlewareCode = `import { Server } from '@dreamer/dweb';
import { logger, cors } from '@dreamer/dweb';

const server = new Server();

// 添加中间件
server.use(logger());
server.use(cors({ origin: '*' }));

server.setHandler(async (req, res) => {
  res.json({ message: 'Hello' });
});

await server.start(3000);`;

  // 中间件执行顺序示例
  const executionOrderCode = `// 中间件执行顺序示例
server.use(async (req, res, next) => {
  console.log('中间件 1: 开始');
  await next();
  console.log('中间件 1: 结束');
});

server.use(async (req, res, next) => {
  console.log('中间件 2: 开始');
  await next();
  console.log('中间件 2: 结束');
});

// 执行顺序：
// 中间件 1: 开始
// 中间件 2: 开始
// 请求处理
// 中间件 2: 结束
// 中间件 1: 结束`;

  // 条件中间件
  const conditionalMiddlewareCode = `// 条件中间件
const authMiddleware = async (req, res, next) => {
  const token = req.headers.get('Authorization');
  if (!token) {
    res.status(401).json({ error: '未授权' });
    return;
  }
  await next();
};

// 只在特定路径使用
server.use('/api', authMiddleware);`;

  // 错误处理中间件
  const errorMiddlewareCode = `// 错误处理中间件
const errorHandler = async (req, res, next) => {
  try {
    await next();
  } catch (error) {
    console.error('错误:', error);
    res.status(500).json({ 
      error: '内部服务器错误',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
};

server.use(errorHandler);`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "中间件系统",
    description: "DWeb 框架提供了强大的中间件系统，允许你在请求处理流程中插入自定义逻辑。",
    sections: [
      {
        title: "什么是中间件",
        blocks: [
          {
            type: "text",
            content: "中间件是一个函数，接收请求、响应和下一个中间件函数作为参数。中间件可以：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "在请求处理前执行逻辑（如身份验证、日志记录）",
              "在请求处理后执行逻辑（如响应压缩、错误处理）",
              "修改请求或响应对象",
              "终止请求处理流程",
            ],
          },
        ],
      },
      {
        title: "创建中间件",
        blocks: [
          {
            type: "text",
            content: "创建一个自定义中间件：",
          },
          {
            type: "code",
            code: middlewareCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "使用中间件",
        blocks: [
          {
            type: "text",
            content: "在服务器上使用中间件：",
          },
          {
            type: "code",
            code: useMiddlewareCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "中间件执行顺序",
        blocks: [
          {
            type: "text",
            content: "中间件按照添加的顺序执行。在调用 `next()` 之前执行的代码会在请求处理前运行，在调用 `next()` 之后执行的代码会在请求处理后运行：",
          },
          {
            type: "code",
            code: executionOrderCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "条件中间件",
        blocks: [
          {
            type: "text",
            content: "可以在特定路径上使用中间件：",
          },
          {
            type: "code",
            code: conditionalMiddlewareCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "错误处理中间件",
        blocks: [
          {
            type: "text",
            content: "使用中间件处理错误：",
          },
          {
            type: "code",
            code: errorMiddlewareCode,
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
            title: "中间件类型",
            blocks: [
              {
                type: "code",
                code: `type Middleware = (
  req: Request,
  res: Response,
  next: () => Promise<void> | void
) => Promise<void> | void;`,
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
                code: `// 在服务器上使用
server.use(middleware);

// 在 Application 上使用
app.use(middleware);

// 在配置文件中使用
export default {
  middleware: [
    logger(),
    cors({ origin: '*' }),
  ],
};`,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "内置中间件",
        blocks: [
          {
            type: "text",
            content: "框架提供了多个内置中间件：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "[logger](/docs/middleware/logger) - 日志记录",
              "[cors](/docs/middleware/cors) - 跨域资源共享",
              "[bodyParser](/docs/middleware/body-parser) - 请求体解析",
              "[staticFiles](/docs/middleware/static-files) - 静态文件服务",
              "[security](/docs/middleware/security) - 安全头设置",
              "[rateLimit](/docs/middleware/rate-limit) - 请求频率限制",
              "[auth](/docs/middleware/auth) - 身份验证",
              "[health](/docs/middleware/health) - 健康检查",
              "[requestId](/docs/middleware/request-id) - 请求 ID 生成",
              "[ipFilter](/docs/middleware/ip-filter) - IP 过滤",
              "[errorHandler](/docs/middleware/error-handler) - 错误处理",
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
              "[自定义中间件](/docs/middleware/custom)",
              "[Application (应用核心)](/docs/core/application)",
              "[服务器 (Server)](/docs/core/server)",
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
