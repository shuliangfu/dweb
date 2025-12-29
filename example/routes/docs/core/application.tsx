/**
 * 核心模块 - Application (应用核心) 文档页面
 * 展示 DWeb 框架的 Application 类的使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "Application (应用核心) - DWeb 框架文档",
  description: "DWeb 框架的 Application 类介绍，统一的应用入口和管理方式",
};

export default function CoreApplicationPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本使用示例
  const basicUsageCode = `// main.ts
import { Application } from "@dreamer/dweb";

// 创建应用实例
const app = new Application("dweb.config.ts");

// 初始化应用（加载配置、注册服务、初始化路由等）
await app.initialize();

// 启动应用
await app.start();`;

  // 使用配置文件
  const configFileCode = `// main.ts
import { Application } from "@dreamer/dweb";

// 自动查找 dweb.config.ts
const app = new Application();

// 或指定配置文件路径
const app = new Application("./config/dweb.config.ts");

// 多应用模式
const app = new Application("./dweb.config.ts", "backend");

await app.initialize();
await app.start();`;

  // 程序化配置
  const programmaticConfigCode = `// main.ts
import { Application } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  server: { port: 3000 },
  routes: { dir: "routes" },
  isProduction: false,
};

const app = new Application();
const configManager = app.getService("configManager") as any;
configManager.setConfig(config);

await app.initialize();
await app.start();`;

  // 注册中间件和插件
  const middlewarePluginCode = `// main.ts
import { Application } from "@dreamer/dweb";

const app = new Application("dweb.config.ts");
await app.initialize();

// 注册中间件
app.use(async (req, res, next) => {
  console.log("请求:", req.url);
  await next();
});

// 注册插件
app.plugin({
  name: "my-plugin",
  onInit: async (app) => {
    console.log("插件初始化");
  },
});

await app.start();`;

  // 获取服务
  const getServiceCode = `// 在中间件或插件中获取服务
import type { Application } from "@dreamer/dweb";
import type { Logger } from "@dreamer/dweb";

// 获取 Logger 服务
const logger = app.getService<Logger>("logger");
logger.info("应用已启动");

// 获取其他服务
const configManager = app.getService("configManager");
const server = app.getService("server");`;

  // 事件驱动架构
  const eventDrivenCode = `// 监听事件
app.on("server:start", () => {
  console.log("Server started!");
});

// 自定义事件
app.on("user:login", (user) => {
  // 处理用户登录
});

// 在其他服务中触发事件 (需要获取 Application 实例)
app.emit("user:login", { id: 1, name: "Alice" });`;

  // 完整示例
  const completeExampleCode = `// main.ts
import { Application } from "@dreamer/dweb";
import { cors, logger } from "@dreamer/dweb";

const app = new Application("dweb.config.ts");

// 初始化应用
await app.initialize();

// 注册中间件
app.use(logger());
app.use(cors({ origin: "*" }));

// 自定义中间件
app.use(async (req, res, next) => {
  console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.url}\`);
  await next();
});

// 启动应用
await app.start();

console.log("应用已启动，访问 http://localhost:3000");`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        Application (应用核心)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
          Application
        </code>{" "}
        类是 DWeb 框架的统一入口，
        管理所有组件和服务，提供面向对象的应用管理方式。
      </p>

      {/* 核心特性 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          核心特性
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li><strong>生命周期管理</strong>: 完整的应用生命周期钩子（Initialize, Start, Stop, Error）。</li>
          <li><strong>依赖注入容器</strong>: 内置 <code>ServiceContainer</code>，支持 Singleton、Transient、Scoped 三种生命周期，实现模块解耦。</li>
          <li><strong>事件驱动架构</strong>: 基于 <code>EventEmitter</code>，支持全局事件总线，实现组件间的解耦通信。</li>
          <li><strong>多应用支持</strong>: 支持单体和多应用（Monorepo）架构。</li>
          <li><strong>统一错误处理</strong>: 内置全局异常捕获和统一的错误响应格式。</li>
          <li><strong>自动配置</strong>: 支持约定优于配置，自动加载 <code>dweb.config.ts</code> 和环境变量。</li>
        </ul>
      </section>

      {/* 事件驱动架构 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          事件驱动架构
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            Application
          </code>{" "}
          类继承自 <code>EventEmitter</code>，作为全局事件总线，允许不同组件通过事件进行通信，而无需直接依赖。
        </p>
        <CodeBlock code={eventDrivenCode} language="typescript" />
      </section>

      {/* 统一错误处理 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          统一错误处理
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          框架内置了全局错误处理机制，能够捕获路由处理、中间件和生命周期中的异常，并返回统一格式的错误响应。
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li><strong>自动捕获</strong>: 自动捕获同步和异步错误。</li>
          <li><strong>内容协商</strong>: 根据请求头自动返回 JSON 或 HTML 格式的错误信息。</li>
          <li><strong>自定义处理</strong>: 支持注册自定义 <code>ErrorHandler</code> 来覆盖默认行为。</li>
        </ul>
      </section>

      {/* 快速开始 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          基本使用
        </h3>
        <CodeBlock code={basicUsageCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          使用配置文件
        </h3>
        <CodeBlock code={configFileCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          程序化配置
        </h3>
        <CodeBlock code={programmaticConfigCode} language="typescript" />
      </section>

      {/* 注册中间件和插件 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          注册中间件和插件
        </h2>
        <CodeBlock code={middlewarePluginCode} language="typescript" />
      </section>

      {/* 获取服务 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          获取服务
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          通过{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            getService
          </code>{" "}
          方法获取已注册的服务：
        </p>
        <CodeBlock code={getServiceCode} language="typescript" />
      </section>

      {/* 完整示例 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          完整示例
        </h2>
        <CodeBlock code={completeExampleCode} language="typescript" />
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
          code={`constructor(configPath?: string, appName?: string)`}
          language="typescript"
        />
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <strong>参数：</strong>
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              configPath
            </code>{" "}
            (可选): 配置文件路径，如果不提供则自动查找{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              dweb.config.ts
            </code>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              appName
            </code>{" "}
            (可选): 应用名称，用于多应用模式
          </li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方法
        </h3>

        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                initialize()
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              初始化应用，加载配置、注册服务、初始化路由和服务器。
            </p>
            <CodeBlock code={`await app.initialize();`} language="typescript" />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                start()
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              启动应用，启动服务器并进入运行状态。
            </p>
            <CodeBlock code={`await app.start();`} language="typescript" />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                stop()
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              停止应用，停止服务器并清理资源。
            </p>
            <CodeBlock code={`await app.stop();`} language="typescript" />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                use(middleware)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              注册中间件。
            </p>
            <CodeBlock
              code={`app.use(async (req, res, next) => {
  // 中间件逻辑
  await next();
});`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                plugin(plugin)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              注册插件。
            </p>
            <CodeBlock
              code={`app.plugin({
  name: "my-plugin",
  onInit: async (app) => {
    // 插件初始化逻辑
  },
});`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                getService&lt;T&gt;(token)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              获取已注册的服务。
            </p>
            <CodeBlock
              code={`const logger = app.getService<Logger>("logger");`}
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
              href="/docs/core/application-context"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ApplicationContext (应用上下文)
            </a>
          </li>
          <li>
            <a
              href="/docs/core/config-manager"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ConfigManager (配置管理器)
            </a>
          </li>
          <li>
            <a
              href="/docs/core/service-container"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ServiceContainer (服务容器)
            </a>
          </li>
          <li>
            <a
              href="/docs/core/lifecycle-manager"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              LifecycleManager (生命周期管理器)
            </a>
          </li>
          <li>
            <a
              href="/docs/core/server"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              服务器 (Server)
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}
