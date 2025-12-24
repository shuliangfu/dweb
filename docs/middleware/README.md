# 中间件

DWeb 框架提供了丰富的内置中间件，用于处理常见的 HTTP 请求和响应任务。

## 目录结构

```
src/middleware/
├── auth.ts              # JWT 认证
├── body-parser.ts       # 请求体解析
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
import { Server } from "@dreamer/dweb/core/server";
import { bodyParser, cors, logger } from "@dreamer/dweb/middleware";

const server = new Server();

// 添加中间件
server.use(logger());
server.use(cors());
server.use(bodyParser());

server.setHandler(async (req, res) => {
  res.json({ message: "Hello" });
});

await server.start(3000);
```

## 文档导航

### 内置中间件

- [logger - 请求日志](./logger.md)
- [cors - 跨域支持](./cors.md)
- [bodyParser - 请求体解析](./body-parser.md)
- [security - 安全头](./security.md)
- [rateLimit - 速率限制](./rate-limit.md)
- [auth - JWT 认证](./auth.md)
- [static - 静态文件](./static.md)
- [errorHandler - 错误处理](./error-handler.md)
- [health - 健康检查](./health.md)
- [requestId - 请求 ID](./request-id.md)
- [requestValidator - 请求验证](./request-validator.md)
- [ipFilter - IP 过滤](./ip-filter.md)

### 其他

- [路由级中间件](./route-middleware.md) - 使用 _middleware.ts 文件
- [创建自定义中间件](./custom.md) - 编写自己的中间件

## 相关文档

- [核心模块](../core.md) - 框架核心功能
- [扩展系统](../extensions/README.md) - 扩展系统
- [插件](../plugins/README.md) - 插件系统
