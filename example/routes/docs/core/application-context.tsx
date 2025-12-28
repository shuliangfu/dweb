/**
 * 核心模块 - ApplicationContext (应用上下文) 文档页面
 * 展示 DWeb 框架的 ApplicationContext 类的使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "ApplicationContext (应用上下文) - DWeb 框架文档",
  description:
    "DWeb 框架的 ApplicationContext 类介绍，提供应用状态和服务的统一访问接口",
};

export default function CoreApplicationContextPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本使用示例
  const basicUsageCode = `// main.ts
import { Application } from "@dreamer/dweb/core/application";

const app = new Application();
await app.initialize();

// 获取应用上下文
const context = app.getContext();

// 访问核心组件
const server = context.server;
const router = context.router;
const routeHandler = context.routeHandler;
const middleware = context.middleware;
const plugins = context.plugins;`;

  // 在插件中使用
  const pluginUsageCode = `// 在插件中使用 ApplicationContext
import type { Plugin } from "@dreamer/dweb";

const myPlugin: Plugin = {
  name: "my-plugin",
  onInit: async (app) => {
    // app 是 ApplicationContext 实例
    const server = app.server;
    const config = app.getConfig();
    
    console.log("服务器端口:", config.server?.port);
  },
};`;

  // 获取配置和环境信息
  const configEnvCode = `// 获取配置和环境信息
const context = app.getContext();

// 获取应用配置
const config = context.getConfig();
const port = config.server?.port;

// 检查是否为生产环境
if (context.isProd()) {
  // 生产环境逻辑
  console.log("运行在生产环境");
} else {
  // 开发环境逻辑
  console.log("运行在开发环境");
}

// 获取应用实例（用于扩展）
const application = context.getApplication();
const service = application.getService("myService");`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        ApplicationContext (应用上下文)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
          ApplicationContext
        </code>{" "}
        提供应用状态和服务的统一访问接口， 实现{" "}
        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
          AppLike
        </code>{" "}
        接口，供插件系统使用。
      </p>

      {/* 概述 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          概述
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            ApplicationContext
          </code>{" "}
          封装了对应用核心组件的访问， 提供统一的接口供插件和中间件使用。
        </p>
      </section>

      {/* 快速开始 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>
        <CodeBlock code={basicUsageCode} language="typescript" />
      </section>

      {/* 在插件中使用 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          在插件中使用
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            ApplicationContext
          </code>{" "}
          实现了{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            AppLike
          </code>{" "}
          接口， 可以直接传递给插件：
        </p>
        <CodeBlock code={pluginUsageCode} language="typescript" />
      </section>

      {/* 获取配置和环境信息 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          获取配置和环境信息
        </h2>
        <CodeBlock code={configEnvCode} language="typescript" />
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          属性
        </h3>

        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                server
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              获取服务器实例。
            </p>
            <CodeBlock
              code={`const server = context.server;
await server.start(3000);`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                router
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              获取路由管理器。
            </p>
            <CodeBlock
              code={`const router = context.router;
const route = router.match("/users/123");`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                routeHandler
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              获取路由处理器。
            </p>
            <CodeBlock
              code={`const routeHandler = context.routeHandler;
await routeHandler.handle(req, res);`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                middleware
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              获取中间件管理器。
            </p>
            <CodeBlock
              code={`const middleware = context.middleware;
middleware.add(myMiddleware);`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                plugins
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              获取插件管理器。
            </p>
            <CodeBlock
              code={`const plugins = context.plugins;
plugins.register(myPlugin);`}
              language="typescript"
            />
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方法
        </h3>

        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                getConfig()
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              获取应用配置。
            </p>
            <CodeBlock
              code={`const config = context.getConfig();
const port = config.server?.port;`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                isProd()
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              检查是否为生产环境。
            </p>
            <CodeBlock
              code={`if (context.isProd()) {
  // 生产环境逻辑
}`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                getApplication()
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              获取应用实例（用于扩展）。
            </p>
            <CodeBlock
              code={`const app = context.getApplication();
const service = app.getService("myService");`}
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
              href="/docs/core/plugin"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              插件系统
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}
