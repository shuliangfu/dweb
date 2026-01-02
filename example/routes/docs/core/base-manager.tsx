/**
 * 核心模块 - BaseManager (基础管理器) 文档页面
 * 展示 DWeb 框架的基础管理器功能和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";
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
  const createManagerCode = `import { BaseManager } from "@dreamer/dweb";
import type { IService } from "@dreamer/dweb";

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
  const completeExampleCode = `import { BaseManager } from "@dreamer/dweb";
import type { IService } from "@dreamer/dweb";

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

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "BaseManager (基础管理器)",
    description: "`BaseManager` 是所有管理器的抽象基类，提供统一的生命周期管理和通用功能。",
    sections: [
      {
        title: "概述",
        blocks: [
          {
            type: "text",
            content: "`BaseManager` 实现了 `IService` 接口，提供了：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "统一的生命周期管理",
              "状态跟踪（初始化、运行、停止、销毁）",
              "时间戳记录",
              "状态检查方法",
            ],
          },
        ],
      },
      {
        title: "快速开始",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "创建自定义管理器",
            blocks: [
              {
                type: "code",
                code: createManagerCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用管理器",
            blocks: [
              {
                type: "code",
                code: useManagerCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "完整示例",
        blocks: [
          {
            type: "code",
            code: completeExampleCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "服务状态",
        blocks: [
          {
            type: "code",
            code: serviceStateCode,
            language: "typescript",
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
                code: "constructor(name: string)",
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
                  "**`name`**: `string` - 管理器名称",
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
                name: "initialize()",
                description: "初始化管理器。功能：检查是否已初始化、调用 `onInitialize()` 方法、设置状态为 `Initialized`、记录初始化时间戳。",
                code: "await manager.initialize();",
              },
              {
                type: "api",
                name: "start()",
                description: "启动管理器。功能：如果未初始化，先调用 `initialize()`、调用 `onStart()` 方法、设置状态为 `Running`、记录启动时间戳。",
                code: "await manager.start();",
              },
              {
                type: "api",
                name: "stop()",
                description: "停止管理器。",
                code: "await manager.stop();",
              },
              {
                type: "api",
                name: "destroy()",
                description: "销毁管理器。",
                code: "await manager.destroy();",
              },
              {
                type: "api",
                name: "getState()",
                description: "获取当前状态。返回: 'uninitialized' | 'initialized' | 'running' | 'stopped' | 'destroyed'",
                code: `const state = manager.getState();`,
              },
              {
                type: "api",
                name: "isInitialized() / isRunning()",
                description: "检查状态。",
                code: `if (manager.isInitialized()) {
  // 已初始化
}

if (manager.isRunning()) {
  // 正在运行
}`,
              },
            ],
          },
        ],
      },
      {
        title: "框架中的使用",
        blocks: [
          {
            type: "text",
            content: "以下管理器都继承自 `BaseManager`：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "**`MiddlewareManager`** - 中间件管理器",
              "**`PluginManager`** - 插件管理器",
            ],
          },
          {
            type: "text",
            content: "它们都获得了统一的生命周期管理功能。",
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
              "[IService (服务接口)](/docs/core/iservice)",
              "[Application (应用核心)](/docs/core/application)",
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
