/**
 * 核心模块 - ConfigManager (配置管理器) 文档页面
 * 展示 DWeb 框架的配置管理器功能和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "ConfigManager (配置管理器) - DWeb 框架文档",
  description:
    "DWeb 框架的配置管理器使用指南，统一管理应用配置的加载、验证和访问",
};

export default function CoreConfigManagerPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本使用
  const basicUsageCode = `// main.ts
import { ConfigManager } from "@dreamer/dweb";

// 创建配置管理器
const configManager = new ConfigManager("dweb.config.ts");

// 加载配置
await configManager.load();

// 获取配置
const config = configManager.getConfig();
const port = config.server?.port;`;

  // 多应用模式
  const multiAppCode = `// 加载特定应用的配置
const configManager = new ConfigManager("dweb.config.ts", "backend");
await configManager.load();
const config = configManager.getConfig();`;

  // 程序化设置配置
  const programmaticCode = `// 直接设置配置（用于测试或特殊场景）
import { ConfigManager } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const configManager = new ConfigManager();

// 直接设置配置
const config: AppConfig = {
  server: { port: 3000 },
  routes: { dir: "routes" },
};

configManager.setConfig(config);
const loadedConfig = configManager.getConfig();`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "ConfigManager (配置管理器)",
    description:
      "`ConfigManager` 统一管理应用配置的加载、验证和访问，提供类型安全的配置访问和配置合并功能。",
    sections: [
      {
        title: "概述",
        blocks: [
          {
            type: "text",
            content:
              "`ConfigManager` 封装了配置加载逻辑，提供统一的配置访问接口。",
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
            title: "多应用模式",
            blocks: [
              {
                type: "code",
                code: multiAppCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "程序化设置配置",
            blocks: [
              {
                type: "code",
                code: programmaticCode,
                language: "typescript",
              },
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
                code: "constructor(configPath?: string, appName?: string)",
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
                  "**`configPath`** (可选): 配置文件路径，如果不提供则自动查找 `dweb.config.ts`",
                  "**`appName`** (可选): 应用名称，用于多应用模式",
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
                name: "load()",
                description:
                  "加载配置文件。功能：从配置文件加载配置、验证配置格式、规范化配置值。",
                code: "await configManager.load();",
              },
              {
                type: "api",
                name: "getConfig()",
                description: "获取配置对象。",
                code: "const config = configManager.getConfig();",
              },
              {
                type: "api",
                name: "getConfigDir()",
                description: "获取配置文件所在目录。",
                code: "const configDir = configManager.getConfigDir();",
              },
              {
                type: "api",
                name: "setConfig(config)",
                description: "直接设置配置（用于测试或特殊场景）。",
                code: "configManager.setConfig(config);",
              },
              {
                type: "api",
                name: "isLoaded()",
                description: "检查配置是否已加载。",
                code: `if (configManager.isLoaded()) {
  const config = configManager.getConfig();
}`,
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
              "[配置管理 (Config)](/docs/core/config)",
              "[配置文档](/docs/deployment/configuration)",
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
