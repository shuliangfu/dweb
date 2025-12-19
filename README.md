# DWeb 框架

[![JSR](https://jsr.io/badges/@dreamer/dweb)](https://jsr.io/@dreamer/dweb)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

基于 Deno + Preact + Tailwind CSS 的现代化全栈 Web 框架，提供开箱即用的开发体验。

## ✨ 特性

- 🚀 **基于 Deno 运行时** - 原生 TypeScript 支持，无需构建工具，开箱即用
- ⚡️ **文件系统路由** - 类似 Next.js 的自动路由，基于文件结构自动生成路由，无需手动配置
- 🎨 **多种渲染模式** - 支持 SSR（服务端渲染）、CSR（客户端渲染）和 Hybrid（混合渲染），可根据需求灵活选择
- 🤖 **智能渲染检测** - 自动检测组件是否使用 Preact Hooks，自动选择最适合的渲染模式
- 🔥 **热更新（HMR）** - 开发时实时热更新，支持服务端和客户端组件热替换，大幅提升开发效率
- 🎨 **Tailwind CSS 集成** - 内置 Tailwind CSS v3/v4 支持，自动编译和优化，无需额外配置
- 🛠️ **中间件系统** - 灵活的中间件系统，支持链式调用，内置日志、CORS、Body Parser、压缩、安全、限流、认证等
- 🔌 **插件系统** - 强大的插件系统，支持生命周期钩子，可轻松扩展框架功能
- 🍪 **Cookie 和 Session 管理** - 内置 Cookie 和 Session 管理，支持签名、加密、多种存储方式（内存、文件、Redis）
- 📦 **单应用和多应用模式** - 支持单应用和多应用（微前端）模式，可共享配置和资源
- 🎯 **API 路由** - 简洁的 API 路由设计，通过 URL 路径指定方法名（如 `/api/users/getUsers` 或 `/api/users/get-users`），支持驼峰和短横线两种命名格式，自动转换
- ⚡️ **异步组件支持** - 支持异步页面组件、布局组件和 App 组件，轻松处理数据加载
- 📊 **服务端数据获取** - 通过 `load` 函数在服务端获取数据，自动注入到组件 props
- 🔄 **客户端路由导航** - 无缝的客户端路由导航，支持无刷新页面切换，类似 SPA 体验
- 🗄️ **数据库支持** - 内置数据库支持，支持 SQLite、PostgreSQL、MySQL、MongoDB，提供查询构建器和 ORM/ODM 模型，支持迁移管理

## 🌐 运行时兼容性

DWeb 框架主要针对 **Deno** 运行时设计，同时兼容以下运行时：

- ✅ **Deno** - 完全支持（主要目标运行时）
- ⚠️ **Node.js** - 部分功能可能受限（需要 Deno 兼容层）
- ⚠️ **Bun** - 实验性支持
- ⚠️ **Browser** - 仅客户端代码支持

> **注意**：为了获得最佳体验，建议使用 Deno 运行时。

## 📦 安装

### 方式一：使用 JSR 创建项目（推荐）

```bash
# 使用 CLI 创建新项目（交互式）
deno run -A jsr:@dreamer/dweb/cli create

# 进入项目目录
cd my-app

# 启动开发服务器
deno task dev
```

### 方式二：作为库导入使用（高级用法）

如果你需要以编程方式使用框架（不通过配置文件），可以使用库模式：

```bash
deno add jsr:@dreamer/dweb
```

然后在代码中导入使用：

```typescript
import { startDevServer, loadConfig } from "jsr:@dreamer/dweb";
import type { AppConfig } from "jsr:@dreamer/dweb";

// 方式 1: 直接传入配置对象
const config: AppConfig = {
  server: { port: 3000, host: "localhost" },
  routes: { dir: "routes" },
};
await startDevServer(config);

// 方式 2: 从配置文件加载（推荐）
const { config } = await loadConfig("dweb.config.ts");
await startDevServer(config);
```

> **注意**：推荐使用配置文件（`dweb.config.ts`）+ CLI 命令的方式，更简单且符合框架设计。库模式主要用于特殊场景或自定义集成。

## 🚀 快速开始

### 1. 创建项目

```bash
deno run -A jsr:@dreamer/dweb/cli create
```

### 2. 配置项目

创建 `dweb.config.ts` 配置文件：

```typescript
import { tailwind, cors } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  server: {
    port: 3000,
    host: "localhost",
  },
  routes: {
    dir: "routes",
  },
  plugins: [
    tailwind({
      version: "v4",
      cssPath: "public/style.css",
    }),
  ],
  middleware: [cors()],
};

export default config;
```

### 3. 创建路由

```typescript
// routes/index.tsx
import type { PageProps } from "@dreamer/dweb";

export default function HomePage({ data }: PageProps) {
  return (
    <div>
      <h1>欢迎使用 DWeb 框架</h1>
      <p>这是一个基于 Deno + Preact 的全栈框架</p>
    </div>
  );
}
```

### 4. 启动开发服务器

```bash
deno task dev
```

访问 http://localhost:3000 查看你的应用。

## 📚 使用示例

### 页面路由

```typescript
// routes/about.tsx
import type { PageProps } from "@dreamer/dweb";

export default function AboutPage({ params, query }: PageProps) {
  return (
    <div>
      <h1>关于我们</h1>
      <p>这是关于页面</p>
    </div>
  );
}
```

### 服务端数据获取

```typescript
// routes/user/[id].tsx
import type { PageProps, LoadContext } from "@dreamer/dweb";

export async function load({ params }: LoadContext) {
  // 在服务端获取数据
  const user = await fetchUser(params.id);
  return { user };
}

export default function UserPage({ data }: PageProps) {
  const { user } = data;
  return <div>用户: {user.name}</div>;
}
```

### API 路由

```typescript
// routes/api/users.ts
import type { Request } from "@dreamer/dweb";
import { getDatabase, SQLQueryBuilder } from "@dreamer/dweb";

// POST /api/users/getUsers 或 POST /api/users/get-users
export async function getUsers(req: Request) {
  const db = getDatabase();
  const builder = new SQLQueryBuilder(db);
  const users = await builder
    .select(['*'])
    .from('users')
    .execute();
  return { users };
}

// POST /api/users/createUser 或 POST /api/users/create-user
export async function createUser(req: Request) {
  const db = getDatabase();
  const data = await req.json();
  const builder = new SQLQueryBuilder(db);
  await builder
    .insert('users', data)
    .execute();
  return { success: true };
}
```

### 中间件使用

```typescript
// routes/_middleware.ts
import type { Request, Response } from "@dreamer/dweb";

export default async function middleware(
  req: Request,
  res: Response,
  next: () => Promise<void>
) {
  console.log(`${req.method} ${req.url}`);
  await next();
}
```

### 布局组件

```typescript
// routes/_layout.tsx
import type { PageProps } from "@dreamer/dweb";

export default function Layout({ children }: PageProps) {
  return (
    <html>
      <head>
        <title>DWeb 应用</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <header>网站头部</header>
        <main>{children}</main>
        <footer>网站底部</footer>
      </body>
    </html>
  );
}
```

## 📖 API 路由

DWeb 的 API 路由**只支持路径模式**，通过 URL 路径指定方法名：

```typescript
// routes/api/users.ts
import type { Request } from "@dreamer/dweb";

export async function getUsers(req: Request) {
  const users = await db.getUsers();
  return { users };
}

export async function createUser(req: Request) {
  const data = await req.json();
  const user = await db.createUser(data);
  return { success: true, user };
}
```

**访问方式**（只支持路径模式）：
- ✅ 驼峰格式：`POST /api/users/getUsers`
- ✅ 短横线格式：`POST /api/users/get-users`
- ❌ 查询参数模式：`POST /api/users?action=getUsers`（不支持）

两种路径格式会自动转换，可以混用。

## 📚 配置说明

DWeb 框架使用配置文件（`dweb.config.ts`）来管理应用配置，无需手动调用 API。框架会自动加载配置文件并启动服务器。

### 基本配置

```typescript
// dweb.config.ts
import { tailwind, cors } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  // ========== 基础配置 ==========
  
  // 应用名称（可选，多应用模式下用于区分应用）
  name: "my-app",
  
  // 应用基础路径（可选，多应用模式下使用）
  // basePath: "/api",
  
  // 全局渲染模式（可选，默认: 'ssr'）
  // 可选值: 'ssr' | 'csr' | 'hybrid'
  // - ssr: 服务端渲染（SEO 友好，首屏快）
  // - csr: 客户端渲染（交互性强，适合管理后台）
  // - hybrid: 混合渲染（SSR + 客户端 hydration）
  renderMode: "hybrid",
  
  // ========== 服务器配置 ==========
  server: {
    // 服务器端口（必需）
    port: 3000,
    // 服务器主机地址（必需）
    host: "localhost", // 或 "127.0.0.1" 或 "0.0.0.0"
  },
  
  // ========== 路由配置 ==========
  routes: {
    // 路由目录（必需）
    // 框架会扫描此目录下的文件自动生成路由
    dir: "routes",
    
    // 忽略的文件或目录（可选，支持 glob 模式）
    ignore: [
      "**/*.test.ts",      // 忽略测试文件
      "**/*.test.tsx",     // 忽略测试文件
      "**/__tests__/**",   // 忽略测试目录
    ],
    
    // 是否启用路由缓存（可选，开发环境默认 false，生产环境默认 true）
    // cache: false,
    
    // 路由匹配优先级（可选，默认: 'specific-first'）
    // - 'specific-first': 具体路由优先于动态路由（如 /user/123 优先于 /user/[id]）
    // - 'order': 按文件系统顺序匹配
    // priority: "specific-first",
  },
  
  // ========== 静态资源目录 ==========
  // 静态资源目录（可选，默认: 'public'）
  // 此目录下的文件可以通过 URL 直接访问，如 public/logo.png → /logo.png
  // staticDir: "public",
  
  // ========== 开发配置 ==========
  dev: {
    // 是否启用热更新（可选，默认: true）
    // hmr: true,
    
    // 是否自动打开浏览器（可选，默认: false）
    // open: true,
    
    // HMR WebSocket 服务器端口（可选，默认: 24678）
    hmrPort: 24678,
    
    // 文件变化后重载延迟（毫秒，可选，默认: 300）
    // 用于避免频繁重载，等待文件保存完成
    reloadDelay: 300,
  },
  
  // ========== 构建配置 ==========
  build: {
    // 构建输出目录（必需）
    outDir: "dist",
    // 可以添加其他构建选项
  },
  
  // ========== Cookie 配置 ==========
  cookie: {
    // Cookie 签名密钥（可选，用于签名 Cookie 防止篡改）
    secret: "your-secret-key-here",
    
    // 是否仅通过 HTTPS 传输（可选，默认: false）
    // secure: true,
    
    // 是否禁止 JavaScript 访问（可选，默认: true）
    // httpOnly: true,
    
    // SameSite 策略（可选，默认: 'lax'）
    // 可选值: 'strict' | 'lax' | 'none'
    // sameSite: "lax",
    
    // 默认过期时间（秒，可选）
    // maxAge: 86400, // 24小时
  },
  
  // ========== Session 配置 ==========
  session: {
    // Session 密钥（必需，用于加密 Session 数据）
    secret: "your-session-secret-here",
    
    // 存储方式（可选，默认: 'memory'）
    // 可选值: 'memory' | 'file' | 'redis'
    store: "memory",
    
    // 过期时间（毫秒，可选，默认: 3600000，即 1 小时）
    maxAge: 3600000,
    
    // 是否仅通过 HTTPS 传输（可选，默认: false）
    secure: false,
    
    // 是否禁止 JavaScript 访问（可选，默认: true）
    httpOnly: true,
    
    // Redis 配置（当 store 为 'redis' 时使用）
    // redis: {
    //   host: "localhost",
    //   port: 6379,
    // },
  },
  
  // ========== 插件配置 ==========
  plugins: [
    // Tailwind CSS 插件
    tailwind({
      // Tailwind CSS 版本（可选，默认: 'v4'）
      version: "v4", // 或 "v3"
      
      // CSS 文件路径（可选，默认: 'public/style.css'）
      cssPath: "public/style.css",
      
      // 生产环境是否优化（可选，默认: true）
      optimize: true,
    }),
    
    // 可以添加更多插件
    // customPlugin({
    //   // 插件配置
    // }),
  ],
  
  // ========== 中间件配置 ==========
  middleware: [
    // CORS 中间件
    cors({
      // 允许的源（可选，默认: '*'）
      origin: "*", // 或 ["http://localhost:3000", "https://example.com"]
      
      // 允许的 HTTP 方法（可选）
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      
      // 允许的请求头（可选）
      allowedHeaders: ["Content-Type", "Authorization"],
      
      // 暴露的响应头（可选）
      // exposedHeaders: ["X-Custom-Header"],
      
      // 是否允许携带凭证（可选，默认: false）
      // credentials: true,
      
      // 预检请求缓存时间（秒，可选）
      // maxAge: 86400,
    }),
    
    // 可以添加更多中间件
    // logger(),           // 日志中间件
    // compression(),      // 压缩中间件
    // security(),         // 安全中间件
    // rateLimit({         // 限流中间件
    //   windowMs: 60000,  // 时间窗口（毫秒）
    //   max: 100,         // 最大请求数
    // }),
    // auth({              // 认证中间件
    //   secret: "your-jwt-secret",
    // }),
  ],
};

export default config;
```

### 启动服务器

配置完成后，使用 CLI 命令启动服务器：

```bash
# 开发环境
deno task dev

# 生产环境构建
deno task build

# 生产环境启动
deno task start
```

框架会自动：
1. 查找并加载 `dweb.config.ts` 配置文件
2. 根据配置初始化服务器、路由、中间件和插件
3. 启动开发或生产服务器


### 环境变量

```typescript
import { env } from "@dreamer/dweb";

const apiKey = env("API_KEY");
const port = env.int("PORT", 3000);
const debug = env.bool("DEBUG", false);
```

## 📖 文档

- **[完整文档](./docs/DOC.md)** - 详细的功能说明和 API 文档
- **[使用指南](./docs/GUIDES.md)** - 完整的使用指南（快速开始、配置、路由、渲染模式、中间件、插件、最佳实践、FAQ）
- **[数据库使用指南](./docs/DATABASE_USAGE.md)** - 数据库功能使用指南（配置、查询构建器、ORM/ODM、迁移管理）
- **[数据库实现方案](./docs/DATABASE_ANALYSIS.md)** - 数据库功能的详细架构设计和实现方案
- **[配置示例](./docs/CONFIG_EXAMPLES.md)** - 各种场景的配置示例（基础配置、单应用、多应用、开发/生产环境、高级配置）
- **[开发指南](./docs/DEVELOPMENT.md)** - 插件开发、中间件开发、自定义路由指南
- **[快速开始指南](./example/QUICK_START.md)** - 快速上手教程
- **[Docker 部署](./docs/DOCKER.md)** - Docker 部署指南
- **[使用示例](./example/)** - 完整的示例项目

## 🛠️ 开发

### 运行示例项目

```bash
# 进入示例目录
cd example

# 启动开发服务器
deno task dev
```

### 构建项目

```bash
deno task build
```

### 代码检查

```bash
deno task lint
deno task fmt
deno task check
```

## 📦 JSR 包信息

- **包名**: `@dreamer/dweb`
- **版本**: `1.0.0`
- **JSR 链接**: https://jsr.io/@dreamer/dweb
- **质量分数**: 查看 [JSR Score](https://jsr.io/@dreamer/dweb/score)

## 🤝 贡献

欢迎贡献代码！请查看 [贡献指南](./CONTRIBUTING.md) 了解如何参与项目，或直接提交 [Issue](https://github.com/shuliangfu/dweb/issues) 和 [Pull Request](https://github.com/shuliangfu/dweb/pulls)。

## 📄 许可证

MIT License - 查看 [LICENSE](./LICENSE) 文件了解详情

## 🔗 相关链接

- [JSR 包页面](https://jsr.io/@dreamer/dweb)
- [GitHub 仓库](https://github.com/shuliangfu/dweb)
- [问题反馈](https://github.com/shuliangfu/dweb/issues)

---

**DWeb 框架** - 让 Deno Web 开发更简单、更快速、更高效！ 🚀

