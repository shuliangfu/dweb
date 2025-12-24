# 中间件系统

DWeb 框架的中间件管理系统，支持请求和响应的中间件处理。

## 创建中间件

```typescript
import type { Middleware } from "@dreamer/dweb/core/middleware";

const myMiddleware: Middleware = async (req, res, next) => {
  // 请求前处理
  console.log("Before:", req.path);

  // 调用下一个中间件
  await next();

  // 响应后处理
  console.log("After:", res.status);
};
```

## 使用中间件

```typescript
import { Server } from "@dreamer/dweb/core/server";
import { MiddlewareManager } from "@dreamer/dweb/core/middleware";

const server = new Server();
const middlewareManager = new MiddlewareManager();

// 添加中间件
middlewareManager.use(myMiddleware);

// 在服务器中使用
server.use(myMiddleware);
```

## 中间件类型

```typescript
type Middleware = (
  req: Request,
  res: Response,
  next: () => Promise<void>
) => Promise<void> | void;
```

## API 参考

### MiddlewareManager 类

#### 方法

- `use(middleware: Middleware | Middleware[]): void` - 添加中间件
- `execute(req: Request, res: Response, handler: (req, res) => Promise<void>): Promise<void>` - 执行中间件链

## 相关文档

- [服务器](./server.md) - HTTP 服务器
- [中间件系统](../middleware/README.md) - 内置中间件和使用指南

