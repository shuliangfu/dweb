/**
 * 核心模块 - BaseManager (基础管理器) 文档页面
 * 展示 DWeb 框架的基础管理器功能和使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "BaseManager (基础管理器) - DWeb 框架文档",
  description:
    "DWeb 框架的基础管理器使用指南，提供统一的生命周期管理和通用功能",
};

export default function CoreBaseManagerPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 创建自定义管理器
  const createManagerCode =
    `import { BaseManager } from "@dreamer/dweb/core/base-manager";
import type { IService } from "@dreamer/dweb/core/iservice";

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
}`;

  // 使用管理器
  const useManagerCode = `const manager = new MyManager();

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
await manager.destroy();`;

  // 完整示例
  const completeExampleCode =
    `import { BaseManager } from "@dreamer/dweb/core/base-manager";
import type { IService } from "@dreamer/dweb/core/iservice";

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
await cacheManager.destroy();`;

  // 服务状态
  const serviceStateCode = `BaseManager 使用 ServiceState 枚举跟踪状态：

enum ServiceState {
  Uninitialized = 'uninitialized',
  Initialized = 'initialized',
  Running = 'running',
  Stopped = 'stopped',
  Destroyed = 'destroyed',
}`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        BaseManager (基础管理器)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
          BaseManager
        </code>{" "}
        是所有管理器的抽象基类， 提供统一的生命周期管理和通用功能。
      </p>

      {/* 概述 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          概述
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            BaseManager
          </code>{" "}
          实现了{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            IService
          </code>{" "}
          接口，提供了：
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>统一的生命周期管理</li>
          <li>状态跟踪（初始化、运行、停止、销毁）</li>
          <li>时间戳记录</li>
          <li>状态检查方法</li>
        </ul>
      </section>

      {/* 快速开始 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          创建自定义管理器
        </h3>
        <CodeBlock code={createManagerCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          使用管理器
        </h3>
        <CodeBlock code={useManagerCode} language="typescript" />
      </section>

      {/* 完整示例 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          完整示例
        </h2>
        <CodeBlock code={completeExampleCode} language="typescript" />
      </section>

      {/* 服务状态 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          服务状态
        </h2>
        <CodeBlock code={serviceStateCode} language="typescript" />
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          构造函数
        </h3>
        <CodeBlock code={`constructor(name: string)`} language="typescript" />
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <strong>参数：</strong>
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              name
            </code>:{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              string
            </code>{" "}
            - 管理器名称
          </li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方法
        </h3>

        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                initialize()
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              初始化管理器。
            </p>
            <CodeBlock
              code={`await manager.initialize();`}
              language="typescript"
            />
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">
              <strong>功能：</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 my-2 text-gray-700 dark:text-gray-300 text-sm">
              <li>检查是否已初始化</li>
              <li>
                调用{" "}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                  onInitialize()
                </code>{" "}
                方法
              </li>
              <li>
                设置状态为{" "}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                  Initialized
                </code>
              </li>
              <li>记录初始化时间戳</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                start()
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              启动管理器。
            </p>
            <CodeBlock code={`await manager.start();`} language="typescript" />
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-2">
              <strong>功能：</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 my-2 text-gray-700 dark:text-gray-300 text-sm">
              <li>
                如果未初始化，先调用{" "}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                  initialize()
                </code>
              </li>
              <li>
                调用{" "}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                  onStart()
                </code>{" "}
                方法
              </li>
              <li>
                设置状态为{" "}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                  Running
                </code>
              </li>
              <li>记录启动时间戳</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                stop()
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              停止管理器。
            </p>
            <CodeBlock code={`await manager.stop();`} language="typescript" />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                destroy()
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              销毁管理器。
            </p>
            <CodeBlock
              code={`await manager.destroy();`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                getState()
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              获取当前状态。
            </p>
            <CodeBlock
              code={`const state = manager.getState();
// 返回: 'uninitialized' | 'initialized' | 'running' | 'stopped' | 'destroyed'`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                isInitialized()
              </code>{" "}
              /{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                isRunning()
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              检查状态。
            </p>
            <CodeBlock
              code={`if (manager.isInitialized()) {
  // 已初始化
}

if (manager.isRunning()) {
  // 正在运行
}`}
              language="typescript"
            />
          </div>
        </div>
      </section>

      {/* 框架中的使用 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          框架中的使用
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          以下管理器都继承自{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            BaseManager
          </code>：
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
          它们都获得了统一的生命周期管理功能。
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
              href="/docs/core/iservice"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              IService (服务接口)
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
