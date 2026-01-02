/**
 * 插件 - cache 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "cache 插件 - DWeb 框架文档",
  description: "cache 插件使用指南",
};

export default function CachePluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const cacheCode = `import { cache } from '@dreamer/dweb';

plugins: [
  cache({
    type: 'memory', // 'memory' | 'redis'
    ttl: 3600, // 缓存时间（秒）
  }),
],`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "cache - 缓存插件",
    description: "cache 插件提供缓存功能，支持内存缓存和 Redis 缓存。",
    sections: [
      {
        title: "架构与性能",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**多级存储策略**：支持 memory (内存)、file (文件系统) 和 redis 三种后端，可根据场景灵活切换。",
              "**改进的 LRU 算法**：内存缓存实现了带有访问顺序追踪 (accessOrder) 和定期清理机制的 LRU 策略，有效防止内存泄漏，保证高并发下的稳定性。",
              "**文件缓存哈希**：文件缓存使用 SHA-256 对 Key 进行哈希作为文件名，解决了特殊字符和文件系统长度限制的问题，提高了文件系统的兼容性。",
            ],
          },
        ],
      },
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: cacheCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "配置选项",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "可选参数",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`config`** - 缓存配置对象，包含：",
                  "  - `store` - 存储类型（'memory' | 'redis' | 'file'）",
                  "  - `redis` - Redis 配置（如果使用 Redis），包含 host, port, password, db",
                  "  - `cacheDir` - 文件缓存目录（如果使用文件缓存）",
                  "  - `defaultTTL` - 默认过期时间（秒）",
                  "  - `maxSize` - 最大缓存大小（内存缓存，字节）",
                  "  - `maxEntries` - 最大缓存条目数（内存缓存）",
                  "  - `keyPrefix` - 缓存键前缀",
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
