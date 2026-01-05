# 功能模块

DWeb 框架提供了丰富的功能模块，用于处理各种业务需求。

## 目录结构

```
src/features/
├── build.ts          # 构建功能
├── cookie.ts         # Cookie 管理
├── create.ts         # 项目创建
├── database/         # 数据库支持
├── dev.ts            # 开发服务器
├── env.ts            # 环境变量
├── graphql/          # GraphQL 支持
├── hmr.ts            # 热模块替换
├── logger.ts         # 日志系统
├── monitoring.ts     # 性能监控
├── prod.ts           # 生产服务器
├── session.ts        # Session 管理
├── shutdown.ts       # 优雅关闭
└── websocket/        # WebSocket 支持
```

## 文档导航

### 核心功能

- [数据库 (database)](./database.md) - 数据库支持、ORM/ODM、查询构建器
- [GraphQL](./graphql/README.md) - GraphQL 服务器和查询处理
- [WebSocket](./websocket/README.md) - WebSocket 服务器和客户端
- [Session](./session.md) - Session 管理和多种存储方式
  - [Cookie](./cookie.md) - Cookie 管理和签名
  - [Cache](./cache.md) - 缓存系统与分布式支持
  - [Logger](./logger.md) - 日志系统和日志轮转
  - [项目创建](./create.md) - 使用 CLI 创建项目
- [开发服务器](./dev.md) - 开发模式服务器
- [热模块替换 (HMR)](./hmr.md) - 开发时的热更新
- [环境变量](./env.md) - 环境变量管理
- [构建](./build.md) - 生产构建
- [生产服务器](./prod.md) - 生产模式服务器
- [性能监控](./monitoring.md) - 性能监控功能
- [优雅关闭](./shutdown.md) - 服务器优雅关闭

## 相关文档

- [核心模块](../core.md) - 框架核心功能
- [扩展系统](../extensions/README.md) - 扩展系统
- [中间件](../middleware/README.md) - 中间件系统
- [插件](../plugins/README.md) - 插件系统
- [控制台工具](../console/README.md) - 命令行工具
