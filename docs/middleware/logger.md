### logger - 请求日志

```typescript
import { logger } from "@dreamer/dweb/middleware";

server.use(logger({
  format: "combined", // 'combined' | 'common' | 'dev' | 'short' | 'tiny'
  stream: process.stdout, // 输出流
}));
```
