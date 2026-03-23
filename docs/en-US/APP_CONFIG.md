# AppConfig Full Configuration Example

> 📖 English | [中文文档](../zh-CN/APP_CONFIG.md)

This document provides a complete configuration example based on the `AppConfig`
type definition and README of `@dreamer/dweb`, covering all commonly used
options.

## 1. AppConfig Structure Overview

`AppConfig` is the application configuration interface for the dweb framework,
with the following main sections:

| Option                 | Type                 | Description                                                                                                                                                                                                          |
| ---------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                 | string               | Application name                                                                                                                                                                                                     |
| `version`              | string               | Application version                                                                                                                                                                                                  |
| `language`             | AppLanguage          | Framework language (zh-CN, en-US, ja-JP, ko-KR, es-ES, pt-BR, id-ID, de-DE, fr-FR; affects CLI, logs, error messages; <br/>default: auto-detect LANGUAGE/LC_ALL/LANG, else en-US)                                    |
| `envPrefix`            | string               | Environment variable prefix                                                                                                                                                                                          |
| `hotReload`            | boolean              | Enable hot reload                                                                                                                                                                                                    |
| `pluginManagerOptions` | PluginManagerOptions | Plugin manager options (autoActivate, continueOnError, enableHotReload, etc.)                                                                                                                                        |
| `server`               | ServerOptions        | Server configuration                                                                                                                                                                                                 |
| `router`               | RouterOptions        | Router configuration                                                                                                                                                                                                 |
| `render`               | object               | Render config (`engine`, `mode`, `debug`; **`compiler`** is **View-only**: extra `compileSource` root paths; see **render.compiler** below and [View View Template Engine](#view-view-template-engine))              |
| `build`                | BuildAppConfig       | Build configuration                                                                                                                                                                                                  |
| `logger`               | LoggerConfig         | Logger configuration                                                                                                                                                                                                 |
| `database`             | DatabaseAppConfig    | Database configuration                                                                                                                                                                                               |
| `socket`               | SocketConfig         | Real-time config (type: socketio or websocket)                                                                                                                                                                       |
| `session`              | SessionOptions       | Session config (@dreamer/session): store required; optional name, maxAge, cookie, autoSave, genId; cookie options applied when setting session cookie; ctx.session available in load(), API, middleware when enabled |
| `plugins`              | Array                | Plugin list                                                                                                                                                                                                          |
| `middlewares`          | Array                | Middleware list                                                                                                                                                                                                      |

---

## 2. Full Configuration Example

### Single-app mode (config/main.ts)

```typescript
import type { AppConfig } from "jsr:@dreamer/dweb";

/**
 * Single-app full config example
 * For src/main.ts single-entry scenario
 */
const config: AppConfig = {
  // ========== Basic info ==========
  name: "my-app",
  version: "1.0.0",
  /** Framework language (zh-CN, en-US, ja-JP, etc.); affects CLI, logs, errors; auto-detect if unset */
  language: "zh-CN",

  // ========== Config directory ==========
  /** Env var prefix; e.g. APP_ reads APP_PORT, APP_HOST, etc. */
  envPrefix: "APP_",
  /** Enable hot reload (default true in dev) */
  hotReload: true,

  /** Plugin manager options (optional) */
  pluginManagerOptions: {
    autoActivate: false,
    continueOnError: true,
    enableHotReload: false,
    hotReloadInterval: 1000,
  },

  // ========== Server config ==========
  server: {
    /** Port */
    port: 3000,
    /** Host; 0.0.0.0 listens on all interfaces */
    host: "0.0.0.0",
    /** Server mode: dev | prod */
    mode: "dev",
    /** Listen success callback */
    onListen: ({ host, port }) => {
      console.log(`Server listening on http://${host}:${port}`);
    },
    /** Error handler */
    onError: (error) => {
      console.error(error);
      return new Response("Internal Server Error", { status: 500 });
    },
    /** Enable debug logs */
    debug: false,
    /** Graceful shutdown timeout (ms) */
    shutdownTimeout: 10000,
    /** Dev tools (dev mode only) */
    dev: {
      hmr: { enabled: true, path: "/__hmr" },
      watch: { paths: ["./src"], ignore: ["node_modules"] },
    },
  },

  // ========== Router config ==========
  router: {
    /** Routes directory */
    routesDir: "./src/routes",
    /** API mode: restful | action */
    apiMode: "restful",
    /** Redirects */
    redirects: [
      { source: "/old", destination: "/new", permanent: true },
      {
        source: "/user/:id/old",
        destination: "/user/:id/new",
        statusCode: 302,
      },
    ],
    /** Skip _app validation */
    skipAppValidation: false,
  },

  // ========== Render config ==========
  render: {
    /** Enable render debug logs (default: true in dev) */
    debug: false,
    /** Template engine: preact | react | view */
    engine: "preact",
    /** Render mode: ssr | csr | ssg | hybrid */
    mode: "hybrid",
    /**
     * View only: `compiler` is `{ dirs, client?, server? }`. See **render.compiler** below.
     */
    // compiler: {
    //   /** Roots for compileSource; include app + workspace/JSR packages */
    //   dirs: ["./src"],
    //   /** Client bundle: jsx-compiler; omit means enabled */
    //   // client: true,
    //   /** Server .tsx routes: compiler; use false for CSR-only doc sites */
    //   // server: true,
    // },
    /** SSR config (when mode is ssr). hydrate: enable client hydration (default true). */
    ssr: {
      hydrate: true,
    },
    /** SSG config (when mode is ssg) */
    ssg: {
      outputDir: "dist/static",
      routes: ["/", "/about"],
      dynamicRoutes: { "/user/[id]": ["1", "2", "3"] },
      /** Enable client hydration for pre-rendered HTML (default true). */
      hydrate: true,
    },
  },

  // ========== Build config ==========
  build: {
    /** Server build (entry/output optional; framework can infer) */
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
    /** Client build */
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
    /** Asset handling */
    assets: {
      css: { extract: true, minify: true, autoprefix: true },
      images: { compress: true, format: "webp" },
      publicDir: "public",
      assetsDir: "assets",
    },
    /** Build options */
    build: {
      mode: "prod",
      clean: true,
      cache: true,
      incremental: true,
      silent: false,
      logLevel: "info",
    },
  },

  // ========== Logger config ==========
  logger: {
    level: "info",
    format: "text",
    color: true,
    showTime: true,
    showLevel: true,
    tags: ["app"],
    /** output.console: true | false | "auto" (auto = by TTY: console in foreground, file in background) */
    output: {
      console: "auto",
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

  // ========== Database config (dweb bundles @dreamer/database; configure to use) ==========
  database: {
    default: {
      adapter: "postgresql",
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
        adapter: "postgresql",
        connection: {
          host: "read-db.example.com",
          port: 5432,
          database: "mydb",
          username: "user",
          password: "password",
        },
      },
      // MongoDB replica set example (optional)
      mongodb: {
        adapter: "mongodb",
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

  // ========== Real-time config (dweb built-in; enabled when adapter is socketio or websocket) ==========
  // Socket.IO example
  socket: {
    adapter: "socketio",
    config: {
      path: "/socket.io/",
      allowCORS: true,
      pingTimeout: 20000,
      pingInterval: 25000,
      transports: ["websocket", "polling"],
      allowPolling: true,
      pollingTimeout: 60000,
      debug: false,
    },
  },
  // WebSocket example (either/or)
  // socket: {
  //   adapter: "websocket",
  //   config: {
  //     path: "/ws",
  //     pingTimeout: 60000,
  //     pingInterval: 30000,
  //     debug: false,
  //   },
  // },

  // ========== Session config (optional; @dreamer/session; when set, ctx.session available in load(), API, middleware) ==========
  // session: {
  //   store: createFileStore(await getDreamerDwebCacheDir(), "sessions"), // store required
  //   name: "sid",
  //   maxAge: 86400,
  //   cookie: { path: "/", httpOnly: true, secure: false, sameSite: "lax" },
  //   autoSave: true,
  // },

  // ========== Plugins ==========
  // Plugins need name, version; optionally implement hooks (onInit, onRequest, onResponse, etc.)
  // Framework manages install/activate via PluginManager; plugins don't implement those
  plugins: [
    // Path string (load from file; export default or export const plugin)
    "./plugins/auth-plugin.ts",
    // Plugin object (implements Plugin interface)
    {
      name: "custom-plugin",
      version: "1.0.0",
      dependencies: [],
      config: { enabled: true },
      async onInit(container) {
        // Called when app init completes
      },
      async onRequest(ctx, container) {
        // Called before request; can return Response to short-circuit
      },
    },
  ],

  // ========== Middlewares ==========
  middlewares: [
    // Function form (must provide name for merge)
    {
      middleware: async (_req, _res, next) => {
        console.log("Request received");
        await next();
      },
      name: "request-logger",
    },
    // Path form
    "./middlewares/cors.ts",
    // With condition
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

### Render engine options

`config.render.engine` supports three values:

- **`"view"`** (recommended): Dweb’s native view template engine
  (`@dreamer/view`). Lightweight, no virtual DOM, fine-grained updates with
  signals; first-class support for SSR, SSG, CSR, and hybrid. See
  https://github.com/shuliangfu/view for details. See
  [View View Template Engine](#view-view-template-engine) below.
- **`"preact"`**: Lightweight React-compatible library; default in examples.
- **`"react"`**: Full React; set `engine: "react"` and ensure React is in
  dependencies.

All three support `mode: "ssr" | "csr" | "ssg" | "hybrid"`.

---

### SSR/SSG client hydration

When `render.mode` is `ssr` or `ssg`, you can control whether the framework
enables **client hydration** (injecting `globalThis.__DATA__` and the client
script so the current page becomes interactive after load, e.g. counters and
click handlers, without enabling client-side routing).

- **`render.ssr.hydrate`** (default `true`): When `mode` is `ssr`, if `true` the
  server injects hydration data and `_client.js` into the HTML; the client
  hydrates the current page only. Link clicks perform full page navigation (no
  SPA routing). Set to `false` to serve plain server-rendered HTML with no
  client script.
- **`render.ssg.hydrate`** (default `true`): When `mode` is `ssg`, if `true`
  each pre-rendered HTML file is injected with hydration data and `_client.js`
  after build so the page can hydrate in the browser. Set to `false` to output
  static HTML only.

Both options require `@dreamer/router@^1.0.10` on the client (used by the
generated client bundle) so that when `hydrate` is enabled, link clicks use full
page navigation instead of client-side routing.

---

### render.compiler (View-only)

Optional when **`render.engine` is `"view"`**. Type: **`RenderCompilerOptions`**
(`AppConfig.render.compiler`) object:

| Field        | Type       | Description                                                                                                                                                                                                                                                                                                                                           |
| ------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`dirs`**   | `string[]` | **Must be non-empty** to enable the jsx-compiler. Lists **source roots** that participate in `compileSource` (**relative to process `cwd()`** or **absolute**, e.g. from `import.meta.resolve` / `dirname` / `join`). Include the app root (e.g. `./src`) and any **workspace / JSR** package roots (e.g. `./src` and `../ui-view/src`).              |
| **`client`** | `boolean?` | Whether the **client** bundle (dev HMR, production `_client` build) uses the jsx-compiler. **Omitted or `true`**: enabled; **`false`**: same client behavior as when `compiler` is unset (strip-load only, etc.).                                                                                                                                     |
| **`server`** | `boolean?` | Whether **server** loading of `.tsx` routes uses the compiler (SSR route bundle, `loadRouteModule`). **Omitted or `true`**: enabled; **`false`**: native `import`. **CSR-only** or doc sites may set **`server: false`** (same idea as `@dreamer/ui-view` docs); keep **`true`** for **SSR / hybrid / SSG** when the server must compile View `.tsx`. |

If **`render.compiler`** is missing or **`dirs` is empty**, jsx-compiler is off
(client strip-load only; server native `import`).

**Resolution**: `resolveRenderCompilerForClient` /
`resolveRenderCompilerForServer` in dweb use **`client !== false`** and
**`server !== false`** per side; **`dirs`** are normalized to absolute paths
(forward slashes). For tooling that only needs the root list, use
**`normalizeRenderCompiler`** (normalizes **`dirs`** only; ignores client/server
flags).

**Note**: esbuild still follows the **import graph**; `compileSource` applies to
loaded **`.tsx`** files under a listed **`dirs`** root.

**Example** (monorepo + client-side compiler only):

```ts
render: {
  engine: "view",
  mode: "hybrid",
  compiler: {
    dirs: ["./src", "../src"],
    client: true,
    server: false,
  },
},
```

---

### View View Template Engine

**View** is the framework’s own view layer, built on `@dreamer/view` and
integrated with `@dreamer/render`. It is the **recommended** template engine for
new Dweb projects.

**Why choose View?**

- **Lightweight and fast**: No virtual DOM; updates are fine-grained
  (signal-based reactivity and targeted DOM patches). Smaller runtime and less
  client-side work than virtual-DOM engines.
- **Familiar DX**: Declarative template syntax and built-in directives. See
  https://github.com/shuliangfu/view for details.
- **Native to the stack**: Designed for the Deno/JSR ecosystem. Same maintainer
  as Dweb; SSR, SSG, CSR, and hybrid modes are supported out of the box with no
  extra glue.
- **Unified with Dweb**: Same routing, `load()`, layouts, and build pipeline as
  Preact/React. Use `render.engine: "view"` and optional examples under
  `examples/view-*` (e.g. view-hybrid-flat, view-csr, view-ssg).

**Configuration**: Set `render.engine: "view"` in `AppConfig`. Client build will
use `@dreamer/render/client/view` for hydration and CSR. No separate “View init”
step; the framework wires the adapter automatically.

**Session**: For stateful apps, combine View with `config.session`
(`@dreamer/session`). Once `session` is set, `ctx.session` is available in
`load()`, API handlers, and middleware. See [Session Config](#session-config).

---

### Socket.IO and WebSocket Config

Real-time supports two types via `socket.adapter`:

- **`adapter: "socketio"`** (aliases: `"socket-io"`, `"socket.io"`): Uses
  Socket.IO with fallback polling; good for compatibility. Default path
  `/socket.io/`.
- **`adapter: "websocket"`**: Uses native WebSocket; lighter. Default path
  `/ws`.

Supports nested `config` (recommended) or flat structure. Both mount on the main
HTTP server and share `server.port` and `server.host`.

**Plugin events**: With Socket configured, the framework calls `onSocket` and
`onSocketClose` on connect/disconnect for auth, logging, etc. Plugins only need
to implement these hooks.

---

### Session Config

When `config.session` is set (using `@dreamer/session`’s `SessionOptions`), the
framework mounts the session middleware and exposes `ctx.session` in `load()`,
API handlers, and middleware.

- **`store`** (required): Session store instance (e.g. from `createFileStore()`
  in `@dreamer/session`). Default directory for file store can be
  `~/.dreamer/dweb/sessions` (via `getDreamerDwebCacheDir()`).
- **`name`**: Cookie name (default from library).
- **`maxAge`**: Session max age in seconds.
- **`cookie`**: Cookie options applied when setting the session cookie: `path`,
  `domain`, `secure`, `httpOnly`, `sameSite`, `maxAge`, `expires`.
- **`autoSave`**, **`genId`**: Optional behavior from `@dreamer/session`.

There is no separate top-level `cookie` config; all cookie options are under
`config.session.cookie`.

---

### MongoDB Replica Set Config

For MongoDB replica sets, configure in `mongoOptions`:

- **`replicaSet`**: Replica set name, e.g. `"rs0"`. Required when MongoDB uses
  replica set.
- **`directConnection`**: `true` = connect only to specified host:port (single
  node or Docker); `false` = auto-discover all nodes (distributed production).
- **`authSource`**: Auth source database, usually `"admin"`.

---

### Plugin Notes

`@dreamer/plugin` `Plugin` interface:

- **Required**: `name`, `version`
- **Optional**: `dependencies`, `config`, `validateConfig`, `onConfigUpdate`
- **Hooks** (optional): `onInit`, `onStart`, `onStop`, `onShutdown`,
  `onRequest`, `onResponse`, `onError`, `onRoute`, `onBuild`, `onBuildComplete`,
  `onSocket`, `onSocketClose`, `onHealthCheck`, `onHotReload`

**Note**: `install`, `activate`, `deactivate`, `uninstall` are **PluginManager**
methods, not plugin hooks. The framework handles register→install→activate;
plugins only implement the hooks they need.

---

## 3. Multi-app Mode Example

### Shared config (common/config/main.ts)

```typescript
import type { AppConfig } from "jsr:@dreamer/dweb";
import { getEnv } from "jsr:@dreamer/runtime-adapter";

/** Shared config for backend, frontend, etc. */
export const commonConfig = {
  appName: "my-project",
  version: "1.0.0",
  apiBasePath: "/api",
  backendPort: 3001,
  frontendPort: 3000,
};

/** Shared AppConfig fragment (getEnv for Deno/Bun compatibility) */
export const commonAppConfig: Partial<AppConfig> = {
  version: commonConfig.version,
  database: {
    default: {
      adapter: "postgresql",
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

### Backend config (backend/config/main.ts)

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

### Frontend config (frontend/config/main.ts)

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

## 4. Environment-specific Config

The framework loads `main.{env}.ts` by environment:

- `main.ts`: Default config
- `main.dev.ts`: Dev (`DENO_ENV=dev` or `NODE_ENV=development`)
- `main.prod.ts`: Production

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
      console: "auto",
      file: { path: "./logs/app.log", rotate: true },
    },
  },
  hotReload: false,
};

export default config;
```

---

## 5. Minimal Config Example

Required and common options only:

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

## 6. Config Load Order

1. `config/main.ts`: Base config
2. `config/main.{env}.ts`: Env override (e.g. `main.dev.ts`)
3. Config passed to `new App(config)`: Highest priority

Merge is deep merge; later config overrides earlier for the same keys.

**Framework language (language)**: Affects CLI, logs, error messages. Set in
`config/main.ts`. Priority: `config/main.ts` `language` > env vars
`LANGUAGE`/`LC_ALL`/`LANG` > default `en-US`. Supports 9 locales (zh-CN, en-US,
ja-JP, ko-KR, es-ES, pt-BR, id-ID, de-DE, fr-FR); falls back to `en-US` if
unsupported.

### 6.1 Config Directory Inference

The framework infers the config directory from the entry path (config not yet
loaded when main.ts runs):

| Scenario      | Entry path example       | Inferred config dir                      |
| ------------- | ------------------------ | ---------------------------------------- |
| Single+src    | `src/main.ts`            | `src/config`                             |
| Single no src | `main.ts`                | `config`                                 |
| Multi+src     | `src/backend/main.ts`    | `src/backend/config`                     |
| Multi no src  | `backend/main.ts`        | `backend/config`                         |
| Prod single   | `dist/server.js`         | `src/config` or `config`                 |
| Prod multi    | `dist/backend/server.js` | `src/backend/config` or `backend/config` |

Fallback: `./config`, `./src/config`.

### 6.2 Config Validation

After merge, the framework calls `validateConfig()` to check:

- **Basic**: Types of `name`, `version`, `envPrefix`, `hotReload`
- **render**: `engine` is `"react"` or `"preact"`; `mode` is `"ssr"`, `"csr"`,
  `"ssg"`, or `"hybrid"`
- **middlewares**: Must have `name` (path form can infer; object form must have
  explicit `name`)
- **plugins**: Must have `name`
- **server / router / build / logger**: If present, must be objects

Validation failure throws `DwebErrorCode` (e.g. `CONFIG_NAME_INVALID`,
`CONFIG_MIDDLEWARE_MUST_HAVE_NAME`).

---

## 7. Config and Params Access

### 7.1 Framework config (config/main.ts series)

After app start, use `getConfig`, `getConfigValue`, `getConfigManager`:

```typescript
import { getConfig, getConfigManager, getConfigValue } from "jsr:@dreamer/dweb";

// Need app.container (in main.ts, plugins, middleware, API routes, etc.)
const container = app.container;

// Full AppConfig
const config = getConfig(container);

// Get by dot path
const port = getConfigValue<number>(container, "server.port", 3000);

// ConfigManager (envPrefix, hot reload)
const cm = getConfigManager(container);
const v = cm.get("key", "default");
```

### 7.2 Business config (config/params.ts)

Business config lives in `config/params.ts`; use `getParams`, `getParamValue`:

```typescript
// config/params.ts example
export default {
  features: { enablePay: true },
  api: { externalUrl: "https://api.example.com", timeout: 30000 },
  pagination: { defaultPageSize: 20 },
};

// Access
import { getParams, getParamValue } from "jsr:@dreamer/dweb";
const params = getParams(container);
const timeout = getParamValue<number>(container, "api.timeout", 30000);
```

### 7.3 Environment variables

**Method 1: Via Config (recommended)**

With `envPrefix: "APP_"`, env vars merge into config. Use `getConfigValue` or
`getConfigManager().get()`; **no** `runtime-adapter` needed:

```typescript
// With envPrefix: "APP_", APP_SERVER_PORT -> server.port
const port = getConfigValue(container, "server.port", "3000");
const dbHost = getConfigValue(container, "database.host", "localhost");
```

**Method 2: Direct read (requires runtime-adapter)**

When defining config in `config/main.ts`, or for unprefixed vars:

```typescript
import { getEnv } from "jsr:@dreamer/runtime-adapter";
const host = getEnv("DB_HOST") ?? "localhost";
const port = parseInt(getEnv("PORT") ?? "3000");
```
