# 服务器 (Server)

DWeb 框架的 HTTP 服务器实现，提供请求处理、中间件支持等功能。

## 基本使用

```typescript
import { Server } from "@dreamer/dweb/core/server";

const server = new Server();

// 设置请求处理器
server.setHandler(async (req, res) => {
  res.text("Hello World");
});

// 启动服务器
await server.start(3000, "localhost");
```

## 添加中间件

```typescript
import { Server } from "@dreamer/dweb/core/server";
import { logger } from "@dreamer/dweb/middleware";

const server = new Server();

// 添加中间件
server.use(logger());
server.use(cors());

server.setHandler(async (req, res) => {
  res.json({ message: "Hello" });
});

await server.start(3000);
```

## 响应方法

```typescript
server.setHandler(async (req, res) => {
  // 文本响应
  res.text("Hello");

  // JSON 响应
  res.json({ message: "Hello" });

  // HTML 响应
  res.html("<h1>Hello</h1>");

  // 设置状态码
  res.status(404);

  // 设置响应头
  res.setHeader("Content-Type", "application/json");

  // 重定向
  res.redirect("/new-path");

  // 发送文件
  res.sendFile("./public/index.html");
});
```

## API 参考

### Server 类

#### 方法

- `use(middleware: Middleware | Middleware[]): void` - 添加中间件
- `setHandler(handler: (req, res) => void): void` - 设置请求处理器
- `start(port: number, hostname?: string): Promise<void>` - 启动服务器
- `stop(): Promise<void>` - 停止服务器

### Response 对象

#### 方法

- `text(content: string, type?: ContentType): void` - 发送文本
- `json(data: any): void` - 发送 JSON
- `html(content: string): void` - 发送 HTML
- `status(code: number): Response` - 设置状态码
- `setHeader(name: string, value: string): void` - 设置响应头
- `redirect(url: string, status?: number): void` - 重定向
- `sendFile(path: string): Promise<void>` - 发送文件

## 相关文档

- [路由系统](./router.md) - 文件系统路由
- [中间件系统](./middleware.md) - 中间件管理
- [路由处理器](./route-handler.md) - 路由处理逻辑

