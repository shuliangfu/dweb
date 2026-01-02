/**
 * 核心模块 - Application (应用核心) 文档页面
 * 展示 DWeb 框架的 Application 类的使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "Application (应用核心) - DWeb 框架文档",
  description: "DWeb 框架的 Application 类介绍，统一的应用入口和管理方式",
};

export default function CoreApplicationPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本使用示例
  const basicUsageCode = `// main.ts（可选）
import { AppConfig, cors, i18n, store, theme } from "@dreamer/dweb";

const config: AppConfig = {
  middleware: [
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  ],
  plugins: [
    i18n({
      languages: [
        { code: "en-US", name: "English" },
        { code: "zh-CN", name: "中文" },
      ],
      defaultLanguage: "en-US",
      translationsDir: "locales",
    }),
    theme({
      defaultTheme: "light",
      storageKey: "theme",
    }),
    store({
      persist: true,
      storageKey: "store",
    }),
  ],
};

export default config;

// 注意：服务启动通过 CLI 命令
// deno task dev  # 开发模式
// deno task start  # 生产模式`;

  // 使用配置文件
  const configFileCode = `// main.ts（可选）
import { AppConfig, cors, i18n, store, theme } from "@dreamer/dweb";

const config: AppConfig = {
  middleware: [
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  ],
  plugins: [
    i18n({
      languages: [
        { code: "en-US", name: "English" },
        { code: "zh-CN", name: "中文" },
      ],
      defaultLanguage: "en-US",
      translationsDir: "locales",
    }),
    theme({
      defaultTheme: "light",
      storageKey: "theme",
    }),
    store({
      persist: true,
      storageKey: "store",
    }),
  ],
};

export default config;

// 注意：框架会自动加载 main.ts 或 dweb.config.ts 中的配置
// 服务启动通过 CLI 命令：deno task dev 或 deno task start`;

  // 程序化配置（推荐使用配置文件）
  const programmaticConfigCode = `// main.ts（可选）
import { AppConfig, cors, i18n, store, theme } from "@dreamer/dweb";

const config: AppConfig = {
  middleware: [
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  ],
  plugins: [
    i18n({
      languages: [
        { code: "en-US", name: "English" },
        { code: "zh-CN", name: "中文" },
      ],
      defaultLanguage: "en-US",
      translationsDir: "locales",
    }),
    theme({
      defaultTheme: "light",
      storageKey: "theme",
    }),
    store({
      persist: true,
      storageKey: "store",
    }),
  ],
};

export default config;

// 注意：服务启动通过 CLI 命令
// deno task dev  # 开发模式
// deno task start  # 生产模式`;

  // 注册中间件和插件（推荐使用配置文件）
  const middlewarePluginCode = `// main.ts（可选）
import { AppConfig, cors, i18n, store, theme } from "@dreamer/dweb";

const config: AppConfig = {
  middleware: [
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
    // 自定义中间件
    async (req, res, next) => {
      console.log("请求:", req.url);
      await next();
    },
  ],
  plugins: [
    i18n({
      languages: [
        { code: "en-US", name: "English" },
        { code: "zh-CN", name: "中文" },
      ],
      defaultLanguage: "en-US",
      translationsDir: "locales",
    }),
    theme({
      defaultTheme: "light",
      storageKey: "theme",
    }),
    store({
      persist: true,
      storageKey: "store",
    }),
    // 可以在这里注册更多插件
  ],
};

export default config;

// 注意：服务启动通过 CLI 命令
// deno task dev  # 开发模式
// deno task start  # 生产模式`;

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
  const completeExampleCode = `// main.ts（可选）
import { AppConfig, cors, i18n, store, theme } from "@dreamer/dweb";

const config: AppConfig = {
  middleware: [
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
    // 自定义中间件
    async (req, res, next) => {
      console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.url}\`);
      await next();
    },
  ],
  plugins: [
    i18n({
      languages: [
        { code: "en-US", name: "English" },
        { code: "zh-CN", name: "中文" },
      ],
      defaultLanguage: "en-US",
      translationsDir: "locales",
    }),
    theme({
      defaultTheme: "light",
      storageKey: "theme",
    }),
    store({
      persist: true,
      storageKey: "store",
    }),
  ],
};

export default config;

// 注意：服务启动通过 CLI 命令
// deno task dev  # 开发模式
// deno task start  # 生产模式
// 应用启动后，访问 http://localhost:3000`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "Application (应用核心)",
    description: "`Application` 类是 DWeb 框架的统一入口，管理所有组件和服务，提供面向对象的应用管理方式。",
    sections: [
        {
          title: "核心特性",
          blocks: [
            {
              type: "list",
              ordered: false,
              items: [
                "**生命周期管理**: 完整的应用生命周期钩子（Initialize, Start, Stop, Error）。",
                "**依赖注入容器**: 内置 `ServiceContainer`，支持 Singleton、Transient、Scoped 三种生命周期，实现模块解耦。",
                "**事件驱动架构**: 基于 `EventEmitter`，支持全局事件总线，实现组件间的解耦通信。",
                "**多应用支持**: 支持单体和多应用（Monorepo）架构。",
                "**统一错误处理**: 内置全局异常捕获和统一的错误响应格式。",
                "**自动配置**: 支持约定优于配置，自动加载 `dweb.config.ts` 和环境变量。",
              ],
            },
          ],
        },
        {
          title: "事件驱动架构",
          blocks: [
            {
              type: "text",
              content: "`Application` 类继承自 `EventEmitter`，作为全局事件总线，允许不同组件通过事件进行通信，而无需直接依赖。",
            },
            {
              type: "code",
              code: eventDrivenCode,
              language: "typescript",
            },
          ],
        },
        {
          title: "统一错误处理",
          blocks: [
            {
              type: "text",
              content: "框架内置了全局错误处理机制，能够捕获路由处理、中间件和生命周期中的异常，并返回统一格式的错误响应。",
            },
            {
              type: "list",
              ordered: false,
              items: [
                "**自动捕获**: 自动捕获同步和异步错误。",
                "**内容协商**: 根据请求头自动返回 JSON 或 HTML 格式的错误信息。",
                "**自定义处理**: 支持注册自定义 `ErrorHandler` 来覆盖默认行为。",
              ],
            },
          ],
        },
        {
          title: "快速开始",
          blocks: [
            {
              type: "subsection",
              level: 3,
              title: "基本使用",
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
              title: "使用配置文件",
              blocks: [
                {
                  type: "code",
                  code: configFileCode,
                  language: "typescript",
                },
              ],
            },
            {
              type: "subsection",
              level: 3,
              title: "程序化配置",
              blocks: [
                {
                  type: "code",
                  code: programmaticConfigCode,
                  language: "typescript",
                },
              ],
            },
          ],
        },
        {
          title: "注册中间件和插件",
          blocks: [
            {
              type: "code",
              code: middlewarePluginCode,
              language: "typescript",
            },
          ],
        },
        {
          title: "获取服务",
          blocks: [
            {
              type: "text",
              content: "通过 `getService` 方法获取已注册的服务：",
            },
            {
              type: "code",
              code: getServiceCode,
              language: "typescript",
            },
          ],
        },
        {
          title: "完整示例",
          blocks: [
            {
              type: "code",
              code: completeExampleCode,
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
              title: "构造函数",
              blocks: [
                {
                  type: "code",
                  code: "constructor(configPath?: string, appName?: string)",
                  language: "typescript",
                },
                {
                  type: "text",
                  content: "**参数：**",
                },
                {
                  type: "list",
                  ordered: false,
                  items: [
                    "`configPath` (可选): 配置文件路径，如果不提供则自动查找 `dweb.config.ts`",
                    "`appName` (可选): 应用名称，用于多应用模式",
                  ],
                },
              ],
            },
            {
              type: "subsection",
              level: 3,
              title: "方法",
              blocks: [
                {
                  type: "api",
                  name: "initialize()",
                  description: "初始化应用，加载配置、注册服务、初始化路由和服务器。",
                  code: "await app.initialize();",
                },
                {
                  type: "api",
                  name: "start()",
                  description: "启动应用，启动服务器并进入运行状态。",
                  code: "await app.start();",
                },
                {
                  type: "api",
                  name: "stop()",
                  description: "停止应用，停止服务器并清理资源。",
                  code: "await app.stop();",
                },
                {
                  type: "api",
                  name: "getService<T>(token)",
                  description: "获取已注册的服务。",
                  code: 'const logger = app.getService<Logger>("logger");',
                },
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
                "[ApplicationContext (应用上下文)](/docs/core/application-context)",
                "[ConfigManager (配置管理器)](/docs/core/config-manager)",
                "[ServiceContainer (服务容器)](/docs/core/service-container)",
                "[LifecycleManager (生命周期管理器)](/docs/core/lifecycle-manager)",
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
