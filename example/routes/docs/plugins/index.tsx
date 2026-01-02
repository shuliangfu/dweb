/**
 * 插件 - 插件概述文档页面
 * 展示 DWeb 框架的插件系统概述
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "插件概述 - DWeb 框架文档",
  description: "DWeb 框架的插件系统概述，包括内置插件和使用方法",
};

export default function PluginsOverviewPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本用法
  const basicUsageCode = `import { Application } from "@dreamer/dweb";
import { tailwind, seo } from "@dreamer/dweb";

const app = new Application();
await app.initialize();

// 注册插件
app.plugin(tailwind({ version: 'v4' }));
app.plugin(seo({ title: 'My App' }));

await app.start();`;

  // 在配置文件中使用
  const configUsageCode = `// dweb.config.ts
import { tailwind, seo, store } from '@dreamer/dweb';

export default {
  plugins: [
    tailwind({ version: 'v4' }),
    seo({ title: 'My App' }),
    store({ persist: true }),
  ],
};`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "插件概述",
    description: "DWeb 框架提供了强大的插件系统，支持各种功能扩展。",
    sections: [
      {
        title: "目录结构",
        blocks: [
          {
            type: "code",
            code: `src/plugins/
├── cache/              # 缓存插件
├── email/              # 邮件插件
├── file-upload/        # 文件上传插件
├── form-validator/     # 表单验证插件
├── i18n/               # 国际化插件
├── image-optimizer/    # 图片优化插件
├── performance/        # 性能监控插件
├── pwa/                # PWA 插件
├── rss/                # RSS 插件
├── seo/                # SEO 插件
├── sitemap/            # 网站地图插件
├── store/              # 状态管理插件
├── tailwind/           # Tailwind CSS 插件
├── theme/              # 主题插件
└── mod.ts              # 模块导出`,
            language: "text",
          },
        ],
      },
      {
        title: "使用插件",
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
            title: "在配置文件中使用",
            blocks: [
              {
                type: "code",
                code: configUsageCode,
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
            type: "list",
            ordered: false,
            items: [
              "[tailwind](/docs/plugins/tailwind) - Tailwind CSS 支持",
              "[store](/docs/plugins/store) - 状态管理",
              "[seo](/docs/plugins/seo) - SEO 优化",
              "[sitemap](/docs/plugins/sitemap) - 网站地图生成",
              "[pwa](/docs/plugins/pwa) - 渐进式 Web 应用",
              "[cache](/docs/plugins/cache) - 缓存管理",
              "[email](/docs/plugins/email) - 邮件发送",
              "[fileUpload](/docs/plugins/file-upload) - 文件上传",
              "[formValidator](/docs/plugins/form-validator) - 表单验证",
              "[i18n](/docs/plugins/i18n) - 国际化",
              "[imageOptimizer](/docs/plugins/image-optimizer) - 图片优化",
              "[performance](/docs/plugins/performance) - 性能监控",
              "[theme](/docs/plugins/theme) - 主题切换",
              "[rss](/docs/plugins/rss) - RSS 订阅",
            ],
          },
        ],
      },
      {
        title: "其他",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[创建自定义插件](/docs/plugins/custom) - 编写自己的插件",
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
              "[插件系统](/docs/core/plugin) - 框架核心功能",
              "[Application](/docs/core/application) - 应用核心",
              "[中间件系统](/docs/middleware) - 中间件系统",
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
