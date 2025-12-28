/**
 * 核心模块 - RouteHandler (路由处理器) 文档页面
 * 展示 DWeb 框架的路由处理器功能和使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "RouteHandler (路由处理器) - DWeb 框架文档",
  description:
    "DWeb 框架的路由处理器使用指南，负责处理页面路由、API 路由、模块请求等",
};

export default function CoreRouteHandlerPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 功能概述
  const overviewCode = `RouteHandler 是框架的核心组件，负责：

- 处理页面路由（SSR/CSR/Hybrid）
- 处理 API 路由
- 处理模块请求（/__modules/）
- 处理 GraphQL 请求
- 资源预加载（Prefetch）
- 热模块替换（HMR）支持`;

  // 基本使用
  const basicUsageCode = `// RouteHandler 通常由 Application 类内部使用
import { Application } from "@dreamer/dweb/core/application";

const app = new Application("dweb.config.ts");
await app.initialize();
await app.start();

// RouteHandler 会自动处理所有请求`;

  // 处理流程 - 页面路由
  const pageRouteFlowCode = `页面路由处理流程：

1. 匹配路由
2. 加载页面模块
3. 执行 load 函数（数据加载）
4. 渲染页面组件（SSR）或返回客户端脚本（CSR）
5. 注入 HMR 脚本（开发模式）`;

  // 处理流程 - API 路由
  const apiRouteFlowCode = `API 路由处理流程：

1. 匹配 API 路由
2. 加载 API 模块
3. 创建 ApiContext（包含 req, res, app, cookie, session, params, query, routePath, url）
4. 根据 HTTP 方法或方法名调用对应处理函数
5. 返回响应`;

  // 重要提示
  const importantNoteCode = `⚠️ 重要提示：

页面组件和布局组件不能是异步函数（async function）。

如果需要进行异步操作，请在组件内部使用 useEffect 钩子处理，
或者使用 load 函数在服务端获取数据。

详细说明请参考路由约定文件文档。`;

  // 资源预加载
  const prefetchCode = `// 在 dweb.config.ts 中配置
export default {
  prefetch: {
    enabled: true,
    routes: ["*", "!/docs/*"],  // 预加载所有路由，但排除 docs 下的页面
    mode: "batch",              // 批量模式（一次请求，服务端打包返回所有匹配路由的数据）
    loading: false,             // 是否在预加载时显示全屏加载状态
  },
};`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        RouteHandler (路由处理器)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 框架的路由处理器，负责处理页面路由、API 路由、模块请求等。
      </p>

      {/* 功能概述 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          功能概述
        </h2>
        <CodeBlock code={overviewCode} language="text" />
      </section>

      {/* 基本使用 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={basicUsageCode} language="typescript" />
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-600 p-4 my-4 rounded">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>注意：</strong>
            <code className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">
              RouteHandler
            </code>{" "}
            通常由{" "}
            <code className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">
              Application
            </code>{" "}
            类内部使用，
            不需要手动创建。如果需要自定义路由处理逻辑，可以通过中间件或插件来实现。
          </p>
        </div>
      </section>

      {/* 处理流程 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          处理流程
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          页面路由处理
        </h3>
        <CodeBlock code={pageRouteFlowCode} language="text" />
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-600 p-4 my-4 rounded">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm font-semibold mb-2">
            ⚠️ 重要提示：
          </p>
          <CodeBlock code={importantNoteCode} language="text" />
        </div>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          API 路由处理
        </h3>
        <CodeBlock code={apiRouteFlowCode} language="text" />
      </section>

      {/* 资源预加载 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          资源预加载
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          资源预加载（Prefetch）可以在用户访问前提前加载路由组件，提升用户体验。
        </p>
        <CodeBlock code={prefetchCode} language="typescript" />
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-600 p-4 my-4 rounded">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>配置说明：</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200 text-sm mt-2">
            <li>
              <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                routes
              </code>：支持通配符模式（<code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                *
              </code>）和否定模式（<code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                !
              </code>）
            </li>
            <li>
              <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                mode
              </code>：<code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                single
              </code>（逐个请求）或{" "}
              <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                batch
              </code>（批量请求，默认）
            </li>
            <li>
              <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                loading
              </code>：是否在预加载时显示全屏加载状态
            </li>
          </ul>
        </div>
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          构造函数
        </h3>
        <CodeBlock
          code={`constructor(
  router: Router,
  cookieManager?: CookieManager,
  sessionManager?: SessionManager,
  config?: AppConfig,
  graphqlServer?: GraphQLServer
)`}
          language="typescript"
        />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          主要方法
        </h3>

        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                handle(req, res)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              处理请求的统一入口。
            </p>
            <CodeBlock
              code={`await routeHandler.handle(req, res);`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                handlePageRoute(routeInfo, req, res)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              处理页面路由。
            </p>
            <CodeBlock
              code={`await routeHandler.handlePageRoute(routeInfo, req, res);`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                handleApiRoute(routeInfo, req, res)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              处理 API 路由。
            </p>
            <CodeBlock
              code={`await routeHandler.handleApiRoute(routeInfo, req, res);`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                handleModuleRequest(req, res)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              处理模块请求（<code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                /__modules/
              </code>）。
            </p>
            <CodeBlock
              code={`await routeHandler.handleModuleRequest(req, res);`}
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
              href="/docs/core/server"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              服务器 (Server)
            </a>
          </li>
          <li>
            <a
              href="/docs/core/router"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              路由系统 (Router)
            </a>
          </li>
          <li>
            <a
              href="/docs/core/api"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              API 路由
            </a>
          </li>
          <li>
            <a
              href="/docs/features/hmr"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              热模块替换 (HMR)
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}
