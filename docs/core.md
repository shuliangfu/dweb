# 核心模块

DWeb 框架的核心功能模块，包括服务器、路由、配置、中间件系统等。

## 目录结构

```
src/core/
├── server.ts         # HTTP 服务器
├── router.ts         # 文件系统路由
├── config.ts         # 配置管理
├── middleware.ts     # 中间件系统
├── plugin.ts         # 插件系统
├── route-handler.ts  # 路由处理器
└── api-route.ts      # API 路由处理
```

## 服务器 (Server)

### 基本使用

```typescript
import { Server } from '@dreamer/dweb/core/server';

const server = new Server();

// 设置请求处理器
server.setHandler(async (req, res) => {
  res.text('Hello World');
});

// 启动服务器
await server.start(3000, 'localhost');
```

### 添加中间件

```typescript
import { Server } from '@dreamer/dweb/core/server';
import { logger } from '@dreamer/dweb/middleware';

const server = new Server();

// 添加中间件
server.use(logger());
server.use(cors());

server.setHandler(async (req, res) => {
  res.json({ message: 'Hello' });
});

await server.start(3000);
```

### 响应方法

```typescript
server.setHandler(async (req, res) => {
  // 文本响应
  res.text('Hello');
  
  // JSON 响应
  res.json({ message: 'Hello' });
  
  // HTML 响应
  res.html('<h1>Hello</h1>');
  
  // 设置状态码
  res.status(404);
  
  // 设置响应头
  res.setHeader('Content-Type', 'application/json');
  
  // 重定向
  res.redirect('/new-path');
  
  // 发送文件
  res.sendFile('./public/index.html');
});
```

## 路由系统 (Router)

### 文件系统路由

DWeb 使用文件系统路由，路由文件位于 `routes` 目录。

```
routes/
├── index.tsx          # / (首页)
├── about.tsx          # /about
├── users/
│   ├── index.tsx      # /users
│   └── [id].tsx       # /users/:id
└── api/
    └── users.ts       # /api/users
```

### 使用路由

```typescript
import { Router } from '@dreamer/dweb/core/router';

const router = new Router('routes');

// 扫描路由
await router.scan();

// 匹配路由
const route = router.match('/users/123');
if (route) {
  console.log('路由路径:', route.path);
  console.log('文件路径:', route.filePath);
  console.log('参数:', route.params);
}
```

### 动态路由

```typescript
// routes/users/[id].tsx
export default function UserPage({ params }: { params: { id: string } }) {
  return <div>User ID: {params.id}</div>;
}
```

### 捕获所有路由

```typescript
// routes/docs/[...slug].tsx
export default function DocsPage({ params }: { params: { slug: string[] } }) {
  return <div>Docs: {params.slug.join('/')}</div>;
}
```

## 配置管理 (Config)

### 加载配置

```typescript
import { loadConfig } from '@dreamer/dweb/core/config';

// 加载默认配置
const { config, configDir } = await loadConfig();

// 加载指定配置文件
const { config } = await loadConfig('./dweb.config.ts');

// 多应用模式
const { config } = await loadConfig('./dweb.config.ts', 'backend');
```

### 配置文件示例

```typescript
// dweb.config.ts
import { defineConfig } from '@dreamer/dweb';

export default defineConfig({
  port: 3000,
  host: 'localhost',
  routes: {
    dir: 'routes',
    ignore: ['**/*.test.ts'],
  },
  build: {
    outDir: 'dist',
  },
});
```

## 中间件系统

### 创建中间件

```typescript
import type { Middleware } from '@dreamer/dweb/core/middleware';

const myMiddleware: Middleware = async (req, res, next) => {
  // 请求前处理
  console.log('Before:', req.path);
  
  // 调用下一个中间件
  await next();
  
  // 响应后处理
  console.log('After:', res.status);
};
```

### 使用中间件

```typescript
server.use(myMiddleware);
```

## 插件系统

### 创建插件

```typescript
import type { Plugin } from '@dreamer/dweb/core/plugin';

const myPlugin: Plugin = {
  name: 'my-plugin',
  setup(app) {
    // 插件初始化
    console.log('Plugin initialized');
  },
};
```

### 使用插件

```typescript
import { usePlugin } from '@dreamer/dweb/core/plugin';

usePlugin(myPlugin);
```

## API 路由

### 创建 API 路由

```typescript
// routes/api/users.ts
export async function GET(req: Request, res: Response) {
  const users = await getUsers();
  res.json(users);
}

export async function POST(req: Request, res: Response) {
  const data = await req.json();
  const user = await createUser(data);
  res.json(user);
}
```

### 访问 API

```bash
# GET 请求
curl http://localhost:3000/api/users

# POST 请求
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John"}'
```

## API 参考

### Server

- `use(middleware: Middleware | Middleware[]): void` - 添加中间件
- `setHandler(handler: (req, res) => void): void` - 设置请求处理器
- `start(port: number, hostname?: string): Promise<void>` - 启动服务器
- `stop(): Promise<void>` - 停止服务器

### Router

- `scan(): Promise<void>` - 扫描路由目录
- `match(path: string): RouteInfo | null` - 匹配路由
- `getRoutes(): RouteInfo[]` - 获取所有路由

### Response

- `text(content: string, type?: ContentType): void` - 发送文本
- `json(data: any): void` - 发送 JSON
- `html(content: string): void` - 发送 HTML
- `status(code: number): Response` - 设置状态码
- `setHeader(name: string, value: string): void` - 设置响应头
- `redirect(url: string, status?: number): void` - 重定向
- `sendFile(path: string): Promise<void>` - 发送文件

---

## 📚 相关文档

- [文档总览](./README.md)
- [配置文档](./configuration.md)
- [开发指南](./development.md)
- [数据库模块](./database.md)
- [中间件](./middleware.md)
- [插件](./plugins.md)

