### sitemap - 网站地图

```typescript
import { sitemap } from "@dreamer/dweb/plugins";

usePlugin(sitemap({
  siteUrl: "https://example.com", // 网站基础 URL（必需）
  routes: ["/**/*.tsx"], // 要包含的路由路径数组（支持 glob 模式）
  exclude: ["/api/**", "/admin/**"], // 要排除的路由路径数组（支持 glob 模式）
  defaultChangefreq: "daily", // 默认更新频率（'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'）
  defaultPriority: 0.8, // 默认优先级（0.0 - 1.0）
  urls: [ // 自定义 URL 列表数组
    {
      loc: "/", // URL 路径（必需）
      lastmod: "2024-01-01", // 最后修改时间（字符串或 Date）
      changefreq: "daily", // 更新频率
      priority: 1.0, // 优先级（0.0 - 1.0）
    },
    { url: "/about", changefreq: "monthly", priority: 0.8 },
  ],
  generateRobots: true, // 是否生成 robots.txt（默认 false）
  robotsContent: "User-agent: *\nDisallow: /admin/", // robots.txt 内容（字符串）
  outputPath: "sitemap.xml", // sitemap.xml 输出路径（相对于输出目录）
  robotsOutputPath: "robots.txt", // robots.txt 输出路径（相对于输出目录）
}));
```

#### 配置选项

**必需参数：**

- `siteUrl` - 网站基础 URL（必需）

**可选参数：**

- `routes` - 要包含的路由路径数组（支持 glob 模式）
- `exclude` - 要排除的路由路径数组（支持 glob 模式）
- `defaultChangefreq` - 默认更新频率（'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'）
- `defaultPriority` - 默认优先级（0.0 - 1.0）
- `urls` - 自定义 URL 列表数组，每个 URL 对象包含 loc, lastmod, changefreq, priority
- `generateRobots` - 是否生成 robots.txt（默认 false）
- `robotsContent` - robots.txt 内容（字符串）
- `outputPath` - sitemap.xml 输出路径（相对于输出目录）
- `robotsOutputPath` - robots.txt 输出路径（相对于输出目录）
