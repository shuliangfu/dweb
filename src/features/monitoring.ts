/**
 * 监控模块
 * 提供请求监控、性能监控、错误监控等功能
 */

import type { Request, Response } from "../types/index.ts";

/**
 * 请求指标
 */
export interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  duration: number; // 毫秒
  timestamp: number;
  userAgent?: string;
  ip?: string;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  cpuUsage?: number;
  memoryUsage?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  uptime: number;
  requestCount: number;
  errorCount: number;
}

/**
 * 错误指标
 */
export interface ErrorMetrics {
  message: string;
  stack?: string;
  path: string;
  method: string;
  statusCode: number;
  timestamp: number;
  userAgent?: string;
  ip?: string;
}

/**
 * 监控选项
 */
export interface MonitoringOptions {
  /**
   * 是否启用请求监控（默认 true）
   */
  enableRequestMonitoring?: boolean;

  /**
   * 是否启用性能监控（默认 true）
   */
  enablePerformanceMonitoring?: boolean;

  /**
   * 是否启用错误监控（默认 true）
   */
  enableErrorMonitoring?: boolean;

  /**
   * 性能监控间隔（毫秒），默认 60000（1分钟）
   */
  performanceInterval?: number;

  /**
   * 请求指标回调
   */
  onRequest?: (metrics: RequestMetrics) => void;

  /**
   * 性能指标回调
   */
  onPerformance?: (metrics: PerformanceMetrics) => void;

  /**
   * 错误指标回调
   */
  onError?: (metrics: ErrorMetrics) => void;
}

/**
 * 监控器类
 */
export class Monitor {
  private options: MonitoringOptions;
  private requestCount: number = 0;
  private errorCount: number = 0;
  private startTime: number = Date.now();
  private performanceTimer?: number;

  constructor(options: MonitoringOptions = {}) {
    this.options = {
      enableRequestMonitoring: true,
      enablePerformanceMonitoring: true,
      enableErrorMonitoring: true,
      performanceInterval: 60000,
      ...options,
    };

    // 启动性能监控
    if (this.options.enablePerformanceMonitoring) {
      this.startPerformanceMonitoring();
    }
  }

  /**
   * 记录请求指标
   */
  recordRequest(req: Request, res: Response, duration: number): void {
    if (!this.options.enableRequestMonitoring) {
      return;
    }

    this.requestCount++;

    const url = new URL(req.url);
    const metrics: RequestMetrics = {
      method: req.method,
      path: url.pathname,
      statusCode: res.status,
      duration,
      timestamp: Date.now(),
      userAgent: req.headers.get("user-agent") || undefined,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("x-real-ip") ||
        "unknown",
    };

    if (this.options.onRequest) {
      this.options.onRequest(metrics);
    }
  }

  /**
   * 记录错误指标
   */
  recordError(error: Error, req: Request, res: Response): void {
    if (!this.options.enableErrorMonitoring) {
      return;
    }

    this.errorCount++;

    const url = new URL(req.url);
    const metrics: ErrorMetrics = {
      message: error.message,
      stack: error.stack,
      path: url.pathname,
      method: req.method,
      statusCode: res.status,
      timestamp: Date.now(),
      userAgent: req.headers.get("user-agent") || undefined,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("x-real-ip") ||
        "unknown",
    };

    if (this.options.onError) {
      this.options.onError(metrics);
    }
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const memoryUsage = Deno.memoryUsage();

    return {
      memoryUsage: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
      },
      uptime: Date.now() - this.startTime,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
    };
  }

  /**
   * 启动性能监控
   */
  private startPerformanceMonitoring(): void {
    if (!this.options.performanceInterval) {
      return;
    }

    this.performanceTimer = setInterval(() => {
      const metrics = this.getPerformanceMetrics();
      if (this.options.onPerformance) {
        this.options.onPerformance(metrics);
      }
    }, this.options.performanceInterval);
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (this.performanceTimer) {
      clearInterval(this.performanceTimer);
      this.performanceTimer = undefined;
    }
  }

  /**
   * 重置统计
   */
  reset(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }
}

/**
 * 默认监控器实例
 */
let defaultMonitor: Monitor | null = null;

/**
 * 获取默认监控器
 */
export function getMonitor(): Monitor {
  if (!defaultMonitor) {
    defaultMonitor = new Monitor();
  }
  return defaultMonitor;
}

/**
 * 设置默认监控器
 */
export function setMonitor(monitor: Monitor): void {
  defaultMonitor = monitor;
}
