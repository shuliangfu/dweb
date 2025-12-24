### image-optimizer - 图片优化

```typescript
import { imageOptimizer } from "@dreamer/dweb/plugins";

usePlugin(imageOptimizer({
  formats: ["webp", "avif"],
  sizes: [320, 640, 1024, 1920],
  quality: 80,
}));
```
