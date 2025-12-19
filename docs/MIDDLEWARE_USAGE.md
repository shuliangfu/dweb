# 中间件使用指南

## 新增中间件使用示例

### 1. IP 过滤中间件 (ip-filter)

用于限制或允许特定 IP 地址访问。

#### 基本用法

```typescript
import { ipFilter } from "@dreamer/dweb";

export default {
  middleware: [
    // 白名单模式：只允许特定 IP 访问
    ipFilter({
      whitelist: ['192.168.1.100', '10.0.0.0/8'],
      whitelistMode: true,
      skip: ['/public/*'], // 跳过公共路径
    }),
    
    // 黑名单模式：禁止特定 IP 访问
    ipFilter({
      blacklist: ['192.168.1.200', '172.16.0.0/12'],
      message: 'Your IP has been blocked',
      statusCode: 403,
    }),
  ],
};
```

#### 支持 CIDR 格式

```typescript
ipFilter({
  whitelist: [
    '192.168.1.100',        // 单个 IP
    '10.0.0.0/8',           // CIDR 网段
    '172.16.0.0/12',        // 另一个网段
  ],
  whitelistMode: true,
});
```

#### 自定义 IP 获取函数

```typescript
ipFilter({
  blacklist: ['192.168.1.200'],
  getClientIP: (req) => {
    // 自定义 IP 获取逻辑
    return req.headers.get('x-custom-ip') || 'unknown';
  },
});
```

---

### 2. 请求 ID 中间件 (request-id)

为每个请求生成唯一 ID，便于日志追踪和问题排查。

#### 基本用法

```typescript
import { requestId } from "@dreamer/dweb";

export default {
  middleware: [
    // 默认配置：生成 UUID 并在响应头中返回
    requestId(),
    
    // 自定义配置
    requestId({
      headerName: 'X-Request-Id',
      exposeHeader: true,
      skip: ['/health', '/metrics'], // 跳过健康检查
      useHeader: true, // 如果请求头中已有 ID，则使用它
    }),
  ],
};
```

#### 自定义 ID 生成器

```typescript
requestId({
  generator: () => {
    // 使用时间戳 + 随机数生成 ID
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  },
});
```

#### 在代码中使用请求 ID

```typescript
// 在路由处理函数中访问请求 ID
export async function GET(req: Request) {
  // 请求 ID 已附加到请求对象
  const requestId = (req as unknown as { requestId?: string }).requestId;
  console.log(`Processing request: ${requestId}`);
  
  return Response.json({ data: 'success', requestId });
}
```

---

### 3. 统一错误处理中间件 (error-handler)

捕获和处理应用程序中的错误，提供统一的错误响应格式。

#### 基本用法

```typescript
import { errorHandler } from "@dreamer/dweb";

export default {
  middleware: [
    // 默认配置：开发环境显示详细错误
    errorHandler(),
    
    // 生产环境配置
    errorHandler({
      debug: false, // 不显示详细错误信息
      logStack: false, // 不记录堆栈信息
      defaultMessage: 'An error occurred',
      skip: ['/health'], // 跳过健康检查
    }),
  ],
};
```

#### 自定义错误格式化

```typescript
errorHandler({
  formatError: (error, req) => {
    return {
      error: error.name,
      message: error.message,
      statusCode: error.statusCode || 500,
      timestamp: new Date().toISOString(),
      path: req.url,
    };
  },
  onError: (error, req) => {
    // 自定义错误日志记录
    console.error('Error occurred:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
    });
  },
});
```

#### 在路由中抛出错误

```typescript
export async function GET(req: Request) {
  // 抛出错误，error-handler 会自动捕获并格式化
  throw new Error('Something went wrong');
  
  // 或者使用带状态码的错误
  const error = new Error('Not found') as Error & { statusCode: number };
  error.statusCode = 404;
  throw error;
}
```

---

### 4. 请求验证中间件 (request-validator)

验证请求参数、查询参数和请求体。

#### 基本用法

```typescript
import { requestValidator } from "@dreamer/dweb";

export default {
  middleware: [
    // 验证查询参数
    requestValidator({
      validation: {
        query: [
          {
            field: 'page',
            type: 'number',
            required: false,
            min: 1,
            max: 1000,
          },
          {
            field: 'limit',
            type: 'number',
            required: false,
            min: 1,
            max: 100,
          },
        ],
      },
    }),
  ],
};
```

#### 验证请求体

```typescript
requestValidator({
  validation: {
    body: [
      {
        field: 'email',
        type: 'email',
        required: true,
        message: 'Email is required and must be valid',
      },
      {
        field: 'password',
        type: 'string',
        required: true,
        minLength: 8,
        maxLength: 100,
        message: 'Password must be between 8 and 100 characters',
      },
      {
        field: 'age',
        type: 'number',
        required: false,
        min: 18,
        max: 120,
      },
    ],
    allowExtra: false, // 不允许额外字段
  },
});
```

#### 复杂验证规则

```typescript
requestValidator({
  validation: {
    body: [
      {
        field: 'username',
        type: 'string',
        required: true,
        minLength: 3,
        maxLength: 20,
        pattern: /^[a-zA-Z0-9_]+$/, // 只允许字母、数字和下划线
        message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores',
      },
      {
        field: 'role',
        type: 'string',
        required: true,
        enum: ['admin', 'user', 'guest'], // 枚举值
      },
      {
        field: 'profile',
        type: 'object',
        required: false,
        properties: {
          // 嵌套对象验证
          name: {
            field: 'name',
            type: 'string',
            required: true,
            minLength: 1,
          },
          bio: {
            field: 'bio',
            type: 'string',
            required: false,
            maxLength: 500,
          },
        },
      },
    ],
  },
});
```

#### 自定义验证函数

```typescript
requestValidator({
  validation: {
    body: [
      {
        field: 'password',
        type: 'string',
        required: true,
        validate: (value, field) => {
          if (typeof value !== 'string') {
            return `${field} must be a string`;
          }
          // 检查密码强度
          if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
            return `${field} must contain at least one lowercase letter, one uppercase letter, and one number`;
          }
          return true;
        },
      },
    ],
  },
});
```

#### 动态验证配置

```typescript
requestValidator({
  validation: (req) => {
    // 根据请求路径和方法返回不同的验证规则
    if (req.url.includes('/api/users')) {
      return {
        body: [
          {
            field: 'email',
            type: 'email',
            required: true,
          },
          {
            field: 'name',
            type: 'string',
            required: true,
            minLength: 1,
          },
        ],
      };
    }
    return null; // 跳过验证
  },
});
```

#### 自定义错误格式化

```typescript
requestValidator({
  validation: {
    body: [
      {
        field: 'email',
        type: 'email',
        required: true,
      },
    ],
  },
  formatError: (errors) => {
    // 自定义错误响应格式
    return {
      success: false,
      message: 'Validation failed',
      details: errors.map((err) => ({
        field: err.field,
        message: err.message,
      })),
    };
  },
});
```

---

## 完整配置示例

### 开发环境

```typescript
import {
  logger,
  cors,
  bodyParser,
  compression,
  requestId,
  errorHandler,
  requestValidator,
} from "@dreamer/dweb";

export default {
  middleware: [
    requestId(), // 请求追踪
    logger({ format: 'dev' }),
    cors({ origin: '*' }),
    compression(),
    bodyParser(),
    errorHandler({ debug: true }), // 显示详细错误
  ],
};
```

### 生产环境

```typescript
import {
  logger,
  cors,
  bodyParser,
  compression,
  security,
  rateLimit,
  requestId,
  errorHandler,
  ipFilter,
} from "@dreamer/dweb";

export default {
  middleware: [
    requestId(),
    logger({ format: 'combined' }),
    ipFilter({
      blacklist: ['192.168.1.200'], // 黑名单
    }),
    cors({ origin: ['https://example.com'] }),
    security({
      csrfProtection: true,
      hsts: true,
    }),
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
    }),
    compression(),
    bodyParser({ limit: '10mb' }),
    errorHandler({ debug: false }), // 隐藏详细错误
  ],
};
```

### API 服务

```typescript
import {
  logger,
  cors,
  bodyParser,
  compression,
  auth,
  rateLimit,
  requestId,
  errorHandler,
  requestValidator,
} from "@dreamer/dweb";

export default {
  middleware: [
    requestId(),
    logger(),
    cors({ origin: '*' }),
    rateLimit({ max: 1000, windowMs: 60000 }),
    compression(),
    bodyParser(),
    requestValidator({
      validation: {
        query: [
          {
            field: 'page',
            type: 'number',
            min: 1,
          },
        ],
      },
    }),
    auth({ secret: process.env.JWT_SECRET }),
    errorHandler(),
  ],
};
```

---

## 中间件执行顺序

中间件的执行顺序很重要，建议按以下顺序配置：

1. **request-id** - 最早执行，为所有请求生成 ID
2. **logger** - 记录请求日志
3. **ip-filter** - IP 过滤（在认证之前）
4. **cors** - 跨域处理
5. **security** - 安全头部设置
6. **rate-limit** - 速率限制
7. **compression** - 响应压缩
8. **body-parser** - 请求体解析
9. **request-validator** - 请求验证（在解析之后）
10. **auth** - 身份认证
11. **error-handler** - 错误处理（最后执行，捕获所有错误）

---

## 注意事项

1. **错误处理中间件**应该放在最后，以便捕获所有中间件和路由中的错误
2. **请求 ID 中间件**应该放在最前面，确保所有请求都有 ID
3. **IP 过滤中间件**应该在认证之前，避免不必要的认证开销
4. **请求验证中间件**应该在 body-parser 之后，确保请求体已解析
5. 使用 `skip` 选项可以跳过特定路径的中间件处理，提高性能

