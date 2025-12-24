# 创建自定义中间件

你可以创建自己的中间件来处理特定的业务逻辑。

## 基本结构

中间件是一个异步函数，接收 `req`、`res` 和 `next` 三个参数：

```typescript
import type { Middleware } from "@dreamer/dweb/core/middleware";

const myMiddleware: Middleware = async (req, res, next) => {
  // 请求前处理
  const start = Date.now();

  // 调用下一个中间件
  await next();

  // 响应后处理
  const duration = Date.now() - start;
  res.setHeader("X-Response-Time", `${duration}ms`);
};

server.use(myMiddleware);
```

## 中间件示例

### 响应时间中间件

```typescript
import type { Middleware } from "@dreamer/dweb/core/middleware";

const responseTime: Middleware = async (req, res, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  res.setHeader("X-Response-Time", `${duration}ms`);
};

server.use(responseTime);
```

### 请求 ID 中间件

```typescript
import type { Middleware } from "@dreamer/dweb/core/middleware";
import { randomUUID } from "@std/uuid";

const requestId: Middleware = async (req, res, next) => {
  const id = randomUUID();
  res.setHeader("X-Request-ID", id);
  // 将 ID 附加到请求对象（如果需要）
  (req as any).id = id;
  await next();
};

server.use(requestId);
```

### 条件中间件

```typescript
import type { Middleware } from "@dreamer/dweb/core/middleware";

const conditionalMiddleware = (condition: (req: Request) => boolean) => {
  const middleware: Middleware = async (req, res, next) => {
    if (condition(req)) {
      // 执行特定逻辑
      res.setHeader("X-Conditional", "matched");
    }
    await next();
  };
  return middleware;
};

// 只在特定路径应用
server.use(conditionalMiddleware((req) => {
  return new URL(req.url).pathname.startsWith("/api");
}));
```

## 错误处理

中间件可以捕获和处理错误：

```typescript
import type { Middleware } from "@dreamer/dweb/core/middleware";

const errorHandling: Middleware = async (req, res, next) => {
  try {
    await next();
  } catch (error) {
    console.error("中间件错误:", error);
    res.status = 500;
    res.json({ error: "Internal Server Error" });
  }
};

server.use(errorHandling);
```

## 提前返回

中间件可以在不调用 `next()` 的情况下提前返回响应：

```typescript
import type { Middleware } from "@dreamer/dweb/core/middleware";

const authCheck: Middleware = async (req, res, next) => {
  const token = req.headers.get("Authorization");
  if (!token) {
    res.status = 401;
    res.json({ error: "Unauthorized" });
    return; // 不调用 next()，提前返回
  }
  await next();
};

server.use(authCheck);
```

## API 参考

### Middleware 类型

```typescript
type Middleware = (
  req: Request,
  res: Response,
  next: () => Promise<void>
) => Promise<void>;
```

### 使用中间件

```typescript
server.use(middleware);
```

## 相关文档

- [中间件概览](./README.md)
- [路由级中间件](./route-middleware.md)

