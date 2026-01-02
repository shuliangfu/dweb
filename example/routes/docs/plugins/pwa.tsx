/**
 * 插件 - pwa 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "pwa 插件 - DWeb 框架文档",
  description: "pwa 插件使用指南",
};

export default function PwaPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const pwaCode = `import { pwa } from '@dreamer/dweb';

plugins: [
  pwa({
    manifest: {
      name: 'My App',
      shortName: 'App',
    },
  }),
],`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "pwa - 渐进式 Web 应用",
    description: "pwa 插件将应用转换为渐进式 Web 应用（PWA），支持离线访问。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: pwaCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "配置选项",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "必需参数",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`manifest`** - PWA Manifest 配置对象，包含：",
                  "  - `name` - 应用名称（必需）",
                  "  - `short_name` - 应用简短名称",
                  "  - `description` - 应用描述",
                  "  - `theme_color` - 应用主题色",
                  "  - `background_color` - 应用背景色",
                  "  - `display` - 显示模式（'fullscreen' | 'standalone' | 'minimal-ui' | 'browser'）",
                  "  - `start_url` - 起始 URL",
                  "  - `scope` - 作用域",
                  "  - `orientation` - 方向（'any' | 'natural' | 'landscape' | 'portrait' 等）",
                  "  - `icons` - 图标列表数组",
                  "  - `shortcuts` - 快捷方式数组",
                  "  - `related_applications` - 相关应用数组",
                  "  - `prefer_related_applications` - 是否首选相关应用",
                  "  - `lang` - 语言",
                  "  - `dir` - 目录（'ltr' | 'rtl' | 'auto'）",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "可选参数",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`serviceWorker`** - Service Worker 配置对象或 false（禁用），包含：",
                  "  - `swPath` - Service Worker 文件路径",
                  "  - `scope` - Service Worker 作用域",
                  "  - `cacheStrategy` - 缓存策略（'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only'）",
                  "  - `precache` - 要缓存的资源数组",
                  "  - `runtimeCache` - 运行时缓存规则数组",
                  "  - `offlinePage` - 离线页面路径",
                  "**`manifestOutputPath`** - manifest.json 输出路径（相对于输出目录）",
                  "**`swOutputPath`** - Service Worker 输出路径（相对于输出目录）",
                  "**`injectLinks`** - 是否在 HTML 中自动注入 manifest 和 Service Worker 链接（默认 true）",
                ],
              },
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
