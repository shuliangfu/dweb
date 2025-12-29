# 缓存系统

DWeb 框架内置了灵活的缓存抽象层，支持多种缓存策略，旨在提高应用性能并减轻数据库压力。

## 核心特性

- **统一接口**: 提供标准的 `CacheAdapter` 接口，屏蔽底层实现差异。
- **多级缓存**: 默认提供高性能内存缓存 (MemoryCache)，并预留分布式缓存接口。
- **依赖注入**: 缓存服务通过 ServiceContainer 注册，可轻松替换或扩展。

## 使用缓存

框架通过 `cache` 服务提供缓存功能：

```typescript
import { Application } from "@dreamer/dweb";
import type { CacheAdapter } from "@dreamer/dweb";

const app = new Application("dweb.config.ts");
await app.initialize();

// 获取缓存服务
const cache = app.getService<CacheAdapter>("cache");

// 设置缓存 (支持 TTL)
await cache.set("user:1", { name: "Alice" }, { ttl: 60 }); // 60秒过期

// 获取缓存
const user = await cache.get("user:1");

// 检查是否存在
if (await cache.has("user:1")) {
  // ...
}

// 删除缓存
await cache.delete("user:1");
```

## 缓存适配器

### 内存缓存 (MemoryCacheAdapter)

默认使用的缓存适配器，基于 `lru-cache` 实现，适合单实例部署。

- **优点**: 极速，无网络开销。
- **缺点**: 进程重启后数据丢失，多实例间无法共享。

### Redis 缓存 (RedisCacheAdapter)

框架预留了 Redis 适配器接口，支持分布式部署场景。

> **注意**: 目前 Redis 适配器处于接口预留状态，实际使用需要引入 Redis 客户端库并自行配置。

```typescript
// dweb.config.ts
export default defineConfig({
  cache: {
    adapter: "redis", // 启用 Redis 适配器接口
    redis: {
      host: "localhost",
      port: 6379,
      // ...
    }
  }
});
```

## 分布式缓存支持

为了支持微服务和多实例部署，框架设计了标准的缓存接口，允许开发者轻松接入 Redis、Memcached 等分布式缓存系统。这确保了在扩容应用实例时，缓存命中率不会大幅下降，且能保持数据一致性。
