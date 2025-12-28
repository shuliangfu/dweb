### seo - SEO 优化

```typescript
import { seo } from "@dreamer/dweb/plugins";

usePlugin(seo({
  defaultTitle: "My App", // 或 title（defaultTitle 的简写）
  titleTemplate: "%s | My Site", // 标题模板（例如：`%s | My Site`）
  defaultDescription: "My awesome app", // 或 description（defaultDescription 的简写）
  defaultKeywords: ["web", "framework"], // 或 keywords（defaultKeywords 的简写，支持字符串或数组）
  defaultAuthor: "Author Name", // 或 author（defaultAuthor 的简写）
  defaultLang: "zh-CN", // 默认语言
  siteUrl: "https://example.com", // 网站 URL
  defaultImage: "https://example.com/default-image.jpg", // 默认图片
  openGraph: { // Open Graph 配置对象或 false（禁用）
    siteName: "My Site",
    type: "website",
    image: "https://example.com/og-image.jpg",
    imageWidth: 1200,
    imageHeight: 630,
    locale: "zh_CN",
    localeAlternate: ["en_US"],
  },
  twitter: { // Twitter Cards 配置对象或 false（禁用）
    card: "summary_large_image",
    site: "@mysite",
    creator: "@author",
    image: "https://example.com/twitter-image.jpg",
  },
  jsonLd: { // JSON-LD 结构化数据配置对象或 false（禁用）
    enabled: true,
    type: "WebSite",
    name: "My Site",
    description: "My awesome site",
    url: "https://example.com",
    logo: "https://example.com/logo.png",
    contactPoint: {
      telephone: "+1-234-567-8900",
      contactType: "customer service",
      email: "support@example.com",
    },
    sameAs: ["https://twitter.com/mysite", "https://facebook.com/mysite"],
  },
  canonical: true, // 是否自动生成 canonical URL（默认 true）
  robots: { // 是否自动生成 robots meta 标签，可以是布尔值或配置对象
    index: true,
    follow: true,
    noarchive: false,
    nosnippet: false,
    noimageindex: false,
  },
  customMeta: [ // 自定义 meta 标签数组
    { name: "custom-meta", content: "custom value" },
    { property: "og:custom", content: "custom og value" },
  ],
}));
```

#### 配置选项

**可选参数：**

- `defaultTitle` 或 `title` - 默认标题（title 是 defaultTitle 的简写）
- `titleTemplate` - 标题模板（例如：`%s | My Site`）
- `defaultDescription` 或 `description` - 默认描述（description 是 defaultDescription 的简写）
- `defaultKeywords` 或 `keywords` - 默认关键词（支持字符串或数组，keywords 是 defaultKeywords 的简写）
- `defaultAuthor` 或 `author` - 默认作者（author 是 defaultAuthor 的简写）
- `defaultLang` - 默认语言
- `siteUrl` - 网站 URL
- `defaultImage` - 默认图片
- `openGraph` - Open Graph 配置对象或 false（禁用），包含 siteName, type, image, imageWidth, imageHeight, audio, video, locale, localeAlternate 等
- `twitter` - Twitter Cards 配置对象或 false（禁用），包含 card, site, creator, image, imageAlt, appNameIphone, appIdIphone, appUrlIphone, appNameIpad, appIdIpad, appUrlIpad, appNameGoogleplay, appIdGoogleplay, appUrlGoogleplay 等
- `jsonLd` - JSON-LD 结构化数据配置对象或 false（禁用），包含 enabled, type, name, description, url, logo, contactPoint, sameAs 等
- `canonical` - 是否自动生成 canonical URL（默认 true）
- `robots` - 是否自动生成 robots meta 标签，可以是布尔值或配置对象（包含 index, follow, noarchive, nosnippet, noimageindex）
- `customMeta` - 自定义 meta 标签数组，每个对象包含 name, property, content
