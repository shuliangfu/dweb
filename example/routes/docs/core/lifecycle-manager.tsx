/**
 * 核心模块 - LifecycleManager (生命周期管理器) 文档页面
 * 展示 DWeb 框架的生命周期管理器功能和使用方法
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "LifecycleManager (生命周期管理器) - DWeb 框架文档",
  description:
    "DWeb 框架的生命周期管理器使用指南，管理应用的生命周期和生命周期钩子",
};

export default function CoreLifecycleManagerPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 生命周期阶段
  const lifecyclePhasesCode = `应用的生命周期包括以下阶段：

- Initializing - 初始化中
- Initialized - 已初始化
- Starting - 启动中
- Running - 运行中
- Stopping - 停止中
- Stopped - 已停止`;

  // 基本使用
  const basicUsageCode =
    `// LifecycleManager 由 Application 类内部使用，通常不需要直接创建
import { Application } from "@dreamer/dweb/core/application";

const app = new Application();
await app.initialize(); // 内部使用 LifecycleManager
await app.start();      // 内部使用 LifecycleManager
await app.stop();       // 内部使用 LifecycleManager`;

  // 注册生命周期钩子
  const registerHooksCode = `// 注册生命周期钩子
import { Application } from "@dreamer/dweb/core/application";
import type { LifecycleHooks } from "@dreamer/dweb/core/lifecycle-manager";

const app = new Application();
await app.initialize();

// 获取生命周期管理器
const lifecycleManager = app.getService("lifecycleManager") as any;

// 注册生命周期钩子
lifecycleManager.registerHooks({
  onInitialize: async () => {
    console.log("应用初始化中...");
  },
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

await app.start();`;

  // 生命周期钩子说明
  const hooksCode = `// 生命周期钩子类型定义
interface LifecycleHooks {
  onInitialize?: () => Promise<void> | void;  // 初始化钩子
  onStart?: () => Promise<void> | void;        // 启动钩子
  onStop?: () => Promise<void> | void;         // 停止钩子
  onShutdown?: () => Promise<void> | void;     // 关闭钩子
}`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        LifecycleManager (生命周期管理器)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
          LifecycleManager
        </code>{" "}
        管理应用的生命周期， 统一处理启动、运行、关闭流程，支持生命周期钩子。
      </p>

      {/* 概述 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          概述
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            LifecycleManager
          </code>{" "}
          负责管理应用的生命周期阶段，
          支持生命周期钩子，确保应用的正确启动和关闭。
        </p>
      </section>

      {/* 生命周期阶段 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          生命周期阶段
        </h2>
        <CodeBlock code={lifecyclePhasesCode} language="text" />
      </section>

      {/* 快速开始 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          基本使用
        </h3>
        <CodeBlock code={basicUsageCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          注册生命周期钩子
        </h3>
        <CodeBlock code={registerHooksCode} language="typescript" />
      </section>

      {/* 生命周期钩子 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          生命周期钩子
        </h2>
        <CodeBlock code={hooksCode} language="typescript" />
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-600 p-4 my-4 rounded">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>说明：</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200 text-sm mt-2">
            <li>
              <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                onInitialize
              </code>：在应用初始化时调用
            </li>
            <li>
              <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                onStart
              </code>：在应用启动时调用
            </li>
            <li>
              <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                onStop
              </code>：在应用停止时调用
            </li>
            <li>
              <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                onShutdown
              </code>：在应用关闭时调用
            </li>
          </ul>
        </div>
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          构造函数
        </h3>
        <CodeBlock
          code={`constructor(application: Application)`}
          language="typescript"
        />
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <strong>参数：</strong>
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              application
            </code>:{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              Application
            </code>{" "}
            - 应用实例
          </li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方法
        </h3>

        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                registerHooks(hooks)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              注册生命周期钩子。
            </p>
            <CodeBlock
              code={`lifecycleManager.registerHooks({
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
});`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                getPhase()
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              获取当前生命周期阶段。
            </p>
            <CodeBlock
              code={`const phase = lifecycleManager.getPhase();
console.log("当前阶段:", phase);`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                setPhase(phase)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              设置生命周期阶段（通常由框架内部调用）。
            </p>
            <CodeBlock
              code={`lifecycleManager.setPhase(LifecyclePhase.Running);`}
              language="typescript"
            />
          </div>
        </div>
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
              href="/docs/features/shutdown"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              优雅关闭
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}
