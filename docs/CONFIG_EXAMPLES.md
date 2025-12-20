# DWeb 框架配置示例

本文档提供各种场景下的 DWeb 框架配置示例，帮助你快速上手。

## 📚 目录

- [基础配置](#基础配置)
- [单应用模式](#单应用模式)
- [多应用模式](#多应用模式)
- [开发环境配置](#开发环境配置)
- [生产环境配置](#生产环境配置)
- [完整配置示例](#完整配置示例)
- [高级配置](#高级配置)

---

## 基础配置

### 最简单的配置

```typescript
// dweb.config.ts
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  server: {
    port: 3000,
  },
  routes: {
    dir: "routes",
  },
};

export default config;
```

### 带 Tailwind CSS 的配置

```typescript
// dweb.config.ts
import { tailwind } from "@dreamer/dweb";
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
    tailwind({
      version: "v4",
      cssPath: "assets/style.css",
    }),
  ],
};

export default config;
```

---

## 单应用模式

### 基础单应用配置

```typescript
// dweb.config.ts
import { tailwind, cors, logger } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  name: "my-app",
  basePath: "/",
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  routes: {
    dir: "routes",
    ignore: ["**/*.test.ts", "**/*.test.tsx"],
    priority: "specific-first",
  },
  static: {
    dir: "public",
    prefix: "/static",
    index: ["index.html"],
    dotfiles: "deny",
    etag: true,
    lastModified: true,
    maxAge: 3600,
  },
  plugins: [
    tailwind({
      version: "v4",
      cssPath: "assets/style.css",
      optimize: true,
    }),
  ],
  middleware: [
    logger(),
    cors({
      origin: ["http://localhost:3000", "https://example.com"],
      credentials: true,
    }),
  ],
};

export default config;
```

### 带 Cookie 和 Session 的配置

```typescript
// dweb.config.ts
import { tailwind } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  server: {
    port: 3000,
  },
  routes: {
    dir: "routes",
  },
  cookie: {
    secret: Deno.env.get("COOKIE_SECRET") || "your-secret-key",
    secure: true,
    httpOnly: true,
    sameSite: "strict",
    maxAge: 86400, // 24 小时
  },
  session: {
    secret: Deno.env.get("SESSION_SECRET") || "your-session-secret",
    store: "memory", // 存储方式：memory | file | redis | kv | mongodb
    maxAge: 86400,
    secure: true,
    httpOnly: true,
    
    // 根据 store 选择对应的配置：
    
    // 1. memory 存储（默认，无需额外配置）
    // store: "memory",
    
    // 2. file 存储
    // store: "file",
    // file: {
    //   dir: ".sessions",  // 可选，默认为 ".sessions"
    // },
    
    // 3. redis 存储
    // store: "redis",
    // redis: {
    //   host: "localhost",
    //   port: 6379,
    //   password: "optional-password",  // 可选
    //   db: 0,                           // 可选，默认为 0
    // },
    
    // 4. kv 存储（Deno KV，无需额外配置）
    // store: "kv",
    // kv: {},  // 可选
    
    // 5. mongodb 存储（需要先配置 database.mongodb）
    // store: "mongodb",
    // mongodb: {
    //   collection: "sessions",  // 可选，默认为 "sessions"
    // },
  },
  plugins: [
    tailwind({ version: "v4" }),
  ],
};

export default config;
```

### 带认证和安全中间件的配置

```typescript
// dweb.config.ts
import { tailwind, cors, security, auth, rateLimit } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  server: {
    port: 3000,
  },
  routes: {
    dir: "routes",
  },
  middleware: [
    // 安全头部
    security({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
      xssProtection: true,
      noSniff: true,
      frameOptions: "DENY",
    }),
    // CORS
    cors({
      origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
      credentials: true,
    }),
    // 限流
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 分钟
      max: 100, // 最多 100 个请求
    }),
    // 认证（JWT）
    auth({
      secret: Deno.env.get("JWT_SECRET") || "your-jwt-secret",
      exclude: ["/login", "/register", "/api/public"],
    }),
  ],
  plugins: [
    tailwind({ version: "v4" }),
  ],
};

export default config;
```

---

## 多应用模式

### 基础多应用配置

```typescript
// dweb.config.ts
import { tailwind } from "@dreamer/dweb";
import type { DWebConfig } from "@dreamer/dweb";

const config: DWebConfig = {
  apps: [
    {
      name: "frontend",
      basePath: "/",
      server: {
        port: 3000,
      },
      routes: {
        dir: "apps/frontend/routes",
      },
      plugins: [
        tailwind({ version: "v4" }),
      ],
    },
    {
      name: "backend",
      basePath: "/api",
      server: {
        port: 3001,
      },
      routes: {
        dir: "apps/backend/routes",
      },
    },
  ],
};

export default config;
```

### 共享配置的多应用

```typescript
// dweb.config.ts
import { tailwind, cors, logger } from "@dreamer/dweb";
import type { DWebConfig } from "@dreamer/dweb";

const config: DWebConfig = {
  // 共享配置
  cookie: {
    secret: Deno.env.get("COOKIE_SECRET") || "shared-secret",
  },
  session: {
    secret: Deno.env.get("SESSION_SECRET") || "shared-session-secret",
    store: "memory",
  },
  middleware: [
    logger(),
    cors({ origin: "*" }),
  ],
  plugins: [
    tailwind({ version: "v4" }),
  ],
  apps: [
    {
      name: "web",
      server: { port: 3000 },
      routes: { dir: "apps/web/routes" },
      // 继承共享的 middleware 和 plugins
    },
    {
      name: "admin",
      server: { port: 3001 },
      routes: { dir: "apps/admin/routes" },
      // 可以覆盖共享配置
      middleware: [
        logger(),
        cors({ origin: "https://admin.example.com" }),
        // 添加额外的认证中间件
      ],
    },
  ],
};

export default config;
```

---

## 开发环境配置

### 开发服务器配置

```typescript
// dweb.config.ts
import { tailwind } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  server: {
    port: 3000,
    host: "localhost",
  },
  dev: {
    hmr: true, // 启用热更新
    open: true, // 自动打开浏览器
    hmrPort: 24678, // HMR WebSocket 端口
    reloadDelay: 100, // 文件变化后重载延迟（毫秒）
  },
  routes: {
    dir: "routes",
  },
  plugins: [
    tailwind({
      version: "v4",
      cssPath: "assets/style.css",
      // 开发环境不优化
      optimize: false,
    }),
  ],
};

export default config;
```

### 开发环境调试配置

```typescript
// dweb.config.ts
import { tailwind, logger } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  server: {
    port: 3000,
  },
  dev: {
    hmr: true,
    open: false, // 开发时不自动打开浏览器
  },
  routes: {
    dir: "routes",
  },
  middleware: [
    // 详细的日志记录
    logger({
      level: "debug",
      format: "detailed",
    }),
  ],
  plugins: [
    tailwind({ version: "v4" }),
  ],
};

export default config;
```

---

## 生产环境配置

### 生产服务器配置

```typescript
// dweb.config.ts
import { tailwind, cors, compression, security } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  server: {
    port: 3000,
    host: "0.0.0.0", // 监听所有网络接口
  },
  routes: {
    dir: "routes",
    cache: true, // 启用路由缓存
  },
  build: {
    outDir: "dist",
    cache: true, // 启用构建缓存
    split: true, // 启用代码分割
    chunkSize: 20000, // 20KB
    compress: true, // 启用资源压缩
    imageQuality: 80, // 图片压缩质量
    prefetch: true, // 启用资源预取
    prefetchRoutes: true, // 预取相关路由
  },
  static: {
    dir: "public",
    etag: true,
    lastModified: true,
    maxAge: 31536000, // 1 年
  },
  middleware: [
    compression(), // 启用压缩
    security({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    }),
    cors({
      origin: ["https://example.com"],
      credentials: true,
    }),
  ],
  plugins: [
    tailwind({
      version: "v4",
      optimize: true, // 生产环境优化
    }),
  ],
};

export default config;
```

### 生产环境优化配置

```typescript
// dweb.config.ts
import { tailwind, compression, security } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  routes: {
    dir: "routes",
    cache: true,
    priority: "specific-first",
  },
  build: {
    outDir: "dist",
    cache: true,
    split: true,
    chunkSize: 20000,
    compress: true,
    imageQuality: 85,
    prefetch: true,
    prefetchRoutes: true,
  },
  static: {
    dir: "public",
    prefix: "/assets",
    etag: true,
    lastModified: true,
    maxAge: 31536000,
  },
  cookie: {
    secret: Deno.env.get("COOKIE_SECRET")!,
    secure: true,
    httpOnly: true,
    sameSite: "strict",
  },
  session: {
    secret: Deno.env.get("SESSION_SECRET")!,
    store: "redis",
    maxAge: 86400,
    secure: true,
    httpOnly: true,
    redis: {
      host: Deno.env.get("REDIS_HOST") || "localhost",
      port: parseInt(Deno.env.get("REDIS_PORT") || "6379"),
    },
  },
  middleware: [
    compression({
      level: 6, // 压缩级别
      filter: (contentType) => {
        return /text|json|javascript|css/.test(contentType);
      },
    }),
    security({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.example.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
      xssProtection: true,
      noSniff: true,
      frameOptions: "SAMEORIGIN",
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
    }),
  ],
  plugins: [
    tailwind({
      version: "v4",
      optimize: true,
    }),
  ],
};

export default config;
```

---

## 完整配置示例

### 企业级应用配置

```typescript
// dweb.config.ts
import {
  tailwind,
  cors,
  logger,
  compression,
  security,
  auth,
  rateLimit,
  health,
} from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  name: "enterprise-app",
  basePath: "/",
  
  // 服务器配置
  server: {
    port: parseInt(Deno.env.get("PORT") || "3000"),
    host: Deno.env.get("HOST") || "0.0.0.0",
  },
  
  // 路由配置
  routes: {
    dir: "routes",
    ignore: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"],
    cache: true,
    priority: "specific-first",
  },
  
  // 静态资源配置
  static: {
    dir: "public",
    prefix: "/static",
    index: ["index.html"],
    dotfiles: "deny",
    etag: true,
    lastModified: true,
    maxAge: 31536000,
  },
  
  // Cookie 配置
  cookie: {
    secret: Deno.env.get("COOKIE_SECRET")!,
    secure: Deno.env.get("NODE_ENV") === "production",
    httpOnly: true,
    sameSite: "strict",
    maxAge: 86400,
  },
  
  // Session 配置
  session: {
    secret: Deno.env.get("SESSION_SECRET")!,
    store: Deno.env.get("SESSION_STORE") as "memory" | "file" | "redis" | "kv" | "mongodb" || "memory",
    maxAge: 86400,
    secure: Deno.env.get("NODE_ENV") === "production",
    httpOnly: true,
    
    // 根据环境变量动态配置存储方式
    
    // 文件存储配置
    file: Deno.env.get("SESSION_STORE") === "file" ? {
      dir: Deno.env.get("SESSION_DIR") || ".sessions",
    } : undefined,
    
    // Redis 存储配置
    redis: Deno.env.get("REDIS_HOST") ? {
      host: Deno.env.get("REDIS_HOST")!,
      port: parseInt(Deno.env.get("REDIS_PORT") || "6379"),
      password: Deno.env.get("REDIS_PASSWORD"),
      db: parseInt(Deno.env.get("REDIS_DB") || "0"),
    } : undefined,
    
    // MongoDB 存储配置（需要先配置 database.mongodb）
    mongodb: Deno.env.get("SESSION_STORE") === "mongodb" ? {
      collection: Deno.env.get("SESSION_COLLECTION") || "sessions",
    } : undefined,
    
    // KV 存储配置（Deno KV，无需额外配置）
    kv: Deno.env.get("SESSION_STORE") === "kv" ? {} : undefined,
  },
  
  // 开发配置
  dev: {
    hmr: Deno.env.get("NODE_ENV") !== "production",
    open: false,
    hmrPort: 24678,
    reloadDelay: 100,
  },
  
  // 构建配置
  build: {
    outDir: "dist",
    cache: true,
    split: true,
    chunkSize: 20000,
    compress: true,
    imageQuality: 85,
    prefetch: true,
    prefetchRoutes: true,
  },
  
  // 中间件配置
  middleware: [
    // 日志
    logger({
      level: Deno.env.get("LOG_LEVEL") || "info",
      format: "json",
    }),
    
    // 健康检查
    health({
      path: "/health",
      readyPath: "/health/ready",
      livePath: "/health/live",
    }),
    
    // 压缩
    compression({
      level: 6,
      filter: (contentType) => {
        return /text|json|javascript|css/.test(contentType);
      },
    }),
    
    // 安全头部
    security({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
      xssProtection: true,
      noSniff: true,
      frameOptions: "SAMEORIGIN",
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
    }),
    
    // CORS
    cors({
      origin: Deno.env.get("ALLOWED_ORIGINS")?.split(",") || ["http://localhost:3000"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
    
    // 限流
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: "请求过于频繁，请稍后再试",
    }),
    
    // 认证
    auth({
      secret: Deno.env.get("JWT_SECRET")!,
      exclude: ["/health", "/login", "/register", "/api/public"],
    }),
  ],
  
  // 插件配置
  plugins: [
    tailwind({
      version: "v4",
      cssPath: "assets/style.css",
      optimize: Deno.env.get("NODE_ENV") === "production",
    }),
  ],
};

export default config;
```

---

## Session 存储方式示例

### 1. Memory 存储（默认）

```typescript
// dweb.config.ts
session: {
  secret: "your-session-secret",
  store: "memory",  // 默认值
  maxAge: 86400,
}
```

**适用场景**: 开发环境、单机部署

### 2. File 存储

```typescript
// dweb.config.ts
session: {
  secret: "your-session-secret",
  store: "file",
  maxAge: 86400,
  file: {
    dir: ".sessions",  // 可选，默认为 ".sessions"
  },
}
```

**适用场景**: 单机生产环境、需要持久化但不想使用数据库

### 3. Deno KV 存储

```typescript
// dweb.config.ts
session: {
  secret: "your-session-secret",
  store: "kv",
  maxAge: 86400,
  // kv: {},  // 可选，无需额外配置
}
```

**运行方式：**
```bash
# 本地开发需要添加 --unstable-kv 标志
deno run --unstable-kv -A main.ts

# Deno Deploy 环境无需额外配置
```

**适用场景**: Deno Deploy 或本地开发

### 4. MongoDB 存储

```typescript
// dweb.config.ts
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  // 需要先配置数据库连接
  database: {
    type: "mongodb",
    url: "mongodb://localhost:27017",
    dbName: "myapp",
  },
  session: {
    secret: "your-session-secret",
    store: "mongodb",
    maxAge: 86400,
    mongodb: {
      collection: "sessions",  // 可选，默认为 "sessions"
    },
  },
};
```

**适用场景**: 生产环境，已有 MongoDB 数据库

### 5. Redis 存储

```typescript
// dweb.config.ts
session: {
  secret: "your-session-secret",
  store: "redis",
  maxAge: 86400,
  redis: {
    host: "localhost",
    port: 6379,
    password: "optional-password",  // 可选
    db: 0,                          // 可选，默认为 0
  },
}
```

**运行方式：**
```bash
# 确保 Redis 服务已启动
redis-server

# 或使用 Docker
docker run -d -p 6379:6379 redis:latest
```

**适用场景**: 分布式部署、高并发场景

---

## 高级配置

### 自定义渲染模式配置

```typescript
// dweb.config.ts
import { tailwind } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  server: {
    port: 3000,
  },
  routes: {
    dir: "routes",
  },
  // 默认渲染模式
  renderMode: "hybrid", // 或 "ssr" | "csr" | "hybrid"
  plugins: [
    tailwind({ version: "v4" }),
  ],
};

export default config;
```

### 环境变量配置

```typescript
// dweb.config.ts
import { tailwind } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const isProduction = Deno.env.get("NODE_ENV") === "production";

const config: AppConfig = {
  server: {
    port: parseInt(Deno.env.get("PORT") || "3000"),
    host: Deno.env.get("HOST") || "localhost",
  },
  routes: {
    dir: "routes",
    cache: isProduction,
  },
  build: {
    outDir: "dist",
    cache: true,
    compress: isProduction,
    split: isProduction,
  },
  plugins: [
    tailwind({
      version: "v4",
      optimize: isProduction,
    }),
  ],
};

export default config;
```

### 条件配置

```typescript
// dweb.config.ts
import { tailwind, cors, logger } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const isDev = Deno.env.get("NODE_ENV") !== "production";
const isProduction = !isDev;

const config: AppConfig = {
  server: {
    port: 3000,
  },
  routes: {
    dir: "routes",
  },
  dev: isDev ? {
    hmr: true,
    open: true,
  } : undefined,
  build: isProduction ? {
    outDir: "dist",
    cache: true,
    split: true,
    compress: true,
  } : undefined,
  middleware: [
    ...(isDev ? [logger()] : []),
    cors({
      origin: isDev ? "*" : ["https://example.com"],
    }),
  ],
  plugins: [
    tailwind({
      version: "v4",
      optimize: isProduction,
    }),
  ],
};

export default config;
```

---

## 📝 配置说明

### 配置优先级

1. **环境变量** > **配置文件** > **默认值**
2. **应用级配置** > **共享配置**（多应用模式）

### 配置验证

框架会自动验证配置，如果配置错误会显示详细的错误信息。

### 配置热重载

开发环境下，修改配置文件后需要重启服务器才能生效。

---

## 🔗 相关文档

- [使用指南](./GUIDES.md) - 详细的使用说明
- [开发指南](./DEVELOPMENT.md) - 插件和中间件开发

---

**最后更新**: 2024-12-19

