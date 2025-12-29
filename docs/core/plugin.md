# 插件系统

DWeb 框架的插件管理系统，支持插件注册和生命周期钩子。

## 创建插件

```typescript
import type { Plugin } from "@dreamer/dweb";

const myPlugin: Plugin = {
  name: "my-plugin",
  onInit: async (app) => {
    // 插件初始化
    console.log("Plugin initialized");
  },
  onRequest: async (req, res) => {
    // 请求处理前
  },
  onResponse: async (req, res) => {
    // 响应处理后
  },
  onError: async (error, req, res) => {
    // 错误处理
  },
  onBuild: async (config) => {
    // 构建时处理
  },
  onStart: async (app) => {
    // 启动时处理
  },
};
```

## 使用插件

```typescript
import { PluginManager } from "@dreamer/dweb";

const manager = new PluginManager();

// 注册插件
manager.register(myPlugin);

// 批量注册插件
manager.registerMany([plugin1, plugin2]);

// 执行生命周期钩子
await manager.executeOnInit(app);
await manager.executeOnRequest(req, res);
await manager.executeOnResponse(req, res);
await manager.executeOnError(error, req, res);
await manager.executeOnBuild(buildConfig);
await manager.executeOnStart(app);
```

## 插件配置

```typescript
// 使用配置对象注册插件
manager.register({
  name: "my-plugin",
  config: {
    enabled: true,
    options: {},
  },
});
```

## API 参考

### PluginManager 类

#### 方法

##### `register(plugin: Plugin | { name: string; config?: Record<string, unknown> }): void`

注册插件到插件管理器中。插件可以是完整的插件对象，也可以是包含名称和配置的对象。

**参数：**
- `plugin`: 插件对象或插件配置对象

**示例：**
```typescript
// 注册完整插件对象
manager.register({
  name: "my-plugin",
  onInit: async (app) => { /* ... */ },
});

// 注册配置对象
manager.register({ name: "my-plugin", config: { enabled: true } });
```

##### `registerMany(plugins: (Plugin | { name: string; config?: Record<string, unknown> })[]): void`

批量注册插件。

**参数：**
- `plugins`: 插件数组

**示例：**
```typescript
manager.registerMany([
  tailwind({ version: "v4" }),
  customPlugin({ enabled: true }),
]);
```

##### `getAll(): Plugin[]`

获取所有已注册的插件。

**返回：** 插件数组的副本

**示例：**
```typescript
const plugins = manager.getAll();
console.log(`当前有 ${plugins.length} 个插件`);
```

##### `get(name: string): Plugin | undefined`

根据名称获取插件对象。

**参数：**
- `name`: 插件名称

**返回：** 插件对象，如果未找到则返回 undefined

**示例：**
```typescript
// 注册插件
manager.register({
  name: "tailwind",
  onInit: async (app) => { /* ... */ },
});

// 获取插件
const tailwindPlugin = manager.get("tailwind");
if (tailwindPlugin) {
  console.log("插件配置:", tailwindPlugin.config);
}
```

##### `getByIndex(index: number): Plugin | undefined`

根据索引位置获取插件对象。

**参数：**
- `index`: 插件在数组中的索引位置

**返回：** 插件对象，如果索引无效则返回 undefined

**示例：**
```typescript
// 获取第一个插件
const firstPlugin = manager.getByIndex(0);

// 获取最后一个插件
const lastPlugin = manager.getByIndex(manager.getAll().length - 1);
```

##### `has(name: string): boolean`

根据名称检查插件是否已注册。

**参数：**
- `name`: 插件名称

**返回：** 如果插件存在返回 true，否则返回 false

**示例：**
```typescript
if (manager.has("tailwind")) {
  const tailwindPlugin = manager.get("tailwind");
}
```

##### `clear(): void`

清空所有已注册的插件。

**示例：**
```typescript
manager.clear(); // 清空所有插件
```

##### `executeOnInit(app: AppLike, config: AppConfig): Promise<void>`

执行所有插件的初始化钩子。

**参数：**
- `app`: 应用实例
- `config`: 应用配置

##### `executeOnRequest(req: Request, res: Response): Promise<void>`

执行所有插件的请求钩子。

**参数：**
- `req`: 请求对象
- `res`: 响应对象

##### `executeOnResponse(req: Request, res: Response): Promise<void>`

执行所有插件的响应钩子。

**参数：**
- `req`: 请求对象
- `res`: 响应对象

##### `executeOnError(error: Error, req: Request, res: Response): Promise<void>`

执行所有插件的错误钩子。

**参数：**
- `error`: 错误对象
- `req`: 请求对象
- `res`: 响应对象

##### `executeOnBuild(config: BuildConfig): Promise<void>`

执行所有插件的构建钩子。

**参数：**
- `config`: 构建配置

##### `executeOnStart(app: AppLike): Promise<void>`

执行所有插件的启动钩子。

**参数：**
- `app`: 应用实例

### Plugin 接口

```typescript
interface Plugin {
  name: string;
  config?: Record<string, unknown>;
  onInit?: (app: AppLike) => Promise<void> | void;
  onRequest?: (req: Request, res: Response) => Promise<void> | void;
  onResponse?: (req: Request, res: Response) => Promise<void> | void;
  onError?: (error: Error, req: Request, res: Response) => Promise<void> | void;
  onBuild?: (config: BuildConfig) => Promise<void> | void;
  onStart?: (app: AppLike) => Promise<void> | void;
}
```

## 相关文档

- [服务器](./server.md) - HTTP 服务器
- [插件系统](../plugins/README.md) - 内置插件和使用指南

