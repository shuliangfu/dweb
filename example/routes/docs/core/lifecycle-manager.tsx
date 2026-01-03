/**
 * 核心模块 - LifecycleManager (生命周期管理器) 文档页面
 * 展示 DWeb 框架的生命周期管理器功能和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";
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
import { Application } from "@dreamer/dweb";

const app = new Application();
await app.initialize(); // 内部使用 LifecycleManager
await app.start();      // 内部使用 LifecycleManager
await app.stop();       // 内部使用 LifecycleManager`;

  // 注册生命周期钩子
  const registerHooksCode = `// 注册生命周期钩子
import { Application } from "@dreamer/dweb";
import type { LifecycleHooks } from "@dreamer/dweb";

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

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "LifecycleManager (生命周期管理器)",
    description:
      "`LifecycleManager` 管理应用的生命周期，统一处理启动、运行、关闭流程，支持生命周期钩子。",
    sections: [
      {
        title: "概述",
        blocks: [
          {
            type: "text",
            content:
              "`LifecycleManager` 负责管理应用的生命周期阶段，支持生命周期钩子，确保应用的正确启动和关闭。",
          },
        ],
      },
      {
        title: "生命周期阶段",
        blocks: [
          {
            type: "code",
            code: lifecyclePhasesCode,
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
            title: "基本使用",
            blocks: [
              {
                type: "code",
                code: basicUsageCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "注册生命周期钩子",
            blocks: [
              {
                type: "code",
                code: registerHooksCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "生命周期钩子",
        blocks: [
          {
            type: "code",
            code: hooksCode,
            language: "typescript",
          },
          {
            type: "alert",
            level: "info",
            content: [
              "**说明：**",
              "**`onInitialize`**：在应用初始化时调用",
              "**`onStart`**：在应用启动时调用",
              "**`onStop`**：在应用停止时调用",
              "**`onShutdown`**：在应用关闭时调用",
            ],
          },
        ],
      },

      {
        title: "API 参考",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "构造函数",
            blocks: [
              {
                type: "code",
                code: "constructor(application: Application)",
                language: "typescript",
              },
              {
                type: "text",
                content: "**参数：**",
              },
              {
                type: "list",
                ordered: false,
                items: [
                  "**`application`**: `Application` - 应用实例",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "方法",
            blocks: [
              {
                type: "api",
                name: "registerHooks(hooks)",
                description: "注册生命周期钩子。",
                code: `lifecycleManager.registerHooks({
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
});`,
              },
              {
                type: "api",
                name: "getPhase()",
                description: "获取当前生命周期阶段。",
                code: `const phase = lifecycleManager.getPhase();
console.log("当前阶段:", phase);`,
              },
              {
                type: "api",
                name: "setPhase(phase)",
                description: "设置生命周期阶段（通常由框架内部调用）。",
                code: "lifecycleManager.setPhase(LifecyclePhase.Running);",
              },
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
              "[优雅关闭](/docs/features/shutdown)",
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
