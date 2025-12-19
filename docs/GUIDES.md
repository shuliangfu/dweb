# DWeb 框架使用指南

本文档提供 DWeb 框架的详细使用指南，包括快速开始、最佳实践和常见问题。

## 📚 目录

- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [配置指南](#配置指南)
- [路由系统](#路由系统)
- [渲染模式](#渲染模式)
- [中间件使用](#中间件使用)
- [插件系统](#插件系统)
- [最佳实践](#最佳实践)
- [常见问题（FAQ）](#常见问题faq)

---

## 🚀 快速开始

### 创建新项目

```bash
# 使用 CLI 创建新项目
deno run -A jsr:@dreamer/dweb/cli create

# 按照提示输入项目信息
# - 项目名称
# - 应用模式（单应用/多应用）
# - Tailwind CSS 版本（V3/V4）
# - 渲染模式（SSR/CSR/Hybrid）
```

### 启动开发服务器

```bash
cd my-app
deno task dev
```

访问 http://localhost:3000 查看应用。

### 构建生产版本

```bash
# 构建项目
deno task build

# 启动生产服务器
deno task start
```

---

## 🎯 核心概念

### 文件系统路由

DWeb 使用文件系统路由，类似于 Next.js。在 `routes/` 目录下创建文件即可自动生成路由：

```
routes/
├── index.tsx          → /
├── about.tsx          → /about
├── users/
│   ├── index.tsx      → /users
│   └── [id].tsx       → /users/:id
└── api/
    └── users.ts       → /api/users/*
```

### 渲染模式

DWeb 支持三种渲染模式：

- **SSR（服务端渲染）**：在服务端渲染 HTML，适合 SEO 和首屏加载
- **CSR（客户端渲染）**：在客户端渲染，适合交互性强的应用
- **Hybrid（混合渲染）**：SSR + 客户端 hydration，兼顾 SEO 和交互

### 数据获取

使用 `load` 函数在服务端获取数据：

```typescript
export const load = async ({ params, query, cookies, session }) => {
  // 从数据库、API 等获取数据
  const user = await getUser(params.id);
  return { user };
};

export default function UserPage({ data }) {
  // data.user 就是 load 函数返回的数据
  return <div>{data.user.name}</div>;
}
```

---

## ⚙️ 配置指南

### 基本配置

创建 `dweb.config.ts` 文件：

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
    tailwind({ version: "v4" }),
  ],
  middleware: [
    cors({ origin: "*" }),
  ],
};

export default config;
```

### 多应用模式

```typescript
import type { DWebConfig } from "@dreamer/dweb";

const config: DWebConfig = {
  apps: [
    {
      name: "app1",
      server: { port: 3000 },
      routes: { dir: "app1/routes" },
    },
    {
      name: "app2",
      server: { port: 3001 },
      routes: { dir: "app2/routes" },
    },
  ],
};

export default config;
```

---

## 🛣️ 路由系统

### 静态路由

创建文件即可：

```typescript
// routes/about.tsx
export default function About() {
  return <h1>关于我们</h1>;
}
```

### 动态路由

使用 `[param]` 或 `[...slug]`：

```typescript
// routes/users/[id].tsx
export default function UserPage({ params }) {
  return <div>用户 ID: {params.id}</div>;
}

// routes/posts/[...slug].tsx
export default function PostPage({ params }) {
  return <div>路径: {params.slug.join('/')}</div>;
}
```

### API 路由

在 `routes/api/` 目录下创建文件，导出函数：

```typescript
// routes/api/users.ts
import type { Request } from "@dreamer/dweb";

export function getUsers(req: Request) {
  return { users: [...] };
}

export function getUser(req: Request) {
  const id = req.query.id;
  return { user: {...} };
}
```

访问方式：
- `POST /api/users/getUsers` 或 `POST /api/users/get-users`
- `POST /api/users/getUser?id=123` 或 `POST /api/users/get-user?id=123`

---

## 🎨 渲染模式

### SSR（服务端渲染）

```typescript
// routes/page.tsx
export const renderMode = "ssr"; // 可选，默认 SSR

export default function Page() {
  return <div>服务端渲染</div>;
}
```

### CSR（客户端渲染）

```typescript
// routes/page.tsx
export const renderMode = "csr";

export default function Page() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### Hybrid（混合渲染）

```typescript
// routes/page.tsx
export const renderMode = "hybrid";
export const hydrate = true; // 启用 hydration

export default function Page() {
  return <div>混合渲染</div>;
}
```

---

## 🛠️ 中间件使用

### 内置中间件

```typescript
import { cors, compression, logger, security } from "@dreamer/dweb";

const config: AppConfig = {
  middleware: [
    logger(),                    // 日志
    cors({ origin: "*" }),      // CORS
    compression(),              // 压缩
    security(),                 // 安全头部
  ],
};
```

### 自定义中间件

```typescript
import type { Middleware } from "@dreamer/dweb";

const myMiddleware: Middleware = async (req, res, next) => {
  // 请求前处理
  console.log("请求:", req.url);
  
  await next(); // 继续执行下一个中间件
  
  // 响应后处理
  console.log("响应状态:", res.status);
};

const config: AppConfig = {
  middleware: [myMiddleware],
};
```

---

## 🔌 插件系统

### 使用插件

```typescript
import { tailwind } from "@dreamer/dweb";

const config: AppConfig = {
  plugins: [
    tailwind({
      version: "v4",
      cssPath: "assets/style.css",
    }),
  ],
};
```

### 插件配置

每个插件都有自己的配置选项，查看插件文档了解详情。

---

## 💡 最佳实践

### 1. 项目结构

```
my-app/
├── routes/           # 路由文件
│   ├── _app.tsx      # 根应用组件（必需）
│   ├── _layout.tsx   # 根布局组件
│   ├── index.tsx     # 首页
│   └── api/          # API 路由
├── components/       # 可复用组件
├── assets/           # 静态资源
├── dweb.config.ts    # 配置文件
└── deno.json         # Deno 配置
```

### 2. 数据获取

- 使用 `load` 函数在服务端获取数据
- 避免在组件中直接调用 API（SSR 模式）
- 使用 `useState` 和 `useEffect` 处理客户端数据（CSR 模式）

### 3. 性能优化

- 使用 SSR 模式提升 SEO 和首屏加载速度
- 使用 CSR 模式处理交互性强的页面
- 使用 Hybrid 模式兼顾两者

### 4. 错误处理

- 创建 `_404.tsx` 和 `_error.tsx` 错误页面
- 在 `load` 函数中处理错误
- 使用 try-catch 处理异步操作

---

## ❓ 常见问题（FAQ）

### Q: 如何选择渲染模式？

**A:** 
- **SSR**：适合内容型网站、需要 SEO 的页面
- **CSR**：适合交互性强的应用、管理后台
- **Hybrid**：适合需要 SEO 但又有交互的页面

### Q: 如何实现路由跳转？

**A:** 使用普通的 `<a>` 标签即可，框架会自动处理客户端路由：

```typescript
<a href="/about">关于我们</a>
```

### Q: 如何获取查询参数？

**A:** 在 `load` 函数或组件中通过 `query` 获取：

```typescript
export const load = async ({ query }) => {
  const id = query.id;
  return { id };
};

export default function Page({ query }) {
  return <div>ID: {query.id}</div>;
}
```

### Q: 如何使用 Cookie 和 Session？

**A:** 在 `load` 函数中访问：

```typescript
export const load = async ({ cookies, session, getCookie, getSession }) => {
  const token = getCookie("token") || cookies.token;
  const userSession = session || await getSession();
  return { token, user: userSession?.data };
};
```

### Q: 如何部署到生产环境？

**A:** 
1. 运行 `deno task build` 构建项目
2. 运行 `deno task start` 启动生产服务器
3. 或使用 Docker（参考 `docs/DOCKER.md`）

### Q: 如何自定义错误页面？

**A:** 创建 `_404.tsx` 和 `_error.tsx` 文件：

```typescript
// routes/_404.tsx
export default function NotFound() {
  return <h1>404 - 页面未找到</h1>;
}

// routes/_error.tsx
export default function ErrorPage({ error }) {
  return <h1>500 - 服务器错误: {error.message}</h1>;
}
```

### Q: 如何添加全局样式？

**A:** 在 `_app.tsx` 中引入：

```typescript
// routes/_app.tsx
export default function App({ children }) {
  return (
    <html>
      <head>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Q: 如何实现认证？

**A:** 使用认证中间件：

```typescript
import { auth } from "@dreamer/dweb";

const config: AppConfig = {
  middleware: [
    auth({
      secret: "your-jwt-secret",
      exclude: ["/login", "/register"],
    }),
  ],
};
```

### Q: 如何优化构建速度？

**A:** 
- 使用构建缓存（框架自动处理）
- 减少不必要的依赖
- 使用代码分割（未来版本支持）

---

## 📖 更多资源

- [API 文档](./API.md) - 完整的 API 参考
- [开发指南](./DEVELOPMENT.md) - 插件和中间件开发
- [部署指南](./DOCKER.md) - Docker 部署
- [示例项目](../example/) - 完整示例

---

**最后更新**: 2024-12-19

