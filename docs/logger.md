# 日志系统

DWeb 框架提供了强大的日志系统，支持结构化日志、日志级别、日志轮转等功能。

## 目录结构

```
src/features/logger.ts  # 日志系统实现
```

## 快速开始

### 基本使用

```typescript
import { Logger, LogLevel } from '@dreamer/dweb/features/logger';

// 创建日志器
const logger = new Logger({
  level: LogLevel.INFO,
});

// 记录日志
logger.debug('调试信息', { userId: 123 });
logger.info('用户登录', { userId: 123, ip: '192.168.1.1' });
logger.warn('警告信息', { message: '内存使用率较高' });
logger.error('错误信息', new Error('Something went wrong'), { userId: 123 });
```

### 使用默认日志器

```typescript
import { getLogger } from '@dreamer/dweb/features/logger';

const logger = getLogger();
logger.info('Hello World');
```

### 文件日志

```typescript
import { Logger, LogLevel, Logger as LoggerClass } from '@dreamer/dweb/features/logger';

// 创建文件日志目标
const fileTarget = LoggerClass.createFileTarget('./logs/app.log', {
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,                // 保留 5 个文件
  interval: 24 * 60 * 60 * 1000, // 每天轮转
});

// 创建日志器
const logger = new Logger({
  level: LogLevel.INFO,
  targets: [fileTarget],
});
```

### 控制台和文件日志

```typescript
import { Logger, LogLevel, Logger as LoggerClass } from '@dreamer/dweb/features/logger';

const consoleTarget = LoggerClass.createConsoleTarget();
const fileTarget = LoggerClass.createFileTarget('./logs/app.log');

const logger = new Logger({
  level: LogLevel.DEBUG,
  targets: [consoleTarget, fileTarget],
});
```

## 日志级别

```typescript
enum LogLevel {
  DEBUG = 0,  // 调试信息
  INFO = 1,   // 一般信息
  WARN = 2,   // 警告信息
  ERROR = 3,  // 错误信息
}
```

只有大于等于设置级别的日志才会被记录。

```typescript
const logger = new Logger({
  level: LogLevel.WARN, // 只记录 WARN 和 ERROR
});

logger.debug('不会记录'); // 不会输出
logger.info('不会记录');  // 不会输出
logger.warn('会记录');    // 会输出
logger.error('会记录');   // 会输出
```

## 日志格式化

### JSON 格式化器（默认）

```typescript
import { Logger, LogLevel, Logger as LoggerClass } from '@dreamer/dweb/features/logger';

const logger = new Logger({
  level: LogLevel.INFO,
  formatter: LoggerClass.createJSONFormatter(),
});

logger.info('用户登录', { userId: 123 });
// 输出: {"level":"INFO","message":"用户登录","timestamp":"2024-01-01T00:00:00.000Z","userId":123}
```

### 简单文本格式化器

```typescript
import { Logger, LogLevel, Logger as LoggerClass } from '@dreamer/dweb/features/logger';

const logger = new Logger({
  level: LogLevel.INFO,
  formatter: LoggerClass.createSimpleFormatter(),
});

logger.info('用户登录', { userId: 123 });
// 输出: [2024-01-01T00:00:00.000Z] INFO: 用户登录 {"userId":123}
```

### 自定义格式化器

```typescript
import { Logger, LogLevel, type LogFormatter, type LogEntry } from '@dreamer/dweb/features/logger';

class CustomFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    return `${entry.timestamp} [${LogLevel[entry.level]}] ${entry.message}`;
  }
}

const logger = new Logger({
  level: LogLevel.INFO,
  formatter: new CustomFormatter(),
});
```

## 日志输出目标

### 控制台输出（默认）

```typescript
import { Logger, LogLevel, Logger as LoggerClass } from '@dreamer/dweb/features/logger';

const logger = new Logger({
  level: LogLevel.INFO,
  targets: [LoggerClass.createConsoleTarget()],
});
```

### 文件输出

```typescript
import { Logger, LogLevel, Logger as LoggerClass } from '@dreamer/dweb/features/logger';

const fileTarget = LoggerClass.createFileTarget('./logs/app.log', {
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,                // 保留 5 个文件
  interval: 24 * 60 * 60 * 1000, // 每天轮转
});

const logger = new Logger({
  level: LogLevel.INFO,
  targets: [fileTarget],
});
```

### 自定义输出目标

```typescript
import { Logger, LogLevel, type LogTarget, type LogEntry } from '@dreamer/dweb/features/logger';

class DatabaseTarget implements LogTarget {
  async write(entry: LogEntry): Promise<void> {
    // 写入数据库
    await db.logs.insert(entry);
  }
  
  async flush(): Promise<void> {
    // 刷新缓冲区
  }
}

const logger = new Logger({
  level: LogLevel.INFO,
  targets: [new DatabaseTarget()],
});
```

## 日志轮转

日志轮转可以防止日志文件过大，支持按大小和时间轮转。

```typescript
import { Logger, LogLevel, Logger as LoggerClass } from '@dreamer/dweb/features/logger';

const fileTarget = LoggerClass.createFileTarget('./logs/app.log', {
  maxSize: 10 * 1024 * 1024,    // 10MB，超过此大小会轮转
  maxFiles: 5,                   // 保留 5 个历史文件
  interval: 24 * 60 * 60 * 1000, // 每 24 小时轮转一次
});

const logger = new Logger({
  level: LogLevel.INFO,
  targets: [fileTarget],
});
```

轮转后的文件命名：
- `app.log` - 当前日志文件
- `app.log.1` - 最近的轮转文件
- `app.log.2` - 第二新的轮转文件
- ...

## 在框架中使用

### 设置全局日志器

```typescript
import { setLogger, Logger, LogLevel } from '@dreamer/dweb/features/logger';

// 创建自定义日志器
const logger = new Logger({
  level: LogLevel.INFO,
  targets: [
    Logger.createConsoleTarget(),
    Logger.createFileTarget('./logs/app.log'),
  ],
});

// 设置为全局日志器
setLogger(logger);

// 在其他地方使用
import { getLogger } from '@dreamer/dweb/features/logger';
const logger = getLogger();
logger.info('使用全局日志器');
```

### 在中间件中使用

```typescript
import { getLogger } from '@dreamer/dweb/features/logger';

const logger = getLogger();

const loggingMiddleware: Middleware = async (req, res, next) => {
  const start = Date.now();
  
  await next();
  
  const duration = Date.now() - start;
  logger.info('请求处理完成', {
    method: req.method,
    path: req.path,
    status: res.status,
    duration,
  });
};
```

## API 参考

### Logger

#### 构造函数

```typescript
new Logger(options?: LoggerOptions)
```

#### 方法

- `debug(message: string, data?: Record<string, unknown>): void` - 调试日志
- `info(message: string, data?: Record<string, unknown>): void` - 信息日志
- `warn(message: string, data?: Record<string, unknown>): void` - 警告日志
- `error(message: string, error?: Error, data?: Record<string, unknown>): void` - 错误日志
- `flush(): Promise<void>` - 刷新所有输出目标

#### 静态方法

- `createFileTarget(filePath: string, rotationConfig?: LogRotationConfig): FileTarget` - 创建文件目标
- `createConsoleTarget(): ConsoleTarget` - 创建控制台目标
- `createSimpleFormatter(): SimpleFormatter` - 创建简单格式化器
- `createJSONFormatter(): JSONFormatter` - 创建 JSON 格式化器

### 全局函数

- `getLogger(): Logger` - 获取默认日志器
- `setLogger(logger: Logger): void` - 设置默认日志器

### 类型定义

```typescript
interface LoggerOptions {
  level?: LogLevel;
  formatter?: LogFormatter;
  targets?: LogTarget[];
  rotation?: LogRotationConfig;
}

interface LogRotationConfig {
  maxSize?: number;    // 最大文件大小（字节）
  maxFiles?: number;   // 保留的文件数量
  interval?: number;    // 轮转间隔（毫秒）
}
```

## 最佳实践

1. **选择合适的日志级别**：生产环境使用 INFO 或 WARN，开发环境使用 DEBUG
2. **结构化日志**：使用 `data` 参数传递结构化数据，而不是字符串拼接
3. **日志轮转**：配置日志轮转，防止日志文件过大
4. **错误日志**：记录完整的错误信息，包括堆栈跟踪
5. **性能考虑**：在高并发场景下，考虑使用异步日志目标

```typescript
// 好的实践
logger.info('用户登录', {
  userId: 123,
  ip: '192.168.1.1',
  timestamp: Date.now(),
});

// 不好的实践
logger.info(`用户 ${userId} 从 ${ip} 登录`);
```

