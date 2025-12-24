### performance - 性能监控

```typescript
import { performance } from "@dreamer/dweb/plugins";

usePlugin(performance({
  enabled: true,
  collectMetrics: true,
  reportInterval: 60000, // 1 分钟
}));
```
