# DWeb 框架文档

欢迎使用 DWeb 框架文档！本文档提供了框架的完整使用指南和 API 参考。

## ✨ 新特性 (v1.9.10)

我们对框架进行了重大重构和升级，带来了以下激动人心的新特性：

- **🏗️ 架构重构**: 更加清晰的模块划分 (`core`, `server`, `client`, `common`, `features`, `plugins`, `middleware`)，提升代码可维护性和扩展性。
- **🎨 Tailwind CSS v4 支持**: 率先支持 Tailwind CSS v4，提供更高的构建性能和更现代的 CSS 开发体验。
- **🌊 流式渲染 (Streaming SSR)**: 支持 Preact 流式服务端渲染，显著提升首屏加载速度和用户体验。
- **🛡️ 企业级安全增强**: 
  - **动态 CSP**: 自动生成 CSP 头，防御 XSS 攻击。
  - **安全头增强**: 集成 HSTS、X-Frame-Options 等全套安全头。
  - **敏感数据脱敏**: 日志系统内置脱敏过滤器。
- **🔌 架构设计升级**:
  - **事件驱动**: 核心 Application 集成事件总线，支持解耦的事件通信。
  - **统一错误处理**: 全局异常捕获与标准化的错误响应机制。
  - **分布式缓存支持**: 预留标准缓存接口，支持无缝扩展 Redis 等分布式缓存（规划中）。
  - **Edge Runtime 适配**: 面向未来的底层服务抽象，为支持 Deno Deploy 和 Cloudflare Workers 做好架构准备（规划中）。
- **⚡️ 性能与构建优化**:
  - **Tree-shaking**: 深度优化，自动移除未使用代码。
  - **依赖打包**: 支持将外部依赖打包进本地产物，减少外部 CDN 依赖。
  - **代码分割**: 智能拆分代码，按需加载。
- **📦 依赖管理优化**: 采用直接 `npm:` 导入，减少对 `import_map` 的依赖，提高模块独立性和版本控制的灵活性。
- **🛠️ 开发体验增强**: 优化的日志输出（结构化 JSON 格式），增强的安全中间件，以及更稳定的热模块替换 (HMR)。

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
- [国际化 (i18n)](./plugins/i18n.md) - 多语言支持和翻译管理

### 扩展模块

- [扩展系统 (extensions)](./common/extensions/README.md) - 扩展方法、辅助函数和自定义扩展
- [中间件 (middleware)](./middleware/README.md) - 内置中间件和使用指南
- [插件 (plugins)](./plugins/README.md) - 插件系统和使用指南
- [控制台工具 (console)](./server/console/README.md) - 命令行工具、输入输出、命令封装
- [渲染适配器系统 (render)](./core/render/README.md) - 多渲染引擎支持（Preact、React、Vue3）
  - [渲染适配器接口](./core/render/adapter.md) - RenderAdapter 接口说明
  - [Preact 适配器](./core/render/preact.md) - Preact 渲染适配器
  - [React 适配器](./core/render/react.md) - React 渲染适配器
  - [Vue 3 适配器](./core/render/vue3.md) - Vue 3 渲染适配器
  - [适配器管理器](./core/render/manager.md) - RenderAdapterManager 使用指南

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
import { Application } from "@dreamer/dweb";

const app = new Application("dweb.config.ts");
await app.initialize();
await app.start();
```

### 传统方式（仍然支持）

```typescript
// main.ts
import { Server } from "@dreamer/dweb";

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
