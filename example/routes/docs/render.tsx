/**
 * 扩展模块 - 渲染适配器系统文档页面
 * 展示 DWeb 框架的渲染适配器系统功能和使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "渲染适配器系统 - DWeb 框架文档",
  description:
    "DWeb 框架的渲染适配器系统使用指南，支持多种渲染引擎（Preact、React、Vue3）",
};

export default function RenderPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 概述
  const overviewCode = `渲染适配器系统允许你：

- 使用 Preact（默认）
- 使用 React
- 使用 Vue 3
- 运行时切换渲染引擎
- 保持统一的 API`;

  // 使用默认引擎（Preact）
  const defaultEngineCode =
    `import { Application } from "@dreamer/dweb/core/application";

const app = new Application();
await app.initialize();
await app.start();
// 自动使用 Preact`;

  // 切换渲染引擎
  const switchEngineCode =
    `import { Application } from "@dreamer/dweb/core/application";

const app = new Application();
await app.initialize();

// 切换到 React
await app.setRenderEngine("react");

// 切换到 Vue 3
await app.setRenderEngine("vue3");

// 切换回 Preact
await app.setRenderEngine("preact");

await app.start();`;

  // 在配置文件中指定
  const configCode = `// dweb.config.ts
import { defineConfig } from "@dreamer/dweb";

export default defineConfig({
  render: {
    engine: "react", // 或 "vue3" 或 "preact"
  },
  server: {
    port: 3000,
  },
  routes: {
    dir: "routes",
  },
});`;

  // 渲染适配器接口
  const adapterInterfaceCode = `interface RenderAdapter {
  readonly name: RenderEngine;
  createElement(type, props, ...children): VNode;
  renderToString(element: VNode): string | Promise<string>;
  hydrate(element: VNode, container: Element): void;
  render(element: VNode, container: Element): void;
  getJSXRuntimePath(): string;
  getClientRuntimePath(): string;
  getServerRuntimePath(): string;
  detectHooks?(filePath: string): Promise<boolean>;
  initialize?(): Promise<void> | void;
  destroy?(): Promise<void> | void;
}`;

  // 渲染适配器管理器
  const managerCode =
    `import { RenderAdapterManager } from "@dreamer/dweb/core/render/manager";
import { PreactRenderAdapter } from "@dreamer/dweb/core/render/preact";
import { ReactRenderAdapter } from "@dreamer/dweb/core/render/react";
import { Vue3RenderAdapter } from "@dreamer/dweb/core/render/vue3";

const manager = new RenderAdapterManager();

// 注册适配器
manager.register(new PreactRenderAdapter());
manager.register(new ReactRenderAdapter());
manager.register(new Vue3RenderAdapter());

// 设置当前引擎
await manager.setEngine("react");

// 获取当前适配器
const adapter = manager.getAdapter();`;

  // 支持的渲染引擎
  const enginesCode = `### Preact（默认）

Preact 是框架的默认渲染引擎，轻量级且性能优秀。

### React

使用 React 作为渲染引擎。

### Vue 3

使用 Vue 3 作为渲染引擎。`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        渲染适配器系统
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb
        框架支持多种渲染引擎，通过统一的渲染适配器接口抽象不同渲染引擎的差异。
      </p>

      {/* 概述 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          概述
        </h2>
        <CodeBlock code={overviewCode} language="text" />
      </section>

      {/* 支持的渲染引擎 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          支持的渲染引擎
        </h2>
        <CodeBlock code={enginesCode} language="text" />
      </section>

      {/* 快速开始 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          使用默认引擎（Preact）
        </h3>
        <CodeBlock code={defaultEngineCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          切换渲染引擎
        </h3>
        <CodeBlock code={switchEngineCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          在配置文件中指定
        </h3>
        <CodeBlock code={configCode} language="typescript" />
      </section>

      {/* 渲染适配器接口 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          渲染适配器接口
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          所有渲染适配器都实现{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            RenderAdapter
          </code>{" "}
          接口：
        </p>
        <CodeBlock code={adapterInterfaceCode} language="typescript" />
      </section>

      {/* 渲染适配器管理器 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          渲染适配器管理器
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            RenderAdapterManager
          </code>{" "}
          负责管理多个渲染适配器：
        </p>
        <CodeBlock code={managerCode} language="typescript" />
      </section>

      {/* 在 RouteHandler 中使用 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          在 RouteHandler 中使用
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            RouteHandler
          </code>{" "}
          内部使用渲染适配器进行页面渲染：
        </p>
        <CodeBlock
          code={`// 框架内部使用
const adapter = app.getRenderAdapter();
const vnode = adapter.createElement(PageComponent, pageProps);
const html = await adapter.renderToString(vnode);`}
          language="typescript"
        />
      </section>

      {/* 文档导航 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          文档导航
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/render/adapter"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              渲染适配器接口
            </a>{" "}
            - RenderAdapter 接口说明
          </li>
          <li>
            <a
              href="/docs/render/preact"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Preact 适配器
            </a>{" "}
            - Preact 渲染适配器
          </li>
          <li>
            <a
              href="/docs/render/react"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              React 适配器
            </a>{" "}
            - React 渲染适配器
          </li>
          <li>
            <a
              href="/docs/render/vue3"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Vue 3 适配器
            </a>{" "}
            - Vue 3 渲染适配器
          </li>
          <li>
            <a
              href="/docs/render/manager"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              适配器管理器
            </a>{" "}
            - RenderAdapterManager 使用指南
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
              应用核心类
            </a>{" "}
            - Application 类的使用
          </li>
          <li>
            <a
              href="/docs/core/route-handler"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              路由处理器
            </a>{" "}
            - 路由处理逻辑
          </li>
        </ul>
      </section>
    </article>
  );
}
