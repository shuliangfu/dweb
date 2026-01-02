/**
 * 功能模块 - Logger (日志系统) 文档页面
 * 展示 DWeb 框架的日志系统功能和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "Logger (日志系统) - DWeb 框架文档",
  description:
    "DWeb 框架的日志系统使用指南，支持结构化日志、日志级别、日志轮转等功能",
};

export default function LoggerPage() {
  // 基本使用
  const basicUsageCode = `import { Logger, LogLevel } from "@dreamer/dweb";

// 创建日志器
const logger = new Logger({
  level: LogLevel.INFO,
});

// 记录日志
logger.debug("调试信息", { userId: 123 });
logger.info("用户登录", { userId: 123, ip: "192.168.1.1" });
logger.warn("警告信息", { message: "内存使用率较高" });
logger.error("错误信息", new Error("Something went wrong"), { userId: 123 });`;

  // 使用默认日志器
  const defaultLoggerCode = `import { getLogger } from "@dreamer/dweb";

const logger = getLogger();
logger.info("Hello World");`;

  // 文件日志
  const fileLoggerCode = `import {
  Logger,
  Logger as LoggerClass,
  LogLevel,
} from "@dreamer/dweb";

// 创建文件日志目标
const fileTarget = LoggerClass.createFileTarget("./logs/app.log", {
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5, // 保留 5 个文件
  interval: 24 * 60 * 60 * 1000, // 每天轮转
});

// 创建日志器
const logger = new Logger({
  level: LogLevel.INFO,
  targets: [fileTarget],
});`;

  // 控制台和文件日志
  const multiTargetCode = `import {
  Logger,
  Logger as LoggerClass,
  LogLevel,
} from "@dreamer/dweb";

const consoleTarget = LoggerClass.createConsoleTarget();
const fileTarget = LoggerClass.createFileTarget("./logs/app.log");

const logger = new Logger({
  level: LogLevel.DEBUG,
  targets: [consoleTarget, fileTarget],
});`;

  // 日志级别
  const logLevelsCode = `enum LogLevel {
  DEBUG = 0, // 调试信息
  INFO = 1,  // 一般信息
  WARN = 2,  // 警告信息
  ERROR = 3, // 错误信息
}

// 只有大于等于设置级别的日志才会被记录
const logger = new Logger({
  level: LogLevel.WARN, // 只记录 WARN 和 ERROR
});

logger.debug("不会记录"); // 不会输出
logger.info("不会记录"); // 不会输出
logger.warn("会记录"); // 会输出
logger.error("会记录"); // 会输出`;

  // JSON 格式化器
  const jsonFormatterCode = `import {
  Logger,
  Logger as LoggerClass,
  LogLevel,
} from "@dreamer/dweb";

const logger = new Logger({
  level: LogLevel.INFO,
  formatter: LoggerClass.createJSONFormatter(),
});

logger.info("用户登录", { userId: 123 });
// 输出: {"level":"INFO","message":"用户登录","timestamp":"2024-01-01T00:00:00.000Z","userId":123}`;

  // 简单文本格式化器
  const simpleFormatterCode = `import {
  Logger,
  Logger as LoggerClass,
  LogLevel,
} from "@dreamer/dweb";

const logger = new Logger({
  level: LogLevel.INFO,
  formatter: LoggerClass.createSimpleFormatter(),
});

logger.info("用户登录", { userId: 123 });
// 输出: [2024-01-01T00:00:00.000Z] INFO: 用户登录 {"userId":123}`;

  // 自定义格式化器
  const customFormatterCode = `import {
  type LogEntry,
  type LogFormatter,
  Logger,
  LogLevel,
} from "@dreamer/dweb";

class CustomFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    return \`\${entry.timestamp} [\${LogLevel[entry.level]}] \${entry.message}\`;
  }
}

const logger = new Logger({
  level: LogLevel.INFO,
  formatter: new CustomFormatter(),
});`;

  // 日志轮转
  const rotationCode = `import {
  Logger,
  Logger as LoggerClass,
  LogLevel,
} from "@dreamer/dweb";

const fileTarget = LoggerClass.createFileTarget("./logs/app.log", {
  maxSize: 10 * 1024 * 1024, // 10MB，超过此大小会轮转
  maxFiles: 5, // 保留 5 个历史文件
  interval: 24 * 60 * 60 * 1000, // 每 24 小时轮转一次
});

const logger = new Logger({
  level: LogLevel.INFO,
  targets: [fileTarget],
});

// 轮转后的文件命名：
// - app.log - 当前日志文件
// - app.log.1 - 最近的轮转文件
// - app.log.2 - 第二新的轮转文件
// ...`;

  // 在框架中使用
  const frameworkUsageCode =
    `import { Logger, LogLevel, setLogger } from "@dreamer/dweb";

// 创建自定义日志器
const logger = new Logger({
  level: LogLevel.INFO,
  targets: [
    Logger.createConsoleTarget(),
    Logger.createFileTarget("./logs/app.log"),
  ],
});

// 设置为全局日志器
setLogger(logger);

// 在其他地方使用
import { getLogger } from "@dreamer/dweb";
const logger = getLogger();
logger.info("使用全局日志器");`;

  // 在中间件中使用
  const middlewareUsageCode = `import { getLogger } from "@dreamer/dweb";
import type { Middleware } from "@dreamer/dweb";

const logger = getLogger();

const loggingMiddleware: Middleware = async (req, res, next) => {
  const start = Date.now();

  await next();

  const duration = Date.now() - start;
  logger.info("请求处理完成", {
    method: req.method,
    path: req.url,
    status: res.status,
    duration,
  });
};`;

  // LoggerOptions
  const loggerOptionsCode = `interface LoggerOptions {
  level?: LogLevel;
  formatter?: LogFormatter;
  targets?: LogTarget[];
  rotation?: LogRotationConfig;
}

interface LogRotationConfig {
  maxSize?: number; // 最大文件大小（字节）
  maxFiles?: number; // 保留的文件数量
  interval?: number; // 轮转间隔（毫秒）
}`;

  const bestPracticeCode = `// 好的实践
logger.info("用户登录", {
  userId: 123,
  ip: "192.168.1.1",
  timestamp: Date.now(),
});

// 不好的实践
logger.info(\`用户 \${userId} 从 \${ip} 登录\`);`;

  const content = {
    title: "Logger (日志系统)",
    description: "DWeb 框架提供了强大的日志系统，支持结构化日志、日志级别、日志轮转等功能。",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "基本使用",
            blocks: [
              {
                type: "code",
                code: basicUsageCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用默认日志器",
            blocks: [
              {
                type: "code",
                code: defaultLoggerCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "文件日志",
        blocks: [
          {
            type: "code",
            code: fileLoggerCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "控制台和文件日志",
        blocks: [
          {
            type: "code",
            code: multiTargetCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "日志级别",
        blocks: [
          {
            type: "code",
            code: logLevelsCode,
            language: "typescript",
          },
          {
            type: "text",
            content: "只有大于等于设置级别的日志才会被记录。",
          },
        ],
      },
      {
        title: "日志格式化",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "JSON 格式化器（默认）",
            blocks: [
              {
                type: "code",
                code: jsonFormatterCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "简单文本格式化器",
            blocks: [
              {
                type: "code",
                code: simpleFormatterCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "自定义格式化器",
            blocks: [
              {
                type: "code",
                code: customFormatterCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "日志轮转",
        blocks: [
          {
            type: "text",
            content: "日志轮转可以防止日志文件过大，支持按大小和时间轮转。",
          },
          {
            type: "code",
            code: rotationCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "在框架中使用",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "设置全局日志器",
            blocks: [
              {
                type: "code",
                code: frameworkUsageCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "在中间件中使用",
            blocks: [
              {
                type: "code",
                code: middlewareUsageCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "API 参考",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "Logger",
            blocks: [
              {
                type: "code",
                code: `new Logger(options?: LoggerOptions)`,
                language: "typescript",
              },
              {
                type: "code",
                code: loggerOptionsCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "方法",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`debug(message, data?)`** - 调试日志",
                  "**`info(message, data?)`** - 信息日志",
                  "**`warn(message, data?)`** - 警告日志",
                  "**`error(message, error?, data?)`** - 错误日志",
                  "**`flush()`** - 刷新所有输出目标",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "静态方法",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`createFileTarget(filePath, rotationConfig?)`** - 创建文件目标",
                  "**`createConsoleTarget()`** - 创建控制台目标",
                  "**`createSimpleFormatter()`** - 创建简单格式化器",
                  "**`createJSONFormatter()`** - 创建 JSON 格式化器",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "全局函数",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`getLogger()`** - 获取默认日志器",
                  "**`setLogger(logger)`** - 设置默认日志器",
                ],
              },
            ],
          },
        ],
      },
      {
        title: "最佳实践",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**选择合适的日志级别**：生产环境使用 INFO 或 WARN，开发环境使用 DEBUG",
              "**结构化日志**：使用 `data` 参数传递结构化数据，而不是字符串拼接",
              "**日志轮转**：配置日志轮转，防止日志文件过大",
              "**错误日志**：记录完整的错误信息，包括堆栈跟踪",
              "**性能考虑**：在高并发场景下，考虑使用异步日志目标",
            ],
          },
          {
            type: "code",
            code: bestPracticeCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "相关文档",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[logger 中间件](/docs/middleware/logger)",
              "[性能监控](/docs/features/monitoring)",
              "[Application](/docs/core/application) - 应用核心",
            ],
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
