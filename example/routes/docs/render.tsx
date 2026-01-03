/**
 * 扩展模块 - 渲染适配器系统文档页面
 * 展示 DWeb 框架的渲染适配器系统功能和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";
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
  const defaultEngineCode = `import { Application } from "@dreamer/dweb";

const app = new Application();
await app.initialize();
await app.start();
// 自动使用 Preact`;

  // 切换渲染引擎
  const switchEngineCode = `import { Application } from "@dreamer/dweb";

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
  const managerCode = `import { RenderAdapterManager } from "@dreamer/dweb";
import { PreactRenderAdapter } from "@dreamer/dweb";
import { ReactRenderAdapter } from "@dreamer/dweb";
import { Vue3RenderAdapter } from "@dreamer/dweb";

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

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "渲染适配器系统",
    description:
      "DWeb 框架支持多种渲染引擎，通过统一的渲染适配器接口抽象不同渲染引擎的差异。",
    sections: [
      {
        title: "概述",
        blocks: [
          {
            type: "code",
            code: overviewCode,
            language: "text",
          },
        ],
      },
      {
        title: "支持的渲染引擎",
        blocks: [
          {
            type: "code",
            code: enginesCode,
            language: "text",
          },
        ],
      },
      {
        title: "快速开始",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "使用默认引擎（Preact）",
            blocks: [
              {
                type: "code",
                code: defaultEngineCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "切换渲染引擎",
            blocks: [
              {
                type: "code",
                code: switchEngineCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "在配置文件中指定",
            blocks: [
              {
                type: "code",
                code: configCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "渲染适配器接口",
        blocks: [
          {
            type: "text",
            content: "所有渲染适配器都实现 `RenderAdapter` 接口：",
          },
          {
            type: "code",
            code: adapterInterfaceCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "渲染适配器管理器",
        blocks: [
          {
            type: "text",
            content: "`RenderAdapterManager` 负责管理多个渲染适配器：",
          },
          {
            type: "code",
            code: managerCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "在 RouteHandler 中使用",
        blocks: [
          {
            type: "text",
            content: "`RouteHandler` 内部使用渲染适配器进行页面渲染：",
          },
          {
            type: "code",
            code: `// 框架内部使用
const adapter = app.getRenderAdapter();
const vnode = adapter.createElement(PageComponent, pageProps);
const html = await adapter.renderToString(vnode);`,
            language: "typescript",
          },
        ],
      },
      {
        title: "文档导航",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[渲染适配器接口](/docs/render/adapter) - RenderAdapter 接口说明",
              "[Preact 适配器](/docs/render/preact) - Preact 渲染适配器",
              "[React 适配器](/docs/render/react) - React 渲染适配器",
              "[Vue 3 适配器](/docs/render/vue3) - Vue 3 渲染适配器",
              "[适配器管理器](/docs/render/manager) - RenderAdapterManager 使用指南",
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
              "[应用核心类](/docs/core/application) - Application 类的使用",
              "[路由处理器](/docs/core/route-handler) - 路由处理逻辑",
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
