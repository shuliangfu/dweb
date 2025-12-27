# 渲染适配器管理器 (RenderAdapterManager)

`RenderAdapterManager` 负责管理多个渲染适配器，支持运行时切换渲染引擎。

## 概述

`RenderAdapterManager` 允许你：
- 注册多个渲染适配器
- 运行时切换渲染引擎
- 管理适配器的生命周期

## 快速开始

### 基本使用

`RenderAdapterManager` 由 `Application` 类内部使用，通常不需要直接创建：

```typescript
import { Application } from "@dreamer/dweb/core/application";

const app = new Application();
await app.initialize();

// 切换渲染引擎
await app.setRenderEngine("react");

// 获取当前适配器
const adapter = app.getRenderAdapter();
```

### 手动管理

```typescript
import { RenderAdapterManager } from "@dreamer/dweb/core/render/manager";
import { PreactRenderAdapter } from "@dreamer/dweb/core/render/preact";
import { ReactRenderAdapter } from "@dreamer/dweb/core/render/react";
import { Vue3RenderAdapter } from "@dreamer/dweb/core/render/vue3";

// 创建管理器
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

## API 参考

### 构造函数

```typescript
constructor()
```

创建渲染适配器管理器实例。

### 方法

#### `register(adapter)`

注册渲染适配器。

```typescript
manager.register(new PreactRenderAdapter());
```

**参数：**
- `adapter`: `RenderAdapter` - 渲染适配器实例

#### `setEngine(engine)`

设置当前使用的渲染引擎。

```typescript
await manager.setEngine("react");
```

**参数：**
- `engine`: `RenderEngine` - 渲染引擎名称（'preact' | 'react' | 'vue3'）

**功能：**
- 如果切换引擎，先清理旧的适配器
- 初始化新适配器
- 设置为当前适配器

**抛出错误：**
- 如果渲染引擎未注册

#### `getAdapter()`

获取当前渲染适配器。

```typescript
const adapter = manager.getAdapter();
```

**返回：**
- `RenderAdapter` - 当前渲染适配器

**抛出错误：**
- 如果适配器未初始化

#### `getDefaultEngine()`

获取默认引擎。

```typescript
const engine = manager.getDefaultEngine();
// 返回: 'preact'
```

#### `setDefaultEngine(engine)`

设置默认引擎。

```typescript
manager.setDefaultEngine("react");
```

#### `initializeAll()`

初始化所有已注册的适配器。

```typescript
await manager.initializeAll();
```

**用途：**
- 预加载所有适配器
- 减少运行时切换的延迟

#### `destroyAll()`

清理所有适配器。

```typescript
await manager.destroyAll();
```

**用途：**
- 应用关闭时清理资源

## 使用示例

### 注册多个适配器

```typescript
import { RenderAdapterManager } from "@dreamer/dweb/core/render/manager";
import { PreactRenderAdapter } from "@dreamer/dweb/core/render/preact";
import { ReactRenderAdapter } from "@dreamer/dweb/core/render/react";
import { Vue3RenderAdapter } from "@dreamer/dweb/core/render/vue3";

const manager = new RenderAdapterManager();

// 注册所有适配器
manager.register(new PreactRenderAdapter());
manager.register(new ReactRenderAdapter());
manager.register(new Vue3RenderAdapter());

// 预初始化所有适配器（可选）
await manager.initializeAll();
```

### 运行时切换

```typescript
// 切换到 React
await manager.setEngine("react");
const reactAdapter = manager.getAdapter();

// 切换到 Vue 3
await manager.setEngine("vue3");
const vueAdapter = manager.getAdapter();

// 切换回 Preact
await manager.setEngine("preact");
const preactAdapter = manager.getAdapter();
```

### 在 Application 中使用

`Application` 类内部使用 `RenderAdapterManager`：

```typescript
import { Application } from "@dreamer/dweb/core/application";

const app = new Application();

// 初始化（会自动注册 Preact 适配器）
await app.initialize();

// 切换渲染引擎
await app.setRenderEngine("react");

// 获取适配器
const adapter = app.getRenderAdapter();
```

## 适配器生命周期

当切换渲染引擎时：

1. 如果当前有适配器且引擎不同，调用 `destroy()` 清理旧的
2. 调用新适配器的 `initialize()` 初始化
3. 设置为当前适配器

## 完整示例

```typescript
import { RenderAdapterManager } from "@dreamer/dweb/core/render/manager";
import { PreactRenderAdapter } from "@dreamer/dweb/core/render/preact";
import { ReactRenderAdapter } from "@dreamer/dweb/core/render/react";
import { Vue3RenderAdapter } from "@dreamer/dweb/core/render/vue3";

// 创建管理器
const manager = new RenderAdapterManager();

// 注册适配器
manager.register(new PreactRenderAdapter());
manager.register(new ReactRenderAdapter());
manager.register(new Vue3RenderAdapter());

// 设置默认引擎
manager.setDefaultEngine("preact");

// 初始化所有适配器（可选，减少切换延迟）
await manager.initializeAll();

// 设置当前引擎
await manager.setEngine("react");

// 获取适配器并使用
const adapter = manager.getAdapter();
const vnode = adapter.createElement("div", { id: "app" }, "Hello");
const html = await adapter.renderToString(vnode);

// 清理所有适配器
await manager.destroyAll();
```

## 相关文档

- [渲染适配器接口](./adapter.md) - RenderAdapter 接口说明
- [渲染适配器系统](./README.md) - 渲染适配器系统概述
- [应用核心类](../core/application.md) - Application 类的使用
