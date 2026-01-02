/**
 * 配置文档页面
 * 展示 DWeb 框架的配置选项和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "配置文档 - DWeb 框架文档",
  description:
    "DWeb 框架的完整配置选项说明，包括服务器、路由、构建、开发等配置",
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
  const middlewareConfigCode =
    `import { bodyParser, cors, logger } from "@dreamer/dweb";

export default defineConfig({
  middleware: [
    logger(),
    cors({ origin: "*" }),
    bodyParser(),
  ],
});`;

  // 插件配置
  const pluginsConfigCode =
    `import { seo, tailwind } from "@dreamer/dweb";

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
import { bodyParser, cors, logger } from "@dreamer/dweb";
import { seo, tailwind } from "@dreamer/dweb";

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

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "配置文档",
    description: "DWeb 框架使用 `dweb.config.ts` 文件进行配置，支持单应用和多应用模式。",
    sections: [
      {
        title: "配置文件位置",
        blocks: [
          {
            type: "text",
            content: "配置文件应位于项目根目录，命名为 `dweb.config.ts`。",
          },
          {
            type: "code",
            code: `// dweb.config.ts
import { defineConfig } from "@dreamer/dweb";

export default defineConfig({
  // 配置选项
});`,
            language: "typescript",
          },
        ],
      },
      {
        title: "配置选项",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "基础配置",
            blocks: [
              {
                type: "code",
                code: basicConfigCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "服务器配置",
            blocks: [
              {
                type: "code",
                code: serverConfigCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "路由配置",
            blocks: [
              {
                type: "code",
                code: routesConfigCode,
                language: "typescript",
              },
              {
                type: "subsection",
                level: 4,
                title: "渲染适配器配置",
                blocks: [
                  {
                    type: "text",
                    content: "`render` 选项用于配置渲染引擎：",
                  },
                  {
                    type: "code",
                    code: `export default defineConfig({
  render: {
    // 渲染引擎，可选值：'preact' | 'react' | 'vue3'
    // 默认为 'preact'
    engine: "preact",
  },
});`,
                    language: "typescript",
                  },
                  {
                    type: "text",
                    content: "**支持的渲染引擎：**",
                  },
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "**preact**（默认）：使用 Preact 作为渲染引擎，轻量级，性能优秀",
                      "**react**：使用 React 作为渲染引擎，需要安装 `react` 和 `react-dom` 依赖",
                      "**vue3**：使用 Vue 3 作为渲染引擎，需要安装 `vue` 和 `@vue/server-renderer` 依赖",
                    ],
                  },
                  {
                    type: "text",
                    content: "**注意事项：**",
                  },
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "如果使用 React 或 Vue3，需要确保已安装对应的依赖包",
                      "如果未安装对应的依赖包，框架会使用默认的 Preact 引擎",
                      "切换渲染引擎后，需要确保代码兼容对应的渲染引擎",
                    ],
                  },
                ],
              },
              {
                type: "subsection",
                level: 4,
                title: "API 目录配置说明",
                blocks: [
                  {
                    type: "text",
                    content: "`apiDir` 选项用于配置 API 路由文件的存放目录：",
                  },
                  {
                    type: "list",
                    ordered: false,
                    items: [
                      "**默认值**：`routes/api` - API 文件放在 `routes` 目录下的 `api` 子目录中",
                      "**自定义配置**：可以设置为 `'api'` 等相对路径，此时 API 文件应放在项目根目录的对应文件夹中",
                    ],
                  },
                  {
                    type: "code",
                    code: `// 默认配置（API 文件在 routes/api 目录）
routes: {
  dir: 'routes',
  // apiDir 默认为 'routes/api'
}

// 自定义配置（API 文件在项目根目录的 api 文件夹）
routes: {
  dir: 'routes',
  apiDir: 'api', // API 文件放在项目根目录的 api 文件夹中
}`,
                    language: "typescript",
                  },
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "构建配置",
            blocks: [
              {
                type: "code",
                code: buildConfigCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "开发配置",
            blocks: [
              {
                type: "code",
                code: devConfigCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "中间件配置",
            blocks: [
              {
                type: "code",
                code: middlewareConfigCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "插件配置",
            blocks: [
              {
                type: "code",
                code: pluginsConfigCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "Cookie 配置",
            blocks: [
              {
                type: "code",
                code: cookieConfigCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "Session 配置",
            blocks: [
              {
                type: "code",
                code: sessionConfigCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "静态资源配置",
            blocks: [
              {
                type: "code",
                code: staticConfigCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "数据库配置",
            blocks: [
              {
                type: "code",
                code: databaseConfigCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "多应用模式",
        blocks: [
          {
            type: "text",
            content: "多应用模式允许在单个配置文件中管理多个应用。",
          },
          {
            type: "code",
            code: multiAppConfigCode,
            language: "typescript",
          },
          {
            type: "subsection",
            level: 3,
            title: "运行多应用",
            blocks: [
              {
                type: "code",
                code: `# 运行指定应用
deno task dev:app-name`,
                language: "bash",
              },
            ],
          },
        ],
      },
      {
        title: "环境变量",
        blocks: [
          {
            type: "text",
            content: "可以使用环境变量覆盖配置：",
          },
          {
            type: "code",
            code: envConfigCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "配置验证",
        blocks: [
          {
            type: "text",
            content: "框架会自动验证配置，如果配置不正确会抛出错误：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "单应用模式：必须配置 `server.port`、`routes` 和 `build.outDir`",
              "多应用模式：每个应用必须配置 `server.port`、`routes` 和 `build.outDir`",
            ],
          },
        ],
      },
      {
        title: "完整配置示例",
        blocks: [
          {
            type: "code",
            code: fullConfigCode,
            language: "typescript",
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
              "[开发指南](/docs/development) - 了解开发流程",
              "[Docker 部署](/docs/docker) - 了解 Docker 部署配置",
              "[配置管理](/docs/core/config) - 了解配置管理器的详细说明",
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
