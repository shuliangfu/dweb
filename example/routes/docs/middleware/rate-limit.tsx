/**
 * 中间件 - rateLimit 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "rateLimit 中间件 - DWeb 框架文档",
  description: "rateLimit 中间件使用指南",
};

export default function RateLimitMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const rateLimitCode = `import { rateLimit } from '@dreamer/dweb';

server.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 时间窗口（毫秒）
  max: 100, // 最大请求数
}));`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "rateLimit - 速率限制",
    description: "rateLimit 中间件用于限制请求速率，防止滥用和 DDoS 攻击。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: rateLimitCode,
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
                  "**`windowMs`** - 时间窗口（毫秒，默认 60000，即 1 分钟）",
                  "**`max`** - 每个时间窗口内的最大请求数（默认 100）",
                  "**`skipSuccessfulRequests`** - 是否跳过成功请求（只限制错误请求，默认 false）",
                  "**`skipFailedRequests`** - 是否跳过失败请求（只限制成功请求，默认 false）",
                  "**`keyGenerator`** - 获取客户端标识的函数（默认使用 IP 地址）",
                  "**`skip`** - 跳过限流的函数",
                  "**`message`** - 自定义错误消息",
                  "**`statusCode`** - 自定义错误状态码（默认 429）",
                  "**`store`** - 存储实现（默认使用内存存储），需要实现 RateLimitStore 接口：",
                  "  - `get(key)` - 获取当前计数",
                  "  - `increment(key)` - 增加计数",
                  "  - `reset(key)` - 重置计数",
                  "  - `setExpiry(key, ttl)` - 设置过期时间",
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
