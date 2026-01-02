/**
 * 核心模块 - 插件系统文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "插件系统 - DWeb 框架文档",
  description: "DWeb 框架的插件系统介绍",
};

export default function CorePluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const pluginCode = `import type { Plugin } from '@dreamer/dweb';

const myPlugin: Plugin = {
  name: 'my-plugin',
  setup(app) {
    // 插件初始化
    console.log('Plugin initialized');
  },
};`;

  const usePluginCode = `import { createApp } from '@dreamer/dweb';
import { tailwind, seo } from '@dreamer/dweb';

const app = createApp();

// 注册插件
app.plugin(tailwind({ version: 'v4' }));
app.plugin(seo({ title: 'My App' }));

export default app;`;

  // 插件生命周期钩子示例
  const lifecycleHooksCode =
    `import type { Plugin } from '@dreamer/dweb';

const myPlugin: Plugin = {
  name: 'my-plugin',
  
  // 应用初始化时执行
  onInit: async (app) => {
    console.log('插件初始化');
  },
  
  // 每个请求前执行
  onRequest: async (req, res) => {
    console.log('请求:', req.url);
  },
  
  // 每个响应后执行
  onResponse: async (req, res, html) => {
    // 可以修改 HTML 内容
    return html.replace('</body>', '<script>console.log("插件注入")</script></body>');
  },
  
  // 发生错误时执行
  onError: async (error, req, res) => {
    console.error('错误:', error);
  },
  
  // 构建时执行
  onBuild: async (config) => {
    console.log('构建配置:', config);
  },
};`;

  // 插件配置
  const pluginConfigCode = `// 插件可以接受配置
const myPlugin = (options: { apiKey: string }) => ({
  name: 'my-plugin',
  onInit: async (app) => {
    console.log('API Key:', options.apiKey);
  },
});

// 使用插件
app.plugin(myPlugin({ apiKey: 'your-api-key' }));`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "插件系统",
    description: "DWeb 框架提供了灵活的插件系统，允许你扩展框架功能。",
    sections: [
      {
        title: "什么是插件",
        blocks: [
          {
            type: "text",
            content: "插件是一个对象，包含名称和初始化函数。插件可以：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "扩展框架功能",
              "添加全局中间件",
              "修改应用配置",
              "注册生命周期钩子",
              "注入 HTML 内容",
              "处理 API 请求",
            ],
          },
        ],
      },
      {
        title: "创建插件",
        blocks: [
          {
            type: "text",
            content: "创建一个自定义插件：",
          },
          {
            type: "code",
            code: pluginCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "使用插件",
        blocks: [
          {
            type: "text",
            content: "在应用中使用插件：",
          },
          {
            type: "code",
            code: usePluginCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "插件生命周期",
        blocks: [
          {
            type: "text",
            content: "插件支持多个生命周期钩子：",
          },
          {
            type: "code",
            code: lifecycleHooksCode,
            language: "typescript",
          },
          {
            type: "subsection",
            level: 3,
            title: "生命周期钩子说明",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`onInit`** - 应用初始化时执行，用于设置插件初始状态",
                  "**`onRequest`** - 每个请求前执行，可以拦截请求或处理 API 路由",
                  "**`onResponse`** - 每个响应后执行，可以修改响应内容或注入 HTML",
                  "**`onError`** - 发生错误时执行，用于错误处理和日志记录",
                  "**`onBuild`** - 构建时执行，用于构建时的处理逻辑",
                ],
              },
            ],
          },
        ],
      },
      {
        title: "插件配置",
        blocks: [
          {
            type: "text",
            content: "插件可以接受配置选项：",
          },
          {
            type: "code",
            code: pluginConfigCode,
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
            title: "插件接口",
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
    tailwind({ version: 'v4' }),
    seo({ title: 'My App' }),
  ],
};`,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "内置插件",
        blocks: [
          {
            type: "text",
            content: "框架提供了多个内置插件：",
          },
          {
            type: "list",
            ordered: false,
            items: [
              "[tailwind](/docs/plugins/tailwind) - Tailwind CSS 支持",
              "[store](/docs/plugins/store) - 状态管理",
              "[seo](/docs/plugins/seo) - SEO 优化",
              "[sitemap](/docs/plugins/sitemap) - 网站地图生成",
              "[pwa](/docs/plugins/pwa) - PWA 支持",
              "[cache](/docs/plugins/cache) - 缓存管理",
              "[email](/docs/plugins/email) - 邮件发送",
              "[fileUpload](/docs/plugins/file-upload) - 文件上传",
              "[formValidator](/docs/plugins/form-validator) - 表单验证",
              "[i18n](/docs/plugins/i18n) - 国际化",
              "[imageOptimizer](/docs/plugins/image-optimizer) - 图片优化",
              "[performance](/docs/plugins/performance) - 性能优化",
              "[theme](/docs/plugins/theme) - 主题管理",
              "[rss](/docs/plugins/rss) - RSS 订阅",
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
              "[中间件系统](/docs/core/middleware)",
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
