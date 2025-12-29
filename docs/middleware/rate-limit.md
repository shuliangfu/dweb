### rateLimit - 速率限制

速率限制中间件用于防止接口滥用和 DDoS 攻击，提供了灵活的限流策略。

#### 特性

*   **高性能存储**：
    默认实现高效的内存存储 (`MemoryStore`)，适合单机高并发场景。同时也支持自定义存储接口，方便扩展 Redis 等分布式存储。

*   **智能跳过策略**：
    支持配置 `skipSuccessfulRequests` 或 `skipFailedRequests`，允许仅针对特定结果类型的请求进行限流（例如只限制失败的登录尝试，而不影响正常用户）。

#### 基本配置
import { rateLimit } from "@dreamer/dweb/middleware";

server.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 时间窗口（毫秒），默认 60000（1分钟）
  max: 100, // 每个时间窗口内的最大请求数，默认 100
  skipSuccessfulRequests: false, // 是否跳过成功请求（只限制错误请求），默认 false
  skipFailedRequests: false, // 是否跳过失败请求（只限制成功请求），默认 false
  keyGenerator: (req) => req.headers.get("x-forwarded-for") || "unknown", // 获取客户端标识的函数（默认使用 IP 地址）
  skip: (req) => req.url.includes("/health"), // 跳过限流的函数
  message: "Too many requests", // 自定义错误消息
  statusCode: 429, // 自定义错误状态码，默认 429
  store: customStore, // 存储实现（默认使用内存存储），需要实现 RateLimitStore 接口
}));
```

#### 配置选项

**可选参数：**

- `windowMs` - 时间窗口（毫秒，默认 60000，即 1 分钟）
- `max` - 每个时间窗口内的最大请求数（默认 100）
- `skipSuccessfulRequests` - 是否跳过成功请求（只限制错误请求，默认 false）
- `skipFailedRequests` - 是否跳过失败请求（只限制成功请求，默认 false）
- `keyGenerator` - 获取客户端标识的函数（默认使用 IP 地址）
- `skip` - 跳过限流的函数
- `message` - 自定义错误消息
- `statusCode` - 自定义错误状态码（默认 429）
- `store` - 存储实现（默认使用内存存储），需要实现 `RateLimitStore` 接口：
  - `get(key)` - 获取当前计数
  - `increment(key)` - 增加计数
  - `reset(key)` - 重置计数
  - `setExpiry(key, ttl)` - 设置过期时间
