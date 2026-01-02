/**
 * 路由约定文件文档页面
 * 展示 DWeb 框架的路由约定文件使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "路由约定文件 - DWeb 框架文档",
  description:
    "DWeb 框架的路由约定文件介绍，包括 _app.tsx、_layout.tsx、_middleware.ts 等",
};

export default function RoutingConventionsPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // _app.tsx 基本结构
  const appCode = `// routes/_app.tsx
export interface AppProps {
  /** 页面内容（已渲染的 HTML） */
  children: string;
}

export default function App({ children }: AppProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>我的应用</title>
        <link rel="stylesheet" href="/assets/style.css" />
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}`;

  // _layout.tsx 基本结构
  const layoutCode = `// routes/_layout.tsx
import type { ComponentChildren } from "preact";

interface LayoutProps {
  children: ComponentChildren;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header>导航栏</header>
      <main>{children}</main>
      <footer>页脚</footer>
    </div>
  );
}`;

  // _middleware.ts 基本结构
  const middlewareCode = `// routes/_middleware.ts
import type { Middleware } from "@dreamer/dweb";

const routeMiddleware: Middleware = async (req, res, next) => {
  // 请求处理前的逻辑
  console.log(\`[中间件] \${req.method} \${req.url}\`);

  // 调用下一个中间件或路由处理器
  await next();

  // 请求处理后的逻辑
  res.setHeader("X-Processed", "true");
};

export default routeMiddleware;`;

  // 多个中间件
  const multipleMiddlewareCode = `// routes/api/_middleware.ts
import type { Middleware } from "@dreamer/dweb";

const authMiddleware: Middleware = async (req, res, next) => {
  // 认证逻辑
  const token = req.headers.get("Authorization");
  if (!token) {
    res.status = 401;
    res.json({ error: "Unauthorized" });
    return;
  }
  await next();
};

const loggerMiddleware: Middleware = async (req, res, next) => {
  console.log(\`[API] \${req.method} \${req.url}\`);
  await next();
};

// 导出中间件数组，按顺序执行
export default [authMiddleware, loggerMiddleware];`;

  // 页面组件基本结构
  const pageComponentCode = `// routes/about.tsx
import type { PageProps } from '@dreamer/dweb';

export default function AboutPage({ params, query, data }: PageProps) {
  return (
    <div>
      <h1>关于我们</h1>
      <p>这是关于页面</p>
    </div>
  );
}`;

  // 使用 load 函数
  const loadFunctionCode = `// ✅ 正确：使用 load 函数在服务端获取数据
import type { PageProps, LoadContext } from '@dreamer/dweb';

// load 函数在服务端执行，可以异步获取数据
export async function load({ params, query }: LoadContext) {
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  return { apiData: data };
}

// 页面组件接收 load 函数返回的数据
export default function MyPage({ params, query, data }: PageProps) {
  const apiData = data.apiData as { title: string };
  return <div>{apiData.title}</div>;
}`;

  // _404.tsx
  const notFoundCode = `// routes/_404.tsx
export const metadata = {
  title: "404 - 页面未找到",
  description: "抱歉，您访问的页面不存在。",
};

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-indigo-600 mb-4">404</h1>
        <h2 className="text-3xl font-semibold text-gray-800 mb-4">
          页面未找到
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          抱歉，您访问的页面不存在。请检查 URL 是否正确，或返回首页。
        </p>
        <a
          href="/"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}`;

  // _error.tsx
  const errorCode = `// routes/_error.tsx
export const metadata = {
  title: "500 - 服务器错误",
  description: "发生了服务器错误。请稍后重试。",
};

interface ErrorProps {
  error?: {
    message?: string;
    statusCode?: number;
  };
}

export default function ErrorPage({ error }: ErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-9xl font-bold text-red-600 mb-4">500</h1>
        <h2 className="text-3xl font-semibold text-gray-800 mb-4">
          服务器错误
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          {error?.message || "发生了未知错误。请稍后重试，或联系管理员。"}
        </p>
        <a
          href="/"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "路由约定文件",
    description: "DWeb 框架使用文件系统路由，并支持以 `_` 开头的特殊约定文件。这些文件具有特殊的功能，用于定义布局、中间件、错误页面等。",
    sections: [
      {
        title: "约定文件概览",
        blocks: [
          {
            type: "text",
            content: "DWeb 框架支持以下约定文件：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "**`_app.tsx`** - 应用组件，✅ 必需，根应用组件，包裹所有页面",
              "**`_layout.tsx`** - 布局组件，❌ 可选，布局组件，支持继承",
              "**`_middleware.ts`** - 中间件，❌ 可选，路由级中间件",
              "**`_404.tsx`** - 错误页面，❌ 可选，404 页面未找到",
              "**`_error.tsx`** - 错误页面，❌ 可选，通用错误页面",
              "**`_500.tsx`** - 错误页面，❌ 可选，500 服务器错误",
            ],
          },
        ],
      },

      {
        title: "文件结构示例",
        blocks: [
          {
            type: "code",
            code: `routes/
├── _app.tsx              # 根应用组件（必需）
├── _layout.tsx            # 根布局（可选）
├── _middleware.ts         # 根中间件（可选）
├── _404.tsx               # 404 错误页面（可选）
├── _error.tsx             # 通用错误页面（可选）
├── _500.tsx               # 500 错误页面（可选）
├── index.tsx               # 首页 (/)
├── about.tsx               # 关于页面 (/about)
├── users/
│   ├── _layout.tsx        # 用户布局（应用到 /users 下的所有页面）
│   ├── _middleware.ts     # 用户中间件（应用到 /users 下的所有路由）
│   ├── index.tsx           # /users
│   └── [id].tsx            # /users/:id
└── api/
    └── _middleware.ts      # API 中间件（应用到 /api 下的所有路由）`,
            language: "text",
          },
        ],
      },
      {
        title: "_app.tsx - 根应用组件",
        blocks: [
          {
            type: "text",
            content: "`_app.tsx` 是框架**必需**的文件，用于提供完整的 HTML 文档结构，包裹所有页面内容。",
          },
          {
            type: "subsection",
            level: 3,
            title: "位置",
            blocks: [
              {
                type: "text",
                content: "必须放在 `routes` 目录的根目录下：",
              },
              {
                type: "code",
                code: `routes/
└── _app.tsx  ✅ 正确`,
                language: "text",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "基本结构",
            blocks: [
              {
                type: "code",
                code: appCode,
                language: "tsx",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "重要说明",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**必需文件**：`_app.tsx` 是框架必需的文件，如果不存在会导致应用无法启动",
                  "**HTML 结构**：必须包含完整的 HTML 文档结构（`<html>`、`<head>`、`<body>`）",
                  "**children 属性**：接收已渲染的页面 HTML 字符串",
                  "**自动注入**：框架会自动注入客户端脚本、HMR 脚本等，无需手动添加",
                ],
              },
            ],
          },
        ],
      },

      {
        title: "_layout.tsx - 布局组件",
        blocks: [
          {
            type: "text",
            content: "`_layout.tsx` 用于定义页面布局，支持布局继承。详细说明请参考 [布局系统文档](/docs/layout)。",
          },
          {
            type: "subsection",
            level: 3,
            title: "位置",
            blocks: [
              {
                type: "text",
                content: "可以放在任何目录下：",
              },
              {
                type: "code",
                code: `routes/
├── _layout.tsx            # 根布局（应用到所有页面）
└── docs/
    └── _layout.tsx        # 文档布局（应用到 /docs 下的所有页面）`,
                language: "text",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "基本结构",
            blocks: [
              {
                type: "code",
                code: layoutCode,
                language: "tsx",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "⚠️ 重要限制：布局组件不能是异步函数",
            blocks: [
              {
                type: "text",
                content: "**布局组件不能定义为 `async function`**。如果需要进行异步操作（如数据获取），请在组件内部使用 `useEffect` 钩子处理。",
              },
            ],
          },
        ],
      },

      {
        title: "_middleware.ts - 路由中间件",
        blocks: [
          {
            type: "text",
            content: "`_middleware.ts` 用于定义路由级中间件，可以为特定路径及其子路径应用中间件逻辑。详细说明请参考 [路由级中间件文档](/docs/middleware/route-middleware)。",
          },
          {
            type: "subsection",
            level: 3,
            title: "位置",
            blocks: [
              {
                type: "text",
                content: "可以放在任何目录下：",
              },
              {
                type: "code",
                code: `routes/
├── _middleware.ts          # 根中间件（应用到所有路由）
└── api/
    └── _middleware.ts      # API 中间件（应用到 /api 下的所有路由）`,
                language: "text",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "基本结构",
            blocks: [
              {
                type: "text",
                content: "**单个中间件**",
              },
              {
                type: "code",
                code: middlewareCode,
                language: "tsx",
              },
              {
                type: "text",
                content: "**多个中间件**",
              },
              {
                type: "code",
                code: multipleMiddlewareCode,
                language: "tsx",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "中间件继承",
            blocks: [
              {
                type: "text",
                content: "中间件会按照路径层级从根到具体路径依次执行：",
              },
              {
                type: "text",
                content: "访问 `/api/users` 时：",
              },
              {
                type: "list",
                ordered: true,
                items: [
                  "`routes/_middleware.ts`（根中间件）",
                  "`routes/api/_middleware.ts`（API 中间件）",
                ],
              },
            ],
          },
        ],
      },

      {
        title: "页面组件",
        blocks: [
          {
            type: "text",
            content: "页面组件是路由目录中的普通文件（如 `index.tsx`、`about.tsx`），用于定义页面的内容和逻辑。",
          },
          {
            type: "subsection",
            level: 3,
            title: "基本结构",
            blocks: [
              {
                type: "code",
                code: pageComponentCode,
                language: "tsx",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "⚠️ 重要限制：页面组件不能是异步函数",
            blocks: [
              {
                type: "text",
                content: "**页面组件不能定义为 `async function`**。如果需要进行异步操作（如数据获取），请在组件内部使用 `useEffect` 钩子处理，或者使用 `load` 函数在服务端获取数据。",
              },
              {
                type: "text",
                content: "**✅ 正确示例：使用 load 函数在服务端获取数据**",
              },
              {
                type: "code",
                code: loadFunctionCode,
                language: "tsx",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "页面组件 Props",
            blocks: [
              {
                type: "text",
                content: "页面组件接收以下 props：",
              },
              {
                type: "list",
                ordered: false,
                items: [
                  "**`params`**: 路由参数（如 `/users/:id` 中的 `id`）",
                  "**`query`**: 查询参数（URL 中的 `?key=value`）",
                  "**`data`**: `load` 函数返回的数据",
                  "**`lang`**: 当前语言代码（如果配置了 i18n 插件）",
                  "**`store`**: 状态管理 Store（如果配置了 store 插件）",
                  "**`metadata`**: 页面元数据",
                  "**`routePath`**: 当前路由路径",
                  "**`url`**: URL 对象",
                ],
              },
            ],
          },
        ],
      },

      {
        title: "_404.tsx - 404 错误页面",
        blocks: [
          {
            type: "text",
            content: "`_404.tsx` 用于定义 404 页面未找到时的错误页面。",
          },
          {
            type: "subsection",
            level: 3,
            title: "位置",
            blocks: [
              {
                type: "text",
                content: "必须放在 `routes` 目录的根目录下：",
              },
              {
                type: "code",
                code: `routes/
└── _404.tsx  ✅ 正确`,
                language: "text",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "基本结构",
            blocks: [
              {
                type: "code",
                code: notFoundCode,
                language: "tsx",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用说明",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**自动触发**：当访问不存在的路由时，框架会自动使用 `_404.tsx` 渲染 404 页面",
                  "**状态码**：框架会自动设置响应状态码为 404",
                  "**SEO**：建议设置 `metadata.robots = false`，避免搜索引擎索引 404 页面",
                ],
              },
            ],
          },
        ],
      },
      {
        title: "_error.tsx - 通用错误页面",
        blocks: [
          {
            type: "text",
            content: "`_error.tsx` 用于定义通用错误页面，处理服务器错误、渲染错误等。",
          },
          {
            type: "subsection",
            level: 3,
            title: "位置",
            blocks: [
              {
                type: "text",
                content: "必须放在 `routes` 目录的根目录下：",
              },
              {
                type: "code",
                code: `routes/
└── _error.tsx  ✅ 正确`,
                language: "text",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "基本结构",
            blocks: [
              {
                type: "code",
                code: errorCode,
                language: "tsx",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用说明",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**自动触发**：当发生服务器错误、渲染错误等时，框架会自动使用 `_error.tsx` 渲染错误页面",
                  "**错误信息**：组件会接收 `error` 属性，包含错误信息",
                  "**状态码**：框架会根据错误类型自动设置响应状态码（通常是 500）",
                ],
              },
            ],
          },
        ],
      },
      {
        title: "错误页面优先级",
        blocks: [
          {
            type: "text",
            content: "当发生错误时，框架会按以下优先级选择错误页面：",
          },
          {
            type: "list",
            ordered: true,
            items: [
              "`_500.tsx` - 专门处理 500 错误",
              "`_error.tsx` - 处理其他错误",
              "`_404.tsx` - 处理 404 错误",
              "默认错误页面 - 如果以上都不存在",
            ],
          },
        ],
      },

      {
        title: "约定文件总结",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "必需文件",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "✅ **`_app.tsx`** - 根应用组件（必需）",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "可选文件",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "❌ **`_layout.tsx`** - 布局组件（可选，支持继承）",
                  "❌ **`_middleware.ts`** - 路由中间件（可选）",
                  "❌ **`_404.tsx`** - 404 错误页面（可选）",
                  "❌ **`_error.tsx`** - 通用错误页面（可选）",
                  "❌ **`_500.tsx`** - 500 错误页面（可选）",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "文件命名规则",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "所有约定文件都以 `_` 下划线开头",
                  "支持 `.tsx` 和 `.ts` 扩展名（`_middleware.ts` 只支持 `.ts`）",
                  "文件名必须完全匹配（区分大小写）",
                ],
              },
            ],
          },
        ],
      },
      {
        title: "最佳实践",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "1. 保持 _app.tsx 简洁",
            blocks: [
              {
                type: "text",
                content: "`_app.tsx` 应该只包含 HTML 文档结构，业务逻辑应该放在布局或页面组件中。",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "2. 合理使用布局继承",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "使用根布局提供全局结构",
                  "使用子布局提供特定区域的布局",
                  "在需要完全独立布局时使用 `layout = false`",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "3. 中间件职责分离",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "使用全局中间件处理通用功能（CORS、压缩等）",
                  "使用路由中间件处理路径特定的逻辑（认证、日志等）",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "4. 错误页面友好",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "提供清晰的错误信息",
                  "提供返回首页或相关页面的链接",
                  "设置合适的 SEO 元数据（`robots: false`）",
                ],
              },
            ],
          },
        ],
      },
      {
        title: "常见问题",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "Q: 可以创建多个 _app.tsx 吗？",
            blocks: [
              {
                type: "text",
                content: "A: 不可以。`_app.tsx` 只能有一个，必须放在 `routes/` 根目录。",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "Q: _layout.tsx 和 _app.tsx 的区别是什么？",
            blocks: [
              {
                type: "text",
                content: "A:",
              },
              {
                type: "list",
                ordered: false,
                items: [
                  "**`_app.tsx`**：提供 HTML 文档结构（`<html>`、`<head>`、`<body>`），必需",
                  "**`_layout.tsx`**：提供页面布局结构（导航、侧边栏等），可选，支持继承",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "Q: 中间件和布局的执行顺序是什么？",
            blocks: [
              {
                type: "text",
                content: "A:",
              },
              {
                type: "list",
                ordered: true,
                items: [
                  "全局中间件（`server.use()`）",
                  "路由中间件（从根到具体路径）",
                  "布局组件（从最具体到最通用）",
                  "页面组件",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "Q: 错误页面可以访问错误信息吗？",
            blocks: [
              {
                type: "text",
                content: "A: 可以。错误页面组件会接收 `error` 属性，包含错误信息：",
              },
              {
                type: "code",
                code: `export default function ErrorPage({ error }: { error?: { message?: string } }) {
  return <div>{error?.message || "未知错误"}</div>;
}`,
                language: "tsx",
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
              "[路由系统](/docs/core/router) - 了解路由的基本概念",
              "[布局系统](/docs/layout) - 了解布局继承的详细说明",
              "[路由级中间件](/docs/middleware/route-middleware) - 了解中间件的详细说明",
              "[配置](/docs/configuration) - 了解如何配置应用",
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
