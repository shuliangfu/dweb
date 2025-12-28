### cache - 缓存

```typescript
import { cache, CacheManager } from "@dreamer/dweb/plugins";

usePlugin(cache({
  config: { // 缓存配置对象
    store: "memory", // 存储类型（'memory' | 'redis' | 'file'）
    redis: { // Redis 配置（如果使用 Redis）
      host: "localhost",
      port: 6379,
      password: "password",
      db: 0,
    },
    cacheDir: "./cache", // 文件缓存目录（如果使用文件缓存）
    defaultTTL: 3600, // 默认过期时间（秒）
    maxSize: 100 * 1024 * 1024, // 最大缓存大小（内存缓存，字节）
    maxEntries: 1000, // 最大缓存条目数（内存缓存）
    keyPrefix: "cache:", // 缓存键前缀
  },
}));

// 使用缓存管理器
const cacheManager = CacheManager.getInstance();
await cacheManager.set("key", "value", 3600);
const value = await cacheManager.get("key");
```

#### 配置选项

**可选参数：**

- `config` - 缓存配置对象，包含：
  - `store` - 存储类型（'memory' | 'redis' | 'file'）
  - `redis` - Redis 配置（如果使用 Redis），包含 host, port, password, db
  - `cacheDir` - 文件缓存目录（如果使用文件缓存）
  - `defaultTTL` - 默认过期时间（秒）
  - `maxSize` - 最大缓存大小（内存缓存，字节）
  - `maxEntries` - 最大缓存条目数（内存缓存）
  - `keyPrefix` - 缓存键前缀
