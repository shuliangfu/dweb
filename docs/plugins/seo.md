### seo - SEO 优化

```typescript
import { seo } from "@dreamer/dweb/plugins";

usePlugin(seo({
  title: "My App",
  description: "My awesome app",
  keywords: ["web", "framework"],
  openGraph: {
    type: "website",
    image: "https://example.com/og-image.jpg",
  },
  twitter: {
    card: "summary_large_image",
  },
}));
```
