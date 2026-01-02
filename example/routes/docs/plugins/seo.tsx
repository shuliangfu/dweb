/**
 * 插件 - seo 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "seo 插件 - DWeb 框架文档",
  description: "seo 插件使用指南",
};

export default function SeoPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const seoCode = `import { seo } from '@dreamer/dweb';

plugins: [
  seo({
    title: 'My App',
    description: 'My awesome app',
    keywords: ['web', 'framework'],
    openGraph: {
      type: 'website',
      image: 'https://example.com/og-image.jpg',
    },
    twitter: {
      card: 'summary_large_image',
    },
  }),
],`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "seo - SEO 优化",
    description: "seo 插件自动生成 SEO 元数据，包括 Open Graph 和 Twitter Card。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: seoCode,
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
            title: "可选参数",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`defaultTitle`** 或 **`title`** - 默认标题（title 是 defaultTitle 的简写）",
                  "**`titleTemplate`** - 标题模板（例如：`%s | My Site`）",
                  "**`defaultDescription`** 或 **`description`** - 默认描述（description 是 defaultDescription 的简写）",
                  "**`defaultKeywords`** 或 **`keywords`** - 默认关键词（支持字符串或数组，keywords 是 defaultKeywords 的简写）",
                  "**`defaultAuthor`** 或 **`author`** - 默认作者（author 是 defaultAuthor 的简写）",
                  "**`defaultLang`** - 默认语言",
                  "**`siteUrl`** - 网站 URL",
                  "**`defaultImage`** - 默认图片",
                  "**`openGraph`** - Open Graph 配置对象或 false（禁用），包含：",
                  "  - `siteName` - 网站名称",
                  "  - `type` - 网站类型（'website' | 'article' | 'book' | 'profile' | 'music' | 'video'）",
                  "  - `image` - 图片 URL",
                  "  - `imageWidth` - 图片宽度",
                  "  - `imageHeight` - 图片高度",
                  "  - `audio` - 音频 URL",
                  "  - `video` - 视频 URL",
                  "  - `locale` - 地区",
                  "  - `localeAlternate` - 备用地区",
                  "**`twitter`** - Twitter Cards 配置对象或 false（禁用），包含：",
                  "  - `card` - 卡片类型（'summary' | 'summary_large_image' | 'app' | 'player'）",
                  "  - `site` - 站点 Twitter 用户名",
                  "  - `creator` - 创建者 Twitter 用户名",
                  "  - `image` - 图片 URL",
                  "  - `imageAlt` - 图片描述",
                  "  - `appNameIphone` - 应用名称（iOS）",
                  "  - `appIdIphone` - 应用 ID（iOS）",
                  "  - `appUrlIphone` - 应用 URL（iOS）",
                  "  - `appNameIpad` - 应用名称（iPad）",
                  "  - `appIdIpad` - 应用 ID（iPad）",
                  "  - `appUrlIpad` - 应用 URL（iPad）",
                  "  - `appNameGoogleplay` - 应用名称（Android）",
                  "  - `appIdGoogleplay` - 应用包名（Android）",
                  "  - `appUrlGoogleplay` - 应用 URL（Android）",
                  "**`jsonLd`** - JSON-LD 结构化数据配置对象或 false（禁用），包含：",
                  "  - `enabled` - 是否启用 JSON-LD",
                  "  - `type` - 网站类型（'WebSite' | 'Organization' | 'Person' | 'Article' | 'BlogPosting' | 'Product'）",
                  "  - `name` - 网站名称",
                  "  - `description` - 网站描述",
                  "  - `url` - 网站 URL",
                  "  - `logo` - Logo URL",
                  "  - `contactPoint` - 联系信息（telephone, contactType, email）",
                  "  - `sameAs` - 社交媒体链接数组",
                  "**`canonical`** - 是否自动生成 canonical URL（默认 true）",
                  "**`robots`** - 是否自动生成 robots meta 标签，可以是布尔值或配置对象：",
                  "  - `index` - 是否允许索引",
                  "  - `follow` - 是否允许跟踪链接",
                  "  - `noarchive` - 是否禁止存档",
                  "  - `nosnippet` - 是否禁止显示摘要",
                  "  - `noimageindex` - 是否禁止索引图片",
                  "**`customMeta`** - 自定义 meta 标签数组，每个对象包含：",
                  "  - `name` - meta 名称",
                  "  - `property` - meta 属性",
                  "  - `content` - meta 内容",
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
