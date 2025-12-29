# 性能监控

DWeb 框架提供了完整的性能监控功能，包括请求监控、性能指标收集和错误追踪。

## 目录结构

```
src/features/
└── monitoring.ts    # 监控模块实现
```

## 快速开始

### 基本使用

```typescript
import { Monitor } from "@dreamer/dweb";

// 创建监控器
const monitor = new Monitor({
  enableRequestMonitoring: true,
  enablePerformanceMonitoring: true,
  enableErrorMonitoring: true,
});

// 在请求处理中使用
server.setHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    // 处理请求
    res.text("OK");
    
    // 记录请求指标
    monitor.recordRequest({
      method: req.method,
      path: req.url,
      statusCode: res.status,
      duration: Date.now() - startTime,
      userAgent: req.headers.get("user-agent"),
      ip: req.headers.get("x-forwarded-for") || "unknown",
    });
  } catch (error) {
    // 记录错误
    monitor.recordError({
      message: error.message,
      stack: error.stack,
      path: req.url,
      method: req.method,
      statusCode: 500,
      userAgent: req.headers.get("user-agent"),
      ip: req.headers.get("x-forwarded-for") || "unknown",
    });
    
    res.status = 500;
    res.text("Internal Server Error");
  }
});
```

## 监控选项

### 请求监控

记录每个请求的详细信息：

```typescript
interface RequestMetrics {
  method: string;        // HTTP 方法
  path: string;          // 请求路径
  statusCode: number;    // 状态码
  duration: number;      // 响应时间（毫秒）
  timestamp: number;     // 时间戳
  userAgent?: string;   // 用户代理
  ip?: string;          // IP 地址
}
```

### 性能监控

收集系统性能指标：

```typescript
interface PerformanceMetrics {
  cpuUsage?: number;              // CPU 使用率
  memoryUsage?: {                 // 内存使用情况
    rss: number;                  // 常驻集大小
    heapTotal: number;            // 堆总大小
    heapUsed: number;             // 堆已使用
    external: number;             // 外部内存
  };
  uptime: number;                 // 运行时间（毫秒）
  requestCount: number;           // 请求总数
  errorCount: number;             // 错误总数
}
```

### 错误监控

追踪应用错误：

```typescript
interface ErrorMetrics {
  message: string;       // 错误消息
  stack?: string;        // 堆栈跟踪
  path: string;          // 请求路径
  method: string;        // HTTP 方法
  statusCode: number;    // 状态码
  timestamp: number;     // 时间戳
  userAgent?: string;   // 用户代理
  ip?: string;          // IP 地址
}
```

## 配置选项

```typescript
interface MonitoringOptions {
  // 是否启用请求监控（默认 true）
  enableRequestMonitoring?: boolean;
  
  // 是否启用性能监控（默认 true）
  enablePerformanceMonitoring?: boolean;
  
  // 是否启用错误监控（默认 true）
  enableErrorMonitoring?: boolean;
  
  // 性能监控间隔（毫秒，默认 60000）
  performanceInterval?: number;
  
  // 请求指标回调
  onRequest?: (metrics: RequestMetrics) => void;
  
  // 性能指标回调
  onPerformance?: (metrics: PerformanceMetrics) => void;
  
  // 错误指标回调
  onError?: (metrics: ErrorMetrics) => void;
}
```

## 使用示例

### 自定义回调

```typescript
const monitor = new Monitor({
  onRequest: (metrics) => {
    // 发送到外部监控服务
    console.log("请求指标:", metrics);
  },
  
  onPerformance: (metrics) => {
    // 记录性能指标
    console.log("性能指标:", metrics);
  },
  
  onError: (metrics) => {
    // 发送错误到错误追踪服务
    console.error("错误指标:", metrics);
  },
});
```

### 集成第三方服务

```typescript
import { Monitor } from "@dreamer/dweb";

const monitor = new Monitor({
  onRequest: async (metrics) => {
    // 发送到 Prometheus
    await fetch("http://prometheus:9091/metrics", {
      method: "POST",
      body: JSON.stringify(metrics),
    });
  },
  
  onError: async (metrics) => {
    // 发送到 Sentry
    await fetch("https://sentry.io/api/errors", {
      method: "POST",
      body: JSON.stringify(metrics),
    });
  },
});
```

### 获取性能指标

```typescript
// 获取当前性能指标
const metrics = monitor.getPerformanceMetrics();
console.log("CPU 使用率:", metrics.cpuUsage);
console.log("内存使用:", metrics.memoryUsage);
console.log("运行时间:", metrics.uptime);
console.log("请求总数:", metrics.requestCount);
console.log("错误总数:", metrics.errorCount);
```

## 最佳实践

1. **生产环境监控**：
   - 启用所有监控功能
   - 配置外部监控服务集成
   - 设置合理的性能监控间隔

2. **开发环境监控**：
   - 可以禁用部分监控以减少开销
   - 使用控制台输出进行调试

3. **错误追踪**：
   - 记录完整的错误信息
   - 包含请求上下文（路径、方法、IP 等）
   - 发送到专业的错误追踪服务

4. **性能优化**：
   - 监控响应时间，识别慢请求
   - 监控内存使用，防止内存泄漏
   - 监控 CPU 使用率，优化资源消耗

## 相关文档

- [开发服务器](./dev.md) - 开发模式服务器
- [生产服务器](./prod.md) - 生产模式服务器
- [日志系统](./logger.md) - 日志记录功能

