# 服务容器使用指南

本文档介绍如何在 DWeb 框架中使用服务容器注册和获取服务。

## 概述

DWeb 框架提供了服务容器（Service Container）功能，支持依赖注入（DI）模式。服务容器支持三种生命周期：

- **Singleton（单例）**：整个应用生命周期内只有一个实例
- **Transient（瞬态）**：每次获取都创建新实例
- **Scoped（作用域）**：在作用域内单例（如每个请求一个实例）

## 注册服务

### 方式 1：使用 services/mod.ts 统一管理（推荐）

在 `services/mod.ts` 中统一管理所有服务配置，然后在 `main.ts` 中一键注册：

**services/mod.ts:**
```typescript
import { type ServiceConfig, ServiceLifetime } from '@dreamer/dweb';
import { UserService } from './user.ts';
import { OrderService } from './order.ts';
import { ProductService } from './product.ts';
import { EmailService } from './email.ts';

// 导出所有服务类
export { UserService, OrderService, ProductService, EmailService };

// 服务配置数组
export const services: ServiceConfig[] = [
  { name: 'userService', factory: () => new UserService() },
  { name: 'orderService', factory: () => new OrderService() },
  { name: 'productService', factory: () => new ProductService() },
  // 可以指定不同的生命周期
  { name: 'emailService', factory: () => new EmailService(), lifetime: ServiceLifetime.Transient },
];
```

**main.ts:**
```typescript
import { createApp } from '@dreamer/dweb';
import { services } from './services/mod.ts';
import { createServicePlugin } from './utils/register-services.ts';

const app = createApp();

// 一键注册所有服务
app.plugin(createServicePlugin(services));
```

### 方式 2：直接在插件中配置服务

如果不想使用 `services/mod.ts`，也可以直接在 `main.ts` 中配置：

```typescript
import { createApp, type ServiceConfig, ServiceLifetime } from '@dreamer/dweb';
import { UserService } from './services/user.ts';
import { createServicePlugin } from './utils/register-services.ts';

const app = createApp();

app.plugin(createServicePlugin([
  { name: 'userService', factory: () => new UserService() },
  // 可以继续添加更多服务...
]));
```

**注意**：`ServiceConfig` 类型已从框架导出（`@dreamer/dweb`），可以直接使用，无需自己定义。

### 方式 3：手动在插件中注册

如果需要更多控制，可以手动注册：

```typescript
import { createApp, ServiceLifetime } from '@dreamer/dweb';
import { UserService } from './services/user.ts';

const app = createApp();

app.plugin({
  name: 'register-services',
  onInit: (app) => {
    const application = app.getApplication?.();
    if (application) {
      application.registerService(
        'userService',
        () => new UserService(),
        ServiceLifetime.Singleton
      );
    }
  },
});
```

### 方式 4：直接使用 Application 类

如果你直接使用 `Application` 类（而不是 `createApp()`），可以直接注册：

```typescript
import { Application, ServiceLifetime } from '@dreamer/dweb';
import { UserService } from './services/user.ts';

const app = new Application('dweb.config.ts');
await app.initialize();

// 注册服务
app.registerService(
  'userService',
  () => new UserService(),
  ServiceLifetime.Singleton
);

await app.start();
```

## 获取服务

### 方式 1：通过 Application 实例获取

```typescript
import { Application } from '@dreamer/dweb';
import type { UserService } from './services/user.ts';

// 获取服务
const userService = app.getService<UserService>('userService');
const users = userService.getAllUsers();
```

### 方式 2：获取服务容器

如果需要访问服务容器本身：

```typescript
import { Application, ServiceContainer } from '@dreamer/dweb';

// 获取服务容器
const serviceContainer = app.getService<ServiceContainer>('serviceContainer');

// 通过服务容器获取服务
const userService = serviceContainer.get<UserService>('userService');
```

### 方式 3：在 API 路由中获取

在 API 路由中，可以通过 `req.getApplication()` 获取 Application 实例：

```typescript
// routes/api/users.ts
import type { Request, Response } from '@dreamer/dweb';
import type { UserService } from '../../services/user.ts';

// GET /api/users/get-users
export async function getUsers(req: Request, res?: Response) {
  if (!res) {
    throw new Error('Response object is required');
  }
  
  // 通过 req.getApplication() 获取 Application 实例
  const application = req.getApplication?.();
  if (!application) {
    return res.json({
      success: false,
      error: 'Application 实例不可用',
    }, { status: 500 });
  }
  
  // 从服务容器获取已注册的服务（支持泛型，类型安全）
  const userService = application.getService<UserService>('userService');
  const users = userService.getAllUsers();
  
  return res.json({
    success: true,
    data: users,
  });
}
```

## 服务生命周期

### Singleton（单例）

整个应用生命周期内只有一个实例：

```typescript
app.registerService(
  'logger',
  () => new Logger(),
  ServiceLifetime.Singleton
);
```

### Transient（瞬态）

每次获取都创建新实例：

```typescript
app.registerService(
  'requestId',
  () => generateId(),
  ServiceLifetime.Transient
);
```

### Scoped（作用域）

在作用域内单例（如每个请求一个实例）：

```typescript
app.registerService(
  'requestContext',
  () => new RequestContext(),
  ServiceLifetime.Scoped
);
```

## 内置服务

框架已经注册了一些内置服务，可以直接使用：

- `logger`: Logger 实例
- `monitor`: Monitor 实例
- `server`: Server 实例
- `router`: Router 实例
- `routeHandler`: RouteHandler 实例
- `middleware`: MiddlewareManager 实例
- `plugins`: PluginManager 实例
- `serviceContainer`: ServiceContainer 实例
- `context`: ApplicationContext 实例

## 注意事项

1. **服务注册时机**：服务应该在应用初始化之前注册，推荐在插件的 `onInit` 钩子中注册。

2. **类型安全**：使用泛型可以确保类型安全：
   ```typescript
   const userService = app.getService<UserService>('userService');
   ```

3. **服务依赖**：服务可以依赖其他服务，通过服务容器解析：
   ```typescript
   app.registerService('userService', (container) => {
     const logger = container.get<Logger>('logger');
     return new UserService(logger);
   }, ServiceLifetime.Singleton);
   ```

4. **错误处理**：如果服务未注册，`getService` 会抛出错误。可以使用 `has` 方法检查：
   ```typescript
   const application = req.getApplication?.();
   if (application) {
     const serviceContainer = application.getService<ServiceContainer>('serviceContainer');
     if (serviceContainer.has('userService')) {
       const userService = application.getService<UserService>('userService');
     }
   }
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

## 示例

完整示例请参考：

- `example/services/user.ts` - 服务定义示例
- `example/services/mod.ts` - 服务统一管理示例
- `example/main.ts` - 服务注册示例
- `example/routes/api/services-example.ts` - 服务使用示例（包括 API 路由中的使用）

## 相关文档

- [应用核心类 (Application)](./application.md) - Application 类的使用
- [服务接口 (IService)](./iservice.md) - 服务接口定义
