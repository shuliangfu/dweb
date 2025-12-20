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

