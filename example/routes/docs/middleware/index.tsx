/**
 * 中间件 - 中间件概述文档页面
 * 展示 DWeb 框架的中间件系统概述
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "中间件概述 - DWeb 框架文档",
  description: "DWeb 框架的中间件系统概述，包括内置中间件和使用方法",
};

export default function MiddlewarePage() {
  // 基本用法
  const basicUsageCode = `import { Server } from "@dreamer/dweb";
import { bodyParser, cors, logger } from "@dreamer/dweb";

const server = new Server();

// 添加中间件
server.use(logger());
server.use(cors());
server.use(bodyParser());

server.setHandler(async (req, res) => {
  res.json({ message: "Hello" });
});

await server.start(3000);`;

  // 在配置文件中使用
  const configUsageCode = `// dweb.config.ts
import { logger, cors, bodyParser } from '@dreamer/dweb';

export default {
  middleware: [
    logger(),
    cors({ origin: '*' }),
    bodyParser(),
  ],
};`;

  // 中间件执行顺序
  const executionOrderCode = `// 中间件按照添加的顺序执行
server.use(logger());      // 1. 首先执行
server.use(cors());        // 2. 然后执行
server.use(bodyParser());  // 3. 最后执行

// 执行顺序：logger -> cors -> bodyParser -> 请求处理 -> bodyParser -> cors -> logger`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "中间件概述",
    description: "DWeb 框架提供了丰富的内置中间件，用于处理常见的 HTTP 请求和响应任务。",
    sections: [
      {
        title: "目录结构",
        blocks: [
          {
            type: "code",
            code: `src/middleware/
├── auth.ts              # JWT 认证
├── body-parser.ts       # 请求体解析
├── cors.ts              # CORS 支持
├── error-handler.ts     # 错误处理
├── health.ts            # 健康检查
├── ip-filter.ts         # IP 过滤
├── logger.ts            # 请求日志
├── rate-limit.ts        # 速率限制
├── request-id.ts        # 请求 ID
├── security.ts          # 安全头
├── static.ts            # 静态文件
└── mod.ts               # 模块导出`,
            language: "text",
          },
        ],
      },
      {
        title: "使用中间件",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "基本用法",
            blocks: [
              {
                type: "code",
                code: basicUsageCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "在配置文件中使用",
            blocks: [
              {
                type: "code",
                code: configUsageCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "中间件执行顺序",
            blocks: [
              {
                type: "code",
                code: executionOrderCode,
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
            type: "list",
            ordered: false,
            items: [
              "[logger](/docs/middleware/logger) - 请求日志记录",
              "[cors](/docs/middleware/cors) - 跨域资源共享",
              "[bodyParser](/docs/middleware/body-parser) - 请求体解析",
              "[security](/docs/middleware/security) - 安全头设置",
              "[rateLimit](/docs/middleware/rate-limit) - 请求频率限制",
              "[auth](/docs/middleware/auth) - JWT 身份验证",
              "[staticFiles](/docs/middleware/static-files) - 静态文件服务",
              "[errorHandler](/docs/middleware/error-handler) - 错误处理",
              "[health](/docs/middleware/health) - 健康检查",
              "[requestId](/docs/middleware/request-id) - 请求 ID 生成",
              "[ipFilter](/docs/middleware/ip-filter) - IP 地址过滤",
            ],
          },
        ],
      },
      {
        title: "其他",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[路由级中间件](/docs/middleware/route-middleware) - 使用 _middleware.ts 文件",
              "[创建自定义中间件](/docs/middleware/custom) - 编写自己的中间件",
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
              "[中间件系统](/docs/core/middleware) - 框架核心功能",
              "[Application](/docs/core/application) - 应用核心",
              "[插件系统](/docs/plugins) - 插件系统",
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
