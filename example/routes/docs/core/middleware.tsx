/**
 * 核心模块 - 中间件系统文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
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
  const middlewareCode =
    `import type { Middleware } from '@dreamer/dweb/core/middleware';

const myMiddleware: Middleware = async (req, res, next) => {
  // 请求前处理
  console.log('Before:', req.url);
  
  // 调用下一个中间件
  await next();
  
  // 响应后处理
  console.log('After:', res.status);
};`;

  const useMiddlewareCode = `import { Server } from '@dreamer/dweb/core/server';
import { logger, cors } from '@dreamer/dweb/middleware';

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
      message: error.message 
    });
  }
};

server.use(errorHandler);`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">中间件系统</h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 框架提供了强大的中间件系统，允许你在请求处理流程中插入自定义逻辑。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          什么是中间件
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          中间件是一个函数，接收请求、响应和下一个中间件函数作为参数。中间件可以：
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            在请求处理前执行逻辑（如身份验证、日志记录）
          </li>
          <li>
            在请求处理后执行逻辑（如响应压缩、错误处理）
          </li>
          <li>修改请求或响应对象</li>
          <li>终止请求处理流程</li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          创建中间件
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          创建一个自定义中间件：
        </p>
        <CodeBlock code={middlewareCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          使用中间件
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          在服务器上使用中间件：
        </p>
        <CodeBlock code={useMiddlewareCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          中间件执行顺序
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          中间件按照添加的顺序执行。在调用{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">next()</code>{" "}
          之前执行的代码会在请求处理前运行，在调用{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">next()</code>{" "}
          之后执行的代码会在请求处理后运行：
        </p>
        <CodeBlock code={executionOrderCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          条件中间件
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          可以在特定路径上使用中间件：
        </p>
        <CodeBlock code={conditionalMiddlewareCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          错误处理中间件
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          使用中间件处理错误：
        </p>
        <CodeBlock code={errorMiddlewareCode} language="typescript" />
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          中间件类型
        </h3>
        <CodeBlock code={`type Middleware = (
  req: Request,
  res: Response,
  next: () => Promise<void> | void
) => Promise<void> | void;`} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          使用中间件
        </h3>
        <CodeBlock code={`// 在服务器上使用
server.use(middleware);

// 在 Application 上使用
app.use(middleware);

// 在配置文件中使用
export default {
  middleware: [
    logger(),
    cors({ origin: '*' }),
  ],
};`} language="typescript" />
      </section>

      {/* 内置中间件 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          内置中间件
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          框架提供了多个内置中间件：
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li><a href="/docs/middleware/logger" className="text-blue-600 dark:text-blue-400 hover:underline">logger</a> - 日志记录</li>
          <li><a href="/docs/middleware/cors" className="text-blue-600 dark:text-blue-400 hover:underline">cors</a> - 跨域资源共享</li>
          <li><a href="/docs/middleware/body-parser" className="text-blue-600 dark:text-blue-400 hover:underline">bodyParser</a> - 请求体解析</li>
          <li><a href="/docs/middleware/static-files" className="text-blue-600 dark:text-blue-400 hover:underline">staticFiles</a> - 静态文件服务</li>
          <li><a href="/docs/middleware/security" className="text-blue-600 dark:text-blue-400 hover:underline">security</a> - 安全头设置</li>
          <li><a href="/docs/middleware/rate-limit" className="text-blue-600 dark:text-blue-400 hover:underline">rateLimit</a> - 请求频率限制</li>
          <li><a href="/docs/middleware/auth" className="text-blue-600 dark:text-blue-400 hover:underline">auth</a> - 身份验证</li>
          <li><a href="/docs/middleware/health" className="text-blue-600 dark:text-blue-400 hover:underline">health</a> - 健康检查</li>
          <li><a href="/docs/middleware/request-id" className="text-blue-600 dark:text-blue-400 hover:underline">requestId</a> - 请求 ID 生成</li>
          <li><a href="/docs/middleware/request-validator" className="text-blue-600 dark:text-blue-400 hover:underline">requestValidator</a> - 请求验证</li>
          <li><a href="/docs/middleware/ip-filter" className="text-blue-600 dark:text-blue-400 hover:underline">ipFilter</a> - IP 过滤</li>
          <li><a href="/docs/middleware/error-handler" className="text-blue-600 dark:text-blue-400 hover:underline">errorHandler</a> - 错误处理</li>
        </ul>
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li><a href="/docs/core/application" className="text-blue-600 dark:text-blue-400 hover:underline">Application (应用核心)</a></li>
          <li><a href="/docs/core/server" className="text-blue-600 dark:text-blue-400 hover:underline">服务器 (Server)</a></li>
        </ul>
      </section>
          <code className="bg-gray-100 px-2 py-1 rounded">next()</code>{" "}
          之后执行的代码会在请求处理后运行。
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          内置中间件
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          框架提供了多个内置中间件，详见{" "}
          <a
            href="/docs/middleware"
            className="text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            中间件文档
          </a>
          。
        </p>
      </section>
    </article>
  );
}
