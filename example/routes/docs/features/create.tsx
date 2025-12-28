/**
 * 功能模块 - 项目创建 (create) 文档页面
 * 展示如何使用 DWeb CLI 创建新项目
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "项目创建 (create) - DWeb 框架文档",
  description: "使用 DWeb CLI 创建新项目的完整指南",
};

export default function FeaturesCreatePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本使用
  const basicUsageCode = `# 交互式创建项目（会提示输入项目名称和配置选项）
deno run -A jsr:@dreamer/dweb/init

# 指定项目名称（跳过名称输入，直接使用提供的名称）
deno run -A jsr:@dreamer/dweb/init my-app`;

  // 创建过程说明
  const processCode = `创建过程说明：

1. 项目名称输入
   - 如果未提供项目名称，会提示输入
   - 只允许字母、数字、连字符和下划线

2. 应用模式选择
   - 单应用模式（默认）：适合简单的单页面应用或 API 服务
   - 多应用模式：适合需要多个独立应用的场景（如前端 + 后端）

3. Tailwind CSS 版本选择
   - V4（推荐）：最新版本，性能更好
   - V3：稳定版本，兼容性更好

4. 渲染模式选择
   - SSR（服务端渲染）：所有页面在服务端渲染，SEO 友好
   - CSR（客户端渲染）：所有页面在客户端渲染，交互性强
   - Hybrid（混合渲染）（默认）：根据路由自动选择渲染方式

5. API 路由模式选择
   - Method（方法路由）：通过 URL 路径指定方法名，默认使用中划线格式
   - REST（RESTful API）：基于 HTTP 方法和资源路径`;

  // 项目结构
  const projectStructureCode = `my-app/
├── routes/              # 路由目录
│   ├── index.tsx        # 首页
│   ├── about.tsx        # 关于页面
│   ├── _app.tsx         # 根应用组件
│   ├── _layout.tsx      # 根布局组件
│   ├── _404.tsx         # 404 错误页面
│   └── api/             # API 路由（默认在 routes/api）
│       └── examples.ts
├── components/          # 组件目录
│   ├── Button.tsx       # 按钮组件
│   └── Navbar.tsx       # 导航栏组件
├── config/             # 配置目录
│   └── menus.ts        # 菜单配置
├── stores/             # Store 状态管理目录
│   └── example.ts      # 示例 Store
├── assets/             # 静态资源
│   └── tailwind.css    # Tailwind CSS 文件
├── dweb.config.ts      # 配置文件
├── deno.json           # Deno 配置
└── main.ts             # 入口文件（可选）`;

  // 入口文件说明
  const mainTsCode = `// main.ts（可选）
/**
 * DWeb 框架应用配置文件
 * 用于创建应用实例并配置中间件和插件
 *
 * 注意：此文件只用于配置，不直接启动服务
 * 服务启动通过 CLI 命令：deno task dev 或 deno task start
 */

import { Application, cors, staticFiles } from '@dreamer/dweb';

// 创建应用实例
const app = new Application();

// 配置中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 自定义静态资源配置（带访问前缀）
// app.use(
//   staticFiles({
//     dir: 'assets',
//     prefix: '/assets',
//     maxAge: 86400, // 缓存 1 天
//   })
// );

// 可以添加更多中间件
// app.use(customMiddleware);

// 可以注册插件
// app.plugin(customPlugin);

// 导出应用实例
export default app;`;

  // 使用说明
  const usageCode = `使用说明：

- 如果存在 main.ts 文件，框架会自动加载并应用其中的配置
- 如果不存在 main.ts 文件，框架会使用 dweb.config.ts 中的配置
- main.ts 主要用于需要编程式配置的场景，如动态添加中间件或插件
- 在多应用模式下，每个应用可以有自己的 main.ts 文件（位于应用目录下）`;

  // 启动项目
  const startProjectCode = `# 进入项目目录
cd my-app

# 启动开发服务器
deno task dev

# 构建生产版本
deno task build

# 启动生产服务器
deno task start`;

  // 多应用模式
  const multiAppCode = `# 多应用模式的项目结构
my-app/
├── app1/                # 第一个应用
│   ├── routes/
│   ├── components/
│   ├── assets/
│   └── main.ts
├── app2/                # 第二个应用
│   ├── routes/
│   ├── components/
│   ├── assets/
│   └── main.ts
├── common/              # 共享资源
│   ├── components/
│   ├── utils/
│   └── config/
├── dweb.config.ts       # 配置文件（包含多个应用配置）
└── deno.json

# 启动特定应用
deno task dev:app1
deno task dev:app2

# 构建特定应用
deno task build:app1
deno task build:app2`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        项目创建 (create)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        使用 DWeb CLI 可以快速创建新项目，支持交互式配置和多种项目模板。
      </p>

      {/* 使用 CLI 创建项目 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          使用 CLI 创建项目
        </h2>
        <CodeBlock code={basicUsageCode} language="bash" />
      </section>

      {/* 创建过程说明 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          创建过程说明
        </h2>
        <CodeBlock code={processCode} language="text" />
      </section>

      {/* 项目结构 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          项目结构
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          创建的项目结构如下：
        </p>
        <CodeBlock code={projectStructureCode} language="text" />
      </section>

      {/* 入口文件 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          入口文件 (main.ts)
        </h2>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-600 p-4 my-4 rounded">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            <strong>注意：</strong><code className="bg-yellow-100 dark:bg-yellow-900/50 px-2 py-1 rounded">main.ts</code> 文件是可选的，不是必须的。
            框架可以通过 CLI 命令（<code className="bg-yellow-100 dark:bg-yellow-900/50 px-2 py-1 rounded">deno task dev</code> 或 <code className="bg-yellow-100 dark:bg-yellow-900/50 px-2 py-1 rounded">deno task start</code>）自动启动服务器，无需手动创建入口文件。
          </p>
        </div>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          如果你需要自定义应用配置（如添加中间件、插件等），可以创建 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">main.ts</code> 文件：
        </p>
        <CodeBlock code={mainTsCode} language="typescript" />
        <div className="mt-4">
          <CodeBlock code={usageCode} language="text" />
        </div>
      </section>

      {/* 启动项目 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          启动项目
        </h2>
        <CodeBlock code={startProjectCode} language="bash" />
      </section>

      {/* 多应用模式 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          多应用模式
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          多应用模式适合需要多个独立应用的场景（如前端 + 后端）：
        </p>
        <CodeBlock code={multiAppCode} language="text" />
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li><a href="/docs/deployment/configuration" className="text-blue-600 dark:text-blue-400 hover:underline">配置文档</a></li>
          <li><a href="/docs/deployment/development" className="text-blue-600 dark:text-blue-400 hover:underline">开发指南</a></li>
          <li><a href="/docs/features/dev" className="text-blue-600 dark:text-blue-400 hover:underline">开发服务器</a></li>
          <li><a href="/docs/features/build" className="text-blue-600 dark:text-blue-400 hover:underline">构建</a></li>
        </ul>
      </section>
    </article>
  );
}
