### ipFilter - IP 过滤

IP 过滤中间件提供了强大的访问控制能力，支持黑白名单、CIDR 子网匹配和智能 IP 检测。

#### 高级特性

*   **CIDR 支持**：
    不仅支持单 IP，还支持 CIDR 子网掩码匹配 (如 `192.168.1.0/24`)，内部实现了高效的 IP 转数字位运算逻辑，能够快速判断 IP 是否在指定网段内。

*   **智能 IP 获取**：
    自动按优先级探测 `X-Forwarded-For` (代理)、`X-Real-IP`、`CF-Connecting-IP` (Cloudflare) 等头信息，确保在反向代理后也能正确获取客户端真实 IP。

#### 基本配置
import { ipFilter } from "@dreamer/dweb/middleware";

// 白名单
server.use(ipFilter({
  whitelist: ["192.168.1.0/24", "10.0.0.0/8"], // IP 白名单数组（允许的 IP 列表），支持单个 IP 或 CIDR 格式
  whitelistMode: true, // 是否启用白名单模式（默认 false）。true: 只允许白名单中的 IP；false: 允许所有 IP，除非在黑名单中
}));

// 黑名单
server.use(ipFilter({
  blacklist: ["192.168.1.100"], // IP 黑名单数组（禁止的 IP 列表），支持单个 IP 或 CIDR 格式
  skip: ["/health"], // 跳过过滤的路径数组（支持 glob 模式）
  message: "Access denied", // 自定义错误消息
  statusCode: 403, // 自定义错误状态码（默认 403）
  getClientIP: (req) => { // 获取客户端 IP 的函数（默认使用标准方法，会尝试从 X-Forwarded-For、X-Real-IP、CF-Connecting-IP 等请求头获取）
    return req.headers.get("x-forwarded-for") || "unknown";
  },
}));
```

#### 配置选项

**可选参数：**

- `whitelist` - IP 白名单数组（允许的 IP 列表），支持单个 IP 或 CIDR 格式（如 '192.168.1.0/24'）
- `blacklist` - IP 黑名单数组（禁止的 IP 列表），支持单个 IP 或 CIDR 格式
- `whitelistMode` - 是否启用白名单模式（默认 false）。true: 只允许白名单中的 IP；false: 允许所有 IP，除非在黑名单中
- `skip` - 跳过过滤的路径数组（支持 glob 模式）
- `message` - 自定义错误消息
- `statusCode` - 自定义错误状态码（默认 403）
- `getClientIP` - 获取客户端 IP 的函数（默认使用标准方法，会尝试从 X-Forwarded-For、X-Real-IP、CF-Connecting-IP 等请求头获取）

## 路由级中间件 (_middleware.ts)

DWeb 框架支持路由级中间件，通过创建 `_middleware.ts`
文件，可以为特定路径及其子路径应用中间件。

### 基本概念

路由中间件文件使用 `_middleware.ts`
命名约定，放置在路由目录中。中间件会自动应用到该目录及其所有子目录的请求。

### 中间件文件结构

```
routes/
├── _middleware.ts        # 根中间件（应用到所有路由）
├── index.tsx
├── users/
│   ├── _middleware.ts    # 用户路由中间件（应用到 /users 下的所有路由）
│   ├── index.tsx         # /users
│   └── [id].tsx          # /users/:id
└── api/
    └── _middleware.ts    # API 路由中间件（应用到 /api 下的所有路由）
```

### 中间件继承顺序

当访问 `/users/123` 时，中间件的执行顺序为：

1. `routes/_middleware.ts`（根中间件）
2. `routes/users/_middleware.ts`（用户路由中间件）

中间件会按照从根到具体路径的顺序执行。

### 创建路由中间件

#### 单个中间件

```typescript
// routes/_middleware.ts
import type { Middleware } from "@dreamer/dweb";

const routeMiddleware: Middleware = async (req, res, next) => {
  // 请求处理前的逻辑
  const startTime = Date.now();
  const url = new URL(req.url);

  console.log(`[路由中间件] ${req.method} ${url.pathname} - 开始处理`);

  // 添加自定义响应头
  res.setHeader("X-Route-Middleware", "processed");
  res.setHeader("X-Request-Time", new Date().toISOString());

  // 调用下一个中间件或路由处理器
  await next();

  // 请求处理后的逻辑
  const duration = Date.now() - startTime;
  console.log(
    `[路由中间件] ${req.method} ${url.pathname} - 处理完成 (${duration}ms)`,
  );

  // 添加处理时间到响应头
  res.setHeader("X-Processing-Time", `${duration}ms`);
};

export default routeMiddleware;
```

#### 多个中间件（数组）

```typescript
// routes/users/_middleware.ts
import type { Middleware } from "@dreamer/dweb";
import { auth } from "@dreamer/dweb/middleware";

// 认证中间件（只应用到 /users 路径）
const userAuthMiddleware: Middleware = async (req, res, next) => {
  const token = req.headers.get("Authorization");
  if (!token) {
    res.status = 401;
    res.json({ error: "Authentication required" });
    return;
  }
  // 验证 token...
  await next();
};

// 日志中间件
const userLoggerMiddleware: Middleware = async (req, res, next) => {
  console.log(`[用户路由] ${req.method} ${req.url}`);
  await next();
};

// 导出中间件数组，按顺序执行
export default [userAuthMiddleware, userLoggerMiddleware];
```

### 路由中间件示例

#### 认证中间件

```typescript
// routes/admin/_middleware.ts
import type { Middleware } from "@dreamer/dweb";

const adminAuthMiddleware: Middleware = async (req, res, next) => {
  // 检查用户是否已登录
  const session = await req.getSession?.();
  if (!session || !session.user) {
    res.status = 401;
    res.redirect("/login");
    return;
  }

  // 检查用户权限
  if (session.user.role !== "admin") {
    res.status = 403;
    res.json({ error: "Forbidden: Admin access required" });
    return;
  }

  await next();
};

export default adminAuthMiddleware;
```

#### 请求日志中间件

```typescript
// routes/api/_middleware.ts（默认配置）
// 如果配置了 apiDir: 'api'，则路径为 api/_middleware.ts
import type { Middleware } from "@dreamer/dweb";

const apiLoggerMiddleware: Middleware = async (req, res, next) => {
  const startTime = Date.now();
  const url = new URL(req.url);

  // 记录请求信息
  console.log(`[API] ${req.method} ${url.pathname}`, {
    query: url.search,
    ip: req.headers.get("x-forwarded-for") || "unknown",
  });

  await next();

  // 记录响应信息
  const duration = Date.now() - startTime;
  console.log(
    `[API] ${req.method} ${url.pathname} - ${res.status} (${duration}ms)`,
  );
};

export default apiLoggerMiddleware;
```

#### 速率限制中间件

```typescript
// routes/api/_middleware.ts（默认配置）
// 如果配置了 apiDir: 'api'，则路径为 api/_middleware.ts
import type { Middleware } from "@dreamer/dweb";

// 简单的内存速率限制
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const apiRateLimitMiddleware: Middleware = async (req, res, next) => {
  const clientId = req.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 分钟
  const maxRequests = 100; // 最多 100 次请求

  const record = rateLimitMap.get(clientId);

  if (record && record.resetTime > now) {
    if (record.count >= maxRequests) {
      res.status = 429;
      res.json({ error: "Too many requests" });
      return;
    }
    record.count++;
  } else {
    rateLimitMap.set(clientId, {
      count: 1,
      resetTime: now + windowMs,
    });
  }

  await next();
};

export default apiRateLimitMiddleware;
```

### 中间件执行顺序

路由中间件会在以下时机执行：

1. **全局中间件**（通过 `server.use()` 添加）
2. **路由中间件**（从根到具体路径，按路径层级顺序）
3. **路由处理器**（页面组件或 API 处理器）

### 路由中间件 vs 全局中间件

| 特性     | 路由中间件 (_middleware.ts)    | 全局中间件 (server.use()) |
| -------- | ------------------------------ | ------------------------- |
| 作用范围 | 特定路径及其子路径             | 所有请求                  |
| 配置位置 | 路由目录中                     | main.ts 或配置文件中      |
| 路径匹配 | 自动匹配路径层级               | 需要手动配置路径匹配      |
| 适用场景 | 路径特定的逻辑（如认证、日志） | 全局功能（如 CORS、压缩） |

### 最佳实践

1. **使用路由中间件处理路径特定的逻辑**
   - 认证和授权
   - 路径特定的日志记录
   - 路径特定的速率限制

2. **使用全局中间件处理通用功能**
   - CORS 配置
   - 全局错误处理
   - 注意：响应压缩由 Deno.serve 自动处理，无需配置

3. **合理组织中间件**
   - 将认证中间件放在需要保护的路径
   - 将日志中间件放在需要记录的路径
   - 避免在根路径放置过多中间件

## 创建自定义中间件

```typescript
import type { Middleware } from "@dreamer/dweb";

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

## API 参考

所有中间件都返回一个 `Middleware` 函数，可以直接传递给 `server.use()`。

### 中间件选项

每个中间件都有对应的选项类型，可以在导入时查看：

```typescript
import type {
  AuthOptions,
  BodyParserOptions,
  CorsOptions,
  RateLimitOptions,
  SecurityOptions,
  // ... 其他选项类型
} from "@dreamer/dweb/middleware";
```

---

## 📚 相关文档

### 核心文档

- [文档总览](./README.md)
- [核心模块](./core.md)
- [配置文档](./configuration.md)
- [开发指南](./development.md)

### 功能模块

- [数据库](../features/database.md)
- [GraphQL](./graphql.md)
- [WebSocket](./websocket.md)
- [Session](./session.md)
- [Cookie](./cookie.md)
- [Logger](./logger.md)

### 扩展模块

- [中间件](./middleware.md)
- [插件](./plugins.md)

### 部署与运维

- [Docker 部署](./docker.md)
