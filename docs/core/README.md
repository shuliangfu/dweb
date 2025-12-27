# 核心模块

DWeb 框架的核心功能模块，包括服务器、路由、配置、中间件系统等。

## 目录结构

```
src/core/
├── application.ts         # 应用核心类（统一入口）
├── application-context.ts # 应用上下文
├── config-manager.ts      # 配置管理器
├── service-container.ts   # 服务容器（依赖注入）
├── lifecycle-manager.ts   # 生命周期管理器
├── iservice.ts           # 服务接口
├── base-manager.ts       # 基础管理器
├── server.ts             # HTTP 服务器
├── router.ts             # 文件系统路由
├── config.ts             # 配置管理（旧 API）
├── middleware.ts         # 中间件系统
├── plugin.ts             # 插件系统
├── route-handler.ts      # 路由处理器
└── api-route.ts          # API 路由处理
```

## 文档导航

### 核心组件（OOP 架构）

- [应用核心类 (Application)](./application.md) - 统一的应用入口，管理所有组件和服务
- [应用上下文 (ApplicationContext)](./application-context.md) - 应用状态和服务的统一访问接口
- [配置管理器 (ConfigManager)](./config-manager.md) - 配置的加载、验证和访问
- [服务容器 (ServiceContainer)](./service-container.md) - 依赖注入容器
- [生命周期管理器 (LifecycleManager)](./lifecycle-manager.md) - 应用生命周期管理
- [服务接口 (IService)](./iservice.md) - 所有服务必须实现的接口
- [基础管理器 (BaseManager)](./base-manager.md) - 管理器的抽象基类

### 传统组件

- [服务器 (Server)](./server.md) - HTTP 服务器实现
- [路由系统 (Router)](./router.md) - 文件系统路由
- [配置管理 (Config)](./config.md) - 配置加载和管理（旧 API）
- [中间件系统](./middleware.md) - 中间件管理
- [插件系统](./plugin.md) - 插件管理
- [路由处理器 (RouteHandler)](./route-handler.md) - 路由处理逻辑
- [API 路由](./api-route.md) - API 路由处理

## 快速开始

### 基本服务器

```typescript
import { Server } from "@dreamer/dweb/core/server";

const server = new Server();

server.setHandler(async (req, res) => {
  res.text("Hello World");
});

await server.start(3000);
```

### 使用路由

```typescript
import { Router } from "@dreamer/dweb/core/router";

const router = new Router("routes");
await router.scan();

const route = router.match("/users/123");
if (route) {
  console.log("匹配的路由:", route.path);
}
```

### 使用 Application（推荐）

```typescript
import { Application } from "@dreamer/dweb/core/application";

const app = new Application("dweb.config.ts");
await app.initialize();
await app.start();
```

### 加载配置（旧 API）

```typescript
import { loadConfig } from "@dreamer/dweb/core/config";

const { config } = await loadConfig();
console.log("服务器端口:", config.server?.port);
```

## 相关文档

- [功能模块](../features/README.md) - 功能模块文档
- [扩展系统](../extensions/README.md) - 扩展系统
- [中间件](../middleware/README.md) - 中间件系统
- [插件](../plugins/README.md) - 插件系统
- [控制台工具](../console/README.md) - 命令行工具

