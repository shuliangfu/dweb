### rss - RSS 订阅

```typescript
import { rss } from "@dreamer/dweb/plugins";

usePlugin(rss({
  feeds: [
    {
      title: "My Blog",
      description: "My awesome blog",
      link: "https://example.com",
      items: [
        {
          title: "Post 1",
          link: "https://example.com/post-1",
          description: "Post 1 description",
          pubDate: new Date(),
        },
      ],
    },
  ],
}));
```
