/**
 * 开发指南文档页面
 * 展示 DWeb 框架的开发流程和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "开发指南 - DWeb 框架文档",
  description: "DWeb 框架的完整开发指南，包括项目创建、开发流程、构建部署等",
};

export default function DevelopmentPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // CLI 创建项目
  const createProjectCode = `# 交互式创建项目（会提示输入项目名称和配置选项）
deno run -A jsr:@dreamer/dweb/init

# 指定项目名称（跳过名称输入，直接使用提供的名称）
deno run -A jsr:@dreamer/dweb/init my-app`;

  // 项目结构
  const projectStructureCode = `my-app/
├── routes/              # 路由目录
│   ├── index.tsx        # 首页
│   ├── about.tsx        # 关于页面
│   └── api/             # API 路由（默认在 routes/api，可通过 apiDir 配置）
│       └── users.ts
├── components/          # 组件目录
├── assets/              # 静态资源
├── public/              # 公共文件
├── dweb.config.ts       # 配置文件
├── deno.json            # Deno 配置
└── main.ts              # 入口文件（可选）`;

  // main.ts 示例
  const mainTsCode = `// main.ts（可选）
import { cors, createApp, staticFiles } from "@dreamer/dweb";

const app = createApp();

// 配置中间件
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// 配置静态文件服务
app.use(staticFiles({
  dir: "assets",
  prefix: "/assets",
  maxAge: 86400, // 缓存 1 天
}));

// 导出应用实例
export default app;`;

  // 启动开发服务器
  const devServerCode = `# 单应用模式
deno task dev

# 多应用模式
deno run -A src/cli.ts dev:app-name`;

  // 代码格式化
  const formatCode = `# 格式化所有文件
deno fmt

# 格式化指定文件或目录
deno fmt src/
deno fmt routes/index.tsx

# 检查格式（不修改文件）
deno fmt --check`;

  // 代码检查
  const lintCode = `# 检查所有文件
deno lint

# 检查指定文件或目录
deno lint src/
deno lint routes/

# 自动修复可修复的问题
deno lint --fix`;

  // 类型检查
  const typeCheckCode = `# 检查所有 TypeScript 文件
deno check

# 检查指定文件或目录
deno check src/
deno check routes/

# 检查特定文件
deno check main.ts`;

  // 构建配置
  const buildConfigCode = `export default defineConfig({
  build: {
    // 输出目录
    outDir: "dist",

    // 是否生成 source map（用于调试）
    sourcemap: true,

    // 是否压缩代码
    minify: true,

    // 目标 JavaScript 版本
    target: "es2022",
  },
});`;

  // 构建命令
  const buildCommandCode = `# 单应用模式
deno task build

# 多应用模式
deno run -A src/cli.ts build:app-name`;

  // 生产服务器
  const prodServerCode = `# 单应用模式
deno task start

# 使用环境变量指定环境
DENO_ENV=production deno task start

# 多应用模式
deno run -A src/cli.ts start:app-name`;

  // 调试配置
  const debugConfigCode = `# 方式1：使用 CLI 命令（推荐）
deno run --inspect-brk -A src/cli.ts dev

# 方式2：指定调试端口
deno run --inspect=127.0.0.1:9229 -A src/cli.ts dev`;

  // VS Code 调试配置
  const vscodeDebugCode = `{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Deno: Debug",
      "type": "node",
      "request": "launch",
      "cwd": "\${workspaceFolder}",
      "runtimeExecutable": "deno",
      "runtimeArgs": ["run", "--inspect-brk", "-A", "src/cli.ts", "dev"],
      "outputCapture": "std",
      "port": 9229
    }
  ]
}`;

  // 测试示例
  const testCode = `// tests/unit/server.test.ts
import { assertEquals } from "@std/assert";
import { Server } from "@dreamer/dweb";

Deno.test("Server should start on specified port", async () => {
  const server = new Server();
  server.setHandler(async (req, res) => {
    res.text("Hello");
  });

  await server.start(3000);

  // 测试请求
  const response = await fetch("http://localhost:3000");
  const text = await response.text();

  assertEquals(text, "Hello");

  await server.close();
});`;

  // 环境变量
  const envCode = `# .env.development
PORT=3000
DB_HOST=localhost
DB_NAME=mydb_dev

# .env.production
PORT=3000
DB_HOST=prod-db.example.com
DB_NAME=mydb`;

  // 使用环境变量
  const useEnvCode = `// dweb.config.ts
export default defineConfig({
  server: {
    port: parseInt(Deno.env.get("PORT") || "3000"),
  },
  database: {
    connection: {
      host: Deno.env.get("DB_HOST") || "localhost",
      database: Deno.env.get("DB_NAME") || "mydb",
    },
  },
});`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "开发指南",
    description: "DWeb 框架开发指南，包括项目创建、开发流程、构建部署等。",
    sections: [
      {
        title: "项目创建",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "使用 CLI 创建项目",
            blocks: [
              {
                type: "code",
                code: createProjectCode,
                language: "bash",
              },
              {
                type: "text",
                content: "**创建过程说明：**",
              },
              {
                type: "list",
                ordered: true,
                items: [
                  "**项目名称输入**：如果未提供项目名称，会提示输入（只允许字母、数字、连字符和下划线）",
                  "**应用模式选择**：单应用模式（默认）- 适合简单的单页面应用或 API 服务；多应用模式 - 适合需要多个独立应用的场景（如前端 + 后端）",
                  "**Tailwind CSS 版本选择**：V4（推荐）- 最新版本，性能更好；V3 - 稳定版本，兼容性更好",
                  "**渲染模式选择**：SSR（服务端渲染）- 所有页面在服务端渲染，SEO 友好；CSR（客户端渲染）- 所有页面在客户端渲染，交互性强；Hybrid（混合渲染）（默认）- 根据路由自动选择渲染方式",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
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
            type: "subsection",
            level: 3,
            title: "入口文件 (main.ts)",
            blocks: [
              {
                type: "text",
                content: "**注意：`main.ts` 文件是可选的，不是必须的。** 框架可以通过 CLI 命令（`deno task dev` 或 `deno task start`）自动启动服务器，无需手动创建入口文件。",
              },
              {
                type: "text",
                content: "如果你需要自定义应用配置（如添加中间件、插件等），可以创建 `main.ts` 文件：",
              },
              {
                type: "code",
                code: mainTsCode,
                language: "typescript",
              },
              {
                type: "text",
                content: "**使用说明：**",
              },
              {
                type: "list",
                ordered: false,
                items: [
                  "如果存在 `main.ts` 文件，框架会自动加载并应用其中的配置",
                  "如果不存在 `main.ts` 文件，框架会使用 `dweb.config.ts` 中的配置",
                  "`main.ts` 主要用于需要编程式配置的场景，如动态添加中间件或插件",
                  "在多应用模式下，每个应用可以有自己的 `main.ts` 文件（位于应用目录下）",
                ],
              },
            ],
          },
        ],
      },

      {
        title: "开发流程",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "启动开发服务器",
            blocks: [
              {
                type: "text",
                content: "**单应用模式**",
              },
              {
                type: "code",
                code: `# 启动开发服务器（默认端口 3000）
deno task dev

# 或使用 CLI 命令
deno run -A src/cli.ts dev

# 指定端口（通过配置文件或环境变量）
# 在 dweb.config.ts 中配置：
# server: { port: 8080 }`,
                language: "bash",
              },
              {
                type: "text",
                content: "**多应用模式**",
              },
              {
                type: "code",
                code: devServerCode,
                language: "bash",
              },
              {
                type: "text",
                content: "**开发服务器特性：**",
              },
              {
                type: "list",
                ordered: false,
                items: [
                  "自动热更新（HMR）：修改代码后自动重新加载",
                  "自动路由扫描：自动发现 `routes/` 目录下的路由文件",
                  "自动加载中间件和插件：从 `main.ts` 或配置文件中加载",
                  "错误提示：详细的错误信息和堆栈跟踪",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "热更新 (HMR)",
            blocks: [
              {
                type: "text",
                content: "开发服务器支持热更新，修改代码后自动刷新：",
              },
              {
                type: "list",
                ordered: false,
                items: [
                  "**服务端组件**：自动重新加载",
                  "**客户端组件**：通过 WebSocket 推送更新",
                  "**样式文件**：自动重新编译",
                ],
              },
            ],
          },
        ],
      },
      {
        title: "开发工具",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "代码格式化",
            blocks: [
              {
                type: "code",
                code: formatCode,
                language: "bash",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "代码检查",
            blocks: [
              {
                type: "code",
                code: lintCode,
                language: "bash",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "类型检查",
            blocks: [
              {
                type: "code",
                code: typeCheckCode,
                language: "bash",
              },
            ],
          },
        ],
      },
      {
        title: "构建",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "构建生产版本",
            blocks: [
              {
                type: "code",
                code: buildCommandCode,
                language: "bash",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "构建配置",
            blocks: [
              {
                type: "text",
                content: "在 `dweb.config.ts` 中配置构建选项：",
              },
              {
                type: "code",
                code: buildConfigCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "部署",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "生产服务器",
            blocks: [
              {
                type: "code",
                code: prodServerCode,
                language: "bash",
              },
              {
                type: "text",
                content: "**生产服务器特性：**",
              },
              {
                type: "list",
                ordered: false,
                items: [
                  "优化的性能：代码已编译和压缩",
                  "静态资源缓存：配置的缓存策略生效",
                  "错误处理：生产环境友好的错误信息",
                  "日志记录：可配置的日志级别和输出",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "Docker 部署",
            blocks: [
              {
                type: "code",
                code: `# 构建镜像
docker build -t dweb-app .

# 运行容器
docker run -p 3000:3000 dweb-app`,
                language: "bash",
              },
              {
                type: "text",
                content: "详细说明请参考 [Docker 文档](/docs/docker)。",
              },
            ],
          },
        ],
      },
      {
        title: "调试",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "使用 Deno 调试器",
            blocks: [
              {
                type: "text",
                content: "Deno 内置了调试器支持，可以使用 Chrome DevTools 进行调试。",
              },
              {
                type: "text",
                content: "**启动调试服务器**",
              },
              {
                type: "code",
                code: debugConfigCode,
                language: "bash",
              },
              {
                type: "text",
                content: "**VS Code 调试配置**",
              },
              {
                type: "text",
                content: "创建 `.vscode/launch.json` 配置：",
              },
              {
                type: "code",
                code: vscodeDebugCode,
                language: "json",
              },
            ],
          },
        ],
      },
      {
        title: "测试",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "运行测试",
            blocks: [
              {
                type: "code",
                code: `# 运行所有测试
deno test

# 运行特定测试文件
deno test tests/unit/server.test.ts

# 运行匹配模式的测试
deno test --filter "server"

# 带覆盖率
deno test --coverage=coverage/

# 查看覆盖率报告
deno coverage coverage/`,
                language: "bash",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "编写测试示例",
            blocks: [
              {
                type: "code",
                code: testCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "环境变量",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "开发环境",
            blocks: [
              {
                type: "text",
                content: "创建 `.env.development`：",
              },
              {
                type: "code",
                code: envCode,
                language: "text",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用环境变量",
            blocks: [
              {
                type: "code",
                code: useEnvCode,
                language: "typescript",
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
            title: "端口被占用",
            blocks: [
              {
                type: "code",
                code: `# 查找占用端口的进程
lsof -i :3000

# 或修改配置
export default defineConfig({
  server: {
    port: 8080,
  },
});`,
                language: "bash",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "模块导入错误",
            blocks: [
              {
                type: "text",
                content: "确保 `deno.json` 中配置了正确的导入映射：",
              },
              {
                type: "code",
                code: `{
  "imports": {
    "@dreamer/dweb": "jsr:@dreamer/dweb@^1.0.0"
  }
}`,
                language: "json",
              },
            ],
          },
        ],
      },
      {
        title: "最佳实践",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "**使用 TypeScript**：充分利用类型检查",
              "**代码格式化**：保持代码风格一致",
              "**错误处理**：使用 try-catch 处理异步错误",
              "**日志记录**：使用框架提供的日志功能",
              "**环境变量**：敏感信息使用环境变量",
              "**测试覆盖**：编写单元测试和集成测试",
              "**性能监控**：使用性能监控插件",
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
              "[配置文档](/docs/configuration) - 了解如何配置应用",
              "[Docker 部署](/docs/docker) - 了解 Docker 部署方法",
              "[热模块替换 (HMR)](/docs/features/hmr) - 了解 HMR 的详细说明",
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
