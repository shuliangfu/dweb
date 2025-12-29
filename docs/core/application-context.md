# 应用上下文 (ApplicationContext)

`ApplicationContext` 提供应用状态和服务的统一访问接口，实现 `AppLike` 接口，供插件系统使用。

## 概述

`ApplicationContext` 封装了对应用核心组件的访问，提供统一的接口供插件和中间件使用。

## 快速开始

```typescript
import { Application } from "@dreamer/dweb";

const app = new Application();
await app.initialize();

// 获取应用上下文
const context = app.getContext();

// 访问核心组件
const server = context.server;
const router = context.router;
const routeHandler = context.routeHandler;
const middleware = context.middleware;
const plugins = context.plugins;
```

## API 参考

### 属性

#### `server`

获取服务器实例。

```typescript
const server = context.server;
await server.start(3000);
```

#### `router`

获取路由管理器。

```typescript
const router = context.router;
const route = router.match("/users/123");
```

#### `routeHandler`

获取路由处理器。

```typescript
const routeHandler = context.routeHandler;
await routeHandler.handle(req, res);
```

#### `middleware`

获取中间件管理器。

```typescript
const middleware = context.middleware;
middleware.add(myMiddleware);
```

#### `plugins`

获取插件管理器。

```typescript
const plugins = context.plugins;
plugins.register(myPlugin);
```

### 方法

#### `getConfig()`

获取应用配置。

```typescript
const config = context.getConfig();
const port = config.server?.port;
```

#### `isProd()`

检查是否为生产环境。

```typescript
if (context.isProd()) {
  // 生产环境逻辑
}
```

#### `getApplication()`

获取应用实例（用于扩展）。

```typescript
const app = context.getApplication();
const service = app.getService("myService");
```

## 在插件中使用

`ApplicationContext` 实现了 `AppLike` 接口，可以直接传递给插件：

```typescript
import type { Plugin } from "@dreamer/dweb";

const myPlugin: Plugin = {
  name: "my-plugin",
  onInit: async (app) => {
    // app 是 ApplicationContext 实例
    const server = app.server;
    const config = app.getConfig();
    
    console.log("服务器端口:", config.server?.port);
  },
};
```

## 相关文档

- [应用核心类 (Application)](./application.md) - Application 类的使用
- [插件系统](./plugin.md) - 插件开发指南
