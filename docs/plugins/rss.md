### rss - RSS 订阅

```typescript
import { rss } from "@dreamer/dweb/plugins";

usePlugin(rss({
  feed: { // RSS Feed 配置（必需）
    title: "My Blog", // Feed 标题（必需）
    description: "My awesome blog", // Feed 描述（必需）
    siteUrl: "https://example.com", // 网站 URL（必需）
    feedUrl: "https://example.com/feed.xml", // Feed URL（可选）
    language: "zh-CN", // 语言代码
    copyright: "© 2024 My Blog", // 版权信息
    managingEditor: "editor@example.com", // 管理邮箱
    webMaster: "webmaster@example.com", // Web Master 邮箱
    lastBuildDate: new Date(), // 最后构建日期
    ttl: 60, // 更新频率（分钟）
    image: { // 图片 URL（Feed 图标）
      url: "https://example.com/icon.png",
      title: "My Blog",
      link: "https://example.com",
      width: 144,
      height: 144,
    },
  },
  items: [ // RSS 条目列表数组（可选）
    {
      title: "Post 1",
      link: "https://example.com/post-1",
      description: "Post 1 description",
      pubDate: new Date(),
      author: "Author Name",
      category: "Technology",
      tags: ["tech", "web"],
      content: "<p>Post content</p>",
      image: "https://example.com/post-1.jpg",
      guid: "post-1",
      comments: true,
      commentsUrl: "https://example.com/post-1#comments",
    },
  ],
  autoScan: false, // 是否自动扫描路由生成条目（默认 false）
  routesDir: "routes", // 路由目录（用于自动扫描）
  outputPath: "feed.xml", // 输出路径（相对于构建输出目录）
  filename: "feed.xml", // 输出文件名
  generateByCategory: false, // 是否生成多个 Feed（按分类，默认 false）
  categories: [ // 分类配置数组
    {
      name: "Technology",
      filter: (item) => item.category === "Technology",
    },
  ],
}));
```

#### 配置选项

**必需参数：**

- `feed` - RSS Feed 配置对象，包含 title, description, siteUrl, feedUrl, language, copyright, managingEditor, webMaster, lastBuildDate, ttl, image 等

**可选参数：**

- `items` - RSS 条目列表数组，每个条目包含 title, link, description, pubDate, author, category, tags, content, image, guid, comments, commentsUrl
- `autoScan` - 是否自动扫描路由生成条目（默认 false）
- `routesDir` - 路由目录（用于自动扫描）
- `outputPath` - 输出路径（相对于构建输出目录）
- `filename` - 输出文件名
- `generateByCategory` - 是否生成多个 Feed（按分类，默认 false）
- `categories` - 分类配置数组，每个分类包含 name 和 filter 函数
