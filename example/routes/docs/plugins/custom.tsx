/**
 * 插件 - 自定义插件文档页面
 * 展示如何创建自定义插件
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "创建自定义插件 - DWeb 框架文档",
  description: "如何创建自定义插件来扩展框架功能",
};

export default function CustomPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本结构
  const basicStructureCode =
    `import type { Plugin } from "@dreamer/dweb";

const myPlugin: Plugin = {
  name: "my-plugin",
  onInit: async (app) => {
    // 插件初始化
    console.log("Plugin initialized");
  },
  onRequest: async (req, res) => {
    // 每个请求前执行
    console.log("Request:", req.url);
  },
  onResponse: async (req, res, html) => {
    // 每个响应后执行，可以修改 HTML
    return html;
  },
  onError: async (error, req, res) => {
    // 发生错误时执行
    console.error("Error:", error);
  },
  onBuild: async (config) => {
    // 构建时执行
    console.log("Build config:", config);
  },
};

app.plugin(myPlugin);`;

  // 简单插件
  const simplePluginCode =
    `import type { Plugin } from "@dreamer/dweb";

const helloPlugin: Plugin = {
  name: "hello",
  onResponse: async (req, res, html) => {
    // 在 HTML 中注入脚本
    return html.replace(
      '</body>',
      '<script>console.log("Hello from plugin!")</script></body>'
    );
  },
};

app.plugin(helloPlugin);`;

  // 配置化插件
  const configurablePluginCode =
    `import type { Plugin } from "@dreamer/dweb";

interface MyPluginOptions {
  prefix: string;
  enabled: boolean;
}

function createMyPlugin(options: MyPluginOptions): Plugin {
  return {
    name: "my-plugin",
    onInit: async (app) => {
      if (!options.enabled) {
        return;
      }
      console.log("Plugin prefix:", options.prefix);
    },
    onRequest: async (req, res) => {
      if (options.enabled) {
        res.setHeader("X-Prefix", options.prefix);
      }
    },
  };
}

app.plugin(createMyPlugin({
  prefix: "api",
  enabled: true,
}));`;

  // 异步插件
  const asyncPluginCode =
    `import type { Plugin } from "@dreamer/dweb";

const asyncPlugin: Plugin = {
  name: "async-plugin",
  onInit: async (app) => {
    // 异步初始化
    const config = await fetch("/api/config").then(r => r.json());
    console.log("Plugin config loaded:", config);
  },
  onRequest: async (req, res) => {
    // 使用配置
    const config = await getConfig();
    (req as any).pluginConfig = config;
  },
};

app.plugin(asyncPlugin);`;

  // 带清理的插件
  const cleanupPluginCode =
    `import type { Plugin } from "@dreamer/dweb";

let intervalId: number | null = null;

const cleanupPlugin: Plugin = {
  name: "cleanup-plugin",
  onInit: async (app) => {
    // 设置定时任务
    intervalId = setInterval(() => {
      console.log("定时任务执行");
    }, 1000);
  },
  onBuild: async (config) => {
    // 清理资源
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  },
};

app.plugin(cleanupPlugin);`;

  // 处理 API 请求的插件
  const apiPluginCode =
    `import type { Plugin } from "@dreamer/dweb";

const apiPlugin: Plugin = {
  name: "api-plugin",
  onRequest: async (req, res) => {
    // 处理特定的 API 路由
    if (req.url.startsWith("/api/plugin")) {
      res.json({ message: "Hello from plugin API" });
      return; // 提前返回，不继续处理
    }
  },
};

app.plugin(apiPlugin);`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "创建自定义插件",
    description: "你可以创建自己的插件来扩展框架功能。",
    sections: [
      {
        title: "基本结构",
        blocks: [
          {
            type: "text",
            content: "插件是一个对象，包含 `name` 和生命周期钩子：",
          },
          {
            type: "code",
            code: basicStructureCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "插件示例",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "简单插件",
            blocks: [
              {
                type: "code",
                code: simplePluginCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "配置化插件",
            blocks: [
              {
                type: "code",
                code: configurablePluginCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "异步插件",
            blocks: [
              {
                type: "code",
                code: asyncPluginCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "带清理的插件",
            blocks: [
              {
                type: "code",
                code: cleanupPluginCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "处理 API 请求的插件",
            blocks: [
              {
                type: "code",
                code: apiPluginCode,
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
            title: "Plugin 接口",
            blocks: [
              {
                type: "code",
                code: `interface Plugin {
  name: string;
  onInit?: (app: AppLike) => Promise<void> | void;
  onRequest?: (req: Request, res: Response) => Promise<void> | void;
  onResponse?: (req: Request, res: Response, html: string) => Promise<string> | string;
  onError?: (error: Error, req: Request, res: Response) => Promise<void> | void;
  onBuild?: (config: AppConfig) => Promise<void> | void;
}`,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用插件",
            blocks: [
              {
                type: "code",
                code: `// 在 Application 上使用
app.plugin(plugin);

// 在配置文件中使用
export default {
  plugins: [
    myPlugin(),
  ],
};`,
                language: "typescript",
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
              "[插件概述](/docs/plugins)",
              "[插件系统](/docs/core/plugin)",
              "[Application](/docs/core/application) - 应用核心",
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
