/**
 * 功能模块 - 性能监控 (monitoring) 文档页面
 * 展示 DWeb 框架的性能监控功能和使用方法
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "性能监控 (monitoring) - DWeb 框架文档",
  description: "DWeb 框架的性能监控功能使用指南，包括请求监控、性能指标收集和错误追踪",
};

export default function FeaturesMonitoringPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本使用
  const basicUsageCode = `import { Monitor } from "@dreamer/dweb/features/monitoring";

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
});`;

  // 自定义回调
  const customCallbacksCode = `const monitor = new Monitor({
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
});`;

  // 集成第三方服务
  const thirdPartyCode = `import { Monitor } from "@dreamer/dweb/features/monitoring";

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
});`;

  // 获取性能指标
  const getMetricsCode = `// 获取当前性能指标
const metrics = monitor.getPerformanceMetrics();
console.log("CPU 使用率:", metrics.cpuUsage);
console.log("内存使用:", metrics.memoryUsage);
console.log("运行时间:", metrics.uptime);
console.log("请求总数:", metrics.requestCount);
console.log("错误总数:", metrics.errorCount);`;

  // 配置选项
  const configCode = `interface MonitoringOptions {
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
}`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        性能监控 (monitoring)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 框架提供了完整的性能监控功能，包括请求监控、性能指标收集和错误追踪。
      </p>

      {/* 快速开始 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          基本使用
        </h3>
        <CodeBlock code={basicUsageCode} language="typescript" />
      </section>

      {/* 监控选项 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          监控选项
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          请求监控
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          记录每个请求的详细信息：
        </p>
        <CodeBlock code={`interface RequestMetrics {
  method: string;        // HTTP 方法
  path: string;          // 请求路径
  statusCode: number;  // 状态码
  duration: number;      // 响应时间（毫秒）
  timestamp: number;     // 时间戳
  userAgent?: string;   // 用户代理
  ip?: string;          // IP 地址
}`} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          性能监控
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          收集系统性能指标：
        </p>
        <CodeBlock code={`interface PerformanceMetrics {
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
}`} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          错误监控
        </h3>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          追踪应用错误：
        </p>
        <CodeBlock code={`interface ErrorMetrics {
  message: string;       // 错误消息
  stack?: string;        // 堆栈跟踪
  path: string;          // 请求路径
  method: string;        // HTTP 方法
  statusCode: number;    // 状态码
  timestamp: number;     // 时间戳
  userAgent?: string;   // 用户代理
  ip?: string;          // IP 地址
}`} language="typescript" />
      </section>

      {/* 配置选项 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        <CodeBlock code={configCode} language="typescript" />
      </section>

      {/* 使用示例 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          使用示例
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          自定义回调
        </h3>
        <CodeBlock code={customCallbacksCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          集成第三方服务
        </h3>
        <CodeBlock code={thirdPartyCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          获取性能指标
        </h3>
        <CodeBlock code={getMetricsCode} language="typescript" />
      </section>

      {/* 最佳实践 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          最佳实践
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li><strong>生产环境监控</strong>：启用所有监控功能，配置外部监控服务集成，设置合理的性能监控间隔</li>
          <li><strong>开发环境监控</strong>：可以禁用部分监控以减少开销，使用控制台输出进行调试</li>
          <li><strong>错误追踪</strong>：记录完整的错误信息，包含请求上下文（路径、方法、IP 等），发送到专业的错误追踪服务</li>
          <li><strong>性能优化</strong>：监控响应时间，识别慢请求；监控内存使用，防止内存泄漏；监控 CPU 使用率，优化资源消耗</li>
        </ul>
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li><a href="/docs/features/dev" className="text-blue-600 dark:text-blue-400 hover:underline">开发服务器</a></li>
          <li><a href="/docs/features/prod" className="text-blue-600 dark:text-blue-400 hover:underline">生产服务器</a></li>
          <li><a href="/docs/features/logger" className="text-blue-600 dark:text-blue-400 hover:underline">日志系统</a></li>
        </ul>
      </section>
    </article>
  );
}
