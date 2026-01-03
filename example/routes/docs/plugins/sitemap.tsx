/**
 * 插件 - sitemap 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "sitemap 插件 - DWeb 框架文档",
  description: "sitemap 插件使用指南",
};

export default function SitemapPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const sitemapCode = `import { sitemap } from '@dreamer/dweb';

plugins: [
  sitemap({
    hostname: 'https://example.com',
    urls: [
      { url: '/', changefreq: 'daily', priority: 1.0 },
      { url: '/core', changefreq: 'monthly', priority: 0.8 },
    ],
  }),
],`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "sitemap - 网站地图",
    description:
      "sitemap 插件自动生成网站地图（sitemap.xml），帮助搜索引擎索引网站。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: sitemapCode,
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
                  "**`siteUrl`** - 网站基础 URL（必需）",
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
                  "**`routes`** - 要包含的路由路径数组（支持 glob 模式）",
                  "**`exclude`** - 要排除的路由路径数组（支持 glob 模式）",
                  "**`defaultChangefreq`** - 默认更新频率（'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'）",
                  "**`defaultPriority`** - 默认优先级（0.0 - 1.0）",
                  "**`urls`** - 自定义 URL 列表数组，每个 URL 对象包含：",
                  "  - `loc` - URL 路径（必需）",
                  "  - `lastmod` - 最后修改时间（字符串或 Date）",
                  "  - `changefreq` - 更新频率（'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'）",
                  "  - `priority` - 优先级（0.0 - 1.0）",
                  "**`generateRobots`** - 是否生成 robots.txt（默认 false）",
                  "**`robotsContent`** - robots.txt 内容（字符串）",
                  "**`outputPath`** - sitemap.xml 输出路径（相对于输出目录）",
                  "**`robotsOutputPath`** - robots.txt 输出路径（相对于输出目录）",
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
