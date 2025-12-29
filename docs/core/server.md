# 服务器 (Server)

DWeb 框架的 HTTP 服务器实现，提供请求处理、中间件支持等功能。

## 基本使用

```typescript
import { Server } from "@dreamer/dweb";

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
import { Server } from "@dreamer/dweb";
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

## 核心架构与设计

DWeb Server 不仅仅是一个简单的 HTTP 封装，它采用了多种高级设计模式来保证性能、扩展性和开发体验。

### 设计模式

*   **适配器与代理模式 (Adapter & Proxy Pattern)**：
    服务器不直接使用 Deno 原生的 `Request` 对象，而是通过 `Proxy` 创建了一个扩展的请求对象。这允许框架在不破坏原生 API 的前提下，无缝添加 `session`、`cookies`、`query` 等便捷属性。

*   **中间件链 (Middleware Chain)**：
    实现了经典的洋葱模型（责任链模式），支持 `next()` 控制流。允许中间件在请求处理前后执行逻辑（例如：请求前解析 Body，响应后记录日志），提供了极高的扩展性。

*   **统一错误处理 (Unified Error Handling)**：
    内置了 `ErrorHandler` 接口和降级处理机制。即使自定义错误处理器失败，服务器也能通过兜底逻辑优雅降级，防止整个进程崩溃。

### 关键优化

*   **惰性求值 (Lazy Evaluation)**：
    利用 `Proxy` 的 `get` 拦截器，只有在用户真正访问扩展属性（如 `req.cookies` 或 `req.session`）时才进行解析。这避免了对每个请求都进行昂贵的解析操作，显著提升了高并发场景下的吞吐量。

*   **零拷贝/高效内存处理**：
    在处理响应体时，框架明确检查 `Uint8Array` 并使用 `slice().buffer` 创建视图，避免了不必要的数据拷贝，大幅降低了内存抖动和 GC 压力。

### 新特性

*   **WebSocket 升级支持**：
    内置了 `setWebSocketUpgradeHandler`，允许在 HTTP 握手阶段平滑升级到 WebSocket 连接，支持实时应用开发。

*   **集群感知 (Cluster Awareness)**：
    通过读取 `PUP_CLUSTER_INSTANCE` 环境变量支持集群模式，自动调整监听端口，无需手动配置即可实现多实例负载均衡部署。

*   **开发体验增强**：
    内置了对自签名证书（开发环境）和自定义 TLS 证书（生产环境）的支持，简化了 HTTPS 和 HTTP/2 的配置流程。

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

