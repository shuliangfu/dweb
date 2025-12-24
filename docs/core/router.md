# 路由系统 (Router)

DWeb 框架的文件系统路由实现，自动扫描路由目录并匹配请求路径。

## 文件系统路由

DWeb 使用文件系统路由，路由文件位于 `routes` 目录。

```
routes/
├── index.tsx          # / (首页)
├── about.tsx          # /about
├── users/
│   ├── index.tsx      # /users
│   └── [id].tsx       # /users/:id
└── api/
    └── users.ts       # /api/users
```

## 基本使用

```typescript
import { Router } from "@dreamer/dweb/core/router";

const router = new Router("routes");

// 扫描路由
await router.scan();

// 匹配路由
const route = router.match("/users/123");
if (route) {
  console.log("路由路径:", route.path);
  console.log("文件路径:", route.filePath);
  console.log("参数:", route.params);
}
```

## 动态路由

### 单参数路由

```typescript
// routes/users/[id].tsx
export default function UserPage({ params }: { params: { id: string } }) {
  return <div>User ID: {params.id}</div>;
}
```

### 捕获所有路由

```typescript
// routes/docs/[...slug].tsx
export default function DocsPage({ params }: { params: { slug: string[] } }) {
  return <div>Docs: {params.slug.join("/")}</div>;
}
```

## 路由配置

```typescript
const router = new Router(
  "routes",                    // 路由目录
  ["**/*.test.ts"],            // 忽略模式
  "/",                         // 基础路径
  "routes/api"                 // API 目录
);
```

## 路由信息

```typescript
interface RouteInfo {
  path: string;                // URL 路径，例如 `/users/:id`
  filePath: string;            // 文件路径
  type: "page" | "api" | "layout" | "middleware" | "error";
  params?: string[];           // 动态参数名数组
  isCatchAll?: boolean;        // 是否为捕获所有路由
  clientModulePath?: string;   // 客户端模块路径（生产环境）
}
```

## API 参考

### Router 类

#### 方法

- `scan(): Promise<void>` - 扫描路由目录
- `match(path: string): RouteInfo | null` - 匹配路由
- `getRoutes(): RouteInfo[]` - 获取所有路由
- `loadFromBuildMap(serverRouteMapPath: string, clientRouteMapPath: string, outDir: string): Promise<void>` - 从构建映射文件加载路由（生产环境）

## 相关文档

- [服务器](./server.md) - HTTP 服务器
- [路由处理器](./route-handler.md) - 路由处理逻辑
- [API 路由](./api-route.md) - API 路由处理

