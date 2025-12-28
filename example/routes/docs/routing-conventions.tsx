/**
 * 路由约定文件文档页面
 * 展示 DWeb 框架的路由约定文件使用方法
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
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

  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>路由约定文件</h1>

      <p>
        DWeb 框架使用文件系统路由，并支持以 <code>_</code>{" "}
        开头的特殊约定文件。这些文件具有特殊的功能，用于定义布局、中间件、错误页面等。
      </p>

      <h2>约定文件概览</h2>

      <p>DWeb 框架支持以下约定文件：</p>

      <table>
        <thead>
          <tr>
            <th>文件名</th>
            <th>类型</th>
            <th>必需</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>_app.tsx</code>
            </td>
            <td>应用组件</td>
            <td>✅ 必需</td>
            <td>根应用组件，包裹所有页面</td>
          </tr>
          <tr>
            <td>
              <code>_layout.tsx</code>
            </td>
            <td>布局组件</td>
            <td>❌ 可选</td>
            <td>布局组件，支持继承</td>
          </tr>
          <tr>
            <td>
              <code>_middleware.ts</code>
            </td>
            <td>中间件</td>
            <td>❌ 可选</td>
            <td>路由级中间件</td>
          </tr>
          <tr>
            <td>
              <code>_404.tsx</code>
            </td>
            <td>错误页面</td>
            <td>❌ 可选</td>
            <td>404 页面未找到</td>
          </tr>
          <tr>
            <td>
              <code>_error.tsx</code>
            </td>
            <td>错误页面</td>
            <td>❌ 可选</td>
            <td>通用错误页面</td>
          </tr>
          <tr>
            <td>
              <code>_500.tsx</code>
            </td>
            <td>错误页面</td>
            <td>❌ 可选</td>
            <td>500 服务器错误</td>
          </tr>
        </tbody>
      </table>

      <h2>文件结构示例</h2>

      <CodeBlock
        language="text"
        code={`routes/
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
    └── _middleware.ts      # API 中间件（应用到 /api 下的所有路由）`}
      />

      <h2>_app.tsx - 根应用组件</h2>

      <p>
        <code>_app.tsx</code>{" "}
        是框架<strong>必需</strong>的文件，用于提供完整的 HTML
        文档结构，包裹所有页面内容。
      </p>

      <h3>位置</h3>

      <p>
        必须放在 <code>routes</code> 目录的根目录下：
      </p>

      <CodeBlock
        language="text"
        code={`routes/
└── _app.tsx  ✅ 正确`}
      />

      <h3>基本结构</h3>

      <CodeBlock language="tsx" code={appCode} />

      <h3>重要说明</h3>

      <ul>
        <li>
          <strong>必需文件</strong>：<code>_app.tsx</code>{" "}
          是框架必需的文件，如果不存在会导致应用无法启动
        </li>
        <li>
          <strong>HTML 结构</strong>：必须包含完整的 HTML 文档结构（<code>
            &lt;html&gt;
          </code>、<code>&lt;head&gt;</code>、<code>&lt;body&gt;</code>）
        </li>
        <li>
          <strong>children 属性</strong>：接收已渲染的页面 HTML 字符串
        </li>
        <li>
          <strong>自动注入</strong>：框架会自动注入客户端脚本、HMR
          脚本等，无需手动添加
        </li>
      </ul>

      <h2>_layout.tsx - 布局组件</h2>

      <p>
        <code>_layout.tsx</code> 用于定义页面布局，支持布局继承。详细说明请参考
        {" "}
        <a href="/docs/layout">布局系统文档</a>。
      </p>

      <h3>位置</h3>

      <p>可以放在任何目录下：</p>

      <CodeBlock
        language="text"
        code={`routes/
├── _layout.tsx            # 根布局（应用到所有页面）
└── docs/
    └── _layout.tsx        # 文档布局（应用到 /docs 下的所有页面）`}
      />

      <h3>基本结构</h3>

      <CodeBlock language="tsx" code={layoutCode} />

      <h3>⚠️ 重要限制：布局组件不能是异步函数</h3>

      <p>
        <strong>
          布局组件不能定义为 <code>async function</code>
        </strong>。如果需要进行异步操作（如数据获取），请在组件内部使用{" "}
        <code>useEffect</code> 钩子处理。
      </p>

      <h2>_middleware.ts - 路由中间件</h2>

      <p>
        <code>_middleware.ts</code>{" "}
        用于定义路由级中间件，可以为特定路径及其子路径应用中间件逻辑。详细说明请参考
        {" "}
        <a href="/docs/middleware/route-middleware">路由级中间件文档</a>。
      </p>

      <h3>位置</h3>

      <p>可以放在任何目录下：</p>

      <CodeBlock
        language="text"
        code={`routes/
├── _middleware.ts          # 根中间件（应用到所有路由）
└── api/
    └── _middleware.ts      # API 中间件（应用到 /api 下的所有路由）`}
      />

      <h3>基本结构</h3>

      <h4>单个中间件</h4>

      <CodeBlock language="tsx" code={middlewareCode} />

      <h4>多个中间件</h4>

      <CodeBlock language="tsx" code={multipleMiddlewareCode} />

      <h3>中间件继承</h3>

      <p>中间件会按照路径层级从根到具体路径依次执行：</p>

      <ul>
        <li>
          访问 <code>/api/users</code> 时：
          <ol>
            <li>
              <code>routes/_middleware.ts</code>（根中间件）
            </li>
            <li>
              <code>routes/api/_middleware.ts</code>（API 中间件）
            </li>
          </ol>
        </li>
      </ul>

      <h2>页面组件</h2>

      <p>
        页面组件是路由目录中的普通文件（如 <code>index.tsx</code>、<code>
          about.tsx
        </code>），用于定义页面的内容和逻辑。
      </p>

      <h3>基本结构</h3>

      <CodeBlock language="tsx" code={pageComponentCode} />

      <h3>⚠️ 重要限制：页面组件不能是异步函数</h3>

      <p>
        <strong>
          页面组件不能定义为 <code>async function</code>
        </strong>。如果需要进行异步操作（如数据获取），请在组件内部使用{" "}
        <code>useEffect</code> 钩子处理，或者使用 <code>load</code>{" "}
        函数在服务端获取数据。
      </p>

      <h4>✅ 正确示例：使用 load 函数在服务端获取数据</h4>

      <CodeBlock language="tsx" code={loadFunctionCode} />

      <h3>页面组件 Props</h3>

      <p>页面组件接收以下 props：</p>

      <ul>
        <li>
          <code>params</code>: 路由参数（如 <code>/users/:id</code> 中的{" "}
          <code>id</code>）
        </li>
        <li>
          <code>query</code>: 查询参数（URL 中的 <code>?key=value</code>）
        </li>
        <li>
          <code>data</code>: <code>load</code> 函数返回的数据
        </li>
        <li>
          <code>lang</code>: 当前语言代码（如果配置了 i18n 插件）
        </li>
        <li>
          <code>store</code>: 状态管理 Store（如果配置了 store 插件）
        </li>
        <li>
          <code>metadata</code>: 页面元数据
        </li>
        <li>
          <code>routePath</code>: 当前路由路径
        </li>
        <li>
          <code>url</code>: URL 对象
        </li>
      </ul>

      <h2>_404.tsx - 404 错误页面</h2>

      <p>
        <code>_404.tsx</code> 用于定义 404 页面未找到时的错误页面。
      </p>

      <h3>位置</h3>

      <p>
        必须放在 <code>routes</code> 目录的根目录下：
      </p>

      <CodeBlock
        language="text"
        code={`routes/
└── _404.tsx  ✅ 正确`}
      />

      <h3>基本结构</h3>

      <CodeBlock language="tsx" code={notFoundCode} />

      <h3>使用说明</h3>

      <ul>
        <li>
          <strong>自动触发</strong>：当访问不存在的路由时，框架会自动使用{" "}
          <code>_404.tsx</code> 渲染 404 页面
        </li>
        <li>
          <strong>状态码</strong>：框架会自动设置响应状态码为 404
        </li>
        <li>
          <strong>SEO</strong>：建议设置{" "}
          <code>metadata.robots = false</code>，避免搜索引擎索引 404 页面
        </li>
      </ul>

      <h2>_error.tsx - 通用错误页面</h2>

      <p>
        <code>_error.tsx</code>{" "}
        用于定义通用错误页面，处理服务器错误、渲染错误等。
      </p>

      <h3>位置</h3>

      <p>
        必须放在 <code>routes</code> 目录的根目录下：
      </p>

      <CodeBlock
        language="text"
        code={`routes/
└── _error.tsx  ✅ 正确`}
      />

      <h3>基本结构</h3>

      <CodeBlock language="tsx" code={errorCode} />

      <h3>使用说明</h3>

      <ul>
        <li>
          <strong>
            自动触发
          </strong>：当发生服务器错误、渲染错误等时，框架会自动使用{" "}
          <code>_error.tsx</code> 渲染错误页面
        </li>
        <li>
          <strong>错误信息</strong>：组件会接收 <code>error</code>{" "}
          属性，包含错误信息
        </li>
        <li>
          <strong>状态码</strong>：框架会根据错误类型自动设置响应状态码（通常是
          500）
        </li>
      </ul>

      <h2>错误页面优先级</h2>

      <p>当发生错误时，框架会按以下优先级选择错误页面：</p>

      <ol>
        <li>
          <code>_500.tsx</code> - 专门处理 500 错误
        </li>
        <li>
          <code>_error.tsx</code> - 处理其他错误
        </li>
        <li>
          <code>_404.tsx</code> - 处理 404 错误
        </li>
        <li>默认错误页面 - 如果以上都不存在</li>
      </ol>

      <h2>约定文件总结</h2>

      <h3>必需文件</h3>

      <ul>
        <li>
          ✅ <code>_app.tsx</code> - 根应用组件（必需）
        </li>
      </ul>

      <h3>可选文件</h3>

      <ul>
        <li>
          ❌ <code>_layout.tsx</code> - 布局组件（可选，支持继承）
        </li>
        <li>
          ❌ <code>_middleware.ts</code> - 路由中间件（可选）
        </li>
        <li>
          ❌ <code>_404.tsx</code> - 404 错误页面（可选）
        </li>
        <li>
          ❌ <code>_error.tsx</code> - 通用错误页面（可选）
        </li>
        <li>
          ❌ <code>_500.tsx</code> - 500 错误页面（可选）
        </li>
      </ul>

      <h3>文件命名规则</h3>

      <ul>
        <li>
          所有约定文件都以 <code>_</code> 下划线开头
        </li>
        <li>
          支持 <code>.tsx</code> 和 <code>.ts</code>{" "}
          扩展名（<code>_middleware.ts</code> 只支持 <code>.ts</code>）
        </li>
        <li>文件名必须完全匹配（区分大小写）</li>
      </ul>

      <h2>最佳实践</h2>

      <h3>1. 保持 _app.tsx 简洁</h3>

      <p>
        <code>_app.tsx</code>{" "}
        应该只包含 HTML 文档结构，业务逻辑应该放在布局或页面组件中。
      </p>

      <h3>2. 合理使用布局继承</h3>

      <ul>
        <li>使用根布局提供全局结构</li>
        <li>使用子布局提供特定区域的布局</li>
        <li>
          在需要完全独立布局时使用 <code>layout = false</code>
        </li>
      </ul>

      <h3>3. 中间件职责分离</h3>

      <ul>
        <li>使用全局中间件处理通用功能（CORS、压缩等）</li>
        <li>使用路由中间件处理路径特定的逻辑（认证、日志等）</li>
      </ul>

      <h3>4. 错误页面友好</h3>

      <ul>
        <li>提供清晰的错误信息</li>
        <li>提供返回首页或相关页面的链接</li>
        <li>
          设置合适的 SEO 元数据（<code>robots: false</code>）
        </li>
      </ul>

      <h2>常见问题</h2>

      <h3>Q: 可以创建多个 _app.tsx 吗？</h3>

      <p>
        A: 不可以。<code>_app.tsx</code> 只能有一个，必须放在{" "}
        <code>routes/</code> 根目录。
      </p>

      <h3>Q: _layout.tsx 和 _app.tsx 的区别是什么？</h3>

      <p>A:</p>

      <ul>
        <li>
          <code>_app.tsx</code>：提供 HTML 文档结构（<code>
            &lt;html&gt;
          </code>、<code>&lt;head&gt;</code>、<code>&lt;body&gt;</code>），必需
        </li>
        <li>
          <code>
            _layout.tsx
          </code>：提供页面布局结构（导航、侧边栏等），可选，支持继承
        </li>
      </ul>

      <h3>Q: 中间件和布局的执行顺序是什么？</h3>

      <p>A:</p>

      <ol>
        <li>
          全局中间件（<code>server.use()</code>）
        </li>
        <li>路由中间件（从根到具体路径）</li>
        <li>布局组件（从最具体到最通用）</li>
        <li>页面组件</li>
      </ol>

      <h3>Q: 错误页面可以访问错误信息吗？</h3>

      <p>
        A: 可以。错误页面组件会接收 <code>error</code> 属性，包含错误信息：
      </p>

      <CodeBlock
        language="tsx"
        code={`export default function ErrorPage({ error }: { error?: { message?: string } }) {
  return <div>{error?.message || "未知错误"}</div>;
}`}
      />

      <h2>相关文档</h2>

      <ul>
        <li>
          <a href="/docs/core/router">路由系统</a> - 了解路由的基本概念
        </li>
        <li>
          <a href="/docs/layout">布局系统</a> - 了解布局继承的详细说明
        </li>
        <li>
          <a href="/docs/middleware/route-middleware">路由级中间件</a>{" "}
          - 了解中间件的详细说明
        </li>
        <li>
          <a href="/docs/configuration">配置</a> - 了解如何配置应用
        </li>
      </ul>
    </article>
  );
}
