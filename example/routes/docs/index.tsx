/**
 * 文档/快速开始页面
 * 提供 DWeb 框架的使用文档和快速开始指南
 */

import DocRenderer from "../../components/DocRenderer.tsx";
import type { LoadContext, PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "文档 - DWeb 快速开始指南",
  description:
    "DWeb 框架的完整使用文档，包括快速开始、配置、创建页面、API 路由、中间件、渲染模式等详细说明",
  keywords: "DWeb, 文档, 快速开始, 教程, 使用指南, Deno, Preact, Web 框架",
  author: "DWeb",
};

/**
 * 加载页面数据（服务端执行）
 * @param context 包含 params、query、cookies、session 等的上下文对象
 * @returns 页面数据，会自动赋值到组件的 data 属性
 */
export async function load({
  params: _params,
  query: _query,
  cookies: _cookies,
  session: _session,
  getCookie: _getCookie,
  getSession: _getSession,
}: LoadContext) {
  // 在 load 函数内部动态导入 utils（只在服务端执行）
  const { getJsrPackageUrl } = await import("../../utils.ts");

  return {
    jsrPackageUrl: getJsrPackageUrl(),
    jsrPackageUrlWithCli: getJsrPackageUrl("/cli"),
  };
}

/**
 * 文档页面组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function DocsPage(
  { params: _params, query: _query, data }: PageProps,
) {
  // 从 load 函数返回的数据中获取 JSR 包 URL
  // 保留用于未来使用
  const {
    jsrPackageUrl: _jsrPackageUrl,
    jsrPackageUrlWithCli: _jsrPackageUrlWithCli,
  } = data as {
    jsrPackageUrl: string;
    jsrPackageUrlWithCli: string;
  };

  // console.log({ jsrPackageUrl, jsrPackageUrlWithCli });

  // 安装代码
  const installCode = `# 创建新项目
deno run -A jsr:@dreamer/dweb/init

cd my-app
deno task dev`;

  // 作为库使用
  const libraryCode = `# 安装依赖
deno add jsr:@dreamer/dweb

# 或在 deno.json 中配置导入映射
{
  "imports": {
    "@dreamer/dweb": "jsr:@dreamer/dweb"
  }
}`;

  // 基本配置
  const configCode = `// dweb.config.ts
import type { AppConfig } from 'jsr:@dreamer/dweb';
import { tailwind, cors } from 'jsr:@dreamer/dweb';

const config: AppConfig = {
  name: 'my-app',
  renderMode: 'hybrid', // 'ssr' | 'csr' | 'hybrid'
  
  // 服务器配置
  server: {
    port: 3000,
    host: 'localhost',
  },
  
  // 路由配置
  routes: {
    dir: 'routes',
    ignore: ['**/*.test.ts', '**/*.test.tsx'],
  },
  
  // Cookie 配置
  cookie: {
    secret: 'your-secret-key-here-change-in-production',
  },
  
  // Session 配置
  session: {
    secret: 'your-session-secret-here-change-in-production',
    store: 'memory',
    maxAge: 3600000, // 1小时
    secure: false,
    httpOnly: true,
  },
  
  // 插件配置
  plugins: [
    tailwind({
      version: 'v4',
      cssPath: 'assets/style.css',
      optimize: true,
    }),
  ],
  
  // 中间件配置
  middleware: [
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  ],
  
  // 开发配置
  dev: {
    hmrPort: 24678,
    reloadDelay: 300,
  },
  
  // 构建配置
  build: {
    outDir: 'dist',
  },
};

export default config;`;

  // 创建页面
  const pageCode = `// routes/index.tsx
export default function HomePage() {
  return (
    <div>
      <h1>欢迎使用 DWeb</h1>
      <p>这是一个简单的页面示例</p>
    </div>
  );
}`;

  // API 路由
  const apiCode = `// routes/api/users.ts
export async function GET(req: Request) {
  return new Response(JSON.stringify({ users: [] }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// 函数式 API 路由
export async function getUser(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  return new Response(JSON.stringify({ id, name: 'User' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}`;

  // 中间件使用
  const middlewareCode = `// main.ts
import { createApp } from 'jsr:@dreamer/dweb';
import { logger, cors } from 'jsr:@dreamer/dweb';

const app = createApp();

// 使用内置中间件
app.use(logger());
app.use(cors());
// 注意：响应压缩由 Deno.serve 自动处理，无需手动配置

export default app;`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "",
    description: "",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "创建新项目",
            blocks: [
              {
                type: "code",
                code: installCode,
                language: "bash",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "作为库使用",
            blocks: [
              {
                type: "code",
                code: libraryCode,
                language: "bash",
              },
            ],
          },
        ],
      },
      {
        title: "配置",
        blocks: [
          {
            type: "text",
            content: "在项目根目录创建 `dweb.config.ts` 文件：",
          },
          {
            type: "code",
            code: configCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "创建页面",
        blocks: [
          {
            type: "text",
            content: "在 `routes` 目录下创建文件即可自动生成路由：",
          },
          {
            type: "code",
            code: pageCode,
            language: "typescript",
          },
          {
            type: "text",
            content: "文件路径会自动映射为路由路径：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "`routes/index.tsx` → `/`",
              "`routes/about.tsx` → `/about`",
              "`routes/blog/[id].tsx` → `/blog/:id`",
            ],
          },
        ],
      },
      {
        title: "API 路由",
        blocks: [
          {
            type: "text",
            content: "在 `routes/api` 目录下创建 API 路由：",
          },
          {
            type: "code",
            code: apiCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "使用中间件",
        blocks: [
          {
            type: "text",
            content: "在 `main.ts` 文件中注册中间件：",
          },
          {
            type: "code",
            code: middlewareCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "渲染模式",
        blocks: [
          {
            type: "text",
            content: "DWeb 支持三种渲染模式：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "**SSR（服务端渲染）**：在服务器端渲染 HTML，适合 SEO 和首屏性能",
              "**CSR（客户端渲染）**：完全在客户端渲染，支持 SPA 无刷新切换",
              "**Hybrid（混合渲染）**：服务端渲染 + 客户端 hydration，兼顾 SEO 和交互性",
            ],
          },
          {
            type: "text",
            content: "可以在页面组件中配置渲染模式：",
          },
          {
            type: "code",
            code: "export const renderMode = 'hybrid';",
            language: "typescript",
          },
        ],
      },
      {
        title: "更多资源",
        blocks: [
          {
            type: "alert",
            level: "info",
            content: [
              "[GitHub 仓库](https://github.com/shuliangfu/dweb) - 查看源代码和提交问题",
              "[JSR 包页面](https://jsr.io/@dreamer/dweb) - 查看包信息和版本",
              "[功能特性](/features) - 了解所有功能",
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
