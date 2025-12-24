### health - 健康检查

```typescript
import { health } from "@dreamer/dweb/middleware";

server.use(health({
  path: "/health",
  checks: {
    database: async () => {
      // 检查数据库连接
      return { status: "ok" };
    },
  },
}));
```
