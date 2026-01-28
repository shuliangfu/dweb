/**
 * 日志系统模块
 * 提供结构化日志、日志级别、日志轮转等功能
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
  error?: Error;
}

/**
 * 日志格式化器接口
 */
export interface LogFormatter {
  format(entry: LogEntry): string;
}

/**
 * 日志输出目标接口
 */
export interface LogTarget {
  write(entry: LogEntry): Promise<void> | void;
  flush?(): Promise<void> | void;
  setFormatter?(formatter: LogFormatter): void;
}

/**
 * 日志轮转配置
 */
export interface LogRotationConfig {
  /**
   * 最大文件大小（字节），默认 10MB
   */
  maxSize?: number;

  /**
   * 保留的文件数量，默认 5
   */
  maxFiles?: number;

  /**
   * 轮转间隔（毫秒），默认 86400000（1天）
   */
  interval?: number;
}

/**
 * 日志选项
 */
export interface LoggerOptions {
  /**
   * 日志级别（默认 INFO）
   */
  level?: LogLevel;

  /**
   * 日志格式化器（默认 JSON 格式）
   */
  formatter?: LogFormatter;

  /**
   * 日志输出目标（默认控制台）
   */
  targets?: LogTarget[];

  /**
   * 是否启用日志轮转（默认 false）
   */
  rotation?: LogRotationConfig;

  /**
   * 需要脱敏的字段（默认 ["password", "token", "secret", "authorization"]）
   */
  maskFields?: string[];

  /**
   * 过滤：不输出消息包含任一关键词的日志（大小写不敏感）
   */
  exclude?: string[];

  /**
   * 过滤：不输出消息匹配任一正则的日志（RegExp 或正则字符串）
   */
  excludePatterns?: (RegExp | string)[];
}

/**
 * JSON 格式化器
 */
class JSONFormatter implements LogFormatter {
  private maskFields: string[];

  constructor(
    maskFields: string[] = ["password", "token", "secret", "authorization"],
  ) {
    this.maskFields = maskFields;
  }

  private maskData(data: Record<string, unknown>): Record<string, unknown> {
    const masked = { ...data };
    for (const key in masked) {
      if (this.maskFields.some((field) => key.toLowerCase().includes(field))) {
        masked[key] = "******";
      } else if (typeof masked[key] === "object" && masked[key] !== null) {
        masked[key] = this.maskData(masked[key] as Record<string, unknown>);
      }
    }
    return masked;
  }

  format(entry: LogEntry): string {
    const logData: Record<string, unknown> = {
      level: LogLevel[entry.level],
      message: entry.message,
      timestamp: entry.timestamp,
    };

    if (entry.data) {
      Object.assign(logData, this.maskData(entry.data));
    }

    if (entry.error) {
      logData.error = {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
      };
    }

    return JSON.stringify(logData);
  }
}

/**
 * 简单文本格式化器
 */
class SimpleFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp;
    let output = `[${timestamp}] ${levelName}: ${entry.message}`;

    if (entry.data) {
      try {
        output += ` ${JSON.stringify(entry.data)}`;
      } catch {
        output += " [Error: Circular data]";
      }
    }

    if (entry.error) {
      output += `\n${entry.error.stack || entry.error.message}`;
    }

    return output;
  }
}

/**
 * 控制台输出目标
 */
class ConsoleTarget implements LogTarget {
  private formatter: LogFormatter = new SimpleFormatter();

  setFormatter(formatter: LogFormatter): void {
    this.formatter = formatter;
  }

  write(entry: LogEntry): void {
    const output = this.formatter.format(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
        console.error(output);
        break;
    }
  }
}

/**
 * 文件输出目标
 */
class FileTarget implements LogTarget {
  private filePath: string;
  private rotationConfig?: LogRotationConfig;
  private currentSize: number = 0;
  private rotationTimer?: number;
  private formatter: LogFormatter = new SimpleFormatter();

  constructor(filePath: string, rotationConfig?: LogRotationConfig) {
    this.filePath = filePath;
    this.rotationConfig = rotationConfig;

    // 初始化文件大小
    this.updateFileSize();

    // 设置轮转定时器
    if (rotationConfig?.interval) {
      this.rotationTimer = setInterval(() => {
        this.rotate();
      }, rotationConfig.interval);
    }
  }

  setFormatter(formatter: LogFormatter): void {
    this.formatter = formatter;
  }

  private async updateFileSize(): Promise<void> {
    try {
      const stat = await Deno.stat(this.filePath);
      this.currentSize = stat.size;
    } catch {
      this.currentSize = 0;
    }
  }

  private async rotate(): Promise<void> {
    try {
      const maxFiles = this.rotationConfig?.maxFiles || 5;

      // 删除最旧的文件
      for (let i = maxFiles - 1; i >= 1; i--) {
        const oldFile = `${this.filePath}.${i}`;
        const newFile = `${this.filePath}.${i + 1}`;

        try {
          await Deno.rename(oldFile, newFile);
        } catch {
          // 文件不存在时忽略
        }
      }

      // 重命名当前文件
      try {
        await Deno.rename(this.filePath, `${this.filePath}.1`);
      } catch {
        // 文件不存在时忽略
      }

      this.currentSize = 0;
    } catch (error) {
      console.error("日志轮转失败:", error);
    }
  }

  async write(entry: LogEntry): Promise<void> {
    const formatter = new SimpleFormatter();
    const line = formatter.format(entry) + "\n";
    const bytes = new TextEncoder().encode(line);

    // 检查是否需要轮转
    if (
      this.rotationConfig?.maxSize &&
      this.currentSize + bytes.length > this.rotationConfig.maxSize
    ) {
      await this.rotate();
    }

    // 追加到文件
    try {
      await Deno.writeFile(this.filePath, bytes, { append: true });
      this.currentSize += bytes.length;
    } catch (error) {
      console.error("写入日志文件失败:", error);
    }
  }

  async flush(): Promise<void> {
    // 文件写入是同步的，不需要刷新
  }

  destroy(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
  }
}

/**
 * 日志器类
 */
export class Logger {
  private level: LogLevel;
  private formatter: LogFormatter;
  private targets: LogTarget[];
  /** 过滤：消息包含任一关键词则不输出（小写匹配，大小写不敏感） */
  private excludeKeywords: string[] = [];
  /** 过滤：消息匹配任一正则则不输出 */
  private excludePatterns: RegExp[] = [];

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.formatter = options.formatter ?? new JSONFormatter(options.maskFields);
    this.targets = options.targets ?? [new ConsoleTarget()];

    // 过滤配置：关键词转小写便于不区分大小写匹配
    if (options.exclude?.length) {
      this.excludeKeywords = options.exclude.map((s) => s.toLowerCase());
    }
    if (options.excludePatterns?.length) {
      this.excludePatterns = options.excludePatterns.map((p) =>
        typeof p === "string" ? new RegExp(p) : p
      );
    }

    // 将格式化器注入到所有目标中
    for (const target of this.targets) {
      if (target.setFormatter) {
        target.setFormatter(this.formatter);
      }
    }

    // 如果启用了文件输出和轮转
    if (options.rotation) {
      // 这里可以添加文件目标
      // 为了简化，文件目标需要单独配置
    }
  }

  /**
   * 判断当前日志条目是否应被过滤掉（不输出）
   */
  private shouldFilterOut(message: string): boolean {
    const msgLower = message.toLowerCase();
    if (this.excludeKeywords.some((kw) => msgLower.includes(kw))) {
      return true;
    }
    if (this.excludePatterns.some((re) => re.test(message))) {
      return true;
    }
    return false;
  }

  /**
   * 记录日志
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error,
  ): void {
    if (level < this.level) {
      return;
    }

    if (this.shouldFilterOut(message)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
      error,
    };

    for (const target of this.targets) {
      try {
        target.write(entry);
      } catch (err) {
        console.error("日志输出失败:", err);
      }
    }
  }

  /**
   * 调试日志
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * 信息日志
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * 警告日志
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * 错误日志
   */
  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  /**
   * 刷新所有输出目标
   */
  async flush(): Promise<void> {
    for (const target of this.targets) {
      if (target.flush) {
        await target.flush();
      }
    }
  }

  /**
   * 创建文件日志目标
   */
  static createFileTarget(
    filePath: string,
    rotationConfig?: LogRotationConfig,
  ): FileTarget {
    return new FileTarget(filePath, rotationConfig);
  }

  /**
   * 创建控制台日志目标
   */
  static createConsoleTarget(): ConsoleTarget {
    return new ConsoleTarget();
  }

  /**
   * 创建简单格式化器
   */
  static createSimpleFormatter(): SimpleFormatter {
    return new SimpleFormatter();
  }

  /**
   * 创建 JSON 格式化器
   */
  static createJSONFormatter(maskFields?: string[]): JSONFormatter {
    return new JSONFormatter(maskFields);
  }
}

/**
 * 默认日志器实例
 */
let defaultLogger: Logger | null = null;

/**
 * 获取默认日志器
 */
export function getLogger(): Logger {
  if (!defaultLogger) {
    defaultLogger = new Logger();
  }
  return defaultLogger;
}

/**
 * 设置默认日志器
 */
export function setLogger(logger: Logger): void {
  defaultLogger = logger;
}
