# 中间件系统

DWeb 框架的中间件管理系统，支持请求和响应的中间件处理。

## 创建中间件

```typescript
import type { Middleware } from "@dreamer/dweb";

const myMiddleware: Middleware = async (req, res, next) => {
  // 请求前处理
  console.log("Before:", req.path);

  // 调用下一个中间件
  await next();

  // 响应后处理
  console.log("After:", res.status);
};
```

## 使用中间件

```typescript
import { Server } from "@dreamer/dweb";
import { MiddlewareManager } from "@dreamer/dweb";

const server = new Server();
const middlewareManager = new MiddlewareManager();

// 添加中间件
middlewareManager.use(myMiddleware);

// 在服务器中使用
server.use(myMiddleware);
```

## 中间件类型

```typescript
type Middleware = (
  req: Request,
  res: Response,
  next: () => Promise<void>
) => Promise<void> | void;
```

## API 参考

### MiddlewareManager 类

#### 方法

##### `add(middleware: Middleware | MiddlewareConfig): void`

添加中间件到中间件链中。中间件会按照添加顺序执行。

**参数：**
- `middleware`: 中间件函数或配置对象

**示例：**
```typescript
// 添加函数形式的中间件
manager.add(async (req, res, next) => {
  console.log("请求:", req.url);
  await next();
});

// 添加配置对象形式的中间件（推荐，可以设置名称和选项）
manager.add({ 
  name: "logger", 
  handler: logger({ format: "dev" }), 
  options: { format: "dev" } 
});
```

##### `addMany(middlewares: (Middleware | MiddlewareConfig)[]): void`

批量添加中间件到中间件链中。

**参数：**
- `middlewares`: 中间件数组

**示例：**
```typescript
manager.addMany([
  logger({ format: "dev" }),
  cors({ origin: "*" }),
]);
```

##### `getAll(): Middleware[]`

获取所有中间件处理函数数组（用于执行中间件链）。

**返回：** 中间件处理函数数组的副本

**示例：**
```typescript
const middlewares = manager.getAll();
console.log(`当前有 ${middlewares.length} 个中间件`);
```

##### `getAllConfigs(): MiddlewareConfig[]`

获取所有中间件的完整配置信息（包括名称、处理函数和配置选项）。

**返回：** 中间件配置数组的副本

**示例：**
```typescript
const allConfigs = manager.getAllConfigs();
allConfigs.forEach((config) => {
  console.log(`中间件: ${config.name || "未命名"}`);
  console.log("配置选项:", config.options);
});
```

##### `get(name: string): MiddlewareConfig | undefined`

根据名称获取中间件配置信息（包括名称、处理函数和配置选项）。

**参数：**
- `name`: 中间件名称

**返回：** 中间件配置对象，如果未找到则返回 undefined

**示例：**
```typescript
// 注册带名称的中间件
manager.add({ name: "logger", handler: logger(), options: { format: "dev" } });

// 获取中间件（包含完整信息）
const loggerConfig = manager.get("logger");
if (loggerConfig) {
  console.log("中间件名称:", loggerConfig.name);
  console.log("中间件配置:", loggerConfig.options);
  // 使用中间件处理函数
  await loggerConfig.handler(req, res, next);
}
```

##### `getByIndex(index: number): MiddlewareConfig | undefined`

根据索引位置获取中间件配置信息（包括名称、处理函数和配置选项）。

**参数：**
- `index`: 中间件在数组中的索引位置

**返回：** 中间件配置对象，如果索引无效则返回 undefined

**示例：**
```typescript
// 获取第一个中间件（包含完整信息）
const firstMiddleware = manager.getByIndex(0);
if (firstMiddleware) {
  console.log("中间件名称:", firstMiddleware.name);
  console.log("中间件配置:", firstMiddleware.options);
}
```

##### `has(name: string): boolean`

根据名称检查中间件是否已注册。

**参数：**
- `name`: 中间件名称

**返回：** 如果中间件存在返回 true，否则返回 false

**示例：**
```typescript
if (manager.has("logger")) {
  const loggerConfig = manager.get("logger");
}
```

##### `clear(): void`

清空所有已注册的中间件。

**示例：**
```typescript
manager.clear(); // 清空所有中间件
```

## 相关文档

- [服务器](./server.md) - HTTP 服务器
- [中间件系统](../middleware/README.md) - 内置中间件和使用指南

