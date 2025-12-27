# 应用核心类 (Application)

`Application` 类是 DWeb 框架的统一入口，管理所有组件和服务，提供面向对象的应用管理方式。

## 概述

`Application` 类整合了框架的所有核心功能：
- 配置管理
- 服务容器（依赖注入）
- 生命周期管理
- 路由系统
- 中间件和插件
- 渲染适配器

## 快速开始

### 基本使用

```typescript
import { Application } from "@dreamer/dweb/core/application";

// 创建应用实例
const app = new Application("dweb.config.ts");

// 初始化应用（加载配置、注册服务、初始化路由等）
await app.initialize();

// 注册中间件
app.use(async (req, res, next) => {
  console.log("请求:", req.url);
  await next();
});

// 注册插件
app.plugin({
  name: "my-plugin",
  onInit: async (app) => {
    console.log("插件初始化");
  },
});

// 启动应用
await app.start();
```

### 使用配置文件

```typescript
import { Application } from "@dreamer/dweb/core/application";

// 自动查找 dweb.config.ts
const app = new Application();

// 或指定配置文件路径
const app = new Application("./config/dweb.config.ts");

// 多应用模式
const app = new Application("./dweb.config.ts", "backend");

await app.initialize();
await app.start();
```

### 程序化配置

```typescript
import { Application } from "@dreamer/dweb/core/application";
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  server: { port: 3000 },
  routes: { dir: "routes" },
  isProduction: false,
};

const app = new Application();
const configManager = app.getService("configManager") as any;
configManager.setConfig(config);

await app.initialize();
await app.start();
```

## API 参考

### 构造函数

```typescript
constructor(configPath?: string, appName?: string)
```

**参数：**
- `configPath` (可选): 配置文件路径，如果不提供则自动查找 `dweb.config.ts`
- `appName` (可选): 应用名称，用于多应用模式

### 方法

#### `initialize()`

初始化应用，加载配置、注册服务、初始化路由和服务器。

```typescript
await app.initialize();
```

**执行顺序：**
1. 加载配置
2. 注册服务（Logger、Monitor、CookieManager、SessionManager 等）
3. 初始化数据库（如果配置了）
4. 初始化 GraphQL 服务器（如果配置了）
5. 初始化渲染适配器
6. 初始化路由
7. 初始化路由处理器
8. 初始化中间件和插件
9. 初始化服务器
10. 初始化 WebSocket 服务器（如果配置了）
11. 执行插件初始化钩子

#### `start()`

启动应用，启动服务器并进入运行状态。

```typescript
await app.start();
```

**功能：**
- 开发环境：启动 HMR 服务器、文件监听、自动打开浏览器
- 生产环境：验证 TLS 配置、设置优雅关闭

#### `stop()`

停止应用，停止服务器并清理资源。

```typescript
await app.stop();
```

#### `use(middleware)`

注册中间件。

```typescript
app.use(async (req, res, next) => {
  // 中间件逻辑
  await next();
});

// 或使用配置对象
app.use({
  name: "my-middleware",
  handler: async (req, res, next) => {
    await next();
  },
});
```

#### `plugin(plugin)`

注册插件。

```typescript
app.plugin({
  name: "my-plugin",
  onInit: async (app, config) => {
    // 初始化逻辑
  },
  onRequest: async (req, res) => {
    // 请求处理逻辑
  },
});
```

#### `getService<T>(token)`

从服务容器获取服务。

```typescript
// 获取 Logger
const logger = app.getService<Logger>("logger");

// 获取配置管理器
const configManager = app.getService<ConfigManager>("configManager");

// 获取服务器
const server = app.getService<Server>("server");
```

#### `registerService<T>(token, factory, lifetime?)`

向服务容器注册服务。

```typescript
import { ServiceLifetime } from "@dreamer/dweb/core/service-container";

// 注册单例服务
app.registerService("myService", () => new MyService(), ServiceLifetime.Singleton);

// 注册瞬态服务（每次获取都创建新实例）
app.registerService("requestId", () => generateId(), ServiceLifetime.Transient);

// 注册作用域服务（每个请求一个实例）
app.registerService("requestContext", () => new RequestContext(), ServiceLifetime.Scoped);
```

#### `getContext()`

获取应用上下文。

```typescript
const context = app.getContext();
const server = context.server;
const router = context.router;
```

#### `getRenderAdapter()`

获取当前渲染适配器。

```typescript
const adapter = app.getRenderAdapter();
const vnode = adapter.createElement("div", { id: "app" }, "Hello");
```

#### `setRenderEngine(engine)`

切换渲染引擎。

```typescript
// 切换到 React
await app.setRenderEngine("react");

// 切换到 Vue 3
await app.setRenderEngine("vue3");

// 切换回 Preact（默认）
await app.setRenderEngine("preact");
```

## 服务容器

`Application` 内部使用 `ServiceContainer` 管理所有服务。已注册的核心服务包括：

- `serviceContainer` - 服务容器自身
- `configManager` - 配置管理器
- `context` - 应用上下文
- `lifecycleManager` - 生命周期管理器
- `server` - HTTP 服务器
- `middleware` - 中间件管理器
- `plugins` - 插件管理器
- `logger` - 日志服务
- `monitor` - 性能监控服务
- `cookieManager` - Cookie 管理器（如果配置了）
- `sessionManager` - Session 管理器（如果配置了）
- `renderAdapterManager` - 渲染适配器管理器

## 生命周期

应用的生命周期由 `LifecycleManager` 管理，包括以下阶段：

- `Initializing` - 初始化中
- `Initialized` - 已初始化
- `Starting` - 启动中
- `Running` - 运行中
- `Stopping` - 停止中
- `Stopped` - 已停止

## 完整示例

```typescript
import { Application } from "@dreamer/dweb/core/application";
import { logger, cors } from "@dreamer/dweb/middleware";
import { tailwind } from "@dreamer/dweb/plugins/tailwind";

// 创建应用
const app = new Application("dweb.config.ts");

// 初始化
await app.initialize();

// 注册中间件
app.use(logger());
app.use(cors({ origin: "*" }));

// 注册插件
app.plugin(tailwind({ version: "v4" }));

// 注册自定义服务
app.registerService("myService", () => {
  return {
    doSomething: () => console.log("Hello"),
  };
});

// 启动应用
await app.start();

// 获取服务
const myService = app.getService("myService");
myService.doSomething();
```

## 与旧 API 的兼容性

为了保持向后兼容，框架仍然支持旧的函数式 API：

```typescript
// 旧方式（仍然支持）
import { startDevServer } from "@dreamer/dweb";
await startDevServer(config);

// 新方式（推荐）
import { Application } from "@dreamer/dweb";
const app = new Application();
await app.initialize();
await app.start();
```

## 相关文档

- [应用上下文 (ApplicationContext)](./application-context.md) - 应用上下文的使用
- [配置管理器 (ConfigManager)](./config-manager.md) - 配置管理
- [服务容器 (ServiceContainer)](./service-container.md) - 依赖注入
- [生命周期管理器 (LifecycleManager)](./lifecycle-manager.md) - 生命周期管理
- [渲染适配器](../render/README.md) - 多渲染引擎支持
