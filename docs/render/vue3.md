# Vue 3 渲染适配器

`Vue3RenderAdapter` 是 Vue 3 渲染引擎的适配器实现。

## 概述

Vue 3 是一个流行的渐进式框架，`Vue3RenderAdapter` 封装了 Vue 3 的渲染功能，允许在 DWeb 框架中使用 Vue 3。

## 快速开始

### 配置使用 Vue 3

```typescript
// dweb.config.ts
export default defineConfig({
  renderEngine: "vue3",
  // ... 其他配置
});
```

### 运行时切换

```typescript
import { Application } from "@dreamer/dweb/core/application";

const app = new Application();
await app.initialize();

// 切换到 Vue 3
await app.setRenderEngine("vue3");

await app.start();
```

### 手动创建适配器

```typescript
import { Vue3RenderAdapter } from "@dreamer/dweb/core/render/vue3";

const adapter = new Vue3RenderAdapter();
await adapter.initialize();

const vnode = adapter.createElement("div", { id: "app" }, "Hello");
const html = await adapter.renderToString(vnode); // 注意：返回 Promise
```

## API 参考

### 构造函数

```typescript
constructor()
```

创建 Vue 3 渲染适配器实例。

### 方法

所有方法都实现自 `RenderAdapter` 接口，详见 [渲染适配器接口](./adapter.md)。

#### `initialize()`

初始化适配器，动态导入 Vue 3 模块。

```typescript
await adapter.initialize();
```

导入的模块：
- `vue` - Vue 3 核心
- `@vue/server-renderer` - 服务端渲染

#### `createElement(type, props, ...children)`

使用 Vue 3 的 `h()` 函数创建虚拟节点。

```typescript
const vnode = adapter.createElement("div", { id: "app" }, "Hello");
```

#### `renderToString(element)`

使用 `@vue/server-renderer` 的 `renderToString()` 渲染为 HTML。

```typescript
const html = await adapter.renderToString(vnode);
// 注意：返回 Promise<string>，需要 await
```

**重要：** Vue 3 的 `renderToString` 是异步的，返回 Promise。

#### `hydrate(element, container)`

使用 Vue 3 的 `createApp()` 和 `mount()` 进行客户端水合。

```typescript
adapter.hydrate(vnode, container);
```

#### `render(element, container)`

使用 Vue 3 的 `createApp()` 和 `mount()` 进行客户端渲染。

```typescript
adapter.render(vnode, container);
```

#### `getJSXRuntimePath()`

返回 `'@vue/babel-plugin-jsx'`。

#### `getClientRuntimePath()`

返回 `'vue'`。

#### `getServerRuntimePath()`

返回 `'@vue/server-renderer'`。

#### `detectHooks(filePath)`

检测文件是否使用了 Vue 3 Composition API。

```typescript
const usesHooks = await adapter.detectHooks("routes/index.tsx");
```

检测的 API：
- `ref()`
- `reactive()`
- `computed()`
- `watch()`
- `watchEffect()`

## 特性

### 异步渲染

Vue 3 的 `renderToString` 是异步的，返回 `Promise<string>`，需要 `await`。

### Composition API 支持

Vue 3 完全支持 Composition API：
- `ref`
- `reactive`
- `computed`
- `watch`
- `watchEffect`
- `onMounted`
- `onUnmounted`
- 等等

### 响应式系统

Vue 3 使用 Proxy 实现的响应式系统，性能优秀。

## 使用示例

### 基本组件

```typescript
// routes/index.tsx
export default function Home() {
  return <div>Hello World</div>;
}
```

### 使用 Composition API

```typescript
// routes/users.tsx
import { ref, onMounted } from "vue";

export default function Users() {
  const users = ref([]);

  onMounted(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    users.value = data;
  });

  return (
    <div>
      {users.value.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### 客户端渲染

```typescript
// 客户端代码
import { createApp } from "vue";
import { PageComponent } from "./routes/index.tsx";

const container = document.getElementById("root");
const app = createApp(PageComponent);
app.mount(container!);
```

## 依赖要求

使用 Vue 3 适配器需要安装 Vue 3 相关依赖：

```json
{
  "imports": {
    "vue": "npm:vue@^3.0.0",
    "@vue/server-renderer": "npm:@vue/server-renderer@^3.0.0"
  }
}
```

## 注意事项

### 异步渲染

Vue 3 的 `renderToString` 是异步的，在 `RouteHandler` 中需要正确处理：

```typescript
const htmlResult = adapter.renderToString(vnode);
const html = htmlResult instanceof Promise ? await htmlResult : htmlResult;
```

### JSX 支持

Vue 3 的 JSX 支持需要配置 Babel 插件 `@vue/babel-plugin-jsx`。

## 相关文档

- [渲染适配器接口](./adapter.md) - RenderAdapter 接口说明
- [渲染适配器系统](./README.md) - 渲染适配器系统概述
