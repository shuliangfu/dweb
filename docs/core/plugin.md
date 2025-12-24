# 插件系统

DWeb 框架的插件管理系统，支持插件注册和生命周期钩子。

## 创建插件

```typescript
import type { Plugin } from "@dreamer/dweb/core/plugin";

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
import { PluginManager } from "@dreamer/dweb/core/plugin";

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

- `register(plugin: Plugin | { name: string; config?: Record<string, unknown> }): void` - 注册插件
- `registerMany(plugins: Plugin[]): void` - 批量注册插件
- `executeOnInit(app: AppLike): Promise<void>` - 执行初始化钩子
- `executeOnRequest(req: Request, res: Response): Promise<void>` - 执行请求钩子
- `executeOnResponse(req: Request, res: Response): Promise<void>` - 执行响应钩子
- `executeOnError(error: Error, req: Request, res: Response): Promise<void>` - 执行错误钩子
- `executeOnBuild(config: BuildConfig): Promise<void>` - 执行构建钩子
- `executeOnStart(app: AppLike): Promise<void>` - 执行启动钩子

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

