/**
 * 核心模块 - 服务器 (Server) 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "服务器 (Server) - DWeb 框架文档",
  description: "DWeb 框架的服务器功能介绍",
};

export default function CoreServerPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 服务器基本使用
  const serverBasicCode = `import { Server } from '@dreamer/dweb/core/server';

const server = new Server();

// 设置请求处理器
server.setHandler(async (req, res) => {
  res.text('Hello World');
});

// 启动服务器
await server.start(3000, 'localhost');`;

  // 服务器响应方法
  const serverResponseCode = `server.setHandler(async (req, res) => {
  // 文本响应
  res.text('Hello');
  
  // JSON 响应
  res.json({ message: 'Hello' });
  
  // HTML 响应
  res.html('<h1>Hello</h1>');
  
  // 设置状态码
  res.status(404);
  
  // 设置响应头
  res.setHeader('Content-Type', 'application/json');
  
  // 重定向
  res.redirect('/new-path');
  
  // 发送文件
  await res.sendFile('./public/index.html');
});`;

  // 中间件使用
  const middlewareCode = `import { Server } from '@dreamer/dweb/core/server';
import { logger, cors } from '@dreamer/dweb/middleware';

const server = new Server();

// 添加中间件
server.use(logger());
server.use(cors({ origin: '*' }));

server.setHandler(async (req, res) => {
  res.json({ message: 'Hello' });
});

await server.start(3000);`;

  // TLS 支持
  const tlsCode = `// 启用 HTTPS
const server = new Server();

server.setHandler(async (req, res) => {
  res.text('Hello World');
});

// 启动 HTTPS 服务器
await server.start({
  port: 443,
  host: 'localhost',
  certFile: './cert.pem',
  keyFile: './key.pem',
});`;

  // 服务器事件
  const eventsCode = `const server = new Server();

// 监听服务器启动事件
server.on('start', () => {
  console.log('服务器已启动');
});

// 监听服务器关闭事件
server.on('close', () => {
  console.log('服务器已关闭');
});

await server.start(3000);`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        服务器 (Server)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        Server 类是框架的核心，提供了 HTTP 服务器功能。它基于 Deno 的原生 HTTP
        服务器，提供了简洁易用的 API。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          创建一个服务器实例，设置请求处理器，然后启动服务器：
        </p>
        <CodeBlock code={serverBasicCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          响应方法
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          Response 对象提供了多种响应方法，方便处理不同类型的响应：
        </p>
        <CodeBlock code={serverResponseCode} language="typescript" />
        <div className="mt-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            响应方法说明
          </h3>
          <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
            <li>
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                res.text(content, type?)
              </code>{" "}
              - 发送文本响应，支持自定义 Content-Type
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                res.json(data, options?)
              </code>{" "}
              - 发送 JSON 响应，支持自定义状态码和响应头
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                res.html(html)
              </code>{" "}
              - 发送 HTML 响应
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                res.status(code)
              </code>{" "}
              - 设置 HTTP 状态码
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                res.setHeader(name, value)
              </code>{" "}
              - 设置响应头
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                res.redirect(url, status?)
              </code>{" "}
              - 重定向到指定 URL
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                res.sendFile(path)
              </code>{" "}
              - 发送文件响应
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          中间件
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          服务器支持添加中间件，用于在请求处理前或后执行逻辑：
        </p>
        <CodeBlock code={middlewareCode} language="typescript" />
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
          更多中间件使用说明，请查看{" "}
          <a
            href="/docs/core/middleware"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            中间件系统文档
          </a>
          。
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          TLS 支持
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          服务器支持 HTTPS（TLS）：
        </p>
        <CodeBlock code={tlsCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          服务器事件
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          服务器支持事件监听：
        </p>
        <CodeBlock code={eventsCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          服务器配置
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          服务器启动时可以配置端口和主机地址：
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              port
            </code>{" "}
            - 服务器监听端口（默认: 3000）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              host
            </code>{" "}
            - 服务器监听地址（默认: 'localhost'）
          </li>
        </ul>
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          构造函数
        </h3>
        <CodeBlock code={`constructor()`} language="typescript" />
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          创建新的服务器实例。
        </p>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方法
        </h3>

        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                start(port, host?)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              启动服务器。
            </p>
            <CodeBlock
              code={`await server.start(3000, 'localhost');`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                stop()
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              停止服务器。
            </p>
            <CodeBlock code={`await server.stop();`} language="typescript" />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                setHandler(handler)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              设置请求处理器。
            </p>
            <CodeBlock
              code={`server.setHandler(async (req, res) => {
  res.text('Hello World');
});`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                use(middleware)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              添加中间件。
            </p>
            <CodeBlock
              code={`server.use(logger());
server.use(cors({ origin: '*' }));`}
              language="typescript"
            />
          </div>
        </div>
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/core/application"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Application (应用核心)
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
          <li>
            <a
              href="/docs/features/shutdown"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              优雅关闭
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}
