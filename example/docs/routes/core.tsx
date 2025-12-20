/**
 * 核心模块文档页面
 * 详细介绍 DWeb 框架的核心功能
 */

import CodeBlock from '../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: '核心模块 - DWeb 框架文档',
  description: 'DWeb 框架的核心功能模块，包括服务器、路由、配置等',
};

/**
 * 核心模块文档页面
 */
export default function CorePage({ params: _params, query: _query, data: _data }: PageProps) {
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

  // 文件系统路由
  const routerCode = `// 路由文件结构
routes/
├── index.tsx          # / (首页)
├── users/
│   ├── index.tsx      # /users
│   └── [id].tsx       # /users/:id
└── api/
    └── users.ts       # /api/users`;

  // 动态路由示例
  const dynamicRouteCode = `// routes/users/[id].tsx
import type { PageProps } from '@dreamer/dweb';

export default function UserPage({ params }: PageProps) {
  const { id } = params as { id: string };
  return <div>User ID: {id}</div>;
}`;

  // 捕获所有路由
  const catchAllRouteCode = `// routes/docs/[...slug].tsx
import type { PageProps } from '@dreamer/dweb';

export default function DocsPage({ params }: PageProps) {
  const { slug } = params as { slug: string[] };
  return <div>Docs: {slug.join('/')}</div>;
}`;

  // 配置管理
  const configCode = `import { loadConfig } from '@dreamer/dweb/core/config';

// 加载默认配置
const { config, configDir } = await loadConfig();

// 加载指定配置文件
const { config } = await loadConfig('./dweb.config.ts');

// 多应用模式
const { config } = await loadConfig('./dweb.config.ts', 'app-name');`;

  // 中间件示例
  const middlewareCode = `import type { Middleware } from '@dreamer/dweb/core/middleware';

const myMiddleware: Middleware = async (req, res, next) => {
  // 请求前处理
  console.log('Before:', req.url);
  
  // 调用下一个中间件
  await next();
  
  // 响应后处理
  console.log('After:', res.status);
};`;

  // 插件示例
  const pluginCode = `import type { Plugin } from '@dreamer/dweb/core/plugin';

const myPlugin: Plugin = {
  name: 'my-plugin',
  setup(app) {
    // 插件初始化
    console.log('Plugin initialized');
  },
};`;

  // API 路由示例
  const apiRouteCode = `// routes/api/users.ts
import type { ApiRoute } from '@dreamer/dweb';

export default async function handler({ req, res }: ApiRoute) {
  if (req.method === 'GET') {
    const users = await getUsers();
    res.json(users);
  } else if (req.method === 'POST') {
    const data = await req.json();
    const user = await createUser(data);
    res.json(user);
  }
}`;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          {/* 标题 */}
          <h1 className="text-4xl font-bold text-gray-900 mb-8">核心模块</h1>

          <p className="text-gray-700 leading-relaxed mb-8">
            DWeb
            框架的核心功能模块，包括服务器、路由、配置、中间件系统等。这些模块构成了框架的基础架构。
          </p>

          {/* 目录结构 */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
              目录结构
            </h2>
            <CodeBlock
              code={`src/core/
├── server.ts         # HTTP 服务器
├── router.ts         # 文件系统路由
├── config.ts         # 配置管理
├── middleware.ts     # 中间件系统
├── plugin.ts         # 插件系统
├── route-handler.ts  # 路由处理器
└── api-route.ts      # API 路由处理`}
              language="text"
            />
          </section>

          {/* 服务器 */}
          <section id="server" className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
              服务器 (Server)
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Server 类是框架的核心，提供了 HTTP 服务器功能。它基于 Deno 的原生 HTTP 服务器，提供了简洁易用的 API。
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              详细说明请查看 <a href="/core/server" className="text-indigo-600 hover:text-indigo-700 hover:underline">服务器文档</a>。
            </p>
          </section>

          {/* 路由系统 */}
          <section id="router" className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
              路由系统 (Router)
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              DWeb 使用文件系统路由，路由文件位于 <code className="bg-gray-100 px-2 py-1 rounded">routes</code> 目录。文件路径自动映射为 URL 路径，无需手动配置路由表。
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              详细说明请查看 <a href="/core/router" className="text-indigo-600 hover:text-indigo-700 hover:underline">路由系统文档</a>。
            </p>
          </section>

          {/* 配置管理 */}
          <section id="config" className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
              配置管理 (Config)
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              DWeb 框架提供了灵活的配置加载机制，支持单应用和多应用模式。配置文件使用 TypeScript，提供完整的类型支持。
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              详细说明请查看 <a href="/core/config" className="text-indigo-600 hover:text-indigo-700 hover:underline">配置管理文档</a>。
            </p>
          </section>

          {/* 中间件系统 */}
          <section id="middleware" className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
              中间件系统
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              DWeb 框架提供了强大的中间件系统，允许你在请求处理流程中插入自定义逻辑。
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              详细说明请查看 <a href="/core/middleware" className="text-indigo-600 hover:text-indigo-700 hover:underline">中间件系统文档</a>。
            </p>
          </section>

          {/* 插件系统 */}
          <section id="plugin" className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
              插件系统
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              DWeb 框架提供了灵活的插件系统，可以扩展框架功能。
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              详细说明请查看 <a href="/core/plugin" className="text-indigo-600 hover:text-indigo-700 hover:underline">插件系统文档</a>。
            </p>
          </section>

          {/* API 路由 */}
          <section id="api" className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
              API 路由
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              DWeb 框架支持创建 API 路由，用于处理 HTTP 请求并返回 JSON 或其他格式的响应。
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              详细说明请查看 <a href="/core/api" className="text-indigo-600 hover:text-indigo-700 hover:underline">API 路由文档</a>。
            </p>
          </section>

          {/* API 参考 */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
              API 参考
            </h2>

            <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Server</h3>
            <ul className="list-disc list-inside space-y-2 my-4">
              <li className="text-gray-700">
                <code className="bg-gray-100 px-2 py-1 rounded">
                  use(middleware: Middleware | Middleware[]): void
                </code>{' '}
                - 添加中间件
              </li>
              <li className="text-gray-700">
                <code className="bg-gray-100 px-2 py-1 rounded">
                  setHandler(handler: (req, res) =&gt; void): void
                </code>{' '}
                - 设置请求处理器
              </li>
              <li className="text-gray-700">
                <code className="bg-gray-100 px-2 py-1 rounded">
                  start(port: number, hostname?: string): Promise&lt;void&gt;
                </code>{' '}
                - 启动服务器
              </li>
              <li className="text-gray-700">
                <code className="bg-gray-100 px-2 py-1 rounded">stop(): Promise&lt;void&gt;</code> -
                停止服务器
              </li>
            </ul>

            <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Router</h3>
            <ul className="list-disc list-inside space-y-2 my-4">
              <li className="text-gray-700">
                <code className="bg-gray-100 px-2 py-1 rounded">scan(): Promise&lt;void&gt;</code> -
                扫描路由目录
              </li>
              <li className="text-gray-700">
                <code className="bg-gray-100 px-2 py-1 rounded">
                  match(path: string): RouteInfo | null
                </code>{' '}
                - 匹配路由
              </li>
              <li className="text-gray-700">
                <code className="bg-gray-100 px-2 py-1 rounded">getRoutes(): RouteInfo[]</code> -
                获取所有路由
              </li>
            </ul>

            <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Response</h3>
            <ul className="list-disc list-inside space-y-2 my-4">
              <li className="text-gray-700">
                <code className="bg-gray-100 px-2 py-1 rounded">
                  text(content: string, type?: ContentType): void
                </code>{' '}
                - 发送文本
              </li>
              <li className="text-gray-700">
                <code className="bg-gray-100 px-2 py-1 rounded">json(data: any): void</code> - 发送
                JSON
              </li>
              <li className="text-gray-700">
                <code className="bg-gray-100 px-2 py-1 rounded">html(content: string): void</code> -
                发送 HTML
              </li>
              <li className="text-gray-700">
                <code className="bg-gray-100 px-2 py-1 rounded">
                  status(code: number): Response
                </code>{' '}
                - 设置状态码
              </li>
              <li className="text-gray-700">
                <code className="bg-gray-100 px-2 py-1 rounded">
                  setHeader(name: string, value: string): void
                </code>{' '}
                - 设置响应头
              </li>
              <li className="text-gray-700">
                <code className="bg-gray-100 px-2 py-1 rounded">
                  redirect(url: string, status?: number): void
                </code>{' '}
                - 重定向
              </li>
              <li className="text-gray-700">
                <code className="bg-gray-100 px-2 py-1 rounded">
                  sendFile(path: string): Promise&lt;void&gt;
                </code>{' '}
                - 发送文件
              </li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}
