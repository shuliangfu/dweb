# DWeb 框架文档

欢迎使用 DWeb 框架文档！本文档提供了框架的完整使用指南和 API 参考。

## 📚 文档目录

### 核心模块

- [核心模块 (core)](./core/README.md) - 服务器、路由、配置等核心功能
  - **OOP 架构（推荐）**
    - [应用核心类 (Application)](./core/application.md) - 统一的应用入口
    - [应用上下文 (ApplicationContext)](./core/application-context.md) - 应用状态和服务访问
    - [配置管理器 (ConfigManager)](./core/config-manager.md) - 配置管理
    - [服务容器 (ServiceContainer)](./core/service-container.md) - 依赖注入
    - [生命周期管理器 (LifecycleManager)](./core/lifecycle-manager.md) - 生命周期管理
    - [服务接口 (IService)](./core/iservice.md) - 服务接口定义
    - [基础管理器 (BaseManager)](./core/base-manager.md) - 管理器基类
  - **传统组件**
    - [服务器 (Server)](./core/server.md) - HTTP 服务器实现
    - [路由系统 (Router)](./core/router.md) - 文件系统路由
    - [配置管理 (Config)](./core/config.md) - 配置加载和管理（旧 API）
    - [中间件系统](./core/middleware.md) - 中间件管理
    - [插件系统](./core/plugin.md) - 插件管理
    - [路由处理器 (RouteHandler)](./core/route-handler.md) - 路由处理逻辑
    - [API 路由](./core/api-route.md) - API 路由处理
- [布局系统 (layout)](./layout.md) - 布局继承和布局组件
- [路由约定文件 (routing-conventions)](./routing-conventions.md) -
  _app、_layout、_middleware 等约定文件说明

### 功能模块

- [功能模块 (features)](./features/README.md) - 所有功能模块的完整文档
  - [数据库 (database)](./features/database/README.md) - 数据库支持、ORM/ODM、查询构建器
  - [GraphQL](./features/graphql/README.md) - GraphQL 服务器和查询处理
  - [WebSocket](./features/websocket/README.md) - WebSocket 服务器和客户端
  - [Session](./features/session.md) - Session 管理和多种存储方式
  - [Cookie](./features/cookie.md) - Cookie 管理和签名
  - [Logger](./features/logger.md) - 日志系统和日志轮转
  - [项目创建](./features/create.md) - 使用 CLI 创建项目
  - [开发服务器](./features/dev.md) - 开发模式服务器
  - [热模块替换 (HMR)](./features/hmr.md) - 开发时的热更新
  - [环境变量](./features/env.md) - 环境变量管理
  - [构建](./features/build.md) - 生产构建
  - [生产服务器](./features/prod.md) - 生产模式服务器
  - [性能监控](./features/monitoring.md) - 性能监控功能
  - [优雅关闭](./features/shutdown.md) - 服务器优雅关闭
- [国际化 (i18n)](./i18n-model-usage.md) - 多语言支持和翻译管理

### 扩展模块

- [扩展系统 (extensions)](./extensions/README.md) - 扩展方法、辅助函数和自定义扩展
- [中间件 (middleware)](./middleware/README.md) - 内置中间件和使用指南
- [插件 (plugins)](./plugins/README.md) - 插件系统和使用指南
- [控制台工具 (console)](./console/README.md) - 命令行工具、输入输出、命令封装
- [渲染适配器系统 (render)](./render/README.md) - 多渲染引擎支持（Preact、React、Vue3）
  - [渲染适配器接口](./render/adapter.md) - RenderAdapter 接口说明
  - [Preact 适配器](./render/preact.md) - Preact 渲染适配器
  - [React 适配器](./render/react.md) - React 渲染适配器
  - [Vue 3 适配器](./render/vue3.md) - Vue 3 渲染适配器
  - [适配器管理器](./render/manager.md) - RenderAdapterManager 使用指南

### 配置与部署

- [配置 (configuration)](./configuration.md) - dweb.config.ts 详细配置说明
- [Docker 部署](./docker.md) - Docker 部署指南
- [开发指南](./development.md) - 开发流程、构建、部署

## 🚀 快速开始

### 安装

```bash
# 创建新项目
deno run -A jsr:@dreamer/dweb/init

# 进入项目目录
cd my-app

# 启动开发服务器
deno task dev
```

### 基本使用（推荐使用 Application）

```typescript
// main.ts
import { Application } from "@dreamer/dweb/core/application";

const app = new Application("dweb.config.ts");
await app.initialize();
await app.start();
```

### 传统方式（仍然支持）

```typescript
// main.ts
import { Server } from "@dreamer/dweb/core/server";

const server = new Server();

server.setHandler(async (req, res) => {
  res.text("Hello World");
});

await server.start(3000);
```

## 📖 更多资源

- [GitHub 仓库](https://github.com/shuliangfu/dweb)
- [JSR 包](https://jsr.io/@dreamer/dweb)
- [示例项目](./example)

## 🤝 贡献

欢迎贡献代码和文档！请查看 [CONTRIBUTING.md](../CONTRIBUTING.md) 了解详情。

## 📄 许可证

MIT License
