### performance - 性能监控

```typescript
import { performance } from "@dreamer/dweb/plugins";

usePlugin(performance({
  config: { // 性能监控配置对象
    collectWebVitals: true, // 是否收集 Web Vitals
    collectResourceTiming: true, // 是否收集资源加载时间
    collectApiTiming: true, // 是否收集 API 响应时间
    endpoint: "/api/metrics", // 上报端点
    reportInterval: 60000, // 上报间隔（毫秒）
    logToConsole: true, // 是否在控制台输出
    sampleRate: 1.0, // 采样率（0-1）
  },
  injectClientScript: true, // 是否在客户端注入监控脚本（默认 true）
  onMetrics: (metrics) => { // 自定义指标收集函数，接收 PerformanceMetrics 对象，返回 void 或 Promise<void>
    console.log("性能指标:", metrics);
  },
}));
```

#### 配置选项

**可选参数：**

- `config` - 性能监控配置对象，包含：
  - `collectWebVitals` - 是否收集 Web Vitals
  - `collectResourceTiming` - 是否收集资源加载时间
  - `collectApiTiming` - 是否收集 API 响应时间
  - `endpoint` - 上报端点
  - `reportInterval` - 上报间隔（毫秒）
  - `logToConsole` - 是否在控制台输出
  - `sampleRate` - 采样率（0-1）
- `injectClientScript` - 是否在客户端注入监控脚本（默认 true）
- `onMetrics` - 自定义指标收集函数，接收 PerformanceMetrics 对象，返回 void 或 Promise<void>
