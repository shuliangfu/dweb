# 核心模块

DWeb 框架的核心功能模块，包括服务器、路由、配置、中间件系统等。

## 目录结构

```
src/core/
├── server.ts         # HTTP 服务器
├── router.ts         # 文件系统路由
├── config.ts         # 配置管理
├── middleware.ts     # 中间件系统
├── plugin.ts         # 插件系统
├── route-handler.ts  # 路由处理器
└── api-route.ts      # API 路由处理
```

## 文档导航

### 核心组件

- [服务器 (Server)](./server.md) - HTTP 服务器实现
- [路由系统 (Router)](./router.md) - 文件系统路由
- [配置管理 (Config)](./config.md) - 配置加载和管理
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

### 加载配置

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

