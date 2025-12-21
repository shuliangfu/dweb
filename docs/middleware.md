# 中间件

DWeb 框架提供了丰富的内置中间件，用于处理常见的 HTTP 请求和响应任务。

## 目录结构

```
src/middleware/
├── auth.ts              # JWT 认证
├── body-parser.ts       # 请求体解析
├── compression.ts       # 响应压缩
├── cors.ts              # CORS 支持
├── error-handler.ts     # 错误处理
├── health.ts            # 健康检查
├── ip-filter.ts         # IP 过滤
├── logger.ts            # 请求日志
├── rate-limit.ts        # 速率限制
├── request-id.ts        # 请求 ID
├── request-validator.ts # 请求验证
├── security.ts          # 安全头
├── static.ts            # 静态文件
└── mod.ts               # 模块导出
```

## 使用中间件

### 基本用法

```typescript
import { Server } from '@dreamer/dweb/core/server';
import { logger, cors, bodyParser } from '@dreamer/dweb/middleware';

const server = new Server();

// 添加中间件
server.use(logger());
server.use(cors());
server.use(bodyParser());

server.setHandler(async (req, res) => {
  res.json({ message: 'Hello' });
});

await server.start(3000);
```

## 内置中间件

### logger - 请求日志

```typescript
import { logger } from '@dreamer/dweb/middleware';

server.use(logger({
  format: 'combined', // 'combined' | 'common' | 'dev' | 'short' | 'tiny'
  stream: process.stdout, // 输出流
}));
```

### cors - 跨域支持

```typescript
import { cors } from '@dreamer/dweb/middleware';

server.use(cors({
  origin: '*', // 或指定域名 ['https://example.com']
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
```

### bodyParser - 请求体解析

```typescript
import { bodyParser } from '@dreamer/dweb/middleware';

server.use(bodyParser({
  json: { limit: '1mb' },
  urlencoded: { limit: '1mb', extended: true },
  text: { limit: '1mb' },
  raw: { limit: '1mb' },
}));

// 使用
server.setHandler(async (req, res) => {
  const json = await req.json(); // 自动解析 JSON
  const form = await req.formData(); // 自动解析表单
});
```

### compression - 响应压缩

```typescript
import { compression } from '@dreamer/dweb/middleware';

server.use(compression({
  level: 6, // 压缩级别 0-9
  threshold: 1024, // 最小压缩大小（字节）
}));
```

### security - 安全头

```typescript
import { security } from '@dreamer/dweb/middleware';

server.use(security({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

### rateLimit - 速率限制

```typescript
import { rateLimit } from '@dreamer/dweb/middleware';

server.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 最多 100 次请求
  message: 'Too many requests',
  store: 'memory', // 'memory' | 'redis'
}));
```

### auth - JWT 认证

```typescript
import { auth, signJWT, verifyJWT } from '@dreamer/dweb/middleware';

// 签名 JWT
const token = await signJWT({ userId: 123 }, 'secret', { expiresIn: '1h' });

// 验证 JWT
const payload = await verifyJWT(token, 'secret');

// 认证中间件
server.use(auth({
  secret: 'your-secret-key',
  unless: ['/login', '/register'], // 排除路径
}));

// 在处理器中访问用户信息
server.setHandler(async (req, res) => {
  const user = req.user; // JWT 载荷
  res.json({ user });
});
```

### static - 静态文件

```typescript
import { staticFiles } from '@dreamer/dweb/middleware';

server.use(staticFiles({
  root: './public',
  prefix: '/static',
  index: 'index.html',
}));
```

### errorHandler - 错误处理

```typescript
import { errorHandler } from '@dreamer/dweb/middleware';

server.use(errorHandler({
  debug: true, // 开发模式显示详细错误
  log: true, // 记录错误日志
}));
```

### health - 健康检查

```typescript
import { health } from '@dreamer/dweb/middleware';

server.use(health({
  path: '/health',
  checks: {
    database: async () => {
      // 检查数据库连接
      return { status: 'ok' };
    },
  },
}));
```

### requestId - 请求 ID

```typescript
import { requestId } from '@dreamer/dweb/middleware';

server.use(requestId({
  header: 'X-Request-ID',
  generator: () => crypto.randomUUID(),
}));

// 在处理器中访问请求 ID
server.setHandler(async (req, res) => {
  const id = req.id; // 请求 ID
  res.json({ requestId: id });
});
```

### requestValidator - 请求验证

```typescript
import { requestValidator } from '@dreamer/dweb/middleware';

server.use(requestValidator({
  body: {
    name: { type: 'string', required: true, min: 2, max: 50 },
    email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    age: { type: 'number', min: 0, max: 150 },
  },
}));
```

### ipFilter - IP 过滤

```typescript
import { ipFilter } from '@dreamer/dweb/middleware';

// 白名单
server.use(ipFilter({
  whitelist: ['192.168.1.0/24', '10.0.0.0/8'],
}));

// 黑名单
server.use(ipFilter({
  blacklist: ['192.168.1.100'],
}));
```

## 路由级中间件 (_middleware.ts)

DWeb 框架支持路由级中间件，通过创建 `_middleware.ts` 文件，可以为特定路径及其子路径应用中间件。

### 基本概念

路由中间件文件使用 `_middleware.ts` 命名约定，放置在路由目录中。中间件会自动应用到该目录及其所有子目录的请求。

### 中间件文件结构

```
routes/
├── _middleware.ts        # 根中间件（应用到所有路由）
├── index.tsx
├── users/
│   ├── _middleware.ts    # 用户路由中间件（应用到 /users 下的所有路由）
│   ├── index.tsx         # /users
│   └── [id].tsx          # /users/:id
└── api/                  # API 路由目录（默认在 routes/api，可通过 apiDir 配置）
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
import type { Middleware } from '@dreamer/dweb';

const routeMiddleware: Middleware = async (req, res, next) => {
  // 请求处理前的逻辑
  const startTime = Date.now();
  const url = new URL(req.url);
  
  console.log(`[路由中间件] ${req.method} ${url.pathname} - 开始处理`);
  
  // 添加自定义响应头
  res.setHeader('X-Route-Middleware', 'processed');
  res.setHeader('X-Request-Time', new Date().toISOString());
  
  // 调用下一个中间件或路由处理器
  await next();
  
  // 请求处理后的逻辑
  const duration = Date.now() - startTime;
  console.log(`[路由中间件] ${req.method} ${url.pathname} - 处理完成 (${duration}ms)`);
  
  // 添加处理时间到响应头
  res.setHeader('X-Processing-Time', `${duration}ms`);
};

export default routeMiddleware;
```

#### 多个中间件（数组）

```typescript
// routes/users/_middleware.ts
import type { Middleware } from '@dreamer/dweb';
import { auth } from '@dreamer/dweb/middleware';

// 认证中间件（只应用到 /users 路径）
const userAuthMiddleware: Middleware = async (req, res, next) => {
  const token = req.headers.get('Authorization');
  if (!token) {
    res.status = 401;
    res.json({ error: 'Authentication required' });
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
import type { Middleware } from '@dreamer/dweb';

const adminAuthMiddleware: Middleware = async (req, res, next) => {
  // 检查用户是否已登录
  const session = await req.getSession?.();
  if (!session || !session.user) {
    res.status = 401;
    res.redirect('/login');
    return;
  }
  
  // 检查用户权限
  if (session.user.role !== 'admin') {
    res.status = 403;
    res.json({ error: 'Forbidden: Admin access required' });
    return;
  }
  
  await next();
};

export default adminAuthMiddleware;
```

#### 请求日志中间件

```typescript
// routes/api/_middleware.ts
import type { Middleware } from '@dreamer/dweb';

const apiLoggerMiddleware: Middleware = async (req, res, next) => {
  const startTime = Date.now();
  const url = new URL(req.url);
  
  // 记录请求信息
  console.log(`[API] ${req.method} ${url.pathname}`, {
    query: url.search,
    ip: req.headers.get('x-forwarded-for') || 'unknown',
  });
  
  await next();
  
  // 记录响应信息
  const duration = Date.now() - startTime;
  console.log(`[API] ${req.method} ${url.pathname} - ${res.status} (${duration}ms)`);
};

export default apiLoggerMiddleware;
```

#### 速率限制中间件

```typescript
// routes/api/_middleware.ts
import type { Middleware } from '@dreamer/dweb';

// 简单的内存速率限制
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const apiRateLimitMiddleware: Middleware = async (req, res, next) => {
  const clientId = req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 分钟
  const maxRequests = 100; // 最多 100 次请求
  
  const record = rateLimitMap.get(clientId);
  
  if (record && record.resetTime > now) {
    if (record.count >= maxRequests) {
      res.status = 429;
      res.json({ error: 'Too many requests' });
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

| 特性 | 路由中间件 (_middleware.ts) | 全局中间件 (server.use()) |
|------|---------------------------|-------------------------|
| 作用范围 | 特定路径及其子路径 | 所有请求 |
| 配置位置 | 路由目录中 | main.ts 或配置文件中 |
| 路径匹配 | 自动匹配路径层级 | 需要手动配置路径匹配 |
| 适用场景 | 路径特定的逻辑（如认证、日志） | 全局功能（如 CORS、压缩） |

### 最佳实践

1. **使用路由中间件处理路径特定的逻辑**
   - 认证和授权
   - 路径特定的日志记录
   - 路径特定的速率限制

2. **使用全局中间件处理通用功能**
   - CORS 配置
   - 响应压缩
   - 全局错误处理

3. **合理组织中间件**
   - 将认证中间件放在需要保护的路径
   - 将日志中间件放在需要记录的路径
   - 避免在根路径放置过多中间件

## 创建自定义中间件

```typescript
import type { Middleware } from '@dreamer/dweb/core/middleware';

const myMiddleware: Middleware = async (req, res, next) => {
  // 请求前处理
  const start = Date.now();
  
  // 调用下一个中间件
  await next();
  
  // 响应后处理
  const duration = Date.now() - start;
  res.setHeader('X-Response-Time', `${duration}ms`);
};

server.use(myMiddleware);
```

## API 参考

所有中间件都返回一个 `Middleware` 函数，可以直接传递给 `server.use()`。

### 中间件选项

每个中间件都有对应的选项类型，可以在导入时查看：

```typescript
import type {
  CorsOptions,
  BodyParserOptions,
  CompressionOptions,
  SecurityOptions,
  RateLimitOptions,
  AuthOptions,
  // ... 其他选项类型
} from '@dreamer/dweb/middleware';
```

---

## 📚 相关文档

### 核心文档
- [文档总览](./README.md)
- [核心模块](./core.md)
- [配置文档](./configuration.md)
- [开发指南](./development.md)

### 功能模块
- [数据库](./database.md)
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

