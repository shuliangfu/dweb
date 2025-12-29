/**
 * 性能监控插件
 * 收集 Web Vitals 和性能指标
 */

import type { Plugin, Request, Response } from "../../common/types/index.ts";
import type { PerformanceMetrics, PerformancePluginOptions } from "./types.ts";

/**
 * 生成性能监控脚本
 */
function generatePerformanceScript(options: PerformancePluginOptions): string {
  const config = options.config || {};
  const collectWebVitals = config.collectWebVitals !== false;
  const collectResourceTiming = config.collectResourceTiming !== false;
  const collectApiTiming = config.collectApiTiming !== false;
  const endpoint = config.endpoint || "/api/performance";
  const reportInterval = config.reportInterval || 5000;
  const logToConsole = config.logToConsole !== false;
  const sampleRate = config.sampleRate ?? 1.0;

  return `
    <script>
      (function() {
        if (Math.random() > ${sampleRate}) return; // 采样率控制
        
        const PerformanceMonitor = {
          endpoint: ${JSON.stringify(endpoint)},
          metrics: {},
          reportInterval: ${reportInterval},
          
          // 收集 Web Vitals
          collectWebVitals: function() {
            if (!${collectWebVitals}) return;
            
            // LCP (Largest Contentful Paint)
            if ('PerformanceObserver' in window) {
              try {
                const lcpObserver = new PerformanceObserver((list) => {
                  const entries = list.getEntries();
                  const lastEntry = entries[entries.length - 1];
                  this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
              } catch (e) {}
              
              // FID (First Input Delay)
              try {
                const fidObserver = new PerformanceObserver((list) => {
                  const entries = list.getEntries();
                  entries.forEach((entry) => {
                    if (entry.processingStart && entry.startTime) {
                      this.metrics.fid = entry.processingStart - entry.startTime;
                    }
                  });
                });
                fidObserver.observe({ entryTypes: ['first-input'] });
              } catch (e) {}
              
              // CLS (Cumulative Layout Shift)
              try {
                let clsValue = 0;
                const clsObserver = new PerformanceObserver((list) => {
                  const entries = list.getEntries();
                  entries.forEach((entry) => {
                    if (!entry.hadRecentInput) {
                      clsValue += entry.value;
                    }
                  });
                  this.metrics.cls = clsValue;
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });
              } catch (e) {}
            }
            
            // FCP (First Contentful Paint)
            if (performance.getEntriesByType) {
              const fcpEntry = performance.getEntriesByType('paint').find(
                entry => entry.name === 'first-contentful-paint'
              );
              if (fcpEntry) {
                this.metrics.fcp = fcpEntry.startTime;
              }
            }
            
            // TTFB (Time to First Byte)
            if (performance.timing) {
              const timing = performance.timing;
              this.metrics.ttfb = timing.responseStart - timing.requestStart;
            }
          },
          
          // 收集页面加载时间
          collectPageTiming: function() {
            if (performance.timing) {
              const timing = performance.timing;
              this.metrics.loadTime = timing.loadEventEnd - timing.navigationStart;
              this.metrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
            }
          },
          
          // 收集资源加载时间
          collectResourceTiming: function() {
            if (!${collectResourceTiming}) return;
            if (!performance.getEntriesByType) return;
            
            const resources = performance.getEntriesByType('resource');
            let totalTime = 0;
            resources.forEach((resource) => {
              totalTime += resource.duration;
            });
            this.metrics.resourceLoadTime = totalTime;
          },
          
          // 拦截 fetch 收集 API 响应时间
          collectApiTiming: function() {
            if (!${collectApiTiming}) return;
            
            const originalFetch = window.fetch;
            const self = this;
            window.fetch = function(...args) {
              const startTime = performance.now();
              return originalFetch.apply(this, args).then((response) => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                if (!self.metrics.apiResponseTime) {
                  self.metrics.apiResponseTime = [];
                }
                self.metrics.apiResponseTime.push({
                  url: args[0],
                  duration: duration,
                  status: response.status
                });
                
                return response;
              });
            };
          },
          
          // 上报指标
          report: function() {
            const metrics = {
              ...this.metrics,
              url: window.location.href,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent
            };
            
            ${logToConsole ? `console.log('[Performance]', metrics);` : ""}
            
            // 发送到服务器
            if (this.endpoint) {
              fetch(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metrics)
              }).catch(err => {
                console.error('[Performance] 上报失败:', err);
              });
            }
          },
          
          // 初始化
          init: function() {
            this.collectWebVitals();
            this.collectApiTiming();
            
            // 页面加载完成后收集指标
            if (document.readyState === 'complete') {
              this.collectPageTiming();
              this.collectResourceTiming();
              setTimeout(() => this.report(), 1000);
            } else {
              window.addEventListener('load', () => {
                this.collectPageTiming();
                this.collectResourceTiming();
                setTimeout(() => this.report(), 1000);
              });
            }
            
            // 定期上报
            setInterval(() => this.report(), this.reportInterval);
          }
        };
        
        // 初始化
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => PerformanceMonitor.init());
        } else {
          PerformanceMonitor.init();
        }
        
        // 暴露到全局
        window.__PERFORMANCE_MONITOR__ = PerformanceMonitor;
      })();
    </script>
  `;
}

/**
 * 创建性能监控插件
 */
export function performance(options: PerformancePluginOptions = {}): Plugin {
  return {
    name: "performance",
    config: options as unknown as Record<string, unknown>,

    /**
     * 请求处理钩子 - 注入性能监控脚本
     */
    onRequest(_req: Request, res: Response) {
      // 只处理 HTML 响应
      if (!res.body || typeof res.body !== "string") {
        return;
      }

      const contentType = res.headers.get("Content-Type") || "";
      if (!contentType.includes("text/html")) {
        return;
      }

      if (options.injectClientScript !== false) {
        try {
          const html = res.body as string;

          // 注入性能监控脚本（在 </head> 之前）
          if (html.includes("</head>")) {
            const script = generatePerformanceScript(options);
            res.body = html.replace("</head>", `${script}\n</head>`);
          }
        } catch (error) {
          console.error("[Performance Plugin] 注入监控脚本时出错:", error);
        }
      }
    },

    /**
     * 响应处理钩子 - 记录 API 响应时间
     */
    async onResponse(req: Request, res: Response) {
      if (options.onMetrics && req.url.includes("/api/")) {
        // 这里可以记录 API 响应时间
        // 实际实现中需要从请求开始时间计算
        const metrics: PerformanceMetrics = {
          apiResponseTime: 0, // 需要实际计算
        };
        await options.onMetrics(metrics);
      }
    },
  };
}

// 导出类型
export type {
  PerformanceConfig,
  PerformanceMetrics,
  PerformancePluginOptions,
  WebVitals,
} from "./types.ts";
