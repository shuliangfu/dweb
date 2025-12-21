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

  return (
    <article className="prose prose-lg max-w-none">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">中间件系统</h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        DWeb 框架提供了强大的中间件系统，允许你在请求处理流程中插入自定义逻辑。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          什么是中间件
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          中间件是一个函数，接收请求、响应和下一个中间件函数作为参数。中间件可以：
        </p>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700">
            在请求处理前执行逻辑（如身份验证、日志记录）
          </li>
          <li className="text-gray-700">
            在请求处理后执行逻辑（如响应压缩、错误处理）
          </li>
          <li className="text-gray-700">修改请求或响应对象</li>
          <li className="text-gray-700">终止请求处理流程</li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          创建中间件
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          创建一个自定义中间件：
        </p>
        <CodeBlock code={middlewareCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          使用中间件
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          在服务器上使用中间件：
        </p>
        <CodeBlock code={useMiddlewareCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          中间件执行顺序
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          中间件按照添加的顺序执行。在调用{" "}
          <code className="bg-gray-100 px-2 py-1 rounded">next()</code>{" "}
          之前执行的代码会在请求处理前运行，在调用{" "}
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
