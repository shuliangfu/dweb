# 渲染适配器接口 (RenderAdapter)

`RenderAdapter` 接口定义了所有渲染引擎适配器必须实现的统一接口。

## 概述

`RenderAdapter` 接口抽象了不同渲染引擎（Preact、React、Vue3）的差异，提供统一的 API。

## 接口定义

```typescript
export interface RenderAdapter {
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

## 必需属性

### `name`

渲染引擎名称。

```typescript
readonly name: RenderEngine; // 'preact' | 'react' | 'vue3'
```

## 必需方法

### `createElement(type, props, ...children)`

创建虚拟节点（VNode）。

```typescript
createElement(
  type: ComponentType,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): VNode;
```

**参数：**
- `type`: `ComponentType` - 组件类型（字符串或函数）
- `props`: `Record<string, unknown> | null` - 组件属性
- `...children`: `unknown[]` - 子元素

**返回：**
- `VNode` - 虚拟节点

**对应关系：**
- Preact: `h()`
- React: `createElement()`
- Vue 3: `h()`

### `renderToString(element)`

服务端渲染，将组件树渲染为 HTML 字符串。

```typescript
renderToString(element: VNode): string | Promise<string>;
```

**参数：**
- `element`: `VNode` - 虚拟节点

**返回：**
- `string | Promise<string>` - HTML 字符串（Vue 3 返回 Promise）

**注意：**
- Preact 和 React 返回同步字符串
- Vue 3 返回异步 Promise

### `hydrate(element, container)`

客户端水合，将服务端渲染的 HTML 与客户端组件关联。

```typescript
hydrate(element: VNode, container: Element): void;
```

**参数：**
- `element`: `VNode` - 虚拟节点
- `container`: `Element` - 容器元素

### `render(element, container)`

客户端渲染，在客户端渲染组件树。

```typescript
render(element: VNode, container: Element): void;
```

**参数：**
- `element`: `VNode` - 虚拟节点
- `container`: `Element` - 容器元素

### `getJSXRuntimePath()`

获取 JSX Runtime 模块路径。

```typescript
getJSXRuntimePath(): string;
```

**返回：**
- `string` - JSX Runtime 模块路径

**示例：**
- Preact: `'preact/jsx-runtime'`
- React: `'react/jsx-runtime'`
- Vue 3: `'@vue/babel-plugin-jsx'`

### `getClientRuntimePath()`

获取客户端运行时模块路径。

```typescript
getClientRuntimePath(): string;
```

**返回：**
- `string` - 客户端运行时模块路径

**示例：**
- Preact: `'preact'`
- React: `'react-dom/client'`
- Vue 3: `'vue'`

### `getServerRuntimePath()`

获取服务端运行时模块路径。

```typescript
getServerRuntimePath(): string;
```

**返回：**
- `string` - 服务端运行时模块路径

**示例：**
- Preact: `'preact-render-to-string'`
- React: `'react-dom/server'`
- Vue 3: `'@vue/server-renderer'`

## 可选方法

### `detectHooks(filePath)`

检测组件是否使用了 Hooks。

```typescript
detectHooks?(filePath: string): Promise<boolean>;
```

**参数：**
- `filePath`: `string` - 文件路径

**返回：**
- `Promise<boolean>` - 如果使用了 Hooks 返回 true

**用途：**
- 自动检测渲染模式
- 判断是否需要客户端渲染

### `initialize()`

初始化适配器。

```typescript
initialize?(): Promise<void> | void;
```

在应用启动时调用，用于动态导入渲染引擎模块。

### `destroy()`

清理适配器。

```typescript
destroy?(): Promise<void> | void;
```

在应用关闭时调用，用于清理资源。

## 使用示例

### 获取适配器

```typescript
import { Application } from "@dreamer/dweb/core/application";

const app = new Application();
await app.initialize();

const adapter = app.getRenderAdapter();
```

### 创建虚拟节点

```typescript
const vnode = adapter.createElement(
  "div",
  { id: "app", className: "container" },
  "Hello World"
);
```

### 服务端渲染

```typescript
const html = await adapter.renderToString(vnode);
// 返回: '<div id="app" class="container">Hello World</div>'
```

### 客户端水合

```typescript
const container = document.getElementById("root");
adapter.hydrate(vnode, container!);
```

### 客户端渲染

```typescript
const container = document.getElementById("root");
adapter.render(vnode, container!);
```

## 实现自定义适配器

```typescript
import type { RenderAdapter, RenderEngine, VNode } from "@dreamer/dweb/core/render/adapter";

class MyRenderAdapter implements RenderAdapter {
  readonly name: RenderEngine = "preact";

  createElement(
    type: ComponentType,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ): VNode {
    // 实现创建虚拟节点的逻辑
  }

  renderToString(element: VNode): string {
    // 实现服务端渲染的逻辑
  }

  hydrate(element: VNode, container: Element): void {
    // 实现客户端水合的逻辑
  }

  render(element: VNode, container: Element): void {
    // 实现客户端渲染的逻辑
  }

  getJSXRuntimePath(): string {
    return "my-render/jsx-runtime";
  }

  getClientRuntimePath(): string {
    return "my-render/client";
  }

  getServerRuntimePath(): string {
    return "my-render/server";
  }
}
```

## 相关文档

- [Preact 适配器](./preact.md) - Preact 渲染适配器
- [React 适配器](./react.md) - React 渲染适配器
- [Vue 3 适配器](./vue3.md) - Vue 3 渲染适配器
- [适配器管理器](./manager.md) - RenderAdapterManager 使用指南
