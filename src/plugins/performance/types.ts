/**
 * 性能监控插件类型定义
 */

/**
 * Web Vitals 指标
 */
export interface WebVitals {
  /** Largest Contentful Paint */
  lcp?: number;
  /** First Input Delay */
  fid?: number;
  /** Cumulative Layout Shift */
  cls?: number;
  /** First Contentful Paint */
  fcp?: number;
  /** Time to First Byte */
  ttfb?: number;
  /** Total Blocking Time */
  tbt?: number;
  /** Speed Index */
  si?: number;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 页面加载时间 */
  loadTime?: number;
  /** DOM 内容加载时间 */
  domContentLoaded?: number;
  /** 资源加载时间 */
  resourceLoadTime?: number;
  /** API 响应时间 */
  apiResponseTime?: number;
  /** Web Vitals 指标 */
  webVitals?: WebVitals;
  /** 自定义指标 */
  custom?: Record<string, number>;
}

/**
 * 性能监控配置
 */
export interface PerformanceConfig {
  /** 是否收集 Web Vitals */
  collectWebVitals?: boolean;
  /** 是否收集资源加载时间 */
  collectResourceTiming?: boolean;
  /** 是否收集 API 响应时间 */
  collectApiTiming?: boolean;
  /** 上报端点 */
  endpoint?: string;
  /** 上报间隔（毫秒） */
  reportInterval?: number;
  /** 是否在控制台输出 */
  logToConsole?: boolean;
  /** 采样率（0-1） */
  sampleRate?: number;
}

/**
 * 性能监控插件选项
 */
export interface PerformancePluginOptions {
  /** 性能监控配置 */
  config?: PerformanceConfig;
  /** 是否在客户端注入监控脚本 */
  injectClientScript?: boolean;
  /** 自定义指标收集函数 */
  onMetrics?: (metrics: PerformanceMetrics) => void | Promise<void>;
}
