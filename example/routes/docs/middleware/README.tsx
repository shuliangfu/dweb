/**
 * 中间件 - 中间件概述文档页面
 * 展示 DWeb 框架的中间件系统概述
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "中间件概述 - DWeb 框架文档",
  description: "DWeb 框架的中间件系统概述，包括内置中间件和使用方法",
};

export default function MiddlewareOverviewPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本用法
  const basicUsageCode = `import { Server } from "@dreamer/dweb/core/server";
import { bodyParser, cors, logger } from "@dreamer/dweb/middleware";

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
import { logger, cors, bodyParser } from '@dreamer/dweb/middleware';

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

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        中间件概述
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 框架提供了丰富的内置中间件，用于处理常见的 HTTP 请求和响应任务。
      </p>

      {/* 目录结构 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          目录结构
        </h2>
        <CodeBlock
          code={`src/middleware/
├── auth.ts              # JWT 认证
├── body-parser.ts       # 请求体解析
├── cors.ts              # CORS 支持
├── error-handler.ts     # 错误处理
├── health.ts            # 健康检查
├── ip-filter.ts         # IP 过滤
├── logger.ts            # 请求日志
├── rate-limit.ts        # 速率限制
├── request-id.ts        # 请求 ID
├── request-validator.ts # 请求验证
├── security.ts          # 安全头
├── static.ts            # 静态文件
└── mod.ts               # 模块导出`}
          language="text"
        />
      </section>

      {/* 使用中间件 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          使用中间件
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          基本用法
        </h3>
        <CodeBlock code={basicUsageCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          在配置文件中使用
        </h3>
        <CodeBlock code={configUsageCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          中间件执行顺序
        </h3>
        <CodeBlock code={executionOrderCode} language="typescript" />
      </section>

      {/* 内置中间件 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          内置中间件
        </h2>
        <div className="grid md:grid-cols-2 gap-4 my-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a
                href="/docs/middleware/logger"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                logger
              </a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              请求日志记录
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a
                href="/docs/middleware/cors"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                cors
              </a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              跨域资源共享
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a
                href="/docs/middleware/body-parser"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                bodyParser
              </a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              请求体解析
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a
                href="/docs/middleware/security"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                security
              </a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              安全头设置
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a
                href="/docs/middleware/rate-limit"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                rateLimit
              </a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              请求频率限制
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a
                href="/docs/middleware/auth"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                auth
              </a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              JWT 身份验证
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a
                href="/docs/middleware/static-files"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                staticFiles
              </a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              静态文件服务
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a
                href="/docs/middleware/error-handler"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                errorHandler
              </a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">错误处理</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a
                href="/docs/middleware/health"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                health
              </a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">健康检查</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a
                href="/docs/middleware/request-id"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                requestId
              </a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              请求 ID 生成
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a
                href="/docs/middleware/request-validator"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                requestValidator
              </a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">请求验证</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a
                href="/docs/middleware/ip-filter"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                ipFilter
              </a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              IP 地址过滤
            </p>
          </div>
        </div>
      </section>

      {/* 其他 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          其他
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/middleware/route-middleware"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              路由级中间件
            </a>{" "}
            - 使用 _middleware.ts 文件
          </li>
          <li>
            <a
              href="/docs/middleware/custom"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              创建自定义中间件
            </a>{" "}
            - 编写自己的中间件
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
              href="/docs/core/middleware"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              中间件系统
            </a>{" "}
            - 框架核心功能
          </li>
          <li>
            <a
              href="/docs/core/application"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Application
            </a>{" "}
            - 应用核心
          </li>
          <li>
            <a
              href="/docs/plugins"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              插件系统
            </a>{" "}
            - 插件系统
          </li>
        </ul>
      </section>
    </article>
  );
}
