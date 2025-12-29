/**
 * 核心模块 - IService (服务接口) 文档页面
 * 展示 DWeb 框架的服务接口定义和使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "IService (服务接口) - DWeb 框架文档",
  description: "DWeb 框架的服务接口定义，提供统一的生命周期管理",
};

export default function CoreIServicePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 接口定义
  const interfaceCode = `export interface IService {
  readonly name: string;
  initialize?(): Promise<void> | void;
  start?(): Promise<void> | void;
  stop?(): Promise<void> | void;
  destroy?(): Promise<void> | void;
  getName(): string;
  isInitialized?(): boolean;
  isRunning?(): boolean;
}`;

  // 基本实现
  const basicImplementationCode =
    `import type { IService } from "@dreamer/dweb";

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
}`;

  // 使用 BaseManager（推荐）
  const baseManagerCode =
    `// 推荐使用 BaseManager 基类，它已经实现了 IService 接口
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
}`;

  // 完整示例
  const completeExampleCode = `import { BaseManager } from "@dreamer/dweb";
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
await dbManager.destroy();`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        IService (服务接口)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
          IService
        </code>{" "}
        接口定义了所有框架服务必须实现的接口， 提供统一的生命周期管理。
      </p>

      {/* 概述 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          概述
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            IService
          </code>{" "}
          接口确保所有服务都有一致的生命周期管理，
          包括初始化、启动、停止和销毁。
        </p>
      </section>

      {/* 接口定义 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          接口定义
        </h2>
        <CodeBlock code={interfaceCode} language="typescript" />
      </section>

      {/* 实现示例 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          实现示例
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          基本实现
        </h3>
        <CodeBlock code={basicImplementationCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          使用 BaseManager（推荐）
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          推荐使用{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            BaseManager
          </code>{" "}
          基类， 它已经实现了{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            IService
          </code>{" "}
          接口：
        </p>
        <CodeBlock code={baseManagerCode} language="typescript" />
      </section>

      {/* 完整示例 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          完整示例
        </h2>
        <CodeBlock code={completeExampleCode} language="typescript" />
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
                  属性/方法
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  说明
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    name
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    readonly string
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  服务名称，用于标识和日志记录（必需）
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    initialize()
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    Promise&lt;void&gt; | void
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  初始化服务（可选），在服务使用前调用
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    start()
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    Promise&lt;void&gt; | void
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  启动服务（可选），在应用启动时调用
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    stop()
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    Promise&lt;void&gt; | void
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  停止服务（可选），在应用停止时调用
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    destroy()
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    Promise&lt;void&gt; | void
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  销毁服务（可选），在应用关闭时调用，用于清理资源
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    getName()
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    string
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  获取服务名称（必需）
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    isInitialized()
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    boolean
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  检查服务是否已初始化（可选）
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    isRunning()
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    boolean
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  检查服务是否正在运行（可选）
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 使用 BaseManager */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          使用 BaseManager
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            BaseManager
          </code>{" "}
          提供了{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            IService
          </code>{" "}
          接口的默认实现，包括：
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            状态管理（<code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              ServiceState
            </code>）
          </li>
          <li>
            时间戳记录（<code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              initializedAt
            </code>,{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              startedAt
            </code>）
          </li>
          <li>
            生命周期方法（<code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              initialize
            </code>,{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              start
            </code>,{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              stop
            </code>,{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              destroy
            </code>）
          </li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          只需要实现以下受保护的方法：
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              onInitialize()
            </code>{" "}
            - 初始化逻辑
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              onStart()
            </code>{" "}
            - 启动逻辑
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              onStop()
            </code>{" "}
            - 停止逻辑
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              onDestroy()
            </code>{" "}
            - 清理逻辑
          </li>
        </ul>
      </section>

      {/* 框架中的实现 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          框架中的实现
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          以下管理器都实现了{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            IService
          </code>{" "}
          接口：
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              MiddlewareManager
            </code>{" "}
            - 中间件管理器
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              PluginManager
            </code>{" "}
            - 插件管理器
          </li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          它们都继承自{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            BaseManager
          </code>，获得统一的生命周期管理。
        </p>
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/core/base-manager"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              BaseManager (基础管理器)
            </a>
          </li>
          <li>
            <a
              href="/docs/core/application"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Application (应用核心)
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}
