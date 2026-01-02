/**
 * 核心模块 - RouteHandler (路由处理器) 文档页面
 * 展示 DWeb 框架的路由处理器功能和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";
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
import { Application } from "@dreamer/dweb";

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

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "RouteHandler (路由处理器)",
    description: "DWeb 框架的路由处理器，负责处理页面路由、API 路由、模块请求等。",
    sections: [
      {
        title: "功能概述",
        blocks: [
          {
            type: "code",
            code: overviewCode,
            language: "text",
          },
        ],
      },
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: basicUsageCode,
            language: "typescript",
          },
          {
            type: "alert",
            level: "info",
            content: [
              "**注意：** `RouteHandler` 通常由 `Application` 类内部使用，不需要手动创建。如果需要自定义路由处理逻辑，可以通过中间件或插件来实现。",
            ],
          },
        ],
      },
      {
        title: "处理流程",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "页面路由处理",
            blocks: [
              {
                type: "code",
                code: pageRouteFlowCode,
                language: "text",
              },
              {
                type: "alert",
                level: "warning",
                content: [
                  "**⚠️ 重要提示：**",
                  importantNoteCode,
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "API 路由处理",
            blocks: [
              {
                type: "code",
                code: apiRouteFlowCode,
                language: "text",
              },
            ],
          },
        ],
      },
      {
        title: "资源预加载",
        blocks: [
          {
            type: "text",
            content: "资源预加载（Prefetch）可以在用户访问前提前加载路由组件，提升用户体验。",
          },
          {
            type: "code",
            code: prefetchCode,
            language: "typescript",
          },
          {
            type: "alert",
            level: "info",
            content: [
              "**配置说明：**",
              "**`routes`**：支持通配符模式（`*`）和否定模式（`!`）",
              "**`mode`**：`single`（逐个请求）或 `batch`（批量请求，默认）",
              "**`loading`**：是否在预加载时显示全屏加载状态",
            ],
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
                code: `constructor(
  router: Router,
  cookieManager?: CookieManager,
  sessionManager?: SessionManager,
  config?: AppConfig,
  graphqlServer?: GraphQLServer
)`,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "主要方法",
            blocks: [
              {
                type: "api",
                name: "handle(req, res)",
                description: "处理请求的统一入口。",
                code: "await routeHandler.handle(req, res);",
              },
              {
                type: "api",
                name: "handlePageRoute(routeInfo, req, res)",
                description: "处理页面路由。",
                code: "await routeHandler.handlePageRoute(routeInfo, req, res);",
              },
              {
                type: "api",
                name: "handleApiRoute(routeInfo, req, res)",
                description: "处理 API 路由。",
                code: "await routeHandler.handleApiRoute(routeInfo, req, res);",
              },
              {
                type: "api",
                name: "handleModuleRequest(req, res)",
                description: "处理模块请求（`/__modules/`）。",
                code: "await routeHandler.handleModuleRequest(req, res);",
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
              "[服务器 (Server)](/docs/core/server)",
              "[路由系统 (Router)](/docs/core/router)",
              "[API 路由](/docs/core/api)",
              "[热模块替换 (HMR)](/docs/features/hmr)",
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
