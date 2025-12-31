# DWeb 框架

[![JSR](https://jsr.io/badges/@dreamer/dweb)](https://jsr.io/@dreamer/dweb)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

基于 **Deno + Preact + Tailwind CSS** 的现代化全栈 Web 框架，提供开箱即用的开发体验，让 Deno Web 开发更简单、更快速、更高效。

## ✨ 核心特性

### 🚀 运行时与语言
- **基于 Deno 运行时** - 原生 TypeScript 支持，无需配置，开箱即用
- **零配置开发** - 无需复杂的构建配置，Deno 原生支持 TypeScript
- **现代 JavaScript** - 支持最新的 ES 特性和 Web 标准

### ⚡️ 路由与渲染
- **文件系统路由** - 基于文件结构自动生成路由，无需手动配置
- **多种渲染模式** - 支持 SSR（服务端渲染）、CSR（客户端渲染）和 Hybrid（混合渲染）
- **智能渲染检测** - 自动检测组件并选择最适合的渲染模式
- **动态路由支持** - 支持参数路由、可选参数、通配符等
- **API 路由** - 通过 URL 路径指定方法名，支持驼峰和短横线格式

### 🎨 开发体验
- **热更新（HMR）** - 开发时实时热更新，支持服务端和客户端组件
- **Tailwind CSS 集成** - 内置 Tailwind CSS v3/v4 支持，自动编译优化
- **异步组件支持** - 支持异步页面、布局和 App 组件
- **服务端数据获取** - 通过 `load` 函数在服务端获取数据
- **客户端路由导航** - 无缝的客户端路由，支持无刷新页面切换

### 🛠️ 核心功能
- **中间件系统** - 灵活的中间件系统，内置日志、CORS、压缩、安全等
- **插件系统** - 强大的插件系统，支持生命周期钩子，易于扩展
- **扩展系统** - 为原生类型提供扩展方法，丰富的辅助函数库
- **控制台工具** - 强大的命令行工具，支持命令封装、输入输出、表格显示等

### 🗄️ 数据与存储
- **数据库支持** - 支持 PostgreSQL、MongoDB，提供查询构建器和 ORM/ODM
- **数据库迁移** - 内置数据库迁移管理工具
- **Cookie 和 Session** - 内置 Cookie 和 Session 管理，支持多种存储方式
- **查询缓存** - 支持查询结果缓存，提升性能

### 🌐 网络与通信
- **WebSocket 支持** - 内置 WebSocket 服务器和客户端
- **GraphQL 支持** - 内置 GraphQL 服务器和查询处理
- **RESTful API** - 完整的 RESTful API 支持

### 📦 架构模式
- **单应用模式** - 适合简单的单页面应用或 API 服务
- **多应用模式** - 支持多应用（微前端）模式，适合大型项目
- **布局系统** - 支持布局继承和嵌套布局

### 🔧 工具与集成
- **国际化（i18n）** - 多语言支持和翻译管理
- **日志系统** - 完整的日志系统，支持日志轮转
- **监控系统** - 内置性能监控和错误追踪
- **环境变量管理** - 便捷的环境变量读取和验证
- **优雅关闭** - 支持优雅关闭和信号处理

## 🌐 运行时要求

DWeb 框架基于 **Deno** 运行时开发，仅支持 Deno 运行时。

- ✅ **Deno** - 完全支持（必需，建议版本 >= 2.5）

## 📦 安装

### 创建新项目

```bash
# 使用 CLI 创建新项目（交互式）
deno run -A jsr:@dreamer/dweb/init

# 进入项目目录
cd my-app

# 启动开发服务器
deno task dev
```

### 项目创建选项

创建项目时，CLI 会提示你选择：

1. **项目名称** - 项目文件夹名称
2. **应用模式** - 单应用模式或多应用模式
3. **Tailwind CSS 版本** - V3（稳定）或 V4（推荐）
4. **渲染模式** - SSR、CSR 或 Hybrid（混合）

## 🚀 快速开始

### 1. 创建项目

```bash
deno run -A jsr:@dreamer/dweb/init
```

### 2. 配置项目

创建项目后，会自动生成 `dweb.config.ts` 配置文件：

```typescript
// dweb.config.ts
import { defineConfig, tailwind, cors, seo } from "@dreamer/dweb";

export default defineConfig({
  name: "my-app",
  
  // 渲染配置
  render: {
    engine: "preact", // 'preact' | 'react' | 'vue3'
    mode: "hybrid", // 'ssr' | 'csr' | 'hybrid'
  },
  
  // 服务器配置
  server: {
    port: 3000,
    host: "localhost",
  },
  
  // 路由配置
  routes: {
    dir: "routes",
    ignore: ["**/*.test.ts", "**/*.test.tsx"],
  },
  
  // 静态资源目录
  static: {
    dir: "assets",
    prefix: "/assets",
    maxAge: 86400, // 缓存 1 天
  },
  
  // 插件配置
  plugins: [
    tailwind({
      version: "v4",
      cssPath: "assets/style.css",
      optimize: true,
    }),
    seo({
      title: "我的应用",
      description: "基于 DWeb 框架构建的应用",
    }),
  ],
  
  // 中间件配置
  middleware: [
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    }),
  ],
});
```

### 3. 创建路由

在 `routes/` 目录下创建页面文件：

```typescript
// routes/index.tsx
import type { PageProps } from "@dreamer/dweb";

export default function HomePage({ data }: PageProps) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">欢迎使用 DWeb 框架</h1>
      <p className="mt-4 text-gray-600">这是一个基于 Deno + Preact 的全栈框架</p>
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

### 动态路由

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

### 使用扩展方法

```typescript
import { setupExtensions } from "@dreamer/dweb/extensions";

// 初始化扩展系统
setupExtensions();

// 使用 String 扩展
"hello world".capitalize(); // "Hello world"
"test@example.com".isEmail(); // true

// 使用 Array 扩展
[1, 2, 3, 2, 1].unique(); // [1, 2, 3]
[{ id: 1 }, { id: 2 }].groupBy('status');

// 使用 Date 扩展
new Date().format("YYYY-MM-DD"); // "2024-01-15"
new Date().fromNow(); // "2小时前"

// 使用辅助函数
import { validateEmail, formatCurrency } from "@dreamer/dweb/extensions";
validateEmail("test@example.com"); // true
formatCurrency(1234.56); // "¥1,234.56"
```

### 数据库操作

```typescript
// 初始化数据库
import { initDatabaseFromConfig } from "@dreamer/dweb/database";
await initDatabaseFromConfig();

// 使用模型
import { MongoModel } from "@dreamer/dweb/database";

class User extends MongoModel {
  static collection = "users";
  
  static schema = {
    name: String,
    email: String,
    age: Number,
  };
}

// 创建用户
const user = await User.create({
  name: "Alice",
  email: "alice@example.com",
  age: 30,
});

// 查询用户
const users = await User.find({ age: { $gte: 18 } });
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
        <link rel="stylesheet" href="/assets/style.css" />
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

两种路径格式会自动转换，可以混用。

## 📚 配置说明

DWeb 框架使用配置文件（`dweb.config.ts`）来管理应用配置。框架会自动加载配置文件并启动服务器。

### 基本配置

```typescript
// dweb.config.ts
import { defineConfig, tailwind, cors, seo } from "@dreamer/dweb";

export default defineConfig({
  // ========== 基础配置 ==========
  
  // 应用名称（可选，多应用模式下用于区分应用）
  name: "my-app",
  
  // ========== 渲染配置 ==========
  render: {
    // 渲染引擎，可选值：'preact' | 'react' | 'vue3'
    // 默认为 'preact'
    engine: "preact",
    // 渲染模式，可选值：'ssr' | 'csr' | 'hybrid'
    // - ssr: 服务端渲染（默认）
    // - csr: 客户端渲染
    // - hybrid: 混合渲染（服务端渲染 + 客户端 hydration）
    mode: "hybrid",
  },
  
  // ========== 服务器配置 ==========
  server: {
    port: 3000,
    host: "localhost", // 或 "127.0.0.1" 或 "0.0.0.0"
  },
  
  // ========== 路由配置 ==========
  routes: {
    dir: "routes",
    ignore: ["**/*.test.ts", "**/*.test.tsx"],
  },
  
  // ========== 静态资源目录 ==========
  static: {
    dir: "assets",
    prefix: "/assets",
    maxAge: 86400, // 缓存 1 天
  },
  
  // ========== 开发配置 ==========
  dev: {
    hmrPort: 24678,
    reloadDelay: 300,
  },
  
  // ========== 构建配置 ==========
  build: {
    outDir: "dist",
  },
  
  // ========== Cookie 配置 ==========
  cookie: {
    secret: "your-secret-key-here",
  },
  
  // ========== Session 配置 ==========
  session: {
    secret: "your-session-secret-here",
    store: "memory",
    maxAge: 3600000, // 1小时
    secure: false,
    httpOnly: true,
  },
  
  // ========== 插件配置 ==========
  plugins: [
    tailwind({
      version: "v4",
      cssPath: "assets/style.css",
      optimize: true,
    }),
    seo({
      title: "我的应用",
      description: "应用描述",
      keywords: "关键词1, 关键词2",
    }),
  ],
  
  // ========== 中间件配置 ==========
  middleware: [
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  ],
});
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

### 多应用模式

```typescript
// dweb.config.ts
import { defineConfig, tailwind, cors } from "@dreamer/dweb";

export default defineConfig({
  cookie: {
    secret: "your-secret-key-here",
  },
  session: {
    secret: "your-session-secret-here",
    store: "memory",
  },
  apps: [
    {
      name: "frontend",
      server: { port: 3000, host: "localhost" },
      routes: { dir: "frontend/routes" },
      static: { dir: "frontend/assets" },
      plugins: [tailwind({ cssPath: "frontend/assets/style.css" })],
    },
    {
      name: "backend",
      server: { port: 3001, host: "localhost" },
      routes: { dir: "backend/routes" },
      plugins: [cors()],
    },
  ],
});
```

启动指定应用：

```bash
# 启动前端应用
deno run -A jsr:@dreamer/dweb/cli dev:frontend

# 启动后端应用
deno run -A jsr:@dreamer/dweb/cli dev:backend
```

## 🐳 Docker 部署

### 使用 Docker Compose（推荐）

```bash
# 在项目根目录执行
# 构建并启动容器（后台运行）
docker compose up -d

# 查看日志
docker compose logs -f

# 停止容器
docker compose down
```

### 使用 Docker 命令

```bash
# 构建镜像
docker build -t dweb-app:latest .

# 运行容器
docker run -d \
  --name dweb-app \
  -p 3000:3000 \
  --restart unless-stopped \
  dweb-app:latest

# 查看日志
docker logs -f dweb-app
```

### 访问应用

容器启动后，访问：http://localhost:3000

> 更多 Docker 部署详情，请查看 [Docker 部署指南](./docs/docker.md)

## 📖 文档

### 核心文档

- **[文档总览](./docs/README.md)** - 文档导航和快速开始
- **[核心模块](./docs/core/README.md)** - 服务器、路由、配置等核心功能
  - [服务器 (Server)](./docs/core/server.md) - HTTP 服务器实现
  - [路由系统 (Router)](./docs/core/router.md) - 文件系统路由
  - [配置管理 (Config)](./docs/core/config.md) - 配置加载和管理
  - [中间件系统](./docs/core/middleware.md) - 中间件管理
  - [插件系统](./docs/core/plugin.md) - 插件管理
  - [路由处理器 (RouteHandler)](./docs/core/route-handler.md) - 路由处理逻辑
  - [API 路由](./docs/core/api-route.md) - API 路由处理
- **[配置文档](./docs/configuration.md)** - dweb.config.ts 详细配置说明
- **[开发指南](./docs/development.md)** - 开发流程、构建、部署
- **[布局系统](./docs/layout.md)** - 布局继承和布局组件
- **[路由约定文件](./docs/routing-conventions.md)** - _app、_layout、_middleware 等约定文件说明

### 功能模块

- **[功能模块](./docs/features/README.md)** - 所有功能模块的完整文档
  - [数据库 (database)](./docs/features/database/README.md) - 数据库支持、ORM/ODM、查询构建器
  - [GraphQL](./docs/features/graphql/README.md) - GraphQL 服务器和查询处理
  - [WebSocket](./docs/features/websocket/README.md) - WebSocket 服务器和客户端
  - [Session](./docs/features/session.md) - Session 管理和多种存储方式
  - [Cookie](./docs/features/cookie.md) - Cookie 管理和签名
  - [Logger](./docs/features/logger.md) - 日志系统和日志轮转
  - [项目创建](./docs/features/create.md) - 使用 CLI 创建项目
  - [开发服务器](./docs/features/dev.md) - 开发模式服务器
  - [热模块替换 (HMR)](./docs/features/hmr.md) - 开发时的热更新
  - [环境变量](./docs/features/env.md) - 环境变量管理
  - [构建](./docs/features/build.md) - 生产构建
  - [生产服务器](./docs/features/prod.md) - 生产模式服务器
  - [性能监控](./docs/features/monitoring.md) - 性能监控功能
  - [优雅关闭](./docs/features/shutdown.md) - 服务器优雅关闭
- **[国际化 (i18n)](./docs/plugins/i18n-usage.md)** - 多语言支持和翻译管理

### 扩展模块

- **[扩展系统](./docs/extensions/README.md)** - 扩展方法、辅助函数和自定义扩展
- **[中间件](./docs/middleware/README.md)** - 内置中间件和使用指南
- **[插件](./docs/plugins/README.md)** - 插件系统和使用指南
- **[控制台工具](./docs/console/README.md)** - 命令行工具、输入输出、命令封装

### 部署与运维

- **[Docker 部署](./docs/docker.md)** - Docker 部署指南

### 示例项目

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
- **版本**: [![JSR](https://jsr.io/badges/@dreamer/dweb)](https://jsr.io/@dreamer/dweb)
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
