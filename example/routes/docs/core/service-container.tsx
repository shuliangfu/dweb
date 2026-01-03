/**
 * 核心模块 - ServiceContainer (服务容器) 文档页面
 * 展示 DWeb 框架的服务容器功能和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "ServiceContainer (服务容器) - DWeb 框架文档",
  description: "DWeb 框架的服务容器使用指南，支持依赖注入和服务生命周期管理",
};

export default function CoreServiceContainerPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 概述
  const overviewCode = `// 服务容器支持三种生命周期：
// 1. Singleton（单例）：整个应用生命周期内只有一个实例
// 2. Transient（瞬态）：每次获取都创建新实例
// 3. Scoped（作用域）：在作用域内单例（如每个请求一个实例）`;

  // 方式 1：使用 services/mod.ts 统一管理（推荐）
  const servicesModCode = `// services/mod.ts
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
];`;

  const mainTsCode = `// main.ts
import { createApp } from '@dreamer/dweb';
import { services } from './services/mod.ts';
import { createServicePlugin } from './utils/register-services.ts';

const app = createApp();

// 一键注册所有服务
app.plugin(createServicePlugin(services));`;

  // 方式 2：直接在插件中配置服务
  const directConfigCode = `// main.ts
import { createApp, type ServiceConfig, ServiceLifetime } from '@dreamer/dweb';
import { UserService } from './services/user.ts';
import { createServicePlugin } from './utils/register-services.ts';

const app = createApp();

app.plugin(createServicePlugin([
  { name: 'userService', factory: () => new UserService() },
  // 可以继续添加更多服务...
]));`;

  // 方式 3：手动在插件中注册
  const manualRegisterCode = `// main.ts
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
});`;

  // 方式 4：直接使用 Application 类
  const applicationClassCode = `// main.ts
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

await app.start();`;

  // 获取服务 - 通过 Application 实例
  const getServiceCode = `// 通过 Application 实例获取服务
import { Application } from '@dreamer/dweb';
import type { UserService } from './services/user.ts';

// 获取服务
const userService = app.getService<UserService>('userService');
const users = userService.getAllUsers();`;

  // 获取服务 - 在 API 路由中
  const apiRouteCode = `// routes/api/users.ts
import type { ApiContext } from '@dreamer/dweb';
import type { UserService } from '../../services/user.ts';

// GET /api/users/get-users
export function getUsers({ app, res }: ApiContext) {
  // 从服务容器获取已注册的服务（支持泛型，类型安全）
  const userService = app.getService<UserService>('userService');
  const users = userService.getAllUsers();
  
  return res.json({
    success: true,
    data: users,
  });
}`;

  // 服务生命周期示例
  const lifecycleCode = `// Singleton（单例）
app.registerService(
  'logger',
  () => new Logger(),
  ServiceLifetime.Singleton
);
// 整个应用生命周期内只有一个实例

// Transient（瞬态）
app.registerService(
  'requestId',
  () => generateId(),
  ServiceLifetime.Transient
);
// 每次获取都创建新实例

// Scoped（作用域）
app.registerService(
  'requestContext',
  () => new RequestContext(),
  ServiceLifetime.Scoped
);
// 在作用域内单例（如每个请求一个实例）`;

  // 依赖注入示例
  const dependencyInjectionCode = `// 定义服务接口
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

// 注册服务（支持依赖注入）
container.registerSingleton("database", () => new Database());
container.registerSingleton("userService", (container) => {
  const db = container.get<Database>("database");
  return new UserService(db);
});

// 使用服务
const userService = container.get<IUserService>("userService");
const user = await userService.getUser("123");`;

  // 内置服务
  const builtinServicesCode = `// 框架已经注册了一些内置服务，可以直接使用：
// - logger: Logger 实例
// - monitor: Monitor 实例
// - server: Server 实例
// - router: Router 实例
// - routeHandler: RouteHandler 实例
// - middleware: MiddlewareManager 实例
// - plugins: PluginManager 实例
// - serviceContainer: ServiceContainer 实例
// - context: ApplicationContext 实例

// 使用示例
const logger = app.getService<Logger>("logger");
logger.info("应用已启动");`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "ServiceContainer (服务容器)",
    description:
      "DWeb 框架提供了服务容器（Service Container）功能，支持依赖注入（DI）模式。服务容器支持三种生命周期：**Singleton（单例）**、**Transient（瞬态）** 和 **Scoped（作用域）**。",
    sections: [
      {
        title: "概述",
        blocks: [
          {
            type: "code",
            code: overviewCode,
            language: "typescript",
          },
        ],
      },

      {
        title: "注册服务",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "方式 1：使用 services/mod.ts 统一管理（推荐）",
            blocks: [
              {
                type: "text",
                content:
                  "在 `services/mod.ts` 中统一管理所有服务配置，然后在 `main.ts` 中一键注册：",
              },
              {
                type: "code",
                code: servicesModCode,
                language: "typescript",
              },
              {
                type: "code",
                code: mainTsCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "方式 2：直接在插件中配置服务",
            blocks: [
              {
                type: "code",
                code: directConfigCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "方式 3：手动在插件中注册",
            blocks: [
              {
                type: "code",
                code: manualRegisterCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "方式 4：直接使用 Application 类",
            blocks: [
              {
                type: "code",
                code: applicationClassCode,
                language: "typescript",
              },
            ],
          },
        ],
      },

      {
        title: "获取服务",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "通过 Application 实例获取",
            blocks: [
              {
                type: "code",
                code: getServiceCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "在 API 路由中获取（推荐使用 ApiContext）",
            blocks: [
              {
                type: "code",
                code: apiRouteCode,
                language: "typescript",
              },
            ],
          },
        ],
      },

      {
        title: "服务生命周期",
        blocks: [
          {
            type: "code",
            code: lifecycleCode,
            language: "typescript",
          },
          {
            type: "alert",
            level: "info",
            content: [
              "**说明：**",
              "**Singleton**：整个应用生命周期内只有一个实例，适合共享状态的服务",
              "**Transient**：每次获取都创建新实例，适合无状态的服务",
              "**Scoped**：在作用域内单例，适合请求级别的服务",
            ],
          },
        ],
      },
      {
        title: "依赖注入示例",
        blocks: [
          {
            type: "code",
            code: dependencyInjectionCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "内置服务",
        blocks: [
          {
            type: "text",
            content: "框架已经注册了一些内置服务，可以直接使用：",
          },
          {
            type: "code",
            code: builtinServicesCode,
            language: "typescript",
          },
        ],
      },

      {
        title: "API 参考",
        blocks: [
          {
            type: "api",
            name: "registerSingleton<T>(token, factory)",
            description: "注册单例服务，整个应用生命周期内只有一个实例",
            code: 'container.registerSingleton("logger", () => new Logger())',
          },
          {
            type: "api",
            name: "registerTransient<T>(token, factory)",
            description: "注册瞬态服务，每次获取都创建新实例",
            code:
              'container.registerTransient("requestId", () => generateId())',
          },
          {
            type: "api",
            name: "registerScoped<T>(token, factory)",
            description: "注册作用域服务，在作用域内单例",
            code:
              'container.registerScoped("requestContext", () => new RequestContext())',
          },
          {
            type: "api",
            name: "get<T>(token)",
            description: "获取服务实例",
            code: 'const logger = container.get<Logger>("logger")',
          },
          {
            type: "api",
            name: "has(token)",
            description: "检查服务是否已注册",
            code: 'if (container.has("logger")) { ... }',
          },
          {
            type: "api",
            name: "clearScope()",
            description: "清除作用域实例（用于请求结束后清理）",
            code: "container.clearScope()",
          },
        ],
      },
      {
        title: "注意事项",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**服务注册时机**：服务应该在应用初始化之前注册，推荐在插件的 `onInit` 钩子中注册。",
              "**类型安全**：使用泛型可以确保类型安全：`const userService = app.getService<UserService>('userService')`",
              "**服务依赖**：服务可以依赖其他服务，通过服务容器解析。",
              "**错误处理**：如果服务未注册，`getService` 会抛出错误。可以使用 `has` 方法检查。",
            ],
          },
        ],
      },
      {
        title: "相关文档",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[Application (应用核心)](/docs/core/application)",
              "[IService (服务接口)](/docs/core/iservice)",
              "[API 路由](/docs/core/api) - 在 API 路由中使用服务容器",
            ],
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
