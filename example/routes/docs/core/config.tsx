/**
 * 核心模块 - 配置管理 (Config) 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "配置管理 (Config) - DWeb 框架文档",
  description: "DWeb 框架的配置管理介绍",
};

export default function CoreConfigPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 加载配置
  const configCode = `import { loadConfig } from '@dreamer/dweb';

// 加载默认配置
const { config, configDir } = await loadConfig();

// 加载指定配置文件
const { config } = await loadConfig('./dweb.config.ts');

// 多应用模式
const { config } = await loadConfig('./dweb.config.ts', 'app-name');`;

  // 基本配置示例
  const basicConfigCode = `// dweb.config.ts
import type { DWebConfig } from '@dreamer/dweb';
import { tailwind, cors } from '@dreamer/dweb';

const config: DWebConfig = {
  server: {
    port: 3000,
    host: 'localhost',
  },
  routes: {
    dir: 'routes',
  },
  static: {
    dir: 'assets',
    prefix: '/assets',
  },
  plugins: [
    tailwind({ version: 'v4' }),
    cors({ origin: '*' }),
  ],
};

export default config;`;

  // 多应用配置示例
  const multiAppConfigCode = `// dweb.config.ts
import type { DWebConfig } from '@dreamer/dweb';
import { tailwind, cors } from '@dreamer/dweb';

const config: DWebConfig = {
  cookie: {
    secret: 'your-secret-key',
  },
  session: {
    secret: 'your-session-secret',
    store: 'memory',
  },
  apps: [
    {
      name: 'frontend',
      server: { port: 3000 },
      routes: { dir: 'frontend/routes' },
      plugins: [tailwind()],
    },
    {
      name: 'backend',
      server: { port: 3001 },
      routes: { dir: 'backend/routes' },
      plugins: [cors()],
    },
  ],
};

export default config;`;

  // 环境变量配置
  const envConfigCode = `// dweb.config.ts
import type { DWebConfig } from '@dreamer/dweb';

const config: DWebConfig = {
  server: {
    port: parseInt(Deno.env.get('PORT') || '3000'),
    host: Deno.env.get('HOST') || 'localhost',
  },
  // ... 其他配置
};

export default config;`;

  // 配置规范化
  const normalizeCode = `import { normalizeRouteConfig } from "@dreamer/dweb";

// 规范化路由配置
const routeConfig = normalizeRouteConfig({
  dir: "routes",
  ignore: ["**/*.test.ts"],
  cache: true,
  priority: "specific-first",
  apiDir: "routes/api",
});`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "配置管理 (Config)",
    description: "DWeb 框架提供了灵活的配置加载机制，支持单应用和多应用模式。配置文件使用 TypeScript，提供完整的类型支持。",
    sections: [
      {
        title: "加载配置",
        blocks: [
          {
            type: "text",
            content: "框架会自动查找并加载 `dweb.config.ts` 配置文件。你也可以手动加载配置：",
          },
          {
            type: "code",
            code: configCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "基本配置",
        blocks: [
          {
            type: "text",
            content: "单应用模式的基本配置示例：",
          },
          {
            type: "code",
            code: basicConfigCode,
            language: "typescript",
          },
          {
            type: "subsection",
            level: 3,
            title: "配置选项",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`server`** - 服务器配置（端口、主机等）",
                  "**`routes`** - 路由配置（目录、忽略规则等）",
                  "**`static`** - 静态资源配置（目录、前缀、缓存等）",
                  "**`plugins`** - 插件列表",
                  "**`middleware`** - 中间件列表",
                  "**`cookie`** - Cookie 配置",
                  "**`session`** - Session 配置",
                  "**`database`** - 数据库配置",
                ],
              },
            ],
          },
        ],
      },
      {
        title: "多应用模式",
        blocks: [
          {
            type: "text",
            content: "多应用模式允许你在一个配置文件中定义多个应用，每个应用有独立的服务器、路由和插件配置：",
          },
          {
            type: "code",
            code: multiAppConfigCode,
            language: "typescript",
          },
          {
            type: "text",
            content: "启动指定应用：`deno run -A jsr:@dreamer/dweb/cli dev:app-name`",
          },
        ],
      },
      {
        title: "环境变量",
        blocks: [
          {
            type: "text",
            content: "可以在配置文件中使用环境变量，方便在不同环境中使用不同的配置：",
          },
          {
            type: "code",
            code: envConfigCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "配置规范化",
        blocks: [
          {
            type: "text",
            content: "使用 `normalizeRouteConfig` 函数规范化路由配置：",
          },
          {
            type: "code",
            code: normalizeCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "配置文件位置",
        blocks: [
          {
            type: "text",
            content: "框架会按以下顺序查找配置文件：",
          },
          {
            type: "list",
            ordered: true,
            items: [
              "当前工作目录的 `dweb.config.ts`",
              "当前工作目录的 `dweb.config.js`",
              "如果使用 `loadConfig(path)`，则加载指定路径的配置文件",
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
            title: "loadConfig",
            blocks: [
              {
                type: "code",
                code: `function loadConfig(
  configPath?: string,
  appName?: string
): Promise<{ config: AppConfig; configDir: string }>`,
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
                  "**`configPath`**: 配置文件路径（可选，默认为 `dweb.config.ts`）",
                  "**`appName`**: 应用名称（多应用模式使用）",
                ],
              },
              {
                type: "text",
                content: "**返回：**",
              },
              {
                type: "list",
                ordered: false,
                items: [
                  "**`config`**: 配置对象",
                  "**`configDir`**: 配置文件所在目录",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "normalizeRouteConfig",
            blocks: [
              {
                type: "code",
                code: `function normalizeRouteConfig(
  routes: string | {
    dir: string;
    ignore?: string[];
    cache?: boolean;
    priority?: "specific-first" | "order";
    apiDir?: string;
  }
): {
  dir: string;
  ignore: string[];
  cache: boolean;
  priority: "specific-first" | "order";
  apiDir: string;
}`,
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
                  "**`routes`**: 路由配置（字符串或配置对象）",
                ],
              },
              {
                type: "text",
                content: "**返回：**规范化后的路由配置对象",
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
              "[ConfigManager (配置管理器)](/docs/core/config-manager)",
              "[配置文档](/docs/deployment/configuration) - 完整的配置选项说明",
              "[路由系统](/docs/core/router) - 文件系统路由",
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
