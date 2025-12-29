### cache - 缓存

DWeb 缓存插件提供了多级缓存策略，支持内存、文件和 Redis 存储。

#### 架构与性能

*   **多级存储策略**：
    支持 `memory` (内存)、`file` (文件系统) 和 `redis` 三种后端，可根据场景灵活切换。

*   **改进的 LRU 算法**：
    内存缓存实现了带有访问顺序追踪 (`accessOrder`) 和定期清理机制的 LRU 策略，有效防止内存泄漏，保证高并发下的稳定性。

*   **文件缓存哈希**：
    文件缓存使用 SHA-256 对 Key 进行哈希作为文件名，解决了特殊字符和文件系统长度限制的问题，提高了文件系统的兼容性。

#### 基本配置
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
