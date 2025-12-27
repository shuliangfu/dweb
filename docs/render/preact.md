# Preact 渲染适配器

`PreactRenderAdapter` 是 Preact 渲染引擎的适配器实现，是框架的默认渲染引擎。

## 概述

Preact 是一个轻量级的 React 替代品，具有相似的 API 但体积更小。`PreactRenderAdapter` 封装了 Preact 的渲染功能。

## 快速开始

### 使用默认引擎

Preact 是默认渲染引擎，无需配置即可使用：

```typescript
import { Application } from "@dreamer/dweb/core/application";

const app = new Application();
await app.initialize();
await app.start();
// 自动使用 Preact
```

### 显式指定

```typescript
// dweb.config.ts
export default defineConfig({
  renderEngine: "preact",
  // ... 其他配置
});
```

### 手动创建适配器

```typescript
import { PreactRenderAdapter } from "@dreamer/dweb/core/render/preact";

const adapter = new PreactRenderAdapter();
await adapter.initialize();

const vnode = adapter.createElement("div", { id: "app" }, "Hello");
const html = adapter.renderToString(vnode);
```

## API 参考

### 构造函数

```typescript
constructor()
```

创建 Preact 渲染适配器实例。

### 方法

所有方法都实现自 `RenderAdapter` 接口，详见 [渲染适配器接口](./adapter.md)。

#### `initialize()`

初始化适配器，动态导入 Preact 模块。

```typescript
await adapter.initialize();
```

#### `createElement(type, props, ...children)`

使用 Preact 的 `h()` 函数创建虚拟节点。

```typescript
const vnode = adapter.createElement("div", { id: "app" }, "Hello");
```

#### `renderToString(element)`

使用 `preact-render-to-string` 渲染为 HTML。

```typescript
const html = adapter.renderToString(vnode);
// 返回同步字符串
```

#### `hydrate(element, container)`

使用 Preact 的 `hydrate()` 函数进行客户端水合。

```typescript
adapter.hydrate(vnode, container);
```

#### `render(element, container)`

使用 Preact 的 `render()` 函数进行客户端渲染。

```typescript
adapter.render(vnode, container);
```

#### `getJSXRuntimePath()`

返回 `'preact/jsx-runtime'`。

#### `getClientRuntimePath()`

返回 `'preact'`。

#### `getServerRuntimePath()`

返回 `'preact-render-to-string'`。

#### `detectHooks(filePath)`

检测文件是否使用了 Preact Hooks。

```typescript
const usesHooks = await adapter.detectHooks("routes/index.tsx");
```

## 特性

### 同步渲染

Preact 的 `renderToString` 是同步的，返回字符串而非 Promise。

### Hooks 支持

Preact 完全支持 Hooks，包括：
- `useState`
- `useEffect`
- `useCallback`
- `useMemo`
- `useRef`
- `useContext`
- `useReducer`
- `useLayoutEffect`

### 轻量级

Preact 体积小（约 3KB），性能优秀。

## 使用示例

### 基本组件

```typescript
// routes/index.tsx
export default function Home() {
  return <div>Hello World</div>;
}
```

### 使用 Hooks

```typescript
// routes/users.tsx
import { useState, useEffect } from "preact/hooks";

export default function Users() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch("/api/users")
      .then(res => res.json())
      .then(data => setUsers(data));
  }, []);

  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### 客户端渲染

```typescript
// 客户端代码
import { render } from "preact";
import { PageComponent } from "./routes/index.tsx";

const container = document.getElementById("root");
render(<PageComponent />, container!);
```

## 相关文档

- [渲染适配器接口](./adapter.md) - RenderAdapter 接口说明
- [渲染适配器系统](./README.md) - 渲染适配器系统概述
