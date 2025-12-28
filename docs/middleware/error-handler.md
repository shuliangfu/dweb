### errorHandler - 错误处理

```typescript
import { errorHandler } from "@dreamer/dweb/middleware";

server.use(errorHandler({
  debug: true, // 是否在开发环境中显示详细错误信息（默认 true）
  formatError: (error, req) => { // 自定义错误格式化函数，接收错误对象和请求对象，返回格式化后的错误信息对象
    return {
      error: error.name,
      message: error.message,
      statusCode: 500,
      details: error.stack,
    };
  },
  onError: (error, req) => { // 错误日志记录函数，接收错误对象和请求对象
    console.error("错误:", error);
  },
  defaultMessage: "Internal Server Error", // 默认错误消息（当无法获取错误消息时使用）
  logStack: true, // 是否记录错误堆栈（默认在开发环境中记录）
  skip: ["/health"], // 跳过错误处理的路径数组（支持 glob 模式）
}));
```

#### 配置选项

**可选参数：**

- `debug` - 是否在开发环境中显示详细错误信息（默认 true）
- `formatError` - 自定义错误格式化函数，接收错误对象和请求对象，返回格式化后的错误信息对象（包含 error, message, statusCode, details）
- `onError` - 错误日志记录函数，接收错误对象和请求对象
- `defaultMessage` - 默认错误消息（当无法获取错误消息时使用）
- `logStack` - 是否记录错误堆栈（默认在开发环境中记录）
- `skip` - 跳过错误处理的路径数组（支持 glob 模式）
