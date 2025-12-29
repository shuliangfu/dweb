/**
 * 统一错误处理模块
 * 提供全局异常捕获和统一错误响应格式
 *
 * @module core/error-handler
 */

import type { Request, Response } from "../common/types/index.ts";
import { type Logger } from "../features/logger.ts";

/**
 * 错误响应格式接口
 */
export interface ErrorResponse {
  code: number;
  message: string;
  details?: unknown;
  stack?: string;
  requestId?: string;
}

/**
 * 错误处理器接口
 */
export interface ErrorHandler {
  /**
   * 处理错误
   * @param error - 捕获的错误对象
   * @param req - 请求对象
   * @param res - 响应对象
   */
  handle(error: unknown, req: Request, res: Response): Promise<void> | void;
}

/**
 * 默认错误处理器配置
 */
export interface DefaultErrorHandlerConfig {
  /**
   * 是否在响应中包含错误堆栈（建议仅在开发环境启用）
   */
  includeStack?: boolean;
  /**
   * 默认错误状态码
   */
  defaultStatus?: number;
  /**
   * 响应格式 ('json' | 'html' | 'auto')
   */
  format?: "json" | "html" | "auto";
}

/**
 * 默认错误处理器
 * 提供 JSON 和 HTML 两种格式的错误响应
 */
export class DefaultErrorHandler implements ErrorHandler {
  private config: DefaultErrorHandlerConfig;
  private logger?: Logger;

  constructor(config: DefaultErrorHandlerConfig = {}, logger?: Logger) {
    this.config = {
      includeStack: false,
      defaultStatus: 500,
      format: "auto",
      ...config,
    };
    this.logger = logger;
  }

  /**
   * 设置日志记录器
   */
  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  /**
   * 处理错误
   */
  handle(error: unknown, req: Request, res: Response): void {
    const status = this.getStatusFromError(error) || this.config.defaultStatus!;
    const message = this.getMessageFromError(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // 记录错误日志
    if (this.logger) {
      const logData = {
        status,
        url: req.url,
        method: req.method,
        ip: req.headers.get("x-forwarded-for") ||
          req.headers.get("remote-addr"),
      };

      const errorObj = error instanceof Error ? error : undefined;
      if (!errorObj) {
        Object.assign(logData, { error: error });
      }

      this.logger.error(
        `[ErrorHandler] ${req.method} ${req.url} - ${message}`,
        errorObj,
        logData,
      );
    } else {
      console.error(`[ErrorHandler] ${req.method} ${req.url} - ${message}`);
      if (stack) console.error(stack);
    }

    // 设置响应状态码
    res.status = status;

    // 确定响应格式
    const format = this.determineFormat(req);

    if (format === "json") {
      this.sendJsonError(res, status, message, stack);
    } else {
      this.sendHtmlError(res, status, message, stack);
    }
  }

  /**
   * 从错误对象获取状态码
   */
  private getStatusFromError(error: unknown): number | undefined {
    if (typeof error === "object" && error !== null) {
      // 支持 http-errors 风格的 status 属性
      if ("status" in error && typeof (error as any).status === "number") {
        return (error as any).status;
      }
      if (
        "statusCode" in error && typeof (error as any).statusCode === "number"
      ) {
        return (error as any).statusCode;
      }
    }
    return undefined;
  }

  /**
   * 从错误对象获取错误消息
   */
  private getMessageFromError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return "Unknown Error";
  }

  /**
   * 确定响应格式
   */
  private determineFormat(req: Request): "json" | "html" {
    if (this.config.format !== "auto") {
      return this.config.format as "json" | "html";
    }

    const accept = req.headers.get("accept") || "";
    if (accept.includes("application/json")) {
      return "json";
    }
    return "html";
  }

  /**
   * 发送 JSON 错误响应
   */
  private sendJsonError(
    res: Response,
    status: number,
    message: string,
    stack?: string,
  ): void {
    const response: ErrorResponse = {
      code: status,
      message,
    };

    if (this.config.includeStack && stack) {
      response.stack = stack;
    }

    res.json(response);
  }

  /**
   * 发送 HTML 错误响应
   */
  private sendHtmlError(
    res: Response,
    status: number,
    message: string,
    stack?: string,
  ): void {
    const stackHtml = this.config.includeStack && stack
      ? `<pre class="stack-trace">${this.escapeHtml(stack)}</pre>`
      : "";

    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${status} - ${this.escapeHtml(message)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f8f9fa;
      color: #333;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .error-container {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 40px;
      max-width: 800px;
      width: 100%;
      text-align: center;
    }
    h1 {
      color: #dc3545;
      margin-top: 0;
      font-size: 48px;
      margin-bottom: 10px;
    }
    h2 {
      font-weight: 400;
      margin-bottom: 20px;
      color: #6c757d;
    }
    p {
      font-size: 18px;
      line-height: 1.6;
    }
    .stack-trace {
      text-align: left;
      background-color: #f1f3f5;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      margin-top: 20px;
      font-size: 14px;
      font-family: source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace;
      white-space: pre-wrap;
    }
    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    .btn:hover {
      background-color: #0056b3;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>${status}</h1>
    <h2>${this.escapeHtml(message)}</h2>
    <p>抱歉，服务器遇到错误，无法完成您的请求。</p>
    ${stackHtml}
    <a href="/" class="btn">返回首页</a>
  </div>
</body>
</html>
    `;

    res.html(html, { status });
  }

  /**
   * HTML 转义
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
