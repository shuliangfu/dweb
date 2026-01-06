/**
 * 核心模块 - 核心模块概述文档页面
 * 展示 DWeb 框架的核心功能模块概述
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "核心模块概述 - DWeb 框架文档",
  description: "DWeb 框架的核心功能模块，包括服务器、路由、配置、中间件系统等",
};

export default function CoreOverviewPage() {
  // 基本用法
  const basicUsageCode = `import { Application } from "@dreamer/dweb";

const app = new Application();
await app.initialize();
await app.start(3000);`;

  // 使用服务容器
  const serviceContainerCode = `import { Application } from "@dreamer/dweb";
import { IService } from "@dreamer/dweb";

class MyService implements IService {
  async initialize() {
    console.log("服务初始化");
  }
  async start() {
    console.log("服务启动");
  }
  async stop() {
    console.log("服务停止");
  }
}

const app = new Application();
app.service(new MyService());
await app.initialize();
await app.start(3000);`;

  // 页面文档数据
  const content = {
    title: "核心模块概述",
    description:
      "DWeb 框架的核心功能模块，包括服务器、路由、配置、中间件系统等。",
    sections: [
      {
        title: "目录结构",
        blocks: [
          {
            type: "code",
            code: `src/core/
├── application.ts         # 应用核心类（统一入口）
├── application-context.ts # 应用上下文
├── config-manager.ts      # 配置管理器
├── service-container.ts   # 服务容器（依赖注入）
├── lifecycle-manager.ts   # 生命周期管理器
├── iservice.ts           # 服务接口
├── base-manager.ts       # 基础管理器
├── server.ts             # HTTP 服务器
├── router.ts             # 文件系统路由
├── config.ts             # 配置管理（旧 API）
├── middleware.ts         # 中间件系统
├── plugin.ts             # 插件系统
├── route-handler.ts      # 路由处理器
└── api-route.ts          # API 路由处理`,
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
            title: "基本用法",
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
            title: "使用服务容器",
            blocks: [
              {
                type: "code",
                code: serviceContainerCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "核心组件（OOP 架构）",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[应用核心类 (Application)](/docs/core/application) - 统一的应用入口，管理所有组件和服务",
              "[应用上下文 (ApplicationContext)](/docs/core/application-context) - 应用状态和服务的统一访问接口",
              "[配置管理器 (ConfigManager)](/docs/core/config-manager) - 配置的加载、验证和访问",
              "[服务容器 (ServiceContainer)](/docs/core/service-container) - 依赖注入容器",
              "[生命周期管理器 (LifecycleManager)](/docs/core/lifecycle-manager) - 应用生命周期管理",
              "[服务接口 (IService)](/docs/core/iservice) - 所有服务必须实现的接口",
              "[基础管理器 (BaseManager)](/docs/core/base-manager) - 管理器的抽象基类",
            ],
          },
        ],
      },
      {
        title: "传统组件",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[服务器 (Server)](/docs/core/server) - HTTP 服务器实现",
              "[路由系统 (Router)](/docs/core/router) - 文件系统路由",
              "[配置管理 (Config)](/docs/core/config) - 配置加载和管理（旧 API）",
              "[中间件系统](/docs/core/middleware) - 中间件管理",
              "[插件系统](/docs/core/plugin) - 插件管理",
              "[路由处理器 (RouteHandler)](/docs/core/route-handler) - 路由处理逻辑",
              "[API 路由](/docs/core/api) - API 路由处理",
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
              "[功能模块](/docs/features) - 框架功能模块",
              "[中间件系统](/docs/middleware) - 中间件系统",
              "[插件系统](/docs/plugins) - 插件系统",
              "[工具函数库](/docs/utils) - 工具函数库",
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
