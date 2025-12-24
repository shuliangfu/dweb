### errorHandler - 错误处理

```typescript
import { errorHandler } from "@dreamer/dweb/middleware";

server.use(errorHandler({
  debug: true, // 开发模式显示详细错误
  log: true, // 记录错误日志
}));
```
