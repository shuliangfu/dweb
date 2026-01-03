/**
 * 核心模块 - IService (服务接口) 文档页面
 * 展示 DWeb 框架的服务接口定义和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";
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

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "IService (服务接口)",
    description:
      "`IService` 接口定义了所有框架服务必须实现的接口，提供统一的生命周期管理。",
    sections: [
      {
        title: "概述",
        blocks: [
          {
            type: "text",
            content:
              "`IService` 接口确保所有服务都有一致的生命周期管理，包括初始化、启动、停止和销毁。",
          },
        ],
      },
      {
        title: "接口定义",
        blocks: [
          {
            type: "code",
            code: interfaceCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "实现示例",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "基本实现",
            blocks: [
              {
                type: "code",
                code: basicImplementationCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用 BaseManager（推荐）",
            blocks: [
              {
                type: "text",
                content:
                  "推荐使用 `BaseManager` 基类，它已经实现了 `IService` 接口：",
              },
              {
                type: "code",
                code: baseManagerCode,
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
        title: "API 参考",
        blocks: [
          {
            type: "api",
            name: "name",
            description: "服务名称，用于标识和日志记录（必需）",
            code: "readonly string",
          },
          {
            type: "api",
            name: "initialize()",
            description: "初始化服务（可选），在服务使用前调用",
            code: "Promise<void> | void",
          },
          {
            type: "api",
            name: "start()",
            description: "启动服务（可选），在应用启动时调用",
            code: "Promise<void> | void",
          },
          {
            type: "api",
            name: "stop()",
            description: "停止服务（可选），在应用停止时调用",
            code: "Promise<void> | void",
          },
          {
            type: "api",
            name: "destroy()",
            description: "销毁服务（可选），在应用关闭时调用，用于清理资源",
            code: "Promise<void> | void",
          },
          {
            type: "api",
            name: "getName()",
            description: "获取服务名称（必需）",
            code: "string",
          },
          {
            type: "api",
            name: "isInitialized()",
            description: "检查服务是否已初始化（可选）",
            code: "boolean",
          },
          {
            type: "api",
            name: "isRunning()",
            description: "检查服务是否正在运行（可选）",
            code: "boolean",
          },
        ],
      },
      {
        title: "使用 BaseManager",
        blocks: [
          {
            type: "text",
            content: "`BaseManager` 提供了 `IService` 接口的默认实现，包括：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "状态管理（`ServiceState`）",
              "时间戳记录（`initializedAt`, `startedAt`）",
              "生命周期方法（`initialize`, `start`, `stop`, `destroy`）",
            ],
          },
          {
            type: "text",
            content: "只需要实现以下受保护的方法：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "**`onInitialize()`** - 初始化逻辑",
              "**`onStart()`** - 启动逻辑",
              "**`onStop()`** - 停止逻辑",
              "**`onDestroy()`** - 清理逻辑",
            ],
          },
        ],
      },
      {
        title: "框架中的实现",
        blocks: [
          {
            type: "text",
            content: "以下管理器都实现了 `IService` 接口：",
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
            content: "它们都继承自 `BaseManager`，获得统一的生命周期管理。",
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
              "[BaseManager (基础管理器)](/docs/core/base-manager)",
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
