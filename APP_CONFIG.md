# AppConfig 完整配置示例

本文档基于 `@dreamer/dweb` 的 `AppConfig` 类型定义与 README
文档，提供一份完整的配置示例，涵盖所有常用配置项。

## 一、AppConfig 结构概览

`AppConfig` 是 dweb 框架的应用配置接口，包含以下主要模块：

| 配置项            | 类型              | 说明                                        |
| ----------------- | ----------------- | ------------------------------------------- |
| `name`            | string            | 应用名称                                    |
| `version`         | string            | 应用版本                                    |
| `language`        | AppLanguage        | 框架语言（zh-CN 或 en-US；影响 CLI、日志、错误消息等；<br/>默认自动检测环境变量 LANGUAGE/LC_ALL/LANG，否则 zh-CN） |
| `configDirectory` | string            | 配置目录（默认 `./config`）                 |
| `envPrefix`       | string            | 环境变量前缀                                |
| `hotReload`       | boolean           | 是否启用热重载                              |
| `server`          | ServerOptions     | 服务器配置                                  |
| `router`          | RouterOptions     | 路由配置                                    |
| `render`          | object            | 渲染配置                                    |
| `build`           | BuildAppConfig    | 构建配置                                    |
| `logger`          | LoggerConfig      | 日志配置                                    |
| `database`        | DatabaseAppConfig | 数据库配置                                  |
| `socket`          | SocketConfig      | 实时通信配置（type: socketio 或 websocket） |
| `plugins`         | Array             | 插件列表                                    |
| `middlewares`     | Array             | 中间件列表                                  |

---

## 二、完整配置示例

### 单应用模式（config/main.ts）

```typescript
import type { AppConfig } from "jsr:@dreamer/dweb";

/**
 * 单应用完整配置示例
 * 适用于 src/main.ts 单入口场景
 */
const config: AppConfig = {
  // ========== 基础信息 ==========
  name: "my-app",
  version: "1.0.0",
  /** 框架语言（zh-CN | en-US），影响 CLI、日志、错误消息等；不设置则自动检测环境变量 */
  language: "zh-CN",

  // ========== 配置目录 ==========
  /** 配置目录，用于加载 main.ts、main.dev.ts、params.ts 等 */
  configDirectory: "./config",
  /** 环境变量前缀，如 APP_ 则读取 APP_PORT、APP_HOST 等 */
  envPrefix: "APP_",
  /** 是否启用热重载（开发环境默认 true） */
  hotReload: true,

  // ========== 服务器配置 ==========
  server: {
    /** 端口号 */
    port: 3000,
    /** 主机名，0.0.0.0 表示监听所有网卡 */
    host: "0.0.0.0",
    /** 服务器模式：dev | prod */
    mode: "dev",
    /** 监听成功回调 */
    onListen: ({ host, port }) => {
      console.log(`Server listening on http://${host}:${port}`);
    },
    /** 错误处理函数 */
    onError: (error) => {
      console.error(error);
      return new Response("Internal Server Error", { status: 500 });
    },
    /** 是否启用调试日志 */
    debug: false,
    /** 优雅关闭超时（毫秒） */
    shutdownTimeout: 10000,
    /** 开发工具配置（仅 dev 模式） */
    dev: {
      hmr: { enabled: true, path: "/_hmr" },
      watch: { paths: ["./src"], ignore: ["node_modules"] },
    },
  },

  // ========== 路由配置 ==========
  router: {
    /** 路由文件目录 */
    routesDir: "./src/routes",
    /** API 路由形式：restful | action */
    apiMode: "restful",
    /** 重定向配置 */
    redirects: [
      { source: "/old", destination: "/new", permanent: true },
      {
        source: "/user/:id/old",
        destination: "/user/:id/new",
        statusCode: 302,
      },
    ],
    /** 是否跳过 _app 验证 */
    skipAppValidation: false,
  },

  // ========== 渲染配置 ==========
  render: {
    /** 模板引擎：preact | react */
    engine: "preact",
    /** 渲染模式：ssr | csr | ssg | hybrid */
    mode: "hybrid",
    /** SSG 配置（mode 为 ssg 时生效） */
    ssg: {
      outputDir: "dist/static",
      routes: ["/", "/about"],
      dynamicRoutes: { "/user/[id]": ["1", "2", "3"] },
    },
  },

  // ========== 构建配置 ==========
  build: {
    /** 服务端构建（entry/output 可选，框架可自动推断） */
    server: {
      entry: "src/main.ts",
      output: "dist",
      target: "deno",
      compile: {
        minify: true,
        sourcemap: true,
        platform: ["linux", "darwin", "windows"],
        standalone: false,
      },
      external: ["tailwindcss", "lightningcss"],
      externalNpm: true,
      useNativeCompile: false,
      excludePaths: ["node_modules", ".bun/install"],
      debug: false,
    },
    /** 客户端构建 */
    client: {
      entry: "src/routes/_client.dep.tsx",
      output: "dist/client",
      engine: "preact",
      bundle: {
        minify: true,
        sourcemap: true,
        splitting: true,
        format: "esm",
      },
      html: {
        template: "src/index.html",
        title: "My App",
      },
      sourcemap: true,
      debug: false,
    },
    /** 资源处理 */
    assets: {
      css: { extract: true, minify: true, autoprefix: true },
      images: { compress: true, format: "webp" },
      publicDir: "public",
      assetsDir: "assets",
    },
    /** 构建选项 */
    build: {
      mode: "prod",
      clean: true,
      cache: true,
      incremental: true,
      silent: false,
      logLevel: "info",
    },
  },

  // ========== 日志配置 ==========
  logger: {
    level: "info",
    format: "text",
    color: true,
    showTime: true,
    showLevel: true,
    tags: ["app"],
    output: {
      auto: true,
      console: true,
      file: {
        path: "./logs/app.log",
        rotate: true,
        strategy: "size",
        maxSize: 10 * 1024 * 1024,
        maxFiles: 5,
      },
    },
    filter: {
      includeTags: ["app", "http"],
      excludeTags: ["debug"],
    },
    maxMessageLength: 32 * 1024,
  },

  // ========== 数据库配置（dweb 已内置 @dreamer/database，配置后即可使用） ==========
  database: {
    default: {
      type: "postgresql",
      connection: {
        host: "localhost",
        port: 5432,
        database: "mydb",
        username: "user",
        password: "password",
      },
    },
    connections: {
      read: {
        type: "postgresql",
        connection: {
          host: "read-db.example.com",
          port: 5432,
          database: "mydb",
          username: "user",
          password: "password",
        },
      },
      // MongoDB 副本集示例（可选）
      mongodb: {
        type: "mongodb",
        connection: {
          host: "localhost",
          port: 27017,
          database: "mydb",
          username: "user",
          password: "password",
          authSource: "admin",
        },
        mongoOptions: {
          replicaSet: "rs0",
          directConnection: true,
          serverSelectionTimeoutMS: 30000,
          connectTimeoutMS: 5000,
          maxPoolSize: 10,
          minPoolSize: 2,
        },
      },
    },
    managerOptions: {},
  },

  // ========== 实时通信配置（dweb 已内置，type 为 socketio 时启用） ==========
  socket: {
    type: "socketio",
    path: "/socket.io/",
    allowCORS: true,
    pingTimeout: 20000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
    allowPolling: true,
    pollingTimeout: 60000,
    debug: false,
  },

  // ========== 插件列表 ==========
  // 插件只需实现 name、version，可选实现事件钩子（onInit、onRequest、onResponse 等）
  // 框架通过 PluginManager 管理 install/activate 生命周期，插件无需实现这些方法
  plugins: [
    // 字符串路径形式（从文件加载，需 export default 或 export const plugin）
    "./plugins/auth-plugin.ts",
    // 插件对象形式（实现 Plugin 接口）
    {
      name: "custom-plugin",
      version: "1.0.0",
      dependencies: [],
      config: { enabled: true },
      async onInit(container) {
        // 应用初始化完成时调用
      },
      async onRequest(ctx, container) {
        // 请求处理前调用，可返回 Response 短路后续处理
      },
    },
  ],

  // ========== 中间件列表 ==========
  middlewares: [
    // 函数形式（需提供 name 以便合并时识别）
    {
      middleware: async (_req, _res, next) => {
        console.log("Request received");
        await next();
      },
      name: "request-logger",
    },
    // 路径形式
    "./middlewares/cors.ts",
    // 带条件
    {
      middleware: "./middlewares/auth.ts",
      condition: (req) => req.url.startsWith("/admin"),
      name: "admin-auth",
    },
  ],
};

export default config;
```

---

### MongoDB 副本集配置说明

当使用 MongoDB 副本集时，需在 `mongoOptions` 中配置：

- **`replicaSet`**：副本集名称，如 `"rs0"`。若 MongoDB 开启副本集则必须设置。
- **`directConnection`**：`true` 表示仅连接指定 host:port（适用于单节点或 Docker
  环境）；`false` 表示自动发现副本集所有节点（适用于分布式生产环境）。
- **`authSource`**：认证源数据库，通常为 `"admin"`。

---

### 插件（Plugin）说明

`@dreamer/plugin` 的 `Plugin` 接口设计如下：

- **必填**：`name`、`version`
- **可选**：`dependencies`、`config`、`validateConfig`、`onConfigUpdate`
- **事件钩子**（可选）：`onInit`、`onStart`、`onStop`、`onShutdown`、`onRequest`、`onResponse`、`onError`、`onRoute`、`onBuild`、`onBuildComplete`、`onSocket`、`onSocketClose`、`onHealthCheck`、`onHotReload`

**注意**：`install`、`activate`、`deactivate`、`uninstall` 是 **PluginManager**
的方法，不是插件需要实现的钩子。框架会自动完成注册→安装→激活流程，插件只需实现需要响应的事件钩子即可。

---

## 三、多应用模式示例

### 公共配置（common/config/main.ts）

```typescript
import type { AppConfig } from "jsr:@dreamer/dweb";
import { getEnv } from "jsr:@dreamer/runtime-adapter";

/** 公共配置，供 backend、frontend 等应用复用 */
export const commonConfig = {
  appName: "my-project",
  version: "1.0.0",
  apiBasePath: "/api",
  backendPort: 3001,
  frontendPort: 3000,
};

/** 公共 AppConfig 片段（使用 getEnv 兼容 Deno/Bun） */
export const commonAppConfig: Partial<AppConfig> = {
  version: commonConfig.version,
  configDirectory: "./config",
  database: {
    default: {
      type: "postgresql",
      connection: {
        host: getEnv("DB_HOST") || "localhost",
        port: parseInt(getEnv("DB_PORT") || "5432"),
        database: getEnv("DB_NAME") || "mydb",
        username: getEnv("DB_USER") || "user",
        password: getEnv("DB_PASSWORD") || "password",
      },
    },
  },
  logger: {
    level: "info",
    format: "json",
  },
};
```

### 后端配置（backend/config/main.ts）

```typescript
import type { AppConfig } from "jsr:@dreamer/dweb";
import { commonAppConfig, commonConfig } from "../../common/config/main.ts";

const config: AppConfig = {
  ...commonAppConfig,
  name: "backend",
  version: commonConfig.version,

  server: {
    port: commonConfig.backendPort,
    host: "0.0.0.0",
  },

  router: {
    routesDir: "./src/backend/routes",
    apiMode: "restful",
  },

  render: {
    engine: "preact",
    mode: "ssr",
  },
};

export default config;
```

### 前端配置（frontend/config/main.ts）

```typescript
import type { AppConfig } from "jsr:@dreamer/dweb";
import { commonAppConfig, commonConfig } from "../../common/config/main.ts";

const config: AppConfig = {
  ...commonAppConfig,
  name: "frontend",
  version: commonConfig.version,

  server: {
    port: commonConfig.frontendPort,
    host: "0.0.0.0",
  },

  router: {
    routesDir: "./src/frontend/routes",
  },

  render: {
    engine: "preact",
    mode: "hybrid",
  },

  logger: {
    level: "info",
    format: "text",
  },
};

export default config;
```

---

## 四、环境区分配置

框架会按环境加载 `main.{env}.ts`，例如：

- `main.ts`：默认配置
- `main.dev.ts`：开发环境（`DENO_ENV=dev` 或 `NODE_ENV=development`）
- `main.prod.ts`：生产环境

```typescript
// config/main.dev.ts
import mainConfig from "./main.ts";

const config: AppConfig = {
  ...mainConfig,
  server: {
    ...mainConfig.server,
    port: 3000,
  },
  logger: {
    ...mainConfig.logger,
    level: "debug",
    format: "text",
  },
  hotReload: true,
};

export default config;
```

```typescript
// config/main.prod.ts
import { getEnv } from "jsr:@dreamer/runtime-adapter";
import mainConfig from "./main.ts";

const config: AppConfig = {
  ...mainConfig,
  server: {
    ...mainConfig.server,
    port: parseInt(getEnv("PORT") || "3000"),
  },
  logger: {
    ...mainConfig.logger,
    level: "info",
    format: "json",
    output: {
      auto: true,
      file: { path: "./logs/app.log", rotate: true },
    },
  },
  hotReload: false,
};

export default config;
```

---

## 五、最简配置示例

仅保留必填与常用项：

```typescript
import type { AppConfig } from "jsr:@dreamer/dweb";

const config: AppConfig = {
  name: "my-app",
  version: "1.0.0",
  server: { port: 3000, host: "0.0.0.0" },
  router: { routesDir: "./src/routes" },
  render: { engine: "preact", mode: "hybrid" },
};

export default config;
```

---

## 六、配置加载顺序

1. `config/main.ts`：基础配置
2. `config/main.{env}.ts`：按环境覆盖（如 `main.dev.ts`）
3. `new App(config)` 传入的配置：最高优先级

合并策略为深度合并（deep merge），后加载的配置会覆盖先加载的同名字段。

**框架语言（language）**：影响 CLI、日志、错误消息等框架文案。在 `config/main.ts` 中设置即可生效。解析优先级：`config/main.ts` 的 `language` > 环境变量 `LANGUAGE`/`LC_ALL`/`LANG` > 默认 `zh-CN`。

---

## 七、配置与参数获取

### 7.1 框架配置（config/main.ts 系列）

在应用启动后，通过 `getConfig`、`getConfigValue`、`getConfigManager`
获取框架配置：

```typescript
import { getConfig, getConfigManager, getConfigValue } from "jsr:@dreamer/dweb";

// 需要 app.container（在 main.ts、插件、中间件、API 路由等场景）
const container = app.container;

// 完整 AppConfig
const config = getConfig(container);

// 按点号路径取值
const port = getConfigValue<number>(container, "server.port", 3000);

// ConfigManager（支持 envPrefix、热重载）
const cm = getConfigManager(container);
const v = cm.get("key", "default");
```

### 7.2 业务配置（config/params.ts）

业务配置单独存放在 `config/params.ts`，通过 `getParams`、`getParamValue` 获取：

```typescript
// config/params.ts 示例
export default {
  features: { enablePay: true },
  api: { externalUrl: "https://api.example.com", timeout: 30000 },
  pagination: { defaultPageSize: 20 },
};

// 获取方式
import { getParams, getParamValue } from "jsr:@dreamer/dweb";
const params = getParams(container);
const timeout = getParamValue<number>(container, "api.timeout", 30000);
```

### 7.3 环境变量

**方式一：通过 Config 获取（推荐）**

配置 `envPrefix: "APP_"` 后，环境变量会自动合并到配置，可通过 `getConfigValue`
或 `getConfigManager().get()` 获取，**无需** `runtime-adapter`：

```typescript
// envPrefix: "APP_" 时，APP_SERVER_PORT -> server.port
const port = getConfigValue(container, "server.port", "3000");
const dbHost = getConfigValue(container, "database.host", "localhost");
```

**方式二：直接读取（需 runtime-adapter）**

在 `config/main.ts` 中定义配置时，或读取未带前缀的变量时使用：

```typescript
import { getEnv } from "jsr:@dreamer/runtime-adapter";
const host = getEnv("DB_HOST") ?? "localhost";
const port = parseInt(getEnv("PORT") ?? "3000");
```
