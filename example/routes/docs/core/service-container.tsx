/**
 * 核心模块 - ServiceContainer (服务容器) 文档页面
 * 展示 DWeb 框架的服务容器功能和使用方法
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
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

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        ServiceContainer (服务容器)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 框架提供了服务容器（Service
        Container）功能，支持依赖注入（DI）模式。
        服务容器支持三种生命周期：<strong>Singleton（单例）</strong>、<strong>
          Transient（瞬态）
        </strong>{" "}
        和 <strong>Scoped（作用域）</strong>。
      </p>

      {/* 概述 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          概述
        </h2>
        <CodeBlock code={overviewCode} language="typescript" />
      </section>

      {/* 注册服务 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          注册服务
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方式 1：使用 services/mod.ts 统一管理（推荐）
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          在{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            services/mod.ts
          </code>{" "}
          中统一管理所有服务配置， 然后在{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            main.ts
          </code>{" "}
          中一键注册：
        </p>
        <CodeBlock code={servicesModCode} language="typescript" />
        <CodeBlock code={mainTsCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方式 2：直接在插件中配置服务
        </h3>
        <CodeBlock code={directConfigCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方式 3：手动在插件中注册
        </h3>
        <CodeBlock code={manualRegisterCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方式 4：直接使用 Application 类
        </h3>
        <CodeBlock code={applicationClassCode} language="typescript" />
      </section>

      {/* 获取服务 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          获取服务
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          通过 Application 实例获取
        </h3>
        <CodeBlock code={getServiceCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          在 API 路由中获取（推荐使用 ApiContext）
        </h3>
        <CodeBlock code={apiRouteCode} language="typescript" />
      </section>

      {/* 服务生命周期 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          服务生命周期
        </h2>
        <CodeBlock code={lifecycleCode} language="typescript" />
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-600 p-4 my-4 rounded">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>说明：</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200 text-sm mt-2">
            <li>
              <strong>
                Singleton
              </strong>：整个应用生命周期内只有一个实例，适合共享状态的服务
            </li>
            <li>
              <strong>Transient</strong>：每次获取都创建新实例，适合无状态的服务
            </li>
            <li>
              <strong>Scoped</strong>：在作用域内单例，适合请求级别的服务
            </li>
          </ul>
        </div>
      </section>

      {/* 依赖注入 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          依赖注入示例
        </h2>
        <CodeBlock code={dependencyInjectionCode} language="typescript" />
      </section>

      {/* 内置服务 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          内置服务
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          框架已经注册了一些内置服务，可以直接使用：
        </p>
        <CodeBlock code={builtinServicesCode} language="typescript" />
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  方法
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  说明
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  示例
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    registerSingleton&lt;T&gt;(token, factory)
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  注册单例服务，整个应用生命周期内只有一个实例
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {'container.registerSingleton("logger", () => new Logger())'}
                  </code>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    registerTransient&lt;T&gt;(token, factory)
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  注册瞬态服务，每次获取都创建新实例
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {'container.registerTransient("requestId", () => generateId())'}
                  </code>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    registerScoped&lt;T&gt;(token, factory)
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  注册作用域服务，在作用域内单例
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {'container.registerScoped("requestContext", () => new RequestContext())'}
                  </code>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    get&lt;T&gt;(token)
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  获取服务实例
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    const logger = container.get&lt;Logger&gt;("logger")
                  </code>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    has(token)
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  检查服务是否已注册
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    if (container.has("logger")) {"{ ... }"}
                  </code>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    clearScope()
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  清除作用域实例（用于请求结束后清理）
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    container.clearScope()
                  </code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 注意事项 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          注意事项
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <strong>
              服务注册时机
            </strong>：服务应该在应用初始化之前注册，推荐在插件的{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              onInit
            </code>{" "}
            钩子中注册。
          </li>
          <li>
            <strong>
              类型安全
            </strong>：使用泛型可以确保类型安全：<code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              const userService =
              app.getService&lt;UserService&gt;('userService')
            </code>
          </li>
          <li>
            <strong>服务依赖</strong>：服务可以依赖其他服务，通过服务容器解析。
          </li>
          <li>
            <strong>
              错误处理
            </strong>：如果服务未注册，<code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              getService
            </code>{" "}
            会抛出错误。可以使用{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              has
            </code>{" "}
            方法检查。
          </li>
        </ul>
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/core/application"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Application (应用核心)
            </a>
          </li>
          <li>
            <a
              href="/docs/core/iservice"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              IService (服务接口)
            </a>
          </li>
          <li>
            <a
              href="/docs/core/api"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              API 路由
            </a>{" "}
            - 在 API 路由中使用服务容器
          </li>
        </ul>
      </section>
    </article>
  );
}
