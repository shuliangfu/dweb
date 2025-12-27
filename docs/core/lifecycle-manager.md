# 生命周期管理器 (LifecycleManager)

`LifecycleManager` 管理应用的生命周期，统一处理启动、运行、关闭流程。

## 概述

`LifecycleManager` 负责管理应用的生命周期阶段，支持生命周期钩子，确保应用的正确启动和关闭。

## 生命周期阶段

应用的生命周期包括以下阶段：

- `Initializing` - 初始化中
- `Initialized` - 已初始化
- `Starting` - 启动中
- `Running` - 运行中
- `Stopping` - 停止中
- `Stopped` - 已停止

## 快速开始

### 基本使用

`LifecycleManager` 由 `Application` 类内部使用，通常不需要直接创建：

```typescript
import { Application } from "@dreamer/dweb/core/application";

const app = new Application();
await app.initialize(); // 内部使用 LifecycleManager
await app.start();      // 内部使用 LifecycleManager
await app.stop();       // 内部使用 LifecycleManager
```

### 注册生命周期钩子

```typescript
import { Application } from "@dreamer/dweb/core/application";
import type { LifecycleHooks } from "@dreamer/dweb/core/lifecycle-manager";

const app = new Application();
await app.initialize();

// 获取生命周期管理器
const lifecycleManager = app.getService("lifecycleManager") as any;

// 注册生命周期钩子
lifecycleManager.registerHooks({
  onStart: async () => {
    console.log("应用启动中...");
  },
  onStop: async () => {
    console.log("应用停止中...");
  },
  onShutdown: async () => {
    console.log("应用已关闭");
  },
});

await app.start();
```

## API 参考

### 构造函数

```typescript
constructor(application: Application)
```

**参数：**
- `application`: `Application` - 应用实例

### 方法

#### `registerHooks(hooks)`

注册生命周期钩子。

```typescript
lifecycleManager.registerHooks({
  onInitialize: async () => {
    // 初始化钩子
  },
  onStart: async () => {
    // 启动钩子
  },
  onStop: async () => {
    // 停止钩子
  },
  onShutdown: async () => {
    // 关闭钩子
  },
});
```

**参数：**
- `hooks`: `LifecycleHooks` - 生命周期钩子对象

#### `start()`

启动应用。

```typescript
await lifecycleManager.start();
```

**执行流程：**
1. 检查应用是否已初始化
2. 设置阶段为 `Starting`
3. 执行 `onStart` 钩子
4. 启动服务器
5. 设置阶段为 `Running`

**抛出错误：**
- 如果应用未初始化

#### `stop()`

停止应用。

```typescript
await lifecycleManager.stop();
```

**执行流程：**
1. 检查应用是否正在运行
2. 设置阶段为 `Stopping`
3. 执行 `onStop` 钩子
4. 停止服务器
5. 清理资源
6. 设置阶段为 `Stopped`
7. 执行 `onShutdown` 钩子

#### `setPhase(phase)`

设置生命周期阶段（内部使用）。

```typescript
lifecycleManager.setPhase(LifecyclePhase.Running);
```

#### `getPhase()`

获取当前生命周期阶段。

```typescript
const phase = lifecycleManager.getPhase();
if (phase === LifecyclePhase.Running) {
  console.log("应用正在运行");
}
```

## 生命周期钩子

### `onInitialize`

在应用初始化时调用。

```typescript
lifecycleManager.registerHooks({
  onInitialize: async () => {
    console.log("应用初始化");
  },
});
```

### `onStart`

在应用启动时调用。

```typescript
lifecycleManager.registerHooks({
  onStart: async () => {
    console.log("应用启动");
    // 可以在这里执行启动前的准备工作
  },
});
```

### `onStop`

在应用停止时调用。

```typescript
lifecycleManager.registerHooks({
  onStop: async () => {
    console.log("应用停止");
    // 可以在这里执行停止前的清理工作
  },
});
```

### `onShutdown`

在应用关闭时调用。

```typescript
lifecycleManager.registerHooks({
  onShutdown: async () => {
    console.log("应用关闭");
    // 可以在这里执行最终的清理工作
  },
});
```

## 完整示例

```typescript
import { Application } from "@dreamer/dweb/core/application";
import type { LifecycleHooks } from "@dreamer/dweb/core/lifecycle-manager";

const app = new Application("dweb.config.ts");

// 获取生命周期管理器
const lifecycleManager = app.getService("lifecycleManager") as any;

// 注册生命周期钩子
const hooks: LifecycleHooks = {
  onInitialize: async () => {
    console.log("✅ 应用初始化完成");
  },
  onStart: async () => {
    console.log("🚀 应用启动");
  },
  onStop: async () => {
    console.log("⏸️  应用停止");
  },
  onShutdown: async () => {
    console.log("👋 应用关闭");
  },
};

lifecycleManager.registerHooks(hooks);

// 初始化并启动
await app.initialize();
await app.start();

// 检查状态
const phase = lifecycleManager.getPhase();
console.log("当前阶段:", phase); // Running

// 停止应用
await app.stop();
```

## 生命周期阶段转换

```
Uninitialized
    ↓
Initializing
    ↓
Initialized
    ↓
Starting
    ↓
Running
    ↓
Stopping
    ↓
Stopped
```

## 相关文档

- [应用核心类 (Application)](./application.md) - Application 类的使用
- [服务接口 (IService)](./iservice.md) - 服务接口定义
