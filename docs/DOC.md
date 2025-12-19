# DWeb 框架需求文档

## 1. 项目概述

DWeb 是一个基于 Deno + Preact + Tailwind CSS v4 的现代化全栈 Web 框架，旨在提供高性能、易用的开发体验。

## 2. 技术栈

- **运行时**: Deno (最新版本)
- **前端框架**: Preact (最新版本)
- **CSS 框架**: Tailwind CSS v4
- **语言**: JavaScript (ES Modules)

## 3. 核心功能需求

### 3.1 开发命令

#### 3.1.1 开发服务 (dev)
- 启动开发服务器
- 支持热更新 (HMR)
- 自动重新编译
- 开发环境错误提示
- 支持 Source Map
- 端口可配置（默认 8000）
- 自动打开浏览器（可选）

#### 3.1.2 打包构建 (build)
- 生产环境代码打包
- 代码压缩和优化
- 资源优化（CSS、JS、图片等）
- 生成静态资源
- 支持代码分割
- 生成构建报告
- 输出目录可配置（默认 `dist`）

#### 3.1.3 生产服务 (start)
- 启动生产环境服务器
- 静态资源服务
- 性能优化（压缩、缓存等）
- 端口可配置（默认 8000）
- 支持 PM2 进程管理

### 3.2 中间件系统

#### 3.2.1 核心中间件功能
- 中间件链式调用
- 支持异步中间件
- 请求/响应对象扩展
- 中间件执行顺序控制
- 错误处理中间件
- 中间件注册和管理

#### 3.2.2 内置中间件
- **日志中间件**: 记录请求日志
- **CORS 中间件**: 跨域资源共享
- **Body Parser**: 解析请求体（JSON、Form Data、Multipart）
- **静态资源中间件**: 服务静态文件
- **压缩中间件**: Gzip/Brotli 压缩
- **安全中间件**: 基础安全防护（XSS、CSRF 等）
- **限流中间件**: 请求频率限制
- **认证中间件**: JWT 认证支持

### 3.3 插件管理系统

#### 3.3.1 插件架构
- 插件注册机制
- 插件生命周期钩子
- 插件配置管理
- 插件依赖管理
- 插件启用/禁用
- 插件优先级控制

#### 3.3.2 插件接口
- `onInit`: 初始化钩子
- `onRequest`: 请求处理钩子
- `onResponse`: 响应处理钩子
- `onError`: 错误处理钩子
- `onBuild`: 构建时钩子
- `onStart`: 启动时钩子

### 3.4 热更新 (HMR)

#### 3.4.1 前端热更新
- Preact 组件热更新
- CSS 热更新（Tailwind CSS）
- 状态保持（不丢失组件状态）
- 自动刷新机制
- WebSocket 连接管理

#### 3.4.2 后端热更新
- 服务器代码热重载
- 中间件热更新
- 路由热更新
- 配置热更新

### 3.5 Cookie 管理

#### 3.5.1 Cookie 功能
- Cookie 设置和读取
- Cookie 选项配置（Path、Domain、Expires、Max-Age、Secure、HttpOnly、SameSite）
- Cookie 签名（可选）
- Cookie 加密（可选）
- Cookie 清理和删除

#### 3.5.2 Cookie API
- `setCookie(name, value, options)`: 设置 Cookie
- `getCookie(name)`: 获取 Cookie
- `deleteCookie(name)`: 删除 Cookie
- `getAllCookies()`: 获取所有 Cookie

### 3.6 Session 管理

#### 3.6.1 Session 功能
- Session 创建和管理
- Session 存储（内存、文件、Redis 可选）
- Session 过期管理
- Session ID 生成（安全随机）
- Session 数据加密
- Session 持久化

#### 3.6.2 Session API
- `createSession(data)`: 创建 Session
- `getSession(sessionId)`: 获取 Session
- `updateSession(sessionId, data)`: 更新 Session
- `destroySession(sessionId)`: 销毁 Session
- `regenerateSession(sessionId)`: 重新生成 Session ID

### 3.7 路由系统

#### 3.7.1 路由功能
- **文件系统自动路由**（类似 Next.js）
  - 基于 `routes/` 或 `pages/` 目录结构自动生成路由
  - 文件路径映射到 URL 路径
  - 支持嵌套路由（目录嵌套）
- 动态路由支持（使用 `[param]` 或 `[...slug]` 命名）
- 路由参数解析
- 路由中间件（文件级中间件）
- 布局路由（Layout 组件）
- 404 处理（`404.tsx` 或 `not-found.tsx`）
- 路由重定向
- 索引路由（`index.tsx`）

#### 3.7.2 路由类型
- **页面路由**: Preact 页面组件（`.tsx` 文件）
- **API 路由**: 后端 API 端点（`api/` 目录下的文件）
  - 通过自定义方法名定义操作（如 register、login、logout、search、create、update 等）
  - 所有方法都通过单个导出函数定义
- **中间件路由**: 路由级别中间件（`middleware.ts` 文件）

#### 3.7.3 路由约定

**页面路由**：
- `routes/index.tsx` → `/`
- `routes/about.tsx` → `/about`
- `routes/user/[id].tsx` → `/user/:id`
- `routes/user/[id]/profile.tsx` → `/user/:id/profile`
- `routes/blog/[...slug].tsx` → `/blog/*` (捕获所有)

**API 路由**：
- `routes/api/users.ts` → `/api/users` (API 路由)

**特殊约定文件**（以下划线开头，不参与路由匹配）：
- `routes/_layout.tsx` → 根布局组件（可继承）
- `routes/user/_layout.tsx` → `/user/*` 路径的布局组件（继承根布局）
- `routes/_middleware.ts` → 全局中间件
- `routes/user/_middleware.ts` → `/user/*` 路径的中间件
- `routes/_404.tsx` → 404 错误页面
- `routes/_error.tsx` → 通用错误页面
- `routes/_500.tsx` → 500 服务器错误页面

**布局继承规则**：
- 子目录的 `_layout.tsx` 会自动继承父目录的 `_layout.tsx`
- 布局组件通过 `children` prop 接收子页面内容
- 支持多层嵌套布局继承

#### 3.7.4 路由约定文件说明

**约定文件命名**（以下划线 `_` 开头，框架自动识别）：
- `_layout.tsx` - 布局组件，支持嵌套继承
- `_middleware.ts` - 中间件文件
- `_404.tsx` - 404 错误页面
- `_error.tsx` - 通用错误页面
- `_500.tsx` - 500 服务器错误页面

**文件扩展名支持**（默认支持，无需配置）：
- `.tsx` - Preact 页面组件
- `.ts` - API 路由或中间件
- `.jsx` - JavaScript JSX 组件
- `.js` - JavaScript 文件

#### 3.7.5 布局继承

布局组件支持嵌套继承，子目录的布局会自动包裹在父目录布局中：

```typescript
// routes/_layout.tsx - 根布局
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <header>网站头部</header>
        <main>{children}</main>
        <footer>网站底部</footer>
      </body>
    </html>
  );
}

// routes/user/_layout.tsx - 用户模块布局（继承根布局）
export default function UserLayout({ children }) {
  return (
    <div className="user-layout">
      <nav>用户导航</nav>
      <div className="content">{children}</div>
    </div>
  );
}

// routes/user/[id].tsx - 用户页面（自动包裹在根布局和用户布局中）
export default function UserPage({ params }) {
  return <div>用户页面: {params.id}</div>;
}
```

**渲染结果**：
```
<RootLayout>
  <UserLayout>
    <UserPage />
  </UserLayout>
</RootLayout>
```

#### 3.7.6 路由配置选项

路由配置支持两种形式：

**简化形式**（仅配置路由目录）：
```typescript
routes: 'routes'  // 或 'pages'
```

**完整形式**（配置多个选项）：
```typescript
routes: {
  // 路由目录（必需）
  dir: 'routes',
  
  // 忽略的文件或目录（支持 glob 模式，可选）
  ignore: [
    '**/*.test.tsx',       // 忽略测试文件
    '**/*.spec.tsx',       // 忽略测试文件
    '**/__tests__/**',     // 忽略测试目录
  ],
  
  // 是否启用路由缓存（开发环境默认 false，生产环境默认 true，可选）
  cache: false,
  
  // 路由匹配优先级（默认: 'specific-first'，可选）
  // 'specific-first': 具体路由优先于动态路由
  // 'order': 按文件系统顺序
  priority: 'specific-first',
}
```

**注意**：
- 约定文件（`_layout.tsx`, `_middleware.ts`, `_404.tsx` 等）会自动被识别，无需配置
- 文件扩展名（`.tsx`, `.ts`, `.jsx`, `.js`）默认支持，无需配置
- 约定文件不参与路由匹配，仅用于布局、中间件和错误处理

### 3.8 静态资源管理

#### 3.8.1 静态资源功能
- 静态文件服务
- 资源缓存策略
- 资源压缩
- 资源版本控制（Hash）
- CDN 支持（可选）
- 图片优化（可选）

### 3.9 错误处理

#### 3.9.1 错误处理功能
- 统一错误处理机制
- 错误日志记录
- 开发环境详细错误信息
- 生产环境友好错误页面
- 错误类型分类
- 错误中间件支持

### 3.10 日志系统

#### 3.10.1 日志功能
- 多级别日志（Debug、Info、Warn、Error）
- 日志格式化
- 日志输出（控制台、文件）
- 日志轮转
- 请求日志记录
- 性能日志记录

### 3.11 环境变量管理

#### 3.11.1 环境变量功能
- `.env` 文件支持
- 环境变量验证
- 类型转换（字符串、数字、布尔值）
- 默认值支持
- 环境变量加密（敏感信息）

### 3.12 配置管理

#### 3.12.1 配置文件 (dweb.config.ts)
- 使用 `dweb.config.ts` 作为主配置文件
- TypeScript/JavaScript 配置文件支持
- 配置项包括：
  - **服务器配置**: `server.port`, `server.host`
  - **Cookie 配置**: `cookie` (选项、签名、加密等)
  - **Session 配置**: `session` (存储方式、过期时间、加密等)
  - **中间件配置**: `middleware` (全局中间件数组)
  - **插件配置**: `plugins` (插件数组及配置)
  - **路由配置**: `routes` (路由目录、路由选项等)
  - **构建配置**: `build` (输出目录、优化选项等)
    - 单应用模式：在顶层配置
    - 多应用模式：在每个应用中独立配置（每个应用打包到不同目录）
  - **开发配置**: `dev` (HMR、端口等)
- 环境特定配置（development、production、test）
- 配置合并和覆盖
- 配置验证
- 配置热重载（开发环境）

### 3.13 数据库支持（可选）

#### 3.13.1 数据库功能
- 数据库连接池
- 查询构建器
- 迁移管理
- 模型定义
- 事务支持

### 3.14 模板引擎（可选）

#### 3.14.1 模板功能
- SSR 支持（服务端渲染）
- 模板继承
- 模板组件
- 数据绑定

### 3.15 测试支持

#### 3.15.1 测试功能
- 单元测试框架集成
- 集成测试支持
- 测试覆盖率
- Mock 支持

### 3.16 开发工具

#### 3.16.1 开发工具功能
- TypeScript 类型检查（可选）
- ESLint 集成
- Prettier 集成
- 代码格式化
- Git Hooks 支持

## 4. 目录结构

### 4.1 框架本身的目录结构

框架（DWeb）的源代码目录结构：

```
dweb-framework/           # 框架源码目录
├── src/
│   ├── core/             # 核心功能
│   │   ├── server.ts     # 服务器核心
│   │   ├── router.ts     # 路由系统
│   │   ├── middleware.ts # 中间件系统
│   │   ├── plugin.ts     # 插件系统
│   │   └── config.ts     # 配置管理
│   ├── features/         # 功能模块
│   │   ├── cookie.ts     # Cookie 管理
│   │   ├── session.ts    # Session 管理
│   │   ├── hmr.ts        # 热更新
│   │   ├── build.ts      # 构建系统
│   │   └── dev.ts        # 开发服务器
│   ├── middleware/       # 内置中间件
│   │   ├── logger.ts     # 日志中间件
│   │   ├── cors.ts       # CORS 中间件
│   │   ├── body-parser.ts # Body 解析中间件
│   │   └── static.ts     # 静态资源中间件
│   ├── plugins/          # 内置插件
│   ├── utils/            # 工具函数
│   ├── types/            # 类型定义
│   └── index.ts          # 框架入口
├── tests/                # 测试文件
├── examples/             # 示例项目
├── deno.json             # Deno 配置
└── README.md             # 框架文档
```

### 4.2 使用框架的项目目录结构

使用 DWeb 框架创建的项目目录结构：

```
my-project/               # 项目根目录
├── routes/               # 路由目录（自动路由，类似 Next.js）
│   ├── index.tsx         # 首页路由 (/)
│   ├── about.tsx         # /about 路由
│   ├── _layout.tsx       # 根布局组件（可继承）
│   ├── _middleware.ts    # 全局中间件
│   ├── _404.tsx          # 404 错误页面
│   ├── _error.tsx        # 通用错误页面
│   ├── _500.tsx          # 500 服务器错误页面
│   ├── user/
│   │   ├── _layout.tsx   # 用户模块布局（继承根布局）
│   │   ├── _middleware.ts # 用户模块中间件
│   │   ├── [id].tsx      # 动态路由 /user/:id
│   │   └── [id]/
│   │       └── profile.tsx # /user/:id/profile
│   └── api/              # API 路由
│       └── users.ts      # /api/users
├── components/           # 共享组件
├── layouts/              # 布局组件
├── plugins/              # 项目插件目录
├── middleware/           # 自定义中间件
├── utils/                # 工具函数
├── public/               # 静态资源
├── dist/                 # 构建输出
├── .env                  # 环境变量
├── .env.example          # 环境变量示例
├── deno.json             # Deno 配置
├── tailwind.config.js    # Tailwind 配置
├── dweb.config.ts        # 框架配置文件
├── main.ts               # 应用入口文件
└── README.md             # 项目说明
```

**注意**: 
- 也可以使用 `pages/` 目录替代 `routes/` 目录，在 `dweb.config.ts` 中配置
- 多应用模式下，每个应用可以有独立的 `routes/` 目录

## 5. API 设计

### 5.1 配置文件 API (dweb.config.ts)

**应用模式判断**：
- **单应用模式**：配置文件中没有 `apps` 属性，直接配置服务器、路由等选项
- **多应用模式**：配置文件中包含 `apps` 数组，每个应用独立配置，可共享公共配置

#### 5.1.1 单应用模式配置

单应用模式适用于单个 Web 应用（没有配置 `apps` 属性）：

```typescript
// dweb.config.ts
export default {
  // 服务器配置
  server: {
    port: 8000,
    host: 'localhost',
  },
  
  // Cookie 配置
  cookie: {
    secret: 'your-secret-key', // Cookie 签名密钥
    secure: true,               // 仅 HTTPS
    httpOnly: true,             // 禁止 JavaScript 访问
    sameSite: 'strict',         // SameSite 策略
    maxAge: 86400,              // 默认过期时间（秒）
  },
  
  // Session 配置
  session: {
    secret: 'your-session-secret',
    store: 'memory',            // 'memory' | 'file' | 'redis'
    maxAge: 3600000,            // 过期时间（毫秒）
    secure: true,
    httpOnly: true,
    // Redis 配置（如果使用 Redis）
    redis: {
      host: 'localhost',
      port: 6379,
    },
  },
  
  // 全局中间件配置
  middleware: [
    // 中间件函数或中间件配置对象
    loggerMiddleware,
    corsMiddleware,
    {
      name: 'custom-middleware',
      handler: customMiddleware,
      options: { /* ... */ }
    }
  ],
  
  // 插件配置
  plugins: [
    // 插件函数或插件配置对象
    authPlugin,
    {
      name: 'custom-plugin',
      config: { /* ... */ }
    }
  ],
  
  // 全局渲染模式（可选，默认: 'ssr'）
  // 可选值: 'ssr' | 'csr' | 'hybrid'
  // - ssr: 服务端渲染（默认）
  // - csr: 客户端渲染
  // - hybrid: 混合渲染（服务端渲染 + 客户端 hydration）
  // 可以在页面组件中通过导出 renderMode 覆盖此配置
  renderMode: 'ssr',
  
  // 路由配置
  // 简化形式: routes: 'routes' (仅配置目录)
  // 完整形式: routes: { dir: 'routes', ... } (配置多个选项)
  routes: {
    // 路由目录，可以是 'routes' 或 'pages'
    dir: 'routes',
    
    // 忽略的文件或目录（支持 glob 模式，可选）
    ignore: [
      '**/*.test.tsx',       // 忽略测试文件
      '**/*.spec.tsx',       // 忽略测试文件
      '**/__tests__/**',     // 忽略测试目录
    ],
    
    // 是否启用路由缓存（开发环境默认 false，生产环境默认 true，可选）
    cache: false,
    
    // 路由匹配优先级（默认: 'specific-first'，可选）
    // 'specific-first': 具体路由优先于动态路由
    // 'order': 按文件系统顺序
    priority: 'specific-first',
  },
  
  // 注意：约定文件（_layout.tsx, _middleware.ts, _404.tsx, _error.tsx, _500.tsx）
  // 和文件扩展名（.tsx, .ts, .jsx, .js）由框架自动识别，无需配置
  
  // 构建配置
  build: {
    outDir: 'dist',
    // 其他构建选项
  },
  
  // 开发配置
  dev: {
    hmr: true,
    open: true,                 // 自动打开浏览器
  },
};
```

#### 5.1.2 多应用模式配置

多应用模式适用于微前端、多站点或模块化应用场景，可以共享公共配置（配置了 `apps` 属性即为多应用模式）：

```typescript
// dweb.config.ts
export default {
  // 共享配置（所有应用共用的配置，直接写在顶层）
  // Cookie 配置（所有应用共用）
  cookie: {
    secret: 'shared-secret-key',
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 86400,
  },
  
  // Session 配置（所有应用共用）
  session: {
    secret: 'shared-session-secret',
    store: 'memory',
    maxAge: 3600000,
    secure: true,
    httpOnly: true,
  },
  
  // 中间件（所有应用都会应用）
  middleware: [
    loggerMiddleware,
    corsMiddleware,
  ],
  
  // 插件（所有应用都会加载）
  plugins: [
    authPlugin,
  ],
  
  // 路由配置（所有应用共用的路由设置，可选）
  routes: {
    // 忽略的文件或目录（所有应用共用）
    ignore: [
      '**/*.test.tsx',
      '**/*.spec.tsx',
      '**/__tests__/**',
    ],
    
    // 路由匹配优先级（所有应用共用，默认: 'specific-first'）
    priority: 'specific-first',
  },
  
  // 注意：约定文件（_layout.tsx, _middleware.ts, _404.tsx, _error.tsx, _500.tsx）
  // 和文件扩展名（.tsx, .ts, .jsx, .js）由框架自动识别，无需配置
  
  // 开发配置（所有应用共用）
  dev: {
    hmr: true,
  },
  
  // 应用列表（配置了 apps 即为多应用模式）
  apps: [
    {
      // 应用名称
      name: 'backend',
      
      // 应用路由前缀（可选，默认为 '/'）
      basePath: '/admin',
      
      // 应用路由配置
      // 简化形式: routes: 'backend/routes' (仅配置目录)
      // 完整形式: routes: { dir: 'backend/routes', ... } (配置多个选项)
      routes: {
        // 路由目录
        dir: 'backend/routes',
        
        // 忽略的文件或目录（可选，会合并到顶层配置的 ignore）
        ignore: ['**/temp/**'],
        
        // 是否启用路由缓存（可选，会覆盖顶层配置）
        cache: false,
        
        // 路由匹配优先级（可选，会覆盖顶层配置）
        priority: 'specific-first',
      },
      
      // 应用特定服务器配置（必需，每个应用必须配置独立的端口）
      server: {
        port: 8000,
        host: 'localhost',
      },
      
      // 应用特定中间件（可选，追加到顶层中间件之后）
      middleware: [
        backendAuthMiddleware,
      ],
      
      // 应用特定插件（可选，追加到顶层插件之后）
      plugins: [
        backendPlugin,
      ],
      
      // 应用特定 Cookie 配置（可选，合并到顶层配置）
      cookie: {
        // 可以覆盖或扩展顶层的 Cookie 配置
      },
      
      // 应用特定 Session 配置（可选，合并到顶层配置）
      session: {
        // 可以覆盖或扩展顶层的 Session 配置
      },
      
      // 构建配置（每个应用独立配置）
      build: {
        outDir: 'dist/backend',  // 后台应用打包到 dist/backend
      },
    },
    {
      name: 'frontend',
      basePath: '/',
      routes: {
        dir: 'frontend/routes',
        // 前台可以使用不同的忽略规则
        ignore: ['**/temp/**'],
      },
      server: {
        port: 8001,  // 不同端口
        host: 'localhost',
      },
      middleware: [
        frontendMiddleware,
      ],
      plugins: [
        frontendPlugin,
      ],
      // 构建配置（每个应用独立配置）
      build: {
        outDir: 'dist/frontend',  // 前台应用打包到 dist/frontend
      },
    },
    {
      name: 'mobile',
      basePath: '/mobile',
      routes: {
        dir: 'mobile/routes',
        // 移动端可以配置不同的缓存策略
        cache: true,
      },
      server: {
        port: 8002,  // 不同端口
        host: 'localhost',
      },
      middleware: [
        mobileMiddleware,
      ],
      plugins: [
        mobilePlugin,
      ],
      // 构建配置（每个应用独立配置）
      build: {
        outDir: 'dist/mobile',  // 移动端应用打包到 dist/mobile
      },
    },
  ],
};
```

#### 5.1.3 配置合并规则

在多应用模式下，配置的合并规则：

1. **顶层配置优先**: 顶层配置（cookie、session、middleware、plugins、routes、dev 等）作为所有应用的基础配置
2. **应用配置覆盖**: 应用特定配置会覆盖或合并到顶层配置
3. **数组配置合并**: 中间件和插件数组会合并（应用配置追加到顶层配置之后）
4. **对象配置深度合并**: Cookie、Session、routes 等对象配置会深度合并
5. **构建配置独立**: 每个应用必须独立配置 `build.outDir`，用于指定各自的构建输出目录
6. **必需配置**: 每个应用必须配置 `name`、`routes.dir`、`server.port` 和 `build.outDir`

#### 5.1.4 多应用目录结构示例

```
multi-app-project/
├── backend/               # 后台管理系统应用
│   └── routes/            # 后台管理路由
│       └── ...
├── frontend/              # 前台应用
│   └── routes/            # 前台路由
│       └── ...
├── mobile/                # 移动端应用
│   └── routes/            # 移动端路由
│       └── ...
├── shared/                # 共享资源
│   ├── components/        # 共享组件
│   ├── middleware/        # 共享中间件
│   └── plugins/           # 共享插件
├── dist/                  # 构建输出目录
│   ├── backend/           # 后台应用构建输出（build.outDir: 'dist/backend'）
│   ├── frontend/          # 前台应用构建输出（build.outDir: 'dist/frontend'）
│   └── mobile/            # 移动端应用构建输出（build.outDir: 'dist/mobile'）
├── dweb.config.ts         # 多应用配置
└── main.ts                # 应用入口
```

### 5.2 应用入口 API (main.ts)

#### 5.2.1 单应用模式

```typescript
// main.ts
import { app } from 'dweb';
import customMiddleware from './middleware/custom.ts';
import customPlugin from './plugins/custom.ts';

// 在代码中动态添加中间件
app.use(customMiddleware);

// 在代码中动态注册插件
app.plugin(customPlugin);

// 应用会自动从 dweb.config.ts 加载配置
// 服务器会自动启动（根据配置的端口和主机）
```

#### 5.2.2 多应用模式

```typescript
// main.ts
import { apps } from 'dweb';
import sharedMiddleware from './shared/middleware/custom.ts';
import sharedPlugin from './shared/plugins/custom.ts';

// 获取所有应用实例
const { backend, frontend, mobile } = apps;

// 为特定应用添加中间件
backend.use(backendMiddleware);
frontend.use(frontendMiddleware);
mobile.use(mobileMiddleware);

// 为特定应用注册插件
backend.plugin(backendPlugin);
frontend.plugin(frontendPlugin);

// 或者通过应用名称获取
const backendApp = apps.get('backend');
backendApp.use(customMiddleware);

// 应用会自动从 dweb.config.ts 加载配置
// 每个应用会根据配置启动独立的服务器
```

**注意**: 
- 服务器配置（端口、主机）必须在 `dweb.config.ts` 中配置
- Cookie、Session、中间件、插件可以在 `dweb.config.ts` 顶层配置（所有应用共用），也可以在应用配置中覆盖，或在 `main.ts` 中通过 `app.use()` 和 `app.plugin()` 动态添加
- 框架会自动读取 `dweb.config.ts` 并应用配置
- 多应用模式下，顶层配置作为所有应用的默认配置，每个应用可以独立配置覆盖或扩展

### 5.3 路由 API（文件系统路由）

路由通过文件系统自动生成，无需手动注册：

```typescript
// routes/_layout.tsx - 根布局组件
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <header>网站头部</header>
        <main>{children}</main>
        <footer>网站底部</footer>
      </body>
    </html>
  );
}

// routes/index.tsx - 对应路由: /
export default function HomePage() {
  return <div>首页</div>;
}

// routes/about.tsx - 对应路由: /about
export default function AboutPage() {
  return <div>关于我们</div>;
}

// routes/user/_layout.tsx - 用户模块布局（继承根布局）
export default function UserLayout({ children }) {
  return (
    <div className="user-layout">
      <nav>用户导航</nav>
      <div className="content">{children}</div>
    </div>
  );
}

// routes/user/[id].tsx - 对应路由: /user/:id
export default function UserPage({ params }) {
  return <div>用户 ID: {params.id}</div>;
}

// routes/about.tsx - CSR 模式示例
export const renderMode = 'csr';

export default function AboutPage() {
  return <div>关于我们</div>;
}

// routes/user/profile.tsx - Hybrid 模式示例
export const renderMode = 'hybrid';

export default function UserProfile() {
  return <div>用户资料</div>;
}

// routes/api/users.ts - 对应路由: /api/users
// 通过自定义方法名定义操作，支持驼峰格式和短横线格式

// POST /api/users/list 或 POST /api/users/list-users
export async function list(req) {
  return { users: [] };
}

// POST /api/users/create 或 POST /api/users/create-user
export async function create(req) {
  // 处理创建请求
  return { success: true };
}

// routes/_middleware.ts - 全局中间件
export default async function middleware(req, res, next) {
  // 中间件逻辑
  await next();
}

// routes/user/_middleware.ts - /user/* 路径的中间件
export default async function userMiddleware(req, res, next) {
  // 用户相关中间件逻辑
  await next();
}

// routes/_404.tsx - 404 错误页面
export default function NotFoundPage() {
  return <div>页面未找到</div>;
}

// routes/_error.tsx - 通用错误页面
export default function ErrorPage({ error }) {
  return <div>发生错误: {error.message}</div>;
}

// routes/_500.tsx - 500 服务器错误页面
export default function ServerErrorPage() {
  return <div>服务器内部错误</div>;
}
```

**路由约定**:
- 文件路径自动映射到 URL 路径
- `[param]` 表示动态参数
- `[...slug]` 表示捕获所有路径
- `index.tsx` 表示索引路由
- `_layout.tsx` 表示布局组件（支持嵌套继承）
- `_middleware.ts` 表示中间件文件
- `_404.tsx` 表示 404 错误页面
- `_error.tsx` 表示通用错误页面
- `_500.tsx` 表示 500 服务器错误页面

### 5.4 中间件 API

#### 5.4.1 在 main.ts 中使用中间件

```typescript
// main.ts
import { app } from 'dweb';
import authMiddleware from './middleware/auth.ts';

// 添加全局中间件
app.use(async (req, res, next) => {
  console.log('请求:', req.url);
  await next();
});

// 添加命名中间件
app.use(authMiddleware);
```

#### 5.4.2 在 dweb.config.ts 中配置中间件

```typescript
// dweb.config.ts
import authMiddleware from './middleware/auth.ts';

export default {
  middleware: [
    authMiddleware,
    // 或使用配置对象
    {
      name: 'custom',
      handler: customMiddleware,
      options: { /* ... */ }
    }
  ],
};
```

#### 5.4.3 路由级别中间件（文件系统）

```typescript
// routes/_middleware.ts - 全局中间件
export default async function middleware(req, res, next) {
  await next();
}

// routes/admin/_middleware.ts - /admin/* 路径的中间件
export default async function adminMiddleware(req, res, next) {
  // 验证管理员权限
  await next();
}
```

### 5.5 Cookie API

```javascript
// 设置 Cookie
res.setCookie('token', 'value', {
  maxAge: 3600,
  httpOnly: true,
  secure: true
});

// 获取 Cookie
const token = req.getCookie('token');

// 删除 Cookie
res.deleteCookie('token');
```

### 5.6 Session API

```javascript
// 创建 Session
const session = await req.createSession({ userId: 123 });

// 获取 Session
const session = await req.getSession();

// 更新 Session
await session.update({ userId: 456 });

// 销毁 Session
await session.destroy();
```

### 5.7 插件 API

#### 5.7.1 在 main.ts 中注册插件

```typescript
// main.ts
import { app } from 'dweb';
import myPlugin from './plugins/my-plugin.ts';

// 注册插件
app.plugin(myPlugin);
```

#### 5.7.2 在 dweb.config.ts 中配置插件

```typescript
// dweb.config.ts
import myPlugin from './plugins/my-plugin.ts';

export default {
  plugins: [
    myPlugin,
    // 或使用配置对象
    {
      name: 'custom-plugin',
      config: { /* ... */ }
    }
  ],
};
```

#### 5.7.3 插件定义

```typescript
// plugins/my-plugin.ts
export default {
  name: 'my-plugin',
  onInit: async (app) => {
    // 初始化逻辑
  },
  onRequest: async (req, res) => {
    // 请求处理逻辑
  },
  onResponse: async (req, res) => {
    // 响应处理逻辑
  },
  onError: async (err, req, res) => {
    // 错误处理逻辑
  }
};
```

## 6. 性能要求

- 开发服务器启动时间 < 2 秒
- 热更新响应时间 < 500ms
- 生产构建时间优化
- 支持代码分割和懒加载
- 静态资源缓存策略
- 响应压缩（Gzip/Brotli）

## 7. 安全要求

- XSS 防护
- CSRF 防护
- SQL 注入防护（如使用数据库）
- 安全的 Cookie 设置
- Session 安全（防劫持）
- 请求限流
- 输入验证和清理
- 安全头部设置

## 8. 兼容性要求

- 支持现代浏览器（Chrome、Firefox、Safari、Edge 最新版本）
- Deno 最新版本
- Preact 最新版本
- 支持 ES Modules
- 移动端响应式支持

## 9. 开发体验要求

- 清晰的错误提示
- 详细的文档
- 代码示例
- TypeScript 类型支持（可选）
- 开发工具集成
- 热更新体验流畅

## 10. 部署要求

- 支持 Docker 部署
- 支持 PM2 进程管理
- 支持环境变量配置
- 支持健康检查端点
- 支持优雅关闭

## 11. 文档要求

- API 文档
- 使用指南
- 插件开发指南
- 中间件开发指南
- 部署文档
- 常见问题（FAQ）

## 12. 测试要求

- 单元测试覆盖率 > 80%
- 集成测试覆盖核心功能
- 性能测试
- 安全测试

## 13. 后续扩展功能（可选）

- GraphQL 支持
- WebSocket 支持
- Server-Sent Events (SSE)
- 国际化 (i18n)
- 主题系统
- 多语言支持
- 监控和指标收集
- 分布式追踪

## 14. 开发计划

### 阶段 1: 核心功能
- [ ] 基础服务器框架
- [ ] 路由系统
- [ ] 中间件系统
- [ ] 开发/构建/生产命令

### 阶段 2: 核心特性
- [ ] Cookie 和 Session
- [ ] 热更新 (HMR)
- [ ] 静态资源管理
- [ ] 错误处理

### 阶段 3: 高级功能
- [ ] 插件系统
- [ ] 日志系统
- [ ] 配置管理
- [ ] 安全中间件

### 阶段 4: 优化和完善
- [ ] 性能优化
- [ ] 文档完善
- [ ] 测试覆盖
- [ ] 示例项目

## 15. 技术决策

### 15.1 为什么选择 Deno？
- 原生 TypeScript 支持（可选）
- 内置工具链（测试、格式化等）
- 安全的权限系统
- 现代 Web 标准支持
- 无需 node_modules
- 使用最新版本以获得最佳性能和最新特性

### 15.2 为什么选择 Preact？
- 轻量级（3KB）
- 快速渲染
- React 兼容 API
- 良好的性能
- 使用最新版本以获得最新特性和性能优化

### 15.3 为什么选择 Tailwind CSS v4？
- 实用优先的 CSS 框架
- 快速开发
- 可定制性强
- 生产环境优化

## 16. 依赖管理

- 使用 Deno 的导入映射（import map）
- 版本锁定文件（deno.lock）
- 依赖审查和更新

## 17. 代码规范

- 使用 ESLint 进行代码检查
- 使用 Prettier 进行代码格式化
- 遵循 JavaScript 最佳实践
- 代码注释规范
- 命名规范

## 18. 版本管理

- 语义化版本控制（SemVer）
- 变更日志（CHANGELOG）
- Git 工作流
- 发布流程

## 19. 需求完善补充

经过分析，以下需求需要进一步完善和明确：

### 19.1 CLI 工具和命令执行

#### 19.1.1 CLI 工具需求
- **项目创建工具**: `dweb create <project-name>` - 创建新项目
- **命令执行方式**: 通过 CLI 工具执行 `dev`、`build`、`start` 命令
- **命令格式**: `dweb dev`、`dweb build`、`dweb start`
- **CLI 功能**:
  - 项目初始化
  - 生成配置文件模板
  - 安装依赖
  - 运行开发服务器
  - 执行构建
  - 启动生产服务器

#### 19.1.2 命令选项
- `dweb dev [options]`:
  - `--port <port>`: 指定端口
  - `--host <host>`: 指定主机
  - `--open`: 自动打开浏览器
  - `--no-hmr`: 禁用热更新
- `dweb build [options]`:
  - `--out-dir <dir>`: 指定输出目录
  - `--analyze`: 生成构建分析报告
- `dweb start [options]`:
  - `--port <port>`: 指定端口
  - `--host <host>`: 指定主机

### 19.2 请求和响应对象 API

#### 19.2.1 请求对象 (Request)
```typescript
interface Request {
  // 基础属性
  url: string;
  method: string;
  headers: Headers;
  body: any;
  
  // 扩展属性
  params: Record<string, string>;        // 路由参数
  query: Record<string, string>;         // 查询参数
  cookies: Record<string, string>;       // Cookie（已解析）
  session: Session | null;              // Session 对象
  
  // 方法
  getCookie(name: string): string | null;
  getHeader(name: string): string | null;
  json(): Promise<any>;
  text(): Promise<string>;
  formData(): Promise<FormData>;
}
```

#### 19.2.2 响应对象 (Response)
```typescript
interface Response {
  // 状态码
  status: number;
  statusText: string;
  
  // 方法
  setCookie(name: string, value: string, options?: CookieOptions): void;
  setHeader(name: string, value: string): void;
  json(data: any): Response;
  html(html: string): Response;
  text(text: string): Response;
  redirect(url: string, status?: number): Response;
  send(data: any): Response;
}
```

### 19.3 API 路由详细说明

#### 19.3.1 API 路由模式

API 路由通过自定义方法名定义操作，使用单个导出函数。每个导出的函数对应一个 API 端点。

**路径格式**：
- 路径格式必须是：`/api/routeName/methodName`
- 支持两种命名格式：
  - **驼峰格式（CamelCase）**：`/api/users/getUsers`、`/api/users/createUser`
  - **短横线格式（kebab-case）**：`/api/users/get-users`、`/api/users/create-user`
- 两种格式会自动转换，可以混用

```typescript
// routes/api/auth.ts

// POST /api/auth/register 或 POST /api/auth/register-user
export async function register(req) {
  const data = await req.json();
  const user = await db.createUser(data);
  return { user };
}

// POST /api/auth/login 或 POST /api/auth/login-user
export async function login(req) {
  const { username, password } = await req.json();
  const user = await db.authenticateUser(username, password);
  if (user) {
    const session = await req.createSession({ userId: user.id });
    return { user, token: session.id };
  }
  return { error: 'Invalid credentials' };
}

// POST /api/auth/logout 或 POST /api/auth/logout-user
export async function logout(req) {
  const session = await req.getSession();
  if (session) {
    await session.destroy();
  }
  return { success: true };
}

// POST /api/auth/refresh 或 POST /api/auth/refresh-token
export async function refresh(req) {
  const session = await req.getSession();
  if (session) {
    await session.regenerate();
    return { token: session.id };
  }
  return { error: 'No session' };
}
```

```typescript
// routes/api/users.ts

// POST /api/users/list 或 POST /api/users/list-users
export async function list(req) {
  const { page = 1, limit = 10 } = req.query;
  const users = await db.getUsers({ page, limit });
  return { users };
}

// POST /api/users/create 或 POST /api/users/create-user
export async function create(req) {
  const data = await req.json();
  const user = await db.createUser(data);
  return { user };
}

// POST /api/users/update 或 POST /api/users/update-user
export async function update(req) {
  const { id, ...data } = await req.json();
  const user = await db.updateUser(id, data);
  return { user };
}

// POST /api/users/delete 或 POST /api/users/delete-user
export async function delete(req) {
  const { id } = await req.json();
  await db.deleteUser(id);
  return { success: true };
}
```

#### 19.3.2 更多示例

```typescript
// routes/api/users.ts

// POST /api/users/search 或 POST /api/users/search-users
export async function search(req) {
  const { keyword } = await req.json();
  const users = await db.searchUsers(keyword);
  return { users };
}

// POST /api/users/batchDelete 或 POST /api/users/batch-delete
export async function batchDelete(req) {
  const { ids } = await req.json();
  await db.batchDeleteUsers(ids);
  return { success: true };
}

// POST /api/users/export 或 POST /api/users/export-users
export async function export(req) {
  const { format } = req.query;
  const data = await db.exportUsers(format);
  return { data };
}
```

#### 19.3.3 API 路由特性

API 路由支持以下特性：
- **路径格式**：通过 URL 路径指定方法名，格式为 `/api/routeName/methodName`
- **命名格式**：支持驼峰格式（CamelCase）和短横线格式（kebab-case），两种格式会自动转换
- **请求体自动解析**：JSON、Form Data、Multipart
- **响应格式统一**：JSON、文本、HTML
- **路由参数解析**：`req.params`
- **查询参数解析**：`req.query`
- **错误处理机制**：统一的错误响应格式
- **请求方法**：所有请求默认使用 POST 方法

**格式转换示例**：
- 代码中定义的函数名：`getUsers`（驼峰格式）
- 支持的 URL 路径：
  - `/api/users/getUsers`（驼峰格式，直接匹配）
  - `/api/users/get-users`（短横线格式，自动转换为 `getUsers` 后匹配）

### 19.4 页面数据获取

#### 19.4.1 数据获取方法
- **服务端数据获取**: 在页面组件中通过 `load` 函数获取数据
- **客户端数据获取**: 使用 Preact Hooks（useState、useEffect）
- **数据预取**: 支持数据预取和缓存

#### 19.4.2 数据获取示例
```typescript
// routes/user/[id].tsx
export async function load({ params }) {
  // 服务端数据获取
  const user = await fetchUser(params.id);
  return { user };
}

export default function UserPage({ data, params }) {
  // data 来自 load 函数返回的数据
  const { user } = data;
  return <div>用户: {user.name}</div>;
}
```

### 19.5 渲染模式

框架支持三种渲染模式：**CSR（客户端渲染）**、**SSR（服务端渲染）** 和 **Hybrid（混合渲染）**。可以根据页面需求选择合适的渲染模式。

#### 19.5.1 渲染模式说明

**1. SSR（服务端渲染）**
- 在服务器端渲染 Preact 组件为 HTML
- 首次加载时直接返回完整的 HTML 内容
- 默认不进行客户端 hydration（除非明确指定）
- 优点：SEO 友好、首屏加载快、减少客户端 JavaScript 执行
- 适用场景：内容页面、博客、文档站点、需要 SEO 的页面

**2. CSR（客户端渲染）**
- 完全在客户端浏览器中渲染组件
- 服务器只返回空的 HTML 容器和 JavaScript 代码
- 所有渲染逻辑在客户端执行
- 优点：交互性强、减少服务器压力、适合动态内容
- 适用场景：管理后台、仪表盘、需要大量交互的应用

**3. Hybrid（混合渲染）**
- 在服务器端渲染 HTML，然后在客户端进行 hydration（激活）
- 结合了 SSR 和 CSR 的优点
- 服务端渲染提供初始内容，客户端 hydration 提供交互能力
- 优点：SEO 友好 + 客户端交互、首屏快 + 后续交互流畅
- 适用场景：需要 SEO 且需要客户端交互的页面、电商产品页、用户中心

#### 19.5.2 渲染模式配置

**全局配置（dweb.config.ts）**：
```typescript
// dweb.config.ts
export default {
  // 全局渲染模式（所有页面的默认模式）
  // 可选值: 'ssr' | 'csr' | 'hybrid'
  // 默认值: 'ssr'
  renderMode: 'hybrid',
  
  // ... 其他配置
};
```

**页面级配置（覆盖全局配置）**：
```typescript
// routes/index.tsx - SSR 模式（默认）
export default function HomePage() {
  return <div>首页</div>;
}

// routes/about.tsx - CSR 模式
export const renderMode = 'csr';

export default function AboutPage() {
  return <div>关于我们</div>;
}

// routes/user/[id].tsx - Hybrid 模式
export const renderMode = 'hybrid';

export default function UserPage({ params }) {
  return <div>用户 ID: {params.id}</div>;
}
```

**控制 Hydration（仅 SSR 模式）**：
```typescript
// routes/blog/[slug].tsx - SSR 模式，但启用 hydration
export const renderMode = 'ssr';
export const hydrate = true; // 启用客户端 hydration

export default function BlogPage({ params }) {
  return <div>博客文章: {params.slug}</div>;
}
```

#### 19.5.3 渲染模式优先级

渲染模式的优先级（从高到低）：
1. **页面组件导出的 `renderMode`**（最高优先级）
2. **配置文件中的 `renderMode`**
3. **默认值 `'ssr'`**

```typescript
// 示例：页面组件优先级最高
// routes/dashboard.tsx
export const renderMode = 'csr'; // 即使全局配置是 'ssr'，此页面也会使用 'csr'

export default function Dashboard() {
  return <div>仪表盘</div>;
}
```

#### 19.5.4 渲染模式使用示例

**SSR 模式示例**：
```typescript
// routes/product/[id].tsx - 产品详情页（需要 SEO）
export const renderMode = 'ssr';

export async function load({ params }) {
  // 服务端数据获取
  const product = await fetchProduct(params.id);
  return { product };
}

export default function ProductPage({ data, params }) {
  const { product } = data;
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
    </div>
  );
}
```

**CSR 模式示例**：
```typescript
// routes/admin/dashboard.tsx - 管理后台（不需要 SEO）
export const renderMode = 'csr';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // 客户端数据获取
    fetch('/api/dashboard').then(res => res.json()).then(setData);
  }, []);
  
  return <div>仪表盘数据: {JSON.stringify(data)}</div>;
}
```

**Hybrid 模式示例**：
```typescript
// routes/user/profile.tsx - 用户中心（需要 SEO 和交互）
export const renderMode = 'hybrid';

export async function load({ req }) {
  // 服务端数据获取（用于初始渲染）
  const session = await req.getSession();
  const user = await fetchUser(session.userId);
  return { user };
}

export default function UserProfile({ data }) {
  const { user } = data;
  const [likes, setLikes] = useState(user.likes);
  
  // 客户端交互逻辑
  const handleLike = () => {
    setLikes(likes + 1);
    // 发送请求到服务器
  };
  
  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={handleLike}>点赞 ({likes})</button>
    </div>
  );
}
```

#### 19.5.5 渲染模式选择建议

| 场景 | 推荐模式 | 原因 |
|------|---------|------|
| 内容页面、博客 | SSR | SEO 友好，首屏快 |
| 管理后台、仪表盘 | CSR | 交互多，不需要 SEO |
| 电商产品页 | Hybrid | 需要 SEO 和交互 |
| 用户中心 | Hybrid | 需要 SEO 和交互 |
| 静态页面 | SSR | 性能好，SEO 友好 |
| 动态应用 | CSR | 交互性强 |

#### 19.5.6 数据获取与渲染模式

**SSR 模式**：
- 使用 `load` 函数在服务端获取数据
- 数据会在服务端渲染时注入到 HTML 中
- 客户端可以通过 `data` prop 访问数据

**CSR 模式**：
- 使用客户端 Hooks（`useState`、`useEffect`）获取数据
- 数据在客户端获取和渲染
- 可以使用 API 路由获取数据

**Hybrid 模式**：
- 可以使用 `load` 函数在服务端获取初始数据
- 也可以使用客户端 Hooks 获取后续数据
- 服务端数据用于初始渲染，客户端数据用于更新

### 19.6 SSR 和静态生成

#### 19.6.1 SSR 支持
- Preact 组件服务端渲染
- 数据预取和注入
- 客户端水合（Hydration）
- SEO 优化

#### 19.6.2 静态生成（SSG）
- 支持静态页面生成
- 构建时数据获取
- 增量静态再生（ISR）
- 页面配置：
```typescript
// routes/about.tsx
export const static = true; // 静态生成
export const revalidate = 3600; // 重新验证时间（秒）

export default function AboutPage() {
  return <div>关于我们</div>;
}
```

### 19.7 环境变量使用

#### 19.7.1 环境变量访问
```typescript
// 在代码中访问环境变量
import { env } from 'dweb';

const apiKey = env('API_KEY');
const dbHost = env('DB_HOST', 'localhost'); // 带默认值
const port = env.int('PORT', 8000); // 类型转换
```

#### 19.7.2 环境变量配置
- `.env` - 默认环境变量
- `.env.local` - 本地环境变量（不提交到版本控制）
- `.env.development` - 开发环境变量
- `.env.production` - 生产环境变量

### 19.8 Tailwind CSS 集成

#### 19.8.1 Tailwind CSS 编译支持

框架需要自己编译 Tailwind CSS，**不使用 CDN**。支持 Tailwind CSS v3 和 v4 两个版本，通过插件配置选择使用哪个版本。

**核心要求**：
- 框架内置 Tailwind CSS 编译功能
- 支持 Tailwind CSS v3 和 v4 两个版本
- 通过 `dweb.config.ts` 插件配置选择版本
- 开发环境实时编译 CSS
- 生产环境优化和压缩 CSS
- 自动查找 `tailwind.config.ts` 或 `tailwind.config.js` 配置文件
- 支持 PostCSS 处理流程（autoprefixer、cssnano 等）

#### 19.8.2 Tailwind CSS 版本选择

在 `dweb.config.ts` 中通过插件配置选择使用 Tailwind CSS v3 或 v4：

```typescript
// dweb.config.ts
import { tailwind } from 'dweb/plugins';

export default {
  // ... 其他配置
  
  plugins: [
    // 使用 Tailwind CSS v4（默认）
    {
      name: 'tailwind',
      config: {
        version: 'v4',  // 或 'v3'
        // v4 特定配置
        optimize: true,  // 生产环境优化
      }
    },
    
    // 或者使用 v3
    {
      name: 'tailwind',
      config: {
        version: 'v3',
        // v3 特定配置
        autoprefixer: {
          // autoprefixer 选项
        }
      }
    }
  ]
};
```

**版本差异**：
- **v3**: 使用 `tailwindcss` 包 + `autoprefixer` + `cssnano`（生产环境）
- **v4**: 使用 `@tailwindcss/postcss` 包（内置优化）

#### 19.8.3 Tailwind CSS 配置文件查找

框架会自动查找 Tailwind CSS 配置文件，查找顺序：
1. 项目根目录：`tailwind.config.ts`
2. 项目根目录：`tailwind.config.js`
3. 项目根目录：`tailwind.config.mjs`
4. 向上查找父目录，直到找到配置文件或到达项目根目录

**配置文件示例**：

```typescript
// tailwind.config.ts (v3)
export default {
  content: [
    './routes/**/*.{tsx,ts,jsx,js}',
    './components/**/*.{tsx,ts,jsx,js}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

```typescript
// tailwind.config.ts (v4)
export default {
  content: [
    './routes/**/*.{tsx,ts,jsx,js}',
    './components/**/*.{tsx,ts,jsx,js}',
  ],
};
```

#### 19.8.4 CSS 文件处理

**开发环境**：
- 实时监听 CSS 文件变化（`public/**/*.css` 或配置的 CSS 目录）
- 使用 PostCSS 处理 CSS 文件
- 自动注入编译后的 CSS 到 HTML 中
- 支持 HMR（CSS 热更新）

**生产环境**：
- 构建时编译所有 CSS 文件
- 自动优化和压缩 CSS
- 生成独立的 CSS 文件到构建输出目录
- 自动添加内容哈希（用于缓存）

**CSS 文件位置**：
- 默认：`public/**/*.css`
- 可配置：在插件配置中指定 CSS 文件路径

#### 19.8.5 PostCSS 处理流程

**Tailwind CSS v3 处理流程**：
1. 读取 CSS 文件内容
2. 查找 `tailwind.config.ts` 配置文件
3. 使用 `tailwindcss` 处理 CSS
4. 使用 `autoprefixer` 添加浏览器前缀
5. 生产环境使用 `cssnano` 压缩 CSS
6. 输出处理后的 CSS

**Tailwind CSS v4 处理流程**：
1. 读取 CSS 文件内容
2. 查找 `tailwind.config.ts` 配置文件（可选，v4 可能不需要）
3. 使用 `@tailwindcss/postcss` 处理 CSS（内置优化）
4. 输出处理后的 CSS

#### 19.8.6 插件实现要求

**插件接口**：
```typescript
// src/plugins/tailwind.ts
export interface TailwindPluginOptions {
  // 版本选择
  version?: 'v3' | 'v4';
  
  // CSS 文件路径（支持 glob 模式）
  cssFiles?: string | string[];
  
  // 排除的文件（支持 glob 模式）
  exclude?: string | string[];
  
  // v3 特定选项
  autoprefixer?: AutoprefixerOptions;
  
  // v4 特定选项
  optimize?: boolean;
}

export function tailwind(
  builder: Builder,  // 构建器实例（开发/生产）
  options?: TailwindPluginOptions
): void;
```

**插件生命周期**：
- `onBuild`: 构建时处理 CSS 文件
- `onRequest`: 开发环境实时处理 CSS 请求
- 集成到构建流程中，自动处理 CSS 文件

#### 19.8.7 样式注入

**开发环境**：
- 自动在 HTML 中注入编译后的 CSS
- 支持 `<link rel="stylesheet" href="/style.css">` 方式
- 支持内联样式（可选）

**生产环境**：
- 生成独立的 CSS 文件
- 自动添加内容哈希：`style.[hash].css`
- 在 HTML 中自动更新 CSS 引用路径

#### 19.8.8 多应用模式支持

在多应用模式下，每个应用可以独立配置 Tailwind CSS：

```typescript
// dweb.config.ts
export default {
  // 共享配置
  plugins: [
    {
      name: 'tailwind',
      config: {
        version: 'v4',
      }
    }
  ],
  
  apps: [
    {
      name: 'frontend',
      plugins: [
        // 前台使用 v4
        {
          name: 'tailwind',
          config: {
            version: 'v4',
            cssFiles: 'frontend/public/**/*.css',
          }
        }
      ]
    },
    {
      name: 'backend',
      plugins: [
        // 后台使用 v3
        {
          name: 'tailwind',
          config: {
            version: 'v3',
            cssFiles: 'backend/public/**/*.css',
          }
        }
      ]
    }
  ]
};
```

#### 19.8.9 依赖包要求

**Tailwind CSS v3 依赖**：
- `tailwindcss` - Tailwind CSS v3 核心包
- `autoprefixer` - 自动添加浏览器前缀
- `postcss` - PostCSS 处理器
- `cssnano` - CSS 压缩（仅生产环境）

**Tailwind CSS v4 依赖**：
- `@tailwindcss/postcss` - Tailwind CSS v4 PostCSS 插件
- `postcss` - PostCSS 处理器

#### 19.8.10 使用示例

**1. 创建 CSS 文件**：
```css
/* public/style.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**2. 配置插件**：
```typescript
// dweb.config.ts
export default {
  plugins: [
    {
      name: 'tailwind',
      config: {
        version: 'v4',  // 或 'v3'
      }
    }
  ]
};
```

**3. 在 HTML 中引用**：
```tsx
// routes/_layout.tsx
export default function Layout({ children }) {
  return (
    <html>
      <head>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
```

#### 19.8.11 样式处理（保留原有内容）

- CSS 模块支持
- 全局样式支持
- PostCSS 插件支持
- 样式优化和压缩

### 19.9 类型定义

#### 19.9.1 框架提供的类型
```typescript
// 从框架导入类型
import type { 
  Request, 
  Response, 
  Middleware, 
  Plugin,
  RouteConfig,
  AppConfig 
} from 'dweb';
```

#### 19.9.2 类型推断
- 路由参数类型推断
- 查询参数类型推断
- 请求体类型推断
- 响应类型推断

### 19.10 错误边界

#### 19.10.1 Preact 错误边界
- 组件错误捕获
- 错误页面显示
- 错误日志记录
- 错误恢复机制

#### 19.10.2 错误边界示例
```typescript
// routes/_error-boundary.tsx
export default class ErrorBoundary extends Component {
  componentDidCatch(error, errorInfo) {
    // 错误处理逻辑
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorPage error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### 19.11 路由守卫和权限控制

#### 19.11.1 路由守卫
- 路由访问控制
- 权限验证
- 重定向处理
- 认证状态检查

#### 19.11.2 路由守卫示例
```typescript
// routes/admin/_middleware.ts
export default async function adminGuard(req, res, next) {
  const session = await req.getSession();
  if (!session || !session.isAdmin) {
    return res.redirect('/login');
  }
  await next();
}
```

### 19.12 多应用路由冲突处理

#### 19.12.1 路由冲突规则
- 不同应用的 `basePath` 不能重叠
- 同一应用内路由路径不能冲突
- 动态路由优先级规则
- 路由匹配顺序说明

### 19.13 静态资源路径

#### 19.13.1 静态资源访问
- `public/` 目录下的文件可通过 `/` 直接访问
- 构建后的资源路径处理
- 资源版本控制（Hash）
- CDN 支持

#### 19.13.2 静态资源示例
```
public/
  ├── images/
  │   └── logo.png  → /images/logo.png
  ├── css/
  │   └── style.css → /css/style.css
  └── js/
      └── app.js    → /js/app.js
```

### 19.14 中间件执行顺序

#### 19.14.1 执行顺序规则
1. 全局中间件（dweb.config.ts 中配置的）
2. 路由级中间件（_middleware.ts 文件）
3. 应用特定中间件（main.ts 中添加的）
4. 路由处理函数

### 19.15 插件加载顺序

#### 19.15.1 加载顺序规则
1. 顶层插件（顶层配置的 plugins）
2. 应用特定插件（app.plugins）
3. 代码中动态注册的插件（main.ts）

### 19.16 构建优化策略

#### 19.16.1 优化功能
- 代码分割（Code Splitting）
- Tree Shaking
- 资源压缩（JS、CSS、图片）
- 懒加载支持
- 预加载和预取
- 构建缓存

### 19.17 开发工具集成

#### 19.17.1 工具集成
- Deno LSP 支持
- 代码自动补全
- 类型检查
- 格式化工具集成
- 调试支持

### 19.18 API 路由响应格式

#### 19.18.1 响应格式规范
- JSON 响应格式统一
- 错误响应格式
- 成功响应格式
- 分页响应格式

#### 19.18.2 响应格式示例
```typescript
// 成功响应
{ success: true, data: {...} }

// 错误响应
{ success: false, error: { code: 'ERROR_CODE', message: '...' } }

// 分页响应
{ success: true, data: [...], pagination: { page, limit, total } }
```

### 19.19 健康检查端点

#### 19.19.1 健康检查
- `/health` - 基础健康检查
- `/health/ready` - 就绪检查
- `/health/live` - 存活检查
- 自定义健康检查端点

### 19.20 优雅关闭

#### 19.20.1 关闭流程
- 停止接收新请求
- 等待现有请求完成
- 清理资源
- 关闭服务器

### 19.21 监控和日志

#### 19.21.1 监控功能
- 请求监控
- 性能监控
- 错误监控
- 资源使用监控

#### 19.21.2 日志格式
- 结构化日志
- 日志级别
- 日志输出目标
- 日志轮转策略

---

**文档版本**: 1.0.1  
**最后更新**: 2024  
**维护者**: DWeb 团队

