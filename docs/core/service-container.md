# 服务容器 (ServiceContainer)

`ServiceContainer` 实现依赖注入，统一管理服务的注册和解析。

## 概述

`ServiceContainer` 提供了依赖注入功能，支持三种服务生命周期：
- **Singleton** - 单例模式，整个应用生命周期内只有一个实例
- **Transient** - 瞬态模式，每次获取都创建新实例
- **Scoped** - 作用域模式，在作用域内单例（如每个请求一个实例）

## 快速开始

### 基本使用

```typescript
import { ServiceContainer, ServiceLifetime } from "@dreamer/dweb/core/service-container";

// 创建服务容器
const container = new ServiceContainer();

// 注册单例服务
container.registerSingleton("logger", () => new Logger());

// 注册瞬态服务
container.registerTransient("requestId", () => generateId());

// 注册作用域服务
container.registerScoped("requestContext", () => new RequestContext());

// 获取服务
const logger = container.get<Logger>("logger");
const requestId = container.get<string>("requestId");
```

### 在 Application 中使用

```typescript
import { Application } from "@dreamer/dweb/core/application";

const app = new Application();
await app.initialize();

// 注册自定义服务
app.registerService("myService", () => new MyService(), ServiceLifetime.Singleton);

// 获取服务
const myService = app.getService<MyService>("myService");
```

## API 参考

### 构造函数

```typescript
constructor()
```

创建新的服务容器实例。

### 方法

#### `registerSingleton<T>(token, factory)`

注册单例服务。

```typescript
container.registerSingleton("logger", () => new Logger());
```

**参数：**
- `token`: `ServiceToken<T>` - 服务令牌（字符串、符号或类构造函数）
- `factory`: `ServiceFactory<T>` - 服务工厂函数

**特点：**
- 整个应用生命周期内只有一个实例
- 第一次获取时创建，之后复用

#### `registerTransient<T>(token, factory)`

注册瞬态服务。

```typescript
container.registerTransient("requestId", () => generateId());
```

**参数：**
- `token`: `ServiceToken<T>` - 服务令牌
- `factory`: `ServiceFactory<T>` - 服务工厂函数

**特点：**
- 每次获取都创建新实例
- 适合无状态服务

#### `registerScoped<T>(token, factory)`

注册作用域服务。

```typescript
container.registerScoped("requestContext", () => new RequestContext());
```

**参数：**
- `token`: `ServiceToken<T>` - 服务令牌
- `factory`: `ServiceFactory<T>` - 服务工厂函数

**特点：**
- 在作用域内单例
- 适合请求级别的服务
- 需要在请求结束后调用 `clearScope()` 清理

#### `get<T>(token)`

获取服务实例。

```typescript
const logger = container.get<Logger>("logger");
```

**参数：**
- `token`: `ServiceToken<T>` - 服务令牌

**返回：**
- `T` - 服务实例

**抛出错误：**
- 如果服务未注册

#### `has(token)`

检查服务是否已注册。

```typescript
if (container.has("logger")) {
  const logger = container.get<Logger>("logger");
}
```

#### `clearScope()`

清除作用域实例（用于请求结束后清理）。

```typescript
// 在请求处理完成后调用
container.clearScope();
```

## 服务令牌类型

服务令牌可以是以下类型：

```typescript
// 字符串令牌
container.registerSingleton("logger", () => new Logger());
const logger = container.get<Logger>("logger");

// 符号令牌
const LoggerToken = Symbol("logger");
container.registerSingleton(LoggerToken, () => new Logger());
const logger = container.get<Logger>(LoggerToken);

// 类构造函数令牌
class Logger {}
container.registerSingleton(Logger, () => new Logger());
const logger = container.get<Logger>(Logger);
```

## 服务工厂函数

服务工厂函数接收容器实例，可以访问其他服务：

```typescript
container.registerSingleton("database", () => new Database());

container.registerSingleton("userService", (container) => {
  const db = container.get<Database>("database");
  return new UserService(db);
});
```

## 服务生命周期

### Singleton（单例）

```typescript
container.registerSingleton("config", () => ({ port: 3000 }));

const config1 = container.get("config");
const config2 = container.get("config");
// config1 === config2 (同一个实例)
```

### Transient（瞬态）

```typescript
container.registerTransient("id", () => Math.random());

const id1 = container.get<number>("id");
const id2 = container.get<number>("id");
// id1 !== id2 (不同实例)
```

### Scoped（作用域）

```typescript
container.registerScoped("requestId", () => generateId());

// 在同一个作用域内
const id1 = container.get<string>("requestId");
const id2 = container.get<string>("requestId");
// id1 === id2 (同一个实例)

// 清理作用域
container.clearScope();

// 新的作用域
const id3 = container.get<string>("requestId");
// id3 !== id1 (不同实例)
```

## 依赖注入示例

```typescript
// 定义服务接口
interface IUserService {
  getUser(id: string): Promise<User>;
}

// 实现服务
class UserService implements IUserService {
  constructor(private db: Database) {}
  
  async getUser(id: string): Promise<User> {
    return await this.db.query("SELECT * FROM users WHERE id = ?", [id]);
  }
}

// 注册服务
container.registerSingleton("database", () => new Database());
container.registerSingleton("userService", (container) => {
  const db = container.get<Database>("database");
  return new UserService(db);
});

// 使用服务
const userService = container.get<IUserService>("userService");
const user = await userService.getUser("123");
```

## 在 Application 中注册服务

`Application` 类内部使用 `ServiceContainer` 管理所有服务：

```typescript
import { Application, ServiceLifetime } from "@dreamer/dweb/core/application";

const app = new Application();
await app.initialize();

// 注册自定义服务
app.registerService("myService", () => new MyService(), ServiceLifetime.Singleton);

// 获取服务
const myService = app.getService<MyService>("myService");
```

## 已注册的核心服务

`Application` 类会自动注册以下核心服务：

- `serviceContainer` - 服务容器自身
- `configManager` - 配置管理器
- `context` - 应用上下文
- `lifecycleManager` - 生命周期管理器
- `server` - HTTP 服务器
- `middleware` - 中间件管理器
- `plugins` - 插件管理器
- `logger` - 日志服务
- `monitor` - 性能监控服务
- `cookieManager` - Cookie 管理器（如果配置了）
- `sessionManager` - Session 管理器（如果配置了）
- `renderAdapterManager` - 渲染适配器管理器

## 相关文档

- [应用核心类 (Application)](./application.md) - Application 类的使用
- [服务接口 (IService)](./iservice.md) - 服务接口定义
