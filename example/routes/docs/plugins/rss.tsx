/**
 * 插件 - rss 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "rss 插件 - DWeb 框架文档",
  description: "rss 插件使用指南",
};

export default function RssPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const rssCode = `import { rss } from '@dreamer/dweb';

plugins: [
  rss({
    title: 'My Blog',
    description: 'My awesome blog',
    feedUrl: '/feed.xml',
  }),
],`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "rss - RSS 插件",
    description: "rss 插件用于生成 RSS Feed，支持内容订阅。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: rssCode,
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
                  "**`feed`** - RSS Feed 配置对象，包含：",
                  "  - `title` - Feed 标题（必需）",
                  "  - `description` - Feed 描述（必需）",
                  "  - `siteUrl` - 网站 URL（必需）",
                  "  - `feedUrl` - Feed URL（可选）",
                  "  - `language` - 语言代码",
                  "  - `copyright` - 版权信息",
                  "  - `managingEditor` - 管理邮箱",
                  "  - `webMaster` - Web Master 邮箱",
                  "  - `lastBuildDate` - 最后构建日期",
                  "  - `ttl` - 更新频率（分钟）",
                  "  - `image` - 图片 URL（Feed 图标）对象，包含 url, title, link, width, height",
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
                  "**`items`** - RSS 条目列表数组，每个条目包含 title, link, description, pubDate, author, category, tags, content, image, guid, comments, commentsUrl",
                  "**`autoScan`** - 是否自动扫描路由生成条目（默认 false）",
                  "**`routesDir`** - 路由目录（用于自动扫描）",
                  "**`outputPath`** - 输出路径（相对于构建输出目录）",
                  "**`filename`** - 输出文件名",
                  "**`generateByCategory`** - 是否生成多个 Feed（按分类，默认 false）",
                  "**`categories`** - 分类配置数组，每个分类包含 name 和 filter 函数",
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
