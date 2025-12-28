/**
 * 配置文档页面
 * 展示 DWeb 框架的配置选项和使用方法
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "配置文档 - DWeb 框架文档",
  description: "DWeb 框架的完整配置选项说明，包括服务器、路由、构建、开发等配置",
};

export default function ConfigurationPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本配置
  const basicConfigCode = `// dweb.config.ts
import { defineConfig } from "@dreamer/dweb";

export default defineConfig({
  // 应用名称
  name: "my-app",

  // 基础路径（用于部署到子路径）
  basePath: "/",

  // 渲染适配器配置
  render: {
    // 渲染引擎，可选值：'preact' | 'react' | 'vue3'
    // 默认为 'preact'
    engine: "preact",
    // 渲染模式，可选值：'ssr' | 'csr' | 'hybrid'
    // - ssr: 服务端渲染（默认）
    // - csr: 客户端渲染
    // - hybrid: 混合渲染（服务端渲染 + 客户端 hydration）
    // 注意：这个配置是全局的，可以在页面组件中通过导出 renderMode 来覆盖
    mode: "ssr",
  },
});`;

  // 服务器配置
  const serverConfigCode = `export default defineConfig({
  server: {
    // 端口号（必需）
    port: 3000,
    
    // 主机名
    host: 'localhost',
    
    // 是否启用 HTTPS
    https: false,
    
    // HTTPS 证书配置
    cert?: string,
    key?: string,
  },
});`;

  // 路由配置
  const routesConfigCode = `export default defineConfig({
  // 字符串形式（简单配置）
  routes: "routes",

  // 对象形式（完整配置）
  routes: {
    // 路由目录（必需）
    dir: "routes",

    // 忽略的文件模式
    ignore: ["**/*.test.ts", "**/*.spec.ts"],

    // 是否缓存路由
    cache: true,

    // 路由优先级策略
    priority: "specific-first", // 'specific-first' | 'order'

    // API 目录配置（可选）
    // 默认为 'routes/api'，也可以配置为 'api' 等相对路径
    // 如果配置为 'api'，则 API 文件应放在项目根目录的 api 文件夹中
    apiDir: "routes/api", // 或 'api'
    
    // API 路由模式配置（可选）
    // - "method": 方法路由模式（默认），通过 URL 路径指定方法名，必须使用中划线格式，例如 /api/users/get-user
    // - "restful": RESTful 模式，基于 HTTP 方法和资源路径，例如 GET /api/users, POST /api/users
    // 注意：两种模式是互斥的，不能混用
    apiMode: "method", // 或 "restful"，默认为 "method"
  },
});`;

  // 构建配置
  const buildConfigCode = `export default defineConfig({
  build: {
    // 输出目录（必需）
    outDir: "dist",

    // 是否生成 source map
    sourcemap: true,

    // 是否压缩代码
    minify: true,

    // 目标环境
    target: "es2022",

    // 外部依赖（不打包）
    external: ["react", "preact"],
  },
});`;

  // 开发配置
  const devConfigCode = `export default defineConfig({
  dev: {
    // 开发服务器端口
    port: 3000,

    // 是否启用 HMR（热更新）
    hmr: true,

    // HMR WebSocket 路径
    hmrPath: "/_hmr",

    // 是否打开浏览器
    open: false,
  },
});`;

  // 中间件配置
  const middlewareConfigCode = `import { bodyParser, cors, logger } from "@dreamer/dweb/middleware";

export default defineConfig({
  middleware: [
    logger(),
    cors({ origin: "*" }),
    bodyParser(),
  ],
});`;

  // 插件配置
  const pluginsConfigCode = `import { seo, tailwind } from "@dreamer/dweb/plugins";

export default defineConfig({
  plugins: [
    seo({
      title: "My App",
      description: "My awesome app",
    }),
    tailwind({
      version: "v4",
    }),
  ],
});`;

  // Cookie 配置
  const cookieConfigCode = `export default defineConfig({
  cookie: {
    // Cookie 密钥（必需）
    secret: "your-secret-key",

    // 默认选项
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 3600,
  },
});`;

  // Session 配置
  const sessionConfigCode = `export default defineConfig({
  session: {
    // 存储方式
    store: "memory", // 'memory' | 'file' | 'kv' | 'mongodb' | 'redis'

    // Session 密钥（必需）
    secret: "your-secret-key",

    // 最大存活时间（秒）
    maxAge: 3600,

    // Session 名称
    name: "session",

    // 文件存储配置
    file: {
      dir: "./sessions",
    },

    // MongoDB 存储配置
    mongodb: {
      collection: "sessions",
    },

    // Redis 存储配置
    redis: {
      host: "localhost",
      port: 6379,
      password: "password",
      db: 0,
    },
  },
});`;

  // 静态资源配置
  const staticConfigCode = `export default defineConfig({
  static: {
    // 静态资源目录
    dir: "./public",

    // URL 前缀
    prefix: "/static",

    // 索引文件名
    index: "index.html",

    // 点文件处理方式
    dotfiles: "ignore", // 'allow' | 'deny' | 'ignore'

    // 是否启用 ETag
    etag: true,

    // 是否发送 Last-Modified
    lastModified: true,

    // 缓存时间（秒）
    maxAge: 3600,
  },
});`;

  // 数据库配置
  const databaseConfigCode = `export default defineConfig({
  database: {
    // 数据库类型
    type: "postgresql", // 'postgresql' | 'mongodb'

    // 连接配置
    connection: {
      host: "localhost",
      port: 5432,
      database: "mydb",
      username: "user",
      password: "password",
    },

    // 连接池配置（SQL 数据库）
    pool: {
      min: 2,
      max: 10,
      idleTimeout: 30,
      maxRetries: 3,
      retryDelay: 1000,
    },

    // MongoDB 特定配置
    mongoOptions: {
      maxPoolSize: 10,
      minPoolSize: 2,
      timeoutMS: 5000,
      maxRetries: 3,
      retryDelay: 1000,
    },
  },
});`;

  // 多应用模式
  const multiAppConfigCode = `export default defineConfig({
  // 共享配置
  cookie: {
    secret: "shared-secret",
  },

  // 应用列表
  apps: [
    {
      name: "frontend",
      basePath: "/",
      server: {
        port: 3000,
      },
      routes: {
        dir: "frontend/routes",
      },
      build: {
        outDir: "dist/frontend",
      },
    },
    {
      name: "backend",
      basePath: "/api",
      server: {
        port: 3001,
      },
      routes: {
        dir: "backend/routes",
      },
      build: {
        outDir: "dist/backend",
      },
    },
  ],
});`;

  // 环境变量
  const envConfigCode = `export default defineConfig({
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

  // 完整配置示例
  const fullConfigCode = `import { defineConfig } from "@dreamer/dweb";
import { bodyParser, cors, logger } from "@dreamer/dweb/middleware";
import { seo, tailwind } from "@dreamer/dweb/plugins";

export default defineConfig({
  name: "my-app",
  basePath: "/",
  renderMode: "ssr",

  server: {
    port: 3000,
    host: "localhost",
  },

  routes: {
    dir: "routes",
    ignore: ["**/*.test.ts"],
  },

  build: {
    outDir: "dist",
    sourcemap: true,
    minify: true,
  },

  dev: {
    port: 3000,
    hmr: true,
  },

  middleware: [
    logger(),
    cors({ origin: "*" }),
    bodyParser(),
  ],

  plugins: [
    seo({
      title: "My App",
      description: "My awesome app",
    }),
    tailwind({
      version: "v4",
    }),
  ],

  cookie: {
    secret: "your-secret-key",
  },

  session: {
    store: "memory",
    secret: "your-secret-key",
    maxAge: 3600,
  },

  static: {
    dir: "./public",
    prefix: "/static",
  },

  database: {
    type: "postgresql",
    connection: {
      host: "localhost",
      port: 5432,
      database: "mydb",
      username: "user",
      password: "password",
    },
  },
});`;

  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>配置文档</h1>

      <p>
        DWeb 框架使用 <code>dweb.config.ts</code> 文件进行配置，支持单应用和多应用模式。
      </p>

      <h2>配置文件位置</h2>

      <p>配置文件应位于项目根目录，命名为 <code>dweb.config.ts</code>。</p>

      <CodeBlock
        language="typescript"
        code={`// dweb.config.ts
import { defineConfig } from "@dreamer/dweb";

export default defineConfig({
  // 配置选项
});`}
      />

      <h2>配置选项</h2>

      <h3>基础配置</h3>

      <CodeBlock language="typescript" code={basicConfigCode} />

      <h3>服务器配置</h3>

      <CodeBlock language="typescript" code={serverConfigCode} />

      <h3>路由配置</h3>

      <CodeBlock language="typescript" code={routesConfigCode} />

      <h4>渲染适配器配置</h4>

      <p><code>render</code> 选项用于配置渲染引擎：</p>

      <CodeBlock
        language="typescript"
        code={`export default defineConfig({
  render: {
    // 渲染引擎，可选值：'preact' | 'react' | 'vue3'
    // 默认为 'preact'
    engine: "preact",
  },
});`}
      />

      <p><strong>支持的渲染引擎：</strong></p>

      <ul>
        <li>
          <strong>preact</strong>（默认）：使用 Preact 作为渲染引擎，轻量级，性能优秀
        </li>
        <li>
          <strong>react</strong>：使用 React 作为渲染引擎，需要安装 <code>react</code> 和 <code>react-dom</code> 依赖
        </li>
        <li>
          <strong>vue3</strong>：使用 Vue 3 作为渲染引擎，需要安装 <code>vue</code> 和 <code>@vue/server-renderer</code> 依赖
        </li>
      </ul>

      <p><strong>注意事项：</strong></p>

      <ul>
        <li>如果使用 React 或 Vue3，需要确保已安装对应的依赖包</li>
        <li>如果未安装对应的依赖包，框架会使用默认的 Preact 引擎</li>
        <li>切换渲染引擎后，需要确保代码兼容对应的渲染引擎</li>
      </ul>

      <h4>API 目录配置说明</h4>

      <p><code>apiDir</code> 选项用于配置 API 路由文件的存放目录：</p>

      <ul>
        <li>
          <strong>默认值</strong>：<code>routes/api</code> - API 文件放在 <code>routes</code> 目录下的 <code>api</code> 子目录中
        </li>
        <li>
          <strong>自定义配置</strong>：可以设置为 <code>'api'</code> 等相对路径，此时 API
          文件应放在项目根目录的对应文件夹中
        </li>
      </ul>

      <CodeBlock
        language="typescript"
        code={`// 默认配置（API 文件在 routes/api 目录）
routes: {
  dir: 'routes',
  // apiDir 默认为 'routes/api'
}

// 自定义配置（API 文件在项目根目录的 api 文件夹）
routes: {
  dir: 'routes',
  apiDir: 'api', // API 文件放在项目根目录的 api 文件夹中
}`}
      />

      <h3>构建配置</h3>

      <CodeBlock language="typescript" code={buildConfigCode} />

      <h3>开发配置</h3>

      <CodeBlock language="typescript" code={devConfigCode} />

      <h3>中间件配置</h3>

      <CodeBlock language="typescript" code={middlewareConfigCode} />

      <h3>插件配置</h3>

      <CodeBlock language="typescript" code={pluginsConfigCode} />

      <h3>Cookie 配置</h3>

      <CodeBlock language="typescript" code={cookieConfigCode} />

      <h3>Session 配置</h3>

      <CodeBlock language="typescript" code={sessionConfigCode} />

      <h3>静态资源配置</h3>

      <CodeBlock language="typescript" code={staticConfigCode} />

      <h3>数据库配置</h3>

      <CodeBlock language="typescript" code={databaseConfigCode} />

      <h2>多应用模式</h2>

      <p>多应用模式允许在单个配置文件中管理多个应用。</p>

      <CodeBlock language="typescript" code={multiAppConfigCode} />

      <h3>运行多应用</h3>

      <CodeBlock
        language="bash"
        code={`# 运行指定应用
deno task dev:app-name`}
      />

      <h2>环境变量</h2>

      <p>可以使用环境变量覆盖配置：</p>

      <CodeBlock language="typescript" code={envConfigCode} />

      <h2>配置验证</h2>

      <p>框架会自动验证配置，如果配置不正确会抛出错误：</p>

      <ul>
        <li>单应用模式：必须配置 <code>server.port</code>、<code>routes</code> 和 <code>build.outDir</code></li>
        <li>多应用模式：每个应用必须配置 <code>server.port</code>、<code>routes</code> 和 <code>build.outDir</code></li>
      </ul>

      <h2>完整配置示例</h2>

      <CodeBlock language="typescript" code={fullConfigCode} />

      <h2>相关文档</h2>

      <ul>
        <li>
          <a href="/docs/development">开发指南</a> - 了解开发流程
        </li>
        <li>
          <a href="/docs/docker">Docker 部署</a> - 了解 Docker 部署配置
        </li>
        <li>
          <a href="/docs/core/config">配置管理</a> - 了解配置管理器的详细说明
        </li>
      </ul>
    </article>
  );
}