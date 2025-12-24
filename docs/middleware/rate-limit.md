### rateLimit - 速率限制

```typescript
import { rateLimit } from "@dreamer/dweb/middleware";

server.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 最多 100 次请求
  message: "Too many requests",
  store: "memory", // 'memory' | 'redis'
}));
```
