### sitemap - 网站地图

```typescript
import { sitemap } from "@dreamer/dweb/plugins";

usePlugin(sitemap({
  hostname: "https://example.com",
  urls: [
    { url: "/", changefreq: "daily", priority: 1.0 },
    { url: "/about", changefreq: "monthly", priority: 0.8 },
  ],
}));
```
