# DWeb 框架开发指南

本文档介绍如何为 DWeb 框架开发插件、中间件和自定义功能。

## 📚 目录

- [插件开发](#插件开发)
- [中间件开发](#中间件开发)
- [自定义路由](#自定义路由)
- [类型定义](#类型定义)
- [测试指南](#测试指南)

---

## 🔌 插件开发

### 插件基础

插件是一个实现了 `Plugin` 接口的对象：

```typescript
import type { Plugin } from "@dreamer/dweb";

const myPlugin: Plugin = {
  name: "my-plugin",
  
  onInit: async ({ server, router, routeHandler }) => {
    // 插件初始化
  },
  
  onRequest: async (req, res) => {
    // 请求处理前
  },
  
  onResponse: async (req, res) => {
    // 响应处理后
  },
  
  onError: async (error, req, res) => {
    // 错误处理
  },
  
  onBuild: async (config) => {
    // 构建时处理
  },
  
  onStart: async (config) => {
    // 启动时处理
  },
};
```

### 插件示例：自定义日志

```typescript
import type { Plugin } from "@dreamer/dweb";

export function customLogger(options: { format?: string } = {}): Plugin {
  return {
    name: "custom-logger",
    
    onRequest: async (req, res) => {
      const start = Date.now();
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      
      // 在响应后记录时间
      const originalEnd = res.end;
      res.end = function(...args) {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.status} (${duration}ms)`);
        return originalEnd.apply(this, args);
      };
    },
  };
}
```

### 插件配置

插件可以接受配置选项：

```typescript
export interface MyPluginOptions {
  enabled?: boolean;
  level?: "info" | "warn" | "error";
}

export function myPlugin(options: MyPluginOptions = {}): Plugin {
  const { enabled = true, level = "info" } = options;
  
  return {
    name: "my-plugin",
    // ...
  };
}

// 使用
import { myPlugin } from "./my-plugin.ts";

const config: AppConfig = {
  plugins: [
    myPlugin({ enabled: true, level: "info" }),
  ],
};
```

---

## 🛠️ 中间件开发

### 中间件基础

中间件是一个函数，接受 `req`、`res` 和 `next` 参数：

```typescript
import type { Middleware } from "@dreamer/dweb";

const myMiddleware: Middleware = async (req, res, next) => {
  // 请求处理前
  console.log("请求:", req.url);
  
  // 继续执行下一个中间件
  await next();
  
  // 响应处理后
  console.log("响应状态:", res.status);
};
```

### 中间件示例：请求计时

```typescript
import type { Middleware } from "@dreamer/dweb";

export function timing(): Middleware {
  return async (req, res, next) => {
    const start = Date.now();
    
    await next();
    
    const duration = Date.now() - start;
    res.setHeader("X-Response-Time", `${duration}ms`);
  };
}
```

### 中间件示例：请求验证

```typescript
import type { Middleware } from "@dreamer/dweb";

export function validateRequest(options: { 
  requiredHeaders?: string[];
} = {}): Middleware {
  return async (req, res, next) => {
    const { requiredHeaders = [] } = options;
    
    for (const header of requiredHeaders) {
      if (!req.getHeader(header)) {
        res.status = 400;
        res.json({ error: `缺少必需的请求头: ${header}` });
        return;
      }
    }
    
    await next();
  };
}
```

### 错误处理中间件

```typescript
import type { Middleware } from "@dreamer/dweb";

export function errorHandler(): Middleware {
  return async (req, res, next) => {
    try {
      await next();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status = 500;
      res.json({ error: message });
    }
  };
}
```

---

## 🛣️ 自定义路由

### 自定义路由处理器

如果需要自定义路由处理逻辑，可以扩展 `RouteHandler`：

```typescript
import { RouteHandler } from "@dreamer/dweb";
import type { Router } from "@dreamer/dweb";

class CustomRouteHandler extends RouteHandler {
  async handle(req: Request, res: Response): Promise<void> {
    // 自定义处理逻辑
    if (req.url.startsWith("/api/v2/")) {
      // 处理 v2 API
      await this.handleV2Api(req, res);
    } else {
      // 使用默认处理
      await super.handle(req, res);
    }
  }
  
  private async handleV2Api(req: Request, res: Response): Promise<void> {
    // 自定义 API 处理
  }
}
```

### 自定义路由匹配

扩展 `Router` 类实现自定义路由匹配：

```typescript
import { Router } from "@dreamer/dweb";

class CustomRouter extends Router {
  match(pathname: string): RouteInfo | null {
    // 自定义匹配逻辑
    if (pathname.startsWith("/custom/")) {
      return {
        path: pathname,
        filePath: `/custom${pathname}.tsx`,
        type: "page",
      };
    }
    
    // 使用默认匹配
    return super.match(pathname);
  }
}
```

---

## 📝 类型定义

### 扩展类型

如果需要扩展框架类型，创建类型声明文件：

```typescript
// types/custom.d.ts
import "@dreamer/dweb";

declare module "@dreamer/dweb" {
  interface Request {
    customProperty?: string;
  }
  
  interface AppConfig {
    customOption?: {
      enabled: boolean;
    };
  }
}
```

### 类型工具

使用框架提供的类型工具：

```typescript
import type { 
  AppConfig, 
  DWebConfig, 
  Middleware, 
  Plugin,
  Request,
  Response,
} from "@dreamer/dweb";
```

---

## 🧪 测试指南

### 单元测试

使用 Deno 内置测试框架：

```typescript
import { assertEquals } from "@std/assert";
import { myFunction } from "./my-module.ts";

Deno.test("My Function", () => {
  const result = myFunction("test");
  assertEquals(result, "expected");
});
```

### 中间件测试

```typescript
import { assertEquals } from "@std/assert";
import { myMiddleware } from "./my-middleware.ts";

Deno.test("Middleware Test", async () => {
  const req = {
    url: "http://localhost:3000/test",
    method: "GET",
    headers: new Headers(),
    getHeader: () => null,
  } as Request;
  
  const res = {
    status: 200,
    headers: new Headers(),
    setHeader: (name: string, value: string) => {
      res.headers.set(name, value);
    },
  } as Response;
  
  let nextCalled = false;
  const next = async () => {
    nextCalled = true;
  };
  
  await myMiddleware(req, res, next);
  
  assertEquals(nextCalled, true);
});
```

### 集成测试

创建测试文件并启动服务器：

```typescript
import { assertEquals } from "@std/assert";

Deno.test("Integration Test", async () => {
  const response = await fetch("http://localhost:3000/test");
  assertEquals(response.status, 200);
});
```

---

## 📦 发布插件

### 插件包结构

```
my-plugin/
├── mod.ts           # 主入口文件
├── README.md        # 插件文档
├── deno.json        # Deno 配置
└── src/
    └── index.ts     # 插件实现
```

### 发布到 JSR

```bash
# 登录 JSR
deno publish

# 发布插件
deno publish --allow-all
```

---

## 🔗 相关资源

- [API 文档](./API.md) - 完整的 API 参考
- [使用指南](./GUIDES.md) - 使用指南
- [贡献指南](../CONTRIBUTING.md) - 如何贡献代码

---

**最后更新**: 2024-12-19

