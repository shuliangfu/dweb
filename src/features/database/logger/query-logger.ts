/**
 * 查询日志记录器
 */

/**
 * 查询日志条目
 */
export interface QueryLogEntry {
  /**
   * 查询类型：'query' | 'execute'
   */
  type: "query" | "execute";
  /**
   * SQL 或查询操作
   */
  sql: string;
  /**
   * 查询参数
   */
  params?: any[];
  /**
   * 执行时间（毫秒）
   */
  duration: number;
  /**
   * 时间戳
   */
  timestamp: Date;
  /**
   * 是否慢查询
   */
  slow?: boolean;
  /**
   * 错误信息（如果有）
   */
  error?: string;
}

/**
 * 查询日志配置
 */
export interface QueryLoggerConfig {
  /**
   * 是否启用日志
   */
  enabled?: boolean;
  /**
   * 慢查询阈值（毫秒）
   */
  slowQueryThreshold?: number;
  /**
   * 日志处理器
   */
  handler?: (entry: QueryLogEntry) => void | Promise<void>;
}

/**
 * 查询日志记录器
 */
export class QueryLogger {
  private config: QueryLoggerConfig;
  private logs: QueryLogEntry[] = [];
  private maxLogs: number = 1000; // 最多保存 1000 条日志

  constructor(config: QueryLoggerConfig = {}) {
    this.config = {
      enabled: true,
      slowQueryThreshold: 1000, // 默认 1 秒
      ...config,
    };
  }

  /**
   * 记录查询日志
   */
  async log(
    type: "query" | "execute",
    sql: string,
    params?: any[],
    duration?: number,
    error?: Error,
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const entry: QueryLogEntry = {
      type,
      sql,
      params,
      duration: duration || 0,
      timestamp: new Date(),
      slow: duration
        ? duration > (this.config.slowQueryThreshold || 1000)
        : false,
      error: error?.message,
    };

    // 保存到内存
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // 移除最旧的日志
    }

    // 调用自定义处理器
    if (this.config.handler) {
      await this.config.handler(entry);
    }
  }

  /**
   * 获取所有日志
   */
  getLogs(): QueryLogEntry[] {
    return [...this.logs];
  }

  /**
   * 获取慢查询日志
   */
  getSlowQueries(threshold?: number): QueryLogEntry[] {
    const thresholdMs = threshold || this.config.slowQueryThreshold || 1000;
    return this.logs.filter((log) => log.duration > thresholdMs);
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    slow: number;
    errors: number;
    averageDuration: number;
  } {
    const total = this.logs.length;
    const slow = this.logs.filter((log) => log.slow).length;
    const errors = this.logs.filter((log) => log.error).length;
    const averageDuration = total > 0
      ? this.logs.reduce((sum, log) => sum + log.duration, 0) / total
      : 0;

    return {
      total,
      slow,
      errors,
      averageDuration: Math.round(averageDuration * 100) / 100,
    };
  }
}
