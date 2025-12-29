# 渲染适配器系统

DWeb 框架支持多种渲染引擎，通过统一的渲染适配器接口抽象不同渲染引擎的差异。

## 概述

渲染适配器系统允许你：
- 使用 **Preact**（默认），支持流式 SSR
- 使用 **React**
- 使用 **Vue 3**
- 运行时切换渲染引擎
- 保持统一的 API

## 支持的渲染引擎

### Preact（默认）

Preact 是框架的默认渲染引擎，轻量级且性能优秀。v1.9.10+ 版本支持流式服务端渲染 (Streaming SSR)。

```typescript
// dweb.config.ts
export default defineConfig({
  renderEngine: 'preact', // 默认，可以不写
  // ... 其他配置
});
```

### React

使用 React 作为渲染引擎。

```typescript
// dweb.config.ts
export default defineConfig({
  renderEngine: 'react',
  // ... 其他配置
});
```

### Vue 3

使用 Vue 3 作为渲染引擎。

```typescript
// dweb.config.ts
export default defineConfig({
  renderEngine: 'vue3',
  // ... 其他配置
});
```

## 快速开始

### 使用默认引擎（Preact）

```typescript
import { Application } from "@dreamer/dweb";

const app = new Application();
await app.initialize();
await app.start();
// 自动使用 Preact
```

### 切换渲染引擎

```typescript
import { Application } from "@dreamer/dweb";

const app = new Application();
await app.initialize();

// 切换到 React
await app.setRenderEngine("react");

// 切换到 Vue 3
await app.setRenderEngine("vue3");

// 切换回 Preact
await app.setRenderEngine("preact");

await app.start();
```

### 在配置文件中指定

```typescript
// dweb.config.ts
import { defineConfig } from "@dreamer/dweb";

export default defineConfig({
  renderEngine: "react", // 或 "vue3" 或 "preact"
  server: {
    port: 3000,
  },
  routes: {
    dir: "routes",
  },
});
```

## 渲染适配器接口

所有渲染适配器都实现 `RenderAdapter` 接口：

```typescript
interface RenderAdapter {
  readonly name: RenderEngine;
  createElement(type, props, ...children): VNode;
  renderToString(element: VNode): string | Promise<string>;
  hydrate(element: VNode, container: Element): void;
  render(element: VNode, container: Element): void;
  getJSXRuntimePath(): string;
  getClientRuntimePath(): string;
  getServerRuntimePath(): string;
  detectHooks?(filePath: string): Promise<boolean>;
  initialize?(): Promise<void> | void;
  destroy?(): Promise<void> | void;
}
```

## 在 RouteHandler 中使用

`RouteHandler` 内部使用渲染适配器进行页面渲染：

```typescript
// 框架内部使用
const adapter = app.getRenderAdapter();
const vnode = adapter.createElement(PageComponent, pageProps);
const html = await adapter.renderToString(vnode);
```

## 渲染适配器管理器

`RenderAdapterManager` 负责管理多个渲染适配器：

```typescript
import { RenderAdapterManager } from "@dreamer/dweb";
import { PreactRenderAdapter } from "@dreamer/dweb";
import { ReactRenderAdapter } from "@dreamer/dweb";
import { Vue3RenderAdapter } from "@dreamer/dweb";

const manager = new RenderAdapterManager();

// 注册适配器
manager.register(new PreactRenderAdapter());
manager.register(new ReactRenderAdapter());
manager.register(new Vue3RenderAdapter());

// 设置当前引擎
await manager.setEngine("react");

// 获取当前适配器
const adapter = manager.getAdapter();
```

## 文档导航

- [渲染适配器接口](./adapter.md) - RenderAdapter 接口说明
- [Preact 适配器](./preact.md) - Preact 渲染适配器
- [React 适配器](./react.md) - React 渲染适配器
- [Vue 3 适配器](./vue3.md) - Vue 3 渲染适配器
- [适配器管理器](./manager.md) - RenderAdapterManager 使用指南

## 相关文档

- [应用核心类](../core/application.md) - Application 类的使用
- [路由处理器](../core/route-handler.md) - 路由处理逻辑
