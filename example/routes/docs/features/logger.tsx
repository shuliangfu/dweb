/**
 * 功能模块 - Logger (日志系统) 文档页面
 * 展示 DWeb 框架的日志系统功能和使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "Logger (日志系统) - DWeb 框架文档",
  description:
    "DWeb 框架的日志系统使用指南，支持结构化日志、日志级别、日志轮转等功能",
};

export default function LoggerPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
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

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        Logger (日志系统)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb
        框架提供了强大的日志系统，支持结构化日志、日志级别、日志轮转等功能。
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

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          使用默认日志器
        </h3>
        <CodeBlock code={defaultLoggerCode} language="typescript" />
      </section>

      {/* 文件日志 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          文件日志
        </h2>
        <CodeBlock code={fileLoggerCode} language="typescript" />
      </section>

      {/* 控制台和文件日志 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          控制台和文件日志
        </h2>
        <CodeBlock code={multiTargetCode} language="typescript" />
      </section>

      {/* 日志级别 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          日志级别
        </h2>
        <CodeBlock code={logLevelsCode} language="typescript" />
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
          只有大于等于设置级别的日志才会被记录。
        </p>
      </section>

      {/* 日志格式化 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          日志格式化
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          JSON 格式化器（默认）
        </h3>
        <CodeBlock code={jsonFormatterCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          简单文本格式化器
        </h3>
        <CodeBlock code={simpleFormatterCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          自定义格式化器
        </h3>
        <CodeBlock code={customFormatterCode} language="typescript" />
      </section>

      {/* 日志轮转 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          日志轮转
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          日志轮转可以防止日志文件过大，支持按大小和时间轮转。
        </p>
        <CodeBlock code={rotationCode} language="typescript" />
      </section>

      {/* 在框架中使用 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          在框架中使用
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          设置全局日志器
        </h3>
        <CodeBlock code={frameworkUsageCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          在中间件中使用
        </h3>
        <CodeBlock code={middlewareUsageCode} language="typescript" />
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          Logger
        </h3>
        <CodeBlock
          code={`new Logger(options?: LoggerOptions)`}
          language="typescript"
        />
        <CodeBlock code={loggerOptionsCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方法
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              debug(message, data?)
            </code>{" "}
            - 调试日志
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              info(message, data?)
            </code>{" "}
            - 信息日志
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              warn(message, data?)
            </code>{" "}
            - 警告日志
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              error(message, error?, data?)
            </code>{" "}
            - 错误日志
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              flush()
            </code>{" "}
            - 刷新所有输出目标
          </li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          静态方法
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              createFileTarget(filePath, rotationConfig?)
            </code>{" "}
            - 创建文件目标
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              createConsoleTarget()
            </code>{" "}
            - 创建控制台目标
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              createSimpleFormatter()
            </code>{" "}
            - 创建简单格式化器
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              createJSONFormatter()
            </code>{" "}
            - 创建 JSON 格式化器
          </li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          全局函数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              getLogger()
            </code>{" "}
            - 获取默认日志器
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              setLogger(logger)
            </code>{" "}
            - 设置默认日志器
          </li>
        </ul>
      </section>

      {/* 最佳实践 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          最佳实践
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <strong>选择合适的日志级别</strong>：生产环境使用 INFO 或
            WARN，开发环境使用 DEBUG
          </li>
          <li>
            <strong>结构化日志</strong>：使用{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              data
            </code>{" "}
            参数传递结构化数据，而不是字符串拼接
          </li>
          <li>
            <strong>日志轮转</strong>：配置日志轮转，防止日志文件过大
          </li>
          <li>
            <strong>错误日志</strong>：记录完整的错误信息，包括堆栈跟踪
          </li>
          <li>
            <strong>性能考虑</strong>：在高并发场景下，考虑使用异步日志目标
          </li>
        </ul>
        <CodeBlock
          code={`// 好的实践
logger.info("用户登录", {
  userId: 123,
  ip: "192.168.1.1",
  timestamp: Date.now(),
});

// 不好的实践
logger.info(\`用户 \${userId} 从 \${ip} 登录\`);`}
          language="typescript"
        />
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/middleware/logger"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              logger 中间件
            </a>
          </li>
          <li>
            <a
              href="/docs/features/monitoring"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              性能监控
            </a>
          </li>
          <li>
            <a
              href="/docs/core/application"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Application
            </a>{" "}
            - 应用核心
          </li>
        </ul>
      </section>
    </article>
  );
}
