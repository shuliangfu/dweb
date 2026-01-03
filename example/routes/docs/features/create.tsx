/**
 * 功能模块 - 项目创建 (create) 文档页面
 * 展示如何使用 DWeb CLI 创建新项目
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "项目创建 (create) - DWeb 框架文档",
  description: "使用 DWeb CLI 创建新项目的完整指南",
};

export default function FeaturesCreatePage() {
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

  const content = {
    title: "项目创建 (create)",
    description:
      "使用 DWeb CLI 可以快速创建新项目，支持交互式配置和多种项目模板。",
    sections: [
      {
        title: "使用 CLI 创建项目",
        blocks: [
          {
            type: "code",
            code: basicUsageCode,
            language: "bash",
          },
        ],
      },
      {
        title: "创建过程说明",
        blocks: [
          {
            type: "code",
            code: processCode,
            language: "text",
          },
        ],
      },
      {
        title: "模板特性",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**现代化技术栈**：默认集成 Tailwind CSS v4、TypeScript 5.x 和 Deno 2.x，直接使用最新技术构建应用。",
              "**最佳实践集成**：模板内置了目录结构规范、代码风格配置（deno.json）、Git 钩子和 VS Code 推荐设置，统一团队开发规范。",
            ],
          },
        ],
      },
      {
        title: "项目结构",
        blocks: [
          {
            type: "text",
            content: "创建的项目结构如下：",
          },
          {
            type: "code",
            code: projectStructureCode,
            language: "text",
          },
        ],
      },
      {
        title: "入口文件 (main.ts)",
        blocks: [
          {
            type: "alert",
            level: "warning",
            content:
              "**注意**：`main.ts` 文件是可选的，不是必须的。框架可以通过 CLI 命令（`deno task dev` 或 `deno task start`）自动启动服务器，无需手动创建入口文件。",
          },
          {
            type: "text",
            content:
              "如果你需要自定义应用配置（如添加中间件、插件等），可以创建 `main.ts` 文件：",
          },
          {
            type: "code",
            code: mainTsCode,
            language: "typescript",
          },
          {
            type: "code",
            code: usageCode,
            language: "text",
          },
        ],
      },
      {
        title: "启动项目",
        blocks: [
          {
            type: "code",
            code: startProjectCode,
            language: "bash",
          },
        ],
      },
      {
        title: "多应用模式",
        blocks: [
          {
            type: "text",
            content: "多应用模式适合需要多个独立应用的场景（如前端 + 后端）：",
          },
          {
            type: "code",
            code: multiAppCode,
            language: "text",
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
              "[配置文档](/docs/deployment/configuration)",
              "[开发指南](/docs/deployment/development)",
              "[开发服务器](/docs/features/dev)",
              "[构建](/docs/features/build)",
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
