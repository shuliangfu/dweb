# 创建自定义插件

你可以创建自己的插件来扩展框架功能。

## 基本结构

插件是一个对象，包含 `name`、`setup` 和可选的 `teardown` 方法：

```typescript
import type { Plugin } from "@dreamer/dweb";

const myPlugin: Plugin = {
  name: "my-plugin",
  version: "1.0.0",
  setup(app) {
    // 插件初始化
    console.log("Plugin initialized");

    // 添加中间件
    app.use((req, res, next) => {
      // 自定义逻辑
      next();
    });
  },
  teardown(app) {
    // 插件清理
    console.log("Plugin teardown");
  },
};

usePlugin(myPlugin);
```

## 插件示例

### 简单插件

```typescript
import type { Plugin } from "@dreamer/dweb";
import { usePlugin } from "@dreamer/dweb";

const helloPlugin: Plugin = {
  name: "hello",
  setup(app) {
    app.use((req, res, next) => {
      res.setHeader("X-Hello", "World");
      next();
    });
  },
};

usePlugin(helloPlugin);
```

### 配置化插件

```typescript
import type { Plugin } from "@dreamer/dweb";
import { usePlugin } from "@dreamer/dweb";

interface MyPluginOptions {
  prefix: string;
  enabled: boolean;
}

function createMyPlugin(options: MyPluginOptions): Plugin {
  return {
    name: "my-plugin",
    setup(app) {
      if (!options.enabled) {
        return;
      }

      app.use((req, res, next) => {
        res.setHeader("X-Prefix", options.prefix);
        next();
      });
    },
  };
}

usePlugin(createMyPlugin({
  prefix: "api",
  enabled: true,
}));
```

### 异步插件

```typescript
import type { Plugin } from "@dreamer/dweb";
import { usePlugin } from "@dreamer/dweb";

const asyncPlugin: Plugin = {
  name: "async-plugin",
  async setup(app) {
    // 异步初始化
    const config = await fetch("/api/config").then(r => r.json());
    
    app.use((req, res, next) => {
      (req as any).config = config;
      next();
    });
  },
};

usePlugin(asyncPlugin);
```

### 带清理的插件

```typescript
import type { Plugin } from "@dreamer/dweb";
import { usePlugin } from "@dreamer/dweb";

let intervalId: number | null = null;

const cleanupPlugin: Plugin = {
  name: "cleanup-plugin",
  setup(app) {
    // 设置定时任务
    intervalId = setInterval(() => {
      console.log("定时任务执行");
    }, 1000);
  },
  teardown(app) {
    // 清理资源
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  },
};

usePlugin(cleanupPlugin);
```

## API 参考

### Plugin 接口

```typescript
interface Plugin {
  name: string;
  version?: string;
  setup: (app: AppLike) => void | Promise<void>;
  teardown?: (app: AppLike) => void | Promise<void>;
}
```

### 使用插件

```typescript
import { usePlugin } from "@dreamer/dweb";

usePlugin(plugin);
```

## 相关文档

- [插件概览](./README.md)

