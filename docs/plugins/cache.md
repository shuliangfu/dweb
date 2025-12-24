### cache - 缓存

```typescript
import { cache, CacheManager } from "@dreamer/dweb/plugins";

usePlugin(cache({
  store: "memory", // 'memory' | 'redis' | 'file'
  ttl: 3600, // 默认 TTL（秒）
}));

// 使用缓存管理器
const cacheManager = CacheManager.getInstance();
await cacheManager.set("key", "value", 3600);
const value = await cacheManager.get("key");
```
