# 服务接口 (IService)

`IService` 接口定义了所有框架服务必须实现的接口，提供统一的生命周期管理。

## 概述

`IService` 接口确保所有服务都有一致的生命周期管理，包括初始化、启动、停止和销毁。

## 接口定义

```typescript
export interface IService {
  readonly name: string;
  initialize?(): Promise<void> | void;
  start?(): Promise<void> | void;
  stop?(): Promise<void> | void;
  destroy?(): Promise<void> | void;
  getName(): string;
  isInitialized?(): boolean;
  isRunning?(): boolean;
}
```

## 实现示例

### 基本实现

```typescript
import type { IService } from "@dreamer/dweb";

class MyService implements IService {
  readonly name = "MyService";
  private initialized = false;
  private running = false;

  async initialize(): Promise<void> {
    console.log("初始化服务");
    this.initialized = true;
  }

  async start(): Promise<void> {
    console.log("启动服务");
    this.running = true;
  }

  async stop(): Promise<void> {
    console.log("停止服务");
    this.running = false;
  }

  async destroy(): Promise<void> {
    console.log("销毁服务");
    this.initialized = false;
  }

  getName(): string {
    return this.name;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isRunning(): boolean {
    return this.running;
  }
}
```

### 使用 BaseManager

推荐使用 `BaseManager` 基类，它已经实现了 `IService` 接口：

```typescript
import { BaseManager } from "@dreamer/dweb";
import type { IService } from "@dreamer/dweb";

class MyManager extends BaseManager implements IService {
  constructor() {
    super("MyManager");
  }

  protected async onInitialize(): Promise<void> {
    // 自定义初始化逻辑
    console.log("初始化 MyManager");
  }

  protected async onStart(): Promise<void> {
    // 自定义启动逻辑
    console.log("启动 MyManager");
  }

  protected async onStop(): Promise<void> {
    // 自定义停止逻辑
    console.log("停止 MyManager");
  }

  protected async onDestroy(): Promise<void> {
    // 自定义清理逻辑
    console.log("销毁 MyManager");
  }
}
```

## API 参考

### 必需属性

#### `name`

服务名称，用于标识和日志记录。

```typescript
readonly name: string;
```

### 可选方法

#### `initialize()`

初始化服务。

```typescript
initialize?(): Promise<void> | void;
```

在服务使用前调用，用于设置初始状态。

#### `start()`

启动服务。

```typescript
start?(): Promise<void> | void;
```

在应用启动时调用，用于启动服务。

#### `stop()`

停止服务。

```typescript
stop?(): Promise<void> | void;
```

在应用停止时调用，用于停止服务。

#### `destroy()`

销毁服务。

```typescript
destroy?(): Promise<void> | void;
```

在应用关闭时调用，用于清理资源。

### 必需方法

#### `getName()`

获取服务名称。

```typescript
getName(): string;
```

#### `isInitialized()`

检查服务是否已初始化。

```typescript
isInitialized?(): boolean;
```

#### `isRunning()`

检查服务是否正在运行。

```typescript
isRunning?(): boolean;
```

## 使用 BaseManager

`BaseManager` 提供了 `IService` 接口的默认实现，包括：

- 状态管理（`ServiceState`）
- 时间戳记录（`initializedAt`, `startedAt`）
- 生命周期方法（`initialize`, `start`, `stop`, `destroy`）

只需要实现以下受保护的方法：

- `onInitialize()` - 初始化逻辑
- `onStart()` - 启动逻辑
- `onStop()` - 停止逻辑
- `onDestroy()` - 清理逻辑

## 完整示例

```typescript
import { BaseManager } from "@dreamer/dweb";
import type { IService } from "@dreamer/dweb";

class DatabaseManager extends BaseManager implements IService {
  private connection: DatabaseConnection | null = null;

  constructor() {
    super("DatabaseManager");
  }

  protected async onInitialize(): Promise<void> {
    console.log("初始化数据库连接");
    // 初始化逻辑
  }

  protected async onStart(): Promise<void> {
    console.log("启动数据库连接");
    this.connection = await connectToDatabase();
  }

  protected async onStop(): Promise<void> {
    console.log("停止数据库连接");
    if (this.connection) {
      await this.connection.close();
    }
  }

  protected async onDestroy(): Promise<void> {
    console.log("销毁数据库管理器");
    this.connection = null;
  }

  // 业务方法
  async query(sql: string): Promise<any> {
    if (!this.isRunning()) {
      throw new Error("数据库管理器未运行");
    }
    return await this.connection!.query(sql);
  }
}

// 使用
const dbManager = new DatabaseManager();
await dbManager.initialize();
await dbManager.start();

if (dbManager.isRunning()) {
  const result = await dbManager.query("SELECT * FROM users");
}

await dbManager.stop();
await dbManager.destroy();
```

## 框架中的实现

以下管理器都实现了 `IService` 接口：

- `MiddlewareManager` - 中间件管理器
- `PluginManager` - 插件管理器

它们都继承自 `BaseManager`，获得统一的生命周期管理。

## 相关文档

- [基础管理器 (BaseManager)](./base-manager.md) - BaseManager 基类的使用
- [应用核心类 (Application)](./application.md) - Application 类的使用
