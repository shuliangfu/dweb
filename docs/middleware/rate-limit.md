### rateLimit - 速率限制

```typescript
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
