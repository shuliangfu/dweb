# 基础管理器 (BaseManager)

`BaseManager` 是所有管理器的抽象基类，提供统一的生命周期管理和通用功能。

## 概述

`BaseManager` 实现了 `IService` 接口，提供了：
- 统一的生命周期管理
- 状态跟踪（初始化、运行、停止、销毁）
- 时间戳记录
- 状态检查方法

## 快速开始

### 创建自定义管理器

```typescript
import { BaseManager } from "@dreamer/dweb";
import type { IService } from "@dreamer/dweb";

class MyManager extends BaseManager implements IService {
  constructor() {
    super("MyManager");
  }

  protected async onInitialize(): Promise<void> {
    // 初始化逻辑
    console.log("初始化 MyManager");
  }

  protected async onStart(): Promise<void> {
    // 启动逻辑
    console.log("启动 MyManager");
  }

  protected async onStop(): Promise<void> {
    // 停止逻辑
    console.log("停止 MyManager");
  }

  protected async onDestroy(): Promise<void> {
    // 清理逻辑
    console.log("销毁 MyManager");
  }
}
```

### 使用管理器

```typescript
const manager = new MyManager();

// 初始化
await manager.initialize();

// 检查状态
console.log(manager.isInitialized()); // true
console.log(manager.getState()); // 'initialized'

// 启动
await manager.start();

console.log(manager.isRunning()); // true
console.log(manager.getState()); // 'running'

// 停止
await manager.stop();

// 销毁
await manager.destroy();
```

## API 参考

### 构造函数

```typescript
constructor(name: string)
```

**参数：**
- `name`: `string` - 管理器名称

### 属性

#### `name`

管理器名称（只读）。

```typescript
readonly name: string;
```

### 方法

#### `initialize()`

初始化管理器。

```typescript
await manager.initialize();
```

**功能：**
- 检查是否已初始化
- 调用 `onInitialize()` 方法
- 设置状态为 `Initialized`
- 记录初始化时间戳

**抛出错误：**
- 如果已经初始化

#### `start()`

启动管理器。

```typescript
await manager.start();
```

**功能：**
- 如果未初始化，先调用 `initialize()`
- 调用 `onStart()` 方法
- 设置状态为 `Running`
- 记录启动时间戳

#### `stop()`

停止管理器。

```typescript
await manager.stop();
```

**功能：**
- 检查是否正在运行
- 调用 `onStop()` 方法
- 设置状态为 `Stopped`

#### `destroy()`

销毁管理器。

```typescript
await manager.destroy();
```

**功能：**
- 如果正在运行，先调用 `stop()`
- 调用 `onDestroy()` 方法
- 设置状态为 `Destroyed`
- 清除时间戳

#### `getName()`

获取管理器名称。

```typescript
const name = manager.getName();
```

#### `getState()`

获取当前状态。

```typescript
const state = manager.getState();
// 返回: 'uninitialized' | 'initialized' | 'running' | 'stopped' | 'destroyed'
```

#### `getInitializedAt()`

获取初始化时间戳。

```typescript
const timestamp = manager.getInitializedAt();
// 返回: number | null
```

#### `getStartedAt()`

获取启动时间戳。

```typescript
const timestamp = manager.getStartedAt();
// 返回: number | null
```

#### `isInitialized()`

检查是否已初始化。

```typescript
if (manager.isInitialized()) {
  // 已初始化
}
```

#### `isRunning()`

检查是否正在运行。

```typescript
if (manager.isRunning()) {
  // 正在运行
}
```

### 受保护方法（子类实现）

#### `onInitialize()`

初始化逻辑（子类实现）。

```typescript
protected async onInitialize(): Promise<void> {
  // 自定义初始化逻辑
}
```

#### `onStart()`

启动逻辑（子类实现）。

```typescript
protected async onStart(): Promise<void> {
  // 自定义启动逻辑
}
```

#### `onStop()`

停止逻辑（子类实现）。

```typescript
protected async onStop(): Promise<void> {
  // 自定义停止逻辑
}
```

#### `onDestroy()`

清理逻辑（子类实现）。

```typescript
protected async onDestroy(): Promise<void> {
  // 自定义清理逻辑
}
```

## 服务状态

`BaseManager` 使用 `ServiceState` 枚举跟踪状态：

```typescript
enum ServiceState {
  Uninitialized = 'uninitialized',
  Initialized = 'initialized',
  Running = 'running',
  Stopped = 'stopped',
  Destroyed = 'destroyed',
}
```

## 完整示例

```typescript
import { BaseManager } from "@dreamer/dweb";
import type { IService } from "@dreamer/dweb";

class CacheManager extends BaseManager implements IService {
  private cache: Map<string, any> = new Map();

  constructor() {
    super("CacheManager");
  }

  protected async onInitialize(): Promise<void> {
    console.log("初始化缓存管理器");
    // 可以在这里加载缓存配置
  }

  protected async onStart(): Promise<void> {
    console.log("启动缓存管理器");
    // 可以在这里预热缓存
    await this.warmupCache();
  }

  protected async onStop(): Promise<void> {
    console.log("停止缓存管理器");
    // 可以在这里保存缓存到磁盘
    await this.saveCache();
  }

  protected async onDestroy(): Promise<void> {
    console.log("销毁缓存管理器");
    this.cache.clear();
  }

  // 业务方法
  set(key: string, value: any): void {
    if (!this.isRunning()) {
      throw new Error("缓存管理器未运行");
    }
    this.cache.set(key, value);
  }

  get(key: string): any {
    if (!this.isRunning()) {
      throw new Error("缓存管理器未运行");
    }
    return this.cache.get(key);
  }

  private async warmupCache(): Promise<void> {
    // 预热缓存逻辑
  }

  private async saveCache(): Promise<void> {
    // 保存缓存逻辑
  }
}

// 使用
const cacheManager = new CacheManager();
await cacheManager.initialize();
await cacheManager.start();

cacheManager.set("key", "value");
const value = cacheManager.get("key");

await cacheManager.stop();
await cacheManager.destroy();
```

## 框架中的使用

以下管理器都继承自 `BaseManager`：

- `MiddlewareManager` - 中间件管理器
- `PluginManager` - 插件管理器

它们都获得了统一的生命周期管理功能。

## 相关文档

- [服务接口 (IService)](./iservice.md) - IService 接口定义
- [应用核心类 (Application)](./application.md) - Application 类的使用
