### health - 健康检查

```typescript
import { health } from "@dreamer/dweb/middleware";

server.use(health({
  path: "/health", // 健康检查路径（默认 '/health'）
  readyPath: "/health/ready", // 就绪检查路径（默认 '/health/ready'）
  livePath: "/health/live", // 存活检查路径（默认 '/health/live'）
  healthCheck: async () => { // 自定义健康检查函数，返回 Promise，包含 status（'ok' | 'error'）、message 和 details
    return {
      status: "ok",
      message: "Service is healthy",
      details: { timestamp: new Date().toISOString() },
    };
  },
  readyCheck: async () => { // 自定义就绪检查函数，返回 Promise，包含 status（'ready' | 'not-ready'）、message 和 details
    return {
      status: "ready",
      message: "Service is ready",
      details: {},
    };
  },
  liveCheck: async () => { // 自定义存活检查函数，返回 Promise，包含 status（'alive' | 'dead'）、message 和 details
    return {
      status: "alive",
      message: "Service is alive",
      details: {},
    };
  },
}));
```

#### 配置选项

**可选参数：**

- `path` - 健康检查路径（默认 '/health'）
- `readyPath` - 就绪检查路径（默认 '/health/ready'）
- `livePath` - 存活检查路径（默认 '/health/live'）
- `healthCheck` - 自定义健康检查函数，返回 Promise，包含 status（'ok' | 'error'）、message 和 details
- `readyCheck` - 自定义就绪检查函数，返回 Promise，包含 status（'ready' | 'not-ready'）、message 和 details
- `liveCheck` - 自定义存活检查函数，返回 Promise，包含 status（'alive' | 'dead'）、message 和 details
