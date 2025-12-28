/**
 * 开发指南文档页面
 * 展示 DWeb 框架的开发流程和使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
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
import { Server } from "@dreamer/dweb/core/server";

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

  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>开发指南</h1>

      <p>
        DWeb 框架开发指南，包括项目创建、开发流程、构建部署等。
      </p>

      <h2>项目创建</h2>

      <h3>使用 CLI 创建项目</h3>

      <CodeBlock language="bash" code={createProjectCode} />

      <p>
        <strong>创建过程说明：</strong>
      </p>

      <ol>
        <li>
          <strong>
            项目名称输入
          </strong>：如果未提供项目名称，会提示输入（只允许字母、数字、连字符和下划线）
        </li>
        <li>
          <strong>应用模式选择</strong>：
          <ul>
            <li>
              <strong>单应用模式</strong>（默认）：适合简单的单页面应用或 API
              服务
            </li>
            <li>
              <strong>多应用模式</strong>：适合需要多个独立应用的场景（如前端 +
              后端）
            </li>
          </ul>
        </li>
        <li>
          <strong>Tailwind CSS 版本选择</strong>：
          <ul>
            <li>
              <strong>V4（推荐）</strong>：最新版本，性能更好
            </li>
            <li>
              <strong>V3</strong>：稳定版本，兼容性更好
            </li>
          </ul>
        </li>
        <li>
          <strong>渲染模式选择</strong>：
          <ul>
            <li>
              <strong>SSR（服务端渲染）</strong>：所有页面在服务端渲染，SEO 友好
            </li>
            <li>
              <strong>CSR（客户端渲染）</strong>：所有页面在客户端渲染，交互性强
            </li>
            <li>
              <strong>
                Hybrid（混合渲染）
              </strong>（默认）：根据路由自动选择渲染方式
            </li>
          </ul>
        </li>
      </ol>

      <h3>项目结构</h3>

      <p>创建的项目结构如下：</p>

      <CodeBlock language="text" code={projectStructureCode} />

      <h3>入口文件 (main.ts)</h3>

      <p>
        <strong>
          注意：<code>main.ts</code> 文件是可选的，不是必须的。
        </strong>{" "}
        框架可以通过 CLI 命令（<code>deno task dev</code> 或
        <code>deno task start</code>）自动启动服务器，无需手动创建入口文件。
      </p>

      <p>
        如果你需要自定义应用配置（如添加中间件、插件等），可以创建{" "}
        <code>main.ts</code> 文件：
      </p>

      <CodeBlock language="typescript" code={mainTsCode} />

      <p>
        <strong>使用说明：</strong>
      </p>

      <ul>
        <li>
          如果存在 <code>main.ts</code> 文件，框架会自动加载并应用其中的配置
        </li>
        <li>
          如果不存在 <code>main.ts</code> 文件，框架会使用{" "}
          <code>dweb.config.ts</code> 中的配置
        </li>
        <li>
          <code>main.ts</code>{" "}
          主要用于需要编程式配置的场景，如动态添加中间件或插件
        </li>
        <li>
          在多应用模式下，每个应用可以有自己的 <code>main.ts</code>{" "}
          文件（位于应用目录下）
        </li>
      </ul>

      <h2>开发流程</h2>

      <h3>启动开发服务器</h3>

      <h4>单应用模式</h4>

      <CodeBlock
        language="bash"
        code={`# 启动开发服务器（默认端口 3000）
deno task dev

# 或使用 CLI 命令
deno run -A src/cli.ts dev

# 指定端口（通过配置文件或环境变量）
# 在 dweb.config.ts 中配置：
# server: { port: 8080 }`}
      />

      <h4>多应用模式</h4>

      <CodeBlock language="bash" code={devServerCode} />

      <p>
        <strong>开发服务器特性：</strong>
      </p>

      <ul>
        <li>自动热更新（HMR）：修改代码后自动重新加载</li>
        <li>
          自动路由扫描：自动发现 <code>routes/</code> 目录下的路由文件
        </li>
        <li>
          自动加载中间件和插件：从 <code>main.ts</code> 或配置文件中加载
        </li>
        <li>错误提示：详细的错误信息和堆栈跟踪</li>
      </ul>

      <h3>热更新 (HMR)</h3>

      <p>开发服务器支持热更新，修改代码后自动刷新：</p>

      <ul>
        <li>
          <strong>服务端组件</strong>：自动重新加载
        </li>
        <li>
          <strong>客户端组件</strong>：通过 WebSocket 推送更新
        </li>
        <li>
          <strong>样式文件</strong>：自动重新编译
        </li>
      </ul>

      <h2>开发工具</h2>

      <h3>代码格式化</h3>

      <CodeBlock language="bash" code={formatCode} />

      <h3>代码检查</h3>

      <CodeBlock language="bash" code={lintCode} />

      <h3>类型检查</h3>

      <CodeBlock language="bash" code={typeCheckCode} />

      <h2>构建</h2>

      <h3>构建生产版本</h3>

      <CodeBlock language="bash" code={buildCommandCode} />

      <h3>构建配置</h3>

      <p>
        在 <code>dweb.config.ts</code> 中配置构建选项：
      </p>

      <CodeBlock language="typescript" code={buildConfigCode} />

      <h2>部署</h2>

      <h3>生产服务器</h3>

      <CodeBlock language="bash" code={prodServerCode} />

      <p>
        <strong>生产服务器特性：</strong>
      </p>

      <ul>
        <li>优化的性能：代码已编译和压缩</li>
        <li>静态资源缓存：配置的缓存策略生效</li>
        <li>错误处理：生产环境友好的错误信息</li>
        <li>日志记录：可配置的日志级别和输出</li>
      </ul>

      <h3>Docker 部署</h3>

      <CodeBlock
        language="bash"
        code={`# 构建镜像
docker build -t dweb-app .

# 运行容器
docker run -p 3000:3000 dweb-app`}
      />

      <p>
        详细说明请参考 <a href="/docs/docker">Docker 文档</a>。
      </p>

      <h2>调试</h2>

      <h3>使用 Deno 调试器</h3>

      <p>Deno 内置了调试器支持，可以使用 Chrome DevTools 进行调试。</p>

      <h4>启动调试服务器</h4>

      <CodeBlock language="bash" code={debugConfigCode} />

      <h4>VS Code 调试配置</h4>

      <p>
        创建 <code>.vscode/launch.json</code> 配置：
      </p>

      <CodeBlock language="json" code={vscodeDebugCode} />

      <h2>测试</h2>

      <h3>运行测试</h3>

      <CodeBlock
        language="bash"
        code={`# 运行所有测试
deno test

# 运行特定测试文件
deno test tests/unit/server.test.ts

# 运行匹配模式的测试
deno test --filter "server"

# 带覆盖率
deno test --coverage=coverage/

# 查看覆盖率报告
deno coverage coverage/`}
      />

      <h3>编写测试示例</h3>

      <CodeBlock language="typescript" code={testCode} />

      <h2>环境变量</h2>

      <h3>开发环境</h3>

      <p>
        创建 <code>.env.development</code>：
      </p>

      <CodeBlock language="text" code={envCode} />

      <h3>使用环境变量</h3>

      <CodeBlock language="typescript" code={useEnvCode} />

      <h2>常见问题</h2>

      <h3>端口被占用</h3>

      <CodeBlock
        language="bash"
        code={`# 查找占用端口的进程
lsof -i :3000

# 或修改配置
export default defineConfig({
  server: {
    port: 8080,
  },
});`}
      />

      <h3>模块导入错误</h3>

      <p>
        确保 <code>deno.json</code> 中配置了正确的导入映射：
      </p>

      <CodeBlock
        language="json"
        code={`{
  "imports": {
    "@dreamer/dweb": "jsr:@dreamer/dweb@^1.0.0"
  }
}`}
      />

      <h2>最佳实践</h2>

      <ol>
        <li>
          <strong>使用 TypeScript</strong>：充分利用类型检查
        </li>
        <li>
          <strong>代码格式化</strong>：保持代码风格一致
        </li>
        <li>
          <strong>错误处理</strong>：使用 try-catch 处理异步错误
        </li>
        <li>
          <strong>日志记录</strong>：使用框架提供的日志功能
        </li>
        <li>
          <strong>环境变量</strong>：敏感信息使用环境变量
        </li>
        <li>
          <strong>测试覆盖</strong>：编写单元测试和集成测试
        </li>
        <li>
          <strong>性能监控</strong>：使用性能监控插件
        </li>
      </ol>

      <h2>相关文档</h2>

      <ul>
        <li>
          <a href="/docs/configuration">配置文档</a> - 了解如何配置应用
        </li>
        <li>
          <a href="/docs/docker">Docker 部署</a> - 了解 Docker 部署方法
        </li>
        <li>
          <a href="/docs/features/hmr">热模块替换 (HMR)</a>{" "}
          - 了解 HMR 的详细说明
        </li>
      </ul>
    </article>
  );
}
