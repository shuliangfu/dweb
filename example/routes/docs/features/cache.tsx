/**
 * 功能模块 - 缓存系统文档页面
 * 介绍 DWeb 框架的缓存系统及其使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "缓存系统 (Cache) - DWeb 框架文档",
  description: "DWeb 框架的缓存系统介绍，包括内存缓存和分布式缓存支持",
};

export default function FeaturesCachePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本使用示例
  const basicUsageCode = `import { Application } from "@dreamer/dweb";
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
await cache.delete("user:1");`;

  // Redis 配置示例
  const redisConfigCode = `// dweb.config.ts
import { defineConfig } from "@dreamer/dweb";

export default defineConfig({
  cache: {
    adapter: "redis", // 启用 Redis 适配器接口
    redis: {
      host: "localhost",
      port: 6379,
      // ...
    }
  }
});`;

  return (
    <div className="prose prose-blue max-w-none dark:prose-invert">
      <h1>缓存系统</h1>
      
      <p>
        DWeb 框架内置了灵活的缓存抽象层，支持多种缓存策略，旨在提高应用性能并减轻数据库压力。
      </p>
      
      <h2>核心特性</h2>
      <ul>
        <li><strong>统一接口</strong>: 提供标准的 <code>CacheAdapter</code> 接口，屏蔽底层实现差异。</li>
        <li><strong>多级缓存</strong>: 默认提供高性能内存缓存 (MemoryCache)，并预留分布式缓存接口。</li>
        <li><strong>依赖注入</strong>: 缓存服务通过 ServiceContainer 注册，可轻松替换或扩展。</li>
      </ul>
      
      <h2>使用缓存</h2>
      <p>框架通过 <code>cache</code> 服务提供缓存功能：</p>
      <CodeBlock code={basicUsageCode} language="typescript" />
      
      <h2>缓存适配器</h2>
      
      <h3>内存缓存 (MemoryCacheAdapter)</h3>
      <p>
        默认使用的缓存适配器，基于 <code>lru-cache</code> 实现，适合单实例部署。
      </p>
      <ul>
        <li><strong>优点</strong>: 极速，无网络开销。</li>
        <li><strong>缺点</strong>: 进程重启后数据丢失，多实例间无法共享。</li>
      </ul>
      
      <h3>Redis 缓存 (RedisCacheAdapter)</h3>
      <p>
        框架预留了 Redis 适配器接口，支持分布式部署场景。
      </p>
      <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 my-4">
        <p className="text-sm text-yellow-700 dark:text-yellow-200 m-0">
          <strong>注意</strong>: 目前 Redis 适配器处于接口预留状态，实际使用需要引入 Redis 客户端库并自行配置。
        </p>
      </div>
      <CodeBlock code={redisConfigCode} language="typescript" />
      
      <h2>分布式缓存支持</h2>
      <p>
        为了支持微服务和多实例部署，框架设计了标准的缓存接口，允许开发者轻松接入 Redis、Memcached 等分布式缓存系统。这确保了在扩容应用实例时，缓存命中率不会大幅下降，且能保持数据一致性。
      </p>
    </div>
  );
}
