# 路由处理器 (RouteHandler)

DWeb 框架的路由处理器，负责处理页面路由、API 路由、模块请求等。

## 功能概述

`RouteHandler` 是框架的核心组件，负责：

- 处理页面路由（SSR/CSR/Hybrid）
- 处理 API 路由
- 处理模块请求（`/__modules/`）
- 处理 GraphQL 请求
- 资源预加载（Prefetch）
- 热模块替换（HMR）支持

## 基本使用

```typescript
import { RouteHandler } from "@dreamer/dweb/core/route-handler";
import { Router } from "@dreamer/dweb/core/router";

const router = new Router("routes");
await router.scan();

const routeHandler = new RouteHandler(router, cookieManager, sessionManager, config);

// 在服务器中使用
server.setHandler(async (req, res) => {
  await routeHandler.handle(req, res);
});
```

## 处理流程

### 页面路由处理

1. 匹配路由
2. 加载页面模块
3. 执行 `load` 函数（数据加载）
4. 渲染页面组件（SSR）或返回客户端脚本（CSR）
5. 注入 HMR 脚本（开发模式）

**重要提示**：页面组件和布局组件不能是异步函数（`async function`）。如果需要进行异步操作，请在组件内部使用 `useEffect` 钩子处理，或者使用 `load` 函数在服务端获取数据。详细说明请参考[路由约定文件文档](../routing-conventions.md)。

### API 路由处理

1. 匹配 API 路由
2. 加载 API 模块
3. 根据 HTTP 方法调用对应处理函数
4. 返回响应

### 模块请求处理

1. 解析请求路径
2. 根据环境加载源文件或构建文件
3. 编译 TypeScript/TSX 文件
4. 返回编译后的 JavaScript

## 资源预加载

```typescript
// 在 dweb.config.ts 中配置
export default defineConfig({
  prefetch: {
    enabled: true,
    routes: ["*", "!/docs/*"],
    mode: "batch",
  },
});
```

## API 参考

### RouteHandler 类

#### 构造函数

```typescript
constructor(
  router: Router,
  cookieManager?: CookieManager,
  sessionManager?: SessionManager,
  config?: AppConfig,
  graphqlServer?: GraphQLServer
)
```

#### 主要方法

- `handle(req: Request, res: Response): Promise<void>` - 处理请求
- `handlePageRoute(routeInfo: RouteInfo, req: Request, res: Response): Promise<void>` - 处理页面路由
- `handleApiRoute(routeInfo: RouteInfo, req: Request, res: Response): Promise<void>` - 处理 API 路由
- `handleModuleRequest(req: Request, res: Response): Promise<void>` - 处理模块请求

## 相关文档

- [服务器](./server.md) - HTTP 服务器
- [路由系统](./router.md) - 文件系统路由
- [API 路由](./api-route.md) - API 路由处理

