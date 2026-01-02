/**
 * 核心模块 - ApplicationContext (应用上下文) 文档页面
 * 展示 DWeb 框架的 ApplicationContext 类的使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";
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
import { Application } from "@dreamer/dweb";

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

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "ApplicationContext (应用上下文)",
    description: "`ApplicationContext` 提供应用状态和服务的统一访问接口，实现 `AppLike` 接口，供插件系统使用。",
    sections: [
        {
          title: "概述",
          blocks: [
            {
              type: "text",
              content: "`ApplicationContext` 封装了对应用核心组件的访问，提供统一的接口供插件和中间件使用。",
            },
          ],
        },
        {
          title: "快速开始",
          blocks: [
            {
              type: "code",
              code: basicUsageCode,
              language: "typescript",
            },
          ],
        },
        {
          title: "在插件中使用",
          blocks: [
            {
              type: "text",
              content: "`ApplicationContext` 实现了 `AppLike` 接口，可以直接传递给插件：",
            },
            {
              type: "code",
              code: pluginUsageCode,
              language: "typescript",
            },
          ],
        },
        {
          title: "获取配置和环境信息",
          blocks: [
            {
              type: "code",
              code: configEnvCode,
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
              title: "属性",
              blocks: [
                {
                  type: "api",
                  name: "server",
                  description: "获取服务器实例。",
                  code: `const server = context.server;
await server.start(3000);`,
                },
                {
                  type: "api",
                  name: "router",
                  description: "获取路由管理器。",
                  code: `const router = context.router;
const route = router.match("/users/123");`,
                },
                {
                  type: "api",
                  name: "routeHandler",
                  description: "获取路由处理器。",
                  code: `const routeHandler = context.routeHandler;
await routeHandler.handle(req, res);`,
                },
                {
                  type: "api",
                  name: "middleware",
                  description: "获取中间件管理器。",
                  code: `const middleware = context.middleware;
middleware.add(myMiddleware);`,
                },
                {
                  type: "api",
                  name: "plugins",
                  description: "获取插件管理器。",
                  code: `const plugins = context.plugins;
plugins.register(myPlugin);`,
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
                  name: "getConfig()",
                  description: "获取应用配置。",
                  code: `const config = context.getConfig();
const port = config.server?.port;`,
                },
                {
                  type: "api",
                  name: "isProd()",
                  description: "检查是否为生产环境。",
                  code: `if (context.isProd()) {
  // 生产环境逻辑
}`,
                },
                {
                  type: "api",
                  name: "getApplication()",
                  description: "获取应用实例（用于扩展）。",
                  code: `const app = context.getApplication();
const service = app.getService("myService");`,
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
                "[Application (应用核心)](/docs/core/application)",
                "[插件系统](/docs/core/plugin)",
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
