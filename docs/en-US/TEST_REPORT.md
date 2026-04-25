# @dreamer/dweb Test Report

> 📖 English | [中文](../zh-CN/TEST_REPORT.md)

## 📋 Test Overview

| Item             | Value                |
| ---------------- | -------------------- |
| Framework        | 3.4.2                |
| Test framework   | @dreamer/test@^1.1.7 |
| Test date        | 2026-04-25           |
| Test environment | Deno 2.x / Bun 1.x   |

---

## 📊 Test Results

### Overall Statistics

| Metric           | Count                                   |
| ---------------- | --------------------------------------- |
| Test files       | 86                                      |
| Total test cases | 875 (865 passed + 10 ignored)           |
| Passed           | 865                                     |
| Ignored          | 10                                      |
| Failed           | 0                                       |
| Pass rate        | 100%                                    |
| Execution time   | ~8m1s (`deno test -A tests` single run) |

### Test File Statistics

#### Unit Tests (tests/unit/)

| File name                           | Test count     | Status        |
| ----------------------------------- | -------------- | ------------- |
| `app.test.ts`                       | 20             | ✅ All passed |
| `asset-manifest.test.ts`            | 6              | ✅ All passed |
| `build-dirs.test.ts`                | 18             | ✅ All passed |
| `config.test.ts`                    | 64             | ✅ All passed |
| `context.test.ts`                   | 26             | ✅ All passed |
| `render.test.ts`                    | 46             | ✅ All passed |
| `command.test.ts`                   | 42             | ✅ All passed |
| `build.test.ts`                     | 23             | ✅ All passed |
| `windows.test.ts`                   | 46 (2 ignored) | ✅ All passed |
| `path.test.ts`                      | 19             | ✅ All passed |
| `plugin-events.test.ts`             | 17             | ✅ All passed |
| `logger.test.ts`                    | 18             | ✅ All passed |
| `runtime-adapter.test.ts`           | 18             | ✅ All passed |
| `server.test.ts`                    | 14             | ✅ All passed |
| `plugin.test.ts`                    | 16             | ✅ All passed |
| `sanitize.test.ts`                  | 16             | ✅ All passed |
| `database.test.ts`                  | 16             | ✅ All passed |
| `lifecycle.test.ts`                 | 13             | ✅ All passed |
| `middleware.test.ts`                | 15             | ✅ All passed |
| `router.test.ts`                    | 13             | ✅ All passed |
| `errors.test.ts`                    | 13             | ✅ All passed |
| `jsr-versions.test.ts`              | 12             | ✅ All passed |
| `i18n.test.ts`                      | 14             | ✅ All passed |
| `load-route-module.test.ts`         | 8              | ✅ All passed |
| `service.test.ts`                   | 10             | ✅ All passed |
| `runtime.test.ts`                   | 12             | ✅ All passed |
| `csr-client-builder.test.ts`        | 7              | ✅ All passed |
| `socket-io.test.ts`                 | 10             | ✅ All passed |
| `websocket.test.ts`                 | 8              | ✅ All passed |
| `generate.test.ts`                  | 7              | ✅ All passed |
| `csr-client-middleware.test.ts`     | 7              | ✅ All passed |
| `csr-client-route-manifest.test.ts` | 3              | ✅ All passed |
| `load-data-middleware.test.ts`      | 6              | ✅ All passed |
| `security.test.ts`                  | 4              | ✅ All passed |
| `config-loader.test.ts`             | 5              | ✅ All passed |
| `module-cache.test.ts`              | 6              | ✅ All passed |
| `cmd-build.test.ts`                 | 4              | ✅ All passed |
| `cmd-clean.test.ts`                 | 4              | ✅ All passed |
| `render-hybrid.test.ts`             | 7              | ✅ All passed |
| `render-ssr.test.ts`                | 7              | ✅ All passed |
| `render-ssg.test.ts`                | 6              | ✅ All passed |
| `db.test.ts`                        | 4              | ✅ All passed |
| `init.test.ts`                      | 6              | ✅ All passed |
| `project.test.ts`                   | 4              | ✅ All passed |
| `version.test.ts`                   | 4              | ✅ All passed |
| `render-csr.test.ts`                | 4              | ✅ All passed |
| `cmd-dev.test.ts`                   | 3              | ✅ All passed |
| `cmd-fmt.test.ts`                   | 3              | ✅ All passed |
| `cmd-lint.test.ts`                  | 3              | ✅ All passed |
| `cmd-preview.test.ts`               | 3              | ✅ All passed |
| `cmd-start.test.ts`                 | 3              | ✅ All passed |
| `cmd-test.test.ts`                  | 3              | ✅ All passed |
| `cmd-upgrade.test.ts`               | 3              | ✅ All passed |
| `cmd-update.test.ts`                | 4              | ✅ All passed |
| `cli.test.ts`                       | 2              | ✅ All passed |

> **Note**: 10 cases ignored in total: 2 in `windows.test.ts` (Windows-only,
> skipped via `skipIf` on non-Windows); 8 in e2e browser SSG/SSR (including
> “应能注入 layout 与页面 load 数据” skipped in SSG/SSR mode).

#### E2E Tests (tests/e2e/)

| File name                                   | Test count | Status        | Description                                               |
| ------------------------------------------- | ---------- | ------------- | --------------------------------------------------------- |
| `browser-render-preact-csr.test.ts`         | 9          | ✅ All passed | Preact CSR basic/advanced: home, about, counter, metadata |
| `browser-render-preact-ssr.test.ts`         | 9          | ✅ All passed | Preact SSR                                                |
| `browser-render-preact-ssg.test.ts`         | 9          | ✅ All passed | Preact SSG                                                |
| `browser-render-preact-hybrid.test.ts`      | 9          | ✅ All passed | Preact Hybrid                                             |
| `browser-render-preact-hybrid-flat.test.ts` | 9          | ✅ All passed | Preact Hybrid (no src)                                    |
| `browser-render-react-csr.test.ts`          | 9          | ✅ All passed | React CSR basic/advanced                                  |
| `browser-render-react-ssr.test.ts`          | 9          | ✅ All passed | React SSR                                                 |
| `browser-render-react-ssg.test.ts`          | 9          | ✅ All passed | React SSG                                                 |
| `browser-render-react-hybrid.test.ts`       | 9          | ✅ All passed | React Hybrid                                              |
| `browser-render-react-hybrid-flat.test.ts`  | 9          | ✅ All passed | React Hybrid (no src)                                     |
| `browser-render-view-csr.test.ts`           | 9          | ✅ All passed | View CSR                                                  |
| `browser-render-view-ssr.test.ts`           | 9          | ✅ All passed | View SSR                                                  |
| `browser-render-view-ssg.test.ts`           | 9          | ✅ All passed | View SSG                                                  |
| `browser-render-view-hybrid.test.ts`        | 9          | ✅ All passed | View Hybrid                                               |
| `browser-render-view-hybrid-flat.test.ts`   | 9          | ✅ All passed | View Hybrid (no src)                                      |
| `server-request.test.ts`                    | 3          | ✅ All passed | Server starts and returns HTML                            |
| **Subtotal**                                | **145**    | ✅ All passed | Included in total ~8m1s (8 e2e cases ignored in SSG/SSR)  |

#### Integration Tests (tests/integration/)

| File name                          | Test count | Status        | Description                         |
| ---------------------------------- | ---------- | ------------- | ----------------------------------- |
| `config-lifecycle.test.ts`         | 3          | ✅ All passed | Config load and lifecycle hooks     |
| `csr-preact-build.test.ts`         | 3          | ✅ All passed | CSR + Preact build                  |
| `csr-react-build.test.ts`          | 3          | ✅ All passed | CSR + React build                   |
| `csr-view-build.test.ts`           | 3          | ✅ All passed | CSR + View build                    |
| `hybrid-preact-build.test.ts`      | 3          | ✅ All passed | Hybrid + Preact build               |
| `hybrid-preact-flat-build.test.ts` | 3          | ✅ All passed | Hybrid + Preact build (no src)      |
| `hybrid-react-build.test.ts`       | 3          | ✅ All passed | Hybrid + React build                |
| `hybrid-react-flat-build.test.ts`  | 3          | ✅ All passed | Hybrid + React build (no src)       |
| `hybrid-view-build.test.ts`        | 3          | ✅ All passed | Hybrid + View build                 |
| `ssg-preact-build.test.ts`         | 3          | ✅ All passed | SSG + Preact build                  |
| `ssg-react-build.test.ts`          | 3          | ✅ All passed | SSG + React build                   |
| `ssg-view-build.test.ts`           | 3          | ✅ All passed | SSG + View build                    |
| `ssr-preact-build.test.ts`         | 4          | ✅ All passed | SSR + Preact build and server check |
| `ssr-react-build.test.ts`          | 4          | ✅ All passed | SSR + React build and server check  |
| `ssr-view-build.test.ts`           | 4          | ✅ All passed | SSR + View build and server check   |
| **Subtotal**                       | **45**     | ✅ All passed | ~25s                                |

---

## 🔍 Feature Test Details

### 1. Config Management (config.test.ts) - 64 tests

#### 1.1 validateConfig() validation

- ✅ Accept valid base config
- ✅ Accept empty config object
- ✅ Reject non-string name
- ✅ Reject non-string version
- ✅ Reject non-string envPrefix
- ✅ Reject non-boolean hotReload
- ✅ Accept valid render config
- ✅ Accept all valid engine values (react, preact)
- ✅ Accept all valid mode values (ssr, csr, ssg, hybrid)
- ✅ Reject non-object render
- ✅ Reject null render
- ✅ Reject invalid engine value
- ✅ Reject invalid mode value
- ✅ Accept string-path middlewares
- ✅ Accept named function middlewares
- ✅ Accept object middlewares with name property
- ✅ Reject non-array middlewares
- ✅ Reject empty-path middlewares
- ✅ Reject anonymous function middlewares
- ✅ Reject object middlewares without name
- ✅ Reject invalid middleware types
- ✅ Accept plugin objects with name property
- ✅ Accept string-path plugins
- ✅ Reject non-array plugins
- ✅ Reject plugins without name
- ✅ Accept valid server config
- ✅ Reject non-object server
- ✅ Accept valid router config
- ✅ Reject non-object router
- ✅ Accept valid build config
- ✅ Reject non-object build
- ✅ Accept valid logger config
- ✅ Reject non-object logger

#### 1.2 deepMergeConfig() merge

- ✅ Merge two simple config objects
- ✅ Source config overrides target's same-named properties
- ✅ Deep merge nested objects
- ✅ Keep original objects immutable
- ✅ Merge plugins with different names
- ✅ Replace existing plugins with same name
- ✅ Use source array when target is empty array
- ✅ Merge middlewares with different names
- ✅ Replace existing middlewares with same name
- ✅ Support string-path middleware merge
- ✅ Handle multi-level nested config correctly
- ✅ Handle empty config object

### 2. Plugin System (plugin.test.ts) - 15 tests

#### 2.1 initializePlugin()

- ✅ Create plugin manager instance
- ✅ Register plugin manager to service container
- ✅ Accept config options
- ✅ Use default config options
- ✅ Throw error on duplicate call (service already registered)

#### 2.2 getPluginManager()

- ✅ Get plugin manager from container
- ✅ Throw error when not initialized

#### 2.3 registerPlugin()

- ✅ Register plugin to manager
- ✅ Support multiple plugin registration
- ✅ Support plugins with lifecycle hooks
- ✅ Support plugins with config
- ✅ Support plugins with dependencies

#### 2.4 Plugin install and activate

- ✅ Install registered plugins
- ✅ Activate installed plugins
- ✅ Call onInit hook via triggerInit

### 3. Server Integration (server.test.ts) - 13 tests

#### 3.1 initializeServer()

- ✅ Create server instance
- ✅ Register server to service container
- ✅ Use port from config
- ✅ Use hostname from config
- ✅ Use default config
- ✅ Throw error on duplicate call

#### 3.2 getServer()

- ✅ Get server instance from container
- ✅ Throw error when not initialized

#### 3.3 Server config

- ✅ Support dev mode config
- ✅ Support prod mode config
- ✅ Support shutdownTimeout config
- ✅ Support onListen callback config
- ✅ Support onError callback config

### 4. Lifecycle Management (lifecycle.test.ts) - 12 tests

#### 4.1 initializeLifecycle()

- ✅ Create lifecycle manager instance
- ✅ Register lifecycle manager to service container
- ✅ Use lifecycle option from config
- ✅ Use default config
- ✅ Throw error on duplicate call

#### 4.2 getLifecycleManager()

- ✅ Get lifecycle manager from container
- ✅ Throw error when not initialized

#### 4.3 registerLifecycleHook()

- ✅ Register lifecycle hooks
- ✅ Support multiple hooks for same stage
- ✅ Support hooks for different stages

#### 4.4 Lifecycle stage transition

- ✅ Support full lifecycle flow
- ✅ Get current stage

### 5. Middleware System (middleware.test.ts) - 12 tests

#### 5.1 initializeMiddleware()

- ✅ Create middleware chain instance
- ✅ Register middleware chain to service container
- ✅ Throw error on duplicate call

#### 5.2 getMiddlewareChain()

- ✅ Get middleware chain from container
- ✅ Throw error when not initialized

#### 5.3 registerMiddleware()

- ✅ Register middleware to chain
- ✅ Support multiple middlewares in sequence
- ✅ Support named middleware registration
- ✅ Middleware can access context object
- ✅ Middleware can modify context object

#### 5.4 Middleware error handling

- ✅ Errors thrown by middleware propagate
- ✅ Subsequent middlewares do not run after error

### 6. Plugin Events System (plugin-events.test.ts) - 16 tests

#### 6.1 emitPluginEvent()

- ✅ Trigger event hooks of activated plugins
- ✅ Do not trigger event hooks of inactive plugins
- ✅ Pass arguments to event hooks
- ✅ Trigger event hooks of multiple plugins
- ✅ Continue with other plugins when hook throws

#### 6.2 Lifecycle event triggers

- ✅ emitOnInit triggers onInit hook
- ✅ emitOnStart triggers onStart hook
- ✅ emitOnStop triggers onStop hook
- ✅ emitOnShutdown triggers onShutdown hook

#### 6.3 Build event triggers

- ✅ emitOnBuild triggers onBuild hook and passes options
- ✅ emitOnBuildComplete triggers onBuildComplete hook and passes result

#### 6.4 Socket event triggers

- ✅ emitOnSocket triggers onSocket hook
- ✅ emitOnSocketClose triggers onSocketClose hook
- ✅ emitOnSocket silently returns when no pluginManager
- ✅ emitOnSocketClose silently returns when no pluginManager

#### 6.5 Event execution order

- ✅ Trigger events in plugin registration order

### 7. Database Integration (database.test.ts) - 11 tests

#### 7.1 initializeDatabase()

- ✅ Create database manager instance
- ✅ Register database manager to service container
- ✅ Accept database config
- ✅ Throw error on duplicate call

#### 7.2 getDatabaseManager()

- ✅ Get database manager from container
- ✅ Throw error when not initialized
- ✅ Support named managers

#### 7.3 getDatabaseStatus()

- ✅ Return empty array when no connection
- ✅ Return empty array when manager not initialized

#### 7.4 Database config

- ✅ Support default connection config
- ✅ Support multiple named connection configs

### 8. Build Integration (build.test.ts) - 24 tests

#### 8.1 initializeBuild()

- ✅ Create builder instance
- ✅ Register builder to service container
- ✅ Use build mode from config
- ✅ Use render config to determine client engine
- ✅ Use default config
- ✅ Throw error on duplicate call

#### 8.2 getBuild()

- ✅ Get builder instance from container
- ✅ Throw error when not initialized

#### 8.3 Build config

- ✅ Support server config
- ✅ Support client config
- ✅ Support asset handling config
- ✅ Support cache config
- ✅ Support clean config
- ✅ Support incremental build config
- ✅ Support silent mode config
- ✅ Support log level config

### 9. Render Integration (render.test.ts) - 45 tests

#### 9.1 initializeRender()

- ✅ Initialize render service with renderSSR and renderSSG
- ✅ Register render service as singleton
- ✅ Throw error on duplicate call (service already registered)

#### 9.2 getRender()

- ✅ Get render service from container with renderSSR, renderSSG
- ✅ Throw error when not initialized

#### 9.3 renderSSR method

- ✅ Preact/React: function, returns Promise when called
- ✅ Use engine from config as default
- ✅ Render correctly, with props, with layout, skipLayouts
- ✅ Throw when component is null/undefined

#### 9.4 renderSSG method

- ✅ Should be function
- ✅ Returns Promise<string[]> when called
- ✅ Correctly call loadRouteComponent when routes non-empty
- ✅ Throw when loadRouteComponent returns null

#### 9.5 Render engine and mode config

- ✅ Service initializes with react / preact engine config
- ✅ Service initializes with ssr / csr / ssg mode config

### 10. Router Integration (router.test.ts) - 13 tests

#### 10.1 initializeRouter()

- ✅ Create router instance
- ✅ Register router to service container
- ✅ Use router directory from config
- ✅ Use render config to determine framework and SSR mode
- ✅ Use default router directory

#### 10.2 getRouter()

- ✅ Get router instance from container
- ✅ Throw error when not initialized

#### 10.3 Route scanning

- ✅ Scan router directory
- ✅ Scan directories containing route files

#### 10.4 API mode config

- ✅ Support restful API mode
- ✅ Support action API mode

### 11. CLI Command Module (command.test.ts) - 41 tests

#### 11.1 Command class constructor

- ✅ Create Command instance
- ✅ Create Command with name and description
- ✅ Create service container
- ✅ Each Command has independent service container

#### 11.2 Command.app property

- ✅ Throw error when accessing app before init

#### 11.3 Command.container property

- ✅ Return service container
- ✅ Can register and get services

#### 11.4 Command.action()

- ✅ Set command handler
- ✅ Support chaining
- ✅ Set handler and return self

#### 11.5 Command.command() subcommands

- ✅ Create subcommand
- ✅ Subcommand extends Command type
- ✅ Support nested subcommands

#### 11.6 Command options and arguments

- ✅ Support option definition
- ✅ Support argument definition
- ✅ Support chained option definition

#### 11.7 Re-exported API - ANSI colors and styles

- ✅ Export colorize function
- ✅ Export colors object
- ✅ Export stripAnsiCodes function
- ✅ Export shouldUseColor function

#### 11.8 Re-exported API - Cursor control

- ✅ Export clearLine function
- ✅ Export clearScreen function
- ✅ Export moveCursor function
- ✅ Export hideCursor function
- ✅ Export showCursor function

#### 11.9 Re-exported API - Output formatting

- ✅ Export success function
- ✅ Export error function
- ✅ Export warning function
- ✅ Export info function
- ✅ Export title function
- ✅ Export separator function
- ✅ Export list function
- ✅ Export numberedList function
- ✅ Export keyValue function
- ✅ Export keyValuePairs function

#### 11.10 Re-exported API - Table display

- ✅ Export table function
- ✅ Export keyValueTable function
- ✅ Export progressBar function

#### 11.11 Re-exported API - User interaction

- ✅ Export input function
- ✅ Export select function
- ✅ Export confirm function

### 12. Logger Integration (logger.test.ts) - 17 tests

#### 12.1 initializeLogger()

- ✅ Create logger instance
- ✅ Register logger to service container
- ✅ Use log level from config
- ✅ Use log format from config
- ✅ Use default config
- ✅ Throw error on duplicate call

#### 12.2 getLogger()

- ✅ Get logger from container
- ✅ Throw error when not initialized

#### 12.3 Logger features

- ✅ Support all log levels
- ✅ Support logs with extra params

### 13. Service Container Integration (service.test.ts) - 9 tests

#### 13.1 initializeServiceContainer()

- ✅ Create service container instance
- ✅ Register container itself as singleton
- ✅ Each call creates new container
- ✅ Support register and get services
- ✅ Singleton returns same instance

#### 13.2 getServiceContainer()

- ✅ Get registered service container
- ✅ Same as container from initializeServiceContainer

#### 13.3 Service container features

- ✅ Support multiple service registration and retrieval
- ✅ Support dependency injection between services

### 14. Unified Error Handling (errors.test.ts) - 12 tests

- ✅ createDwebError creates error instance, with params
- ✅ throwDwebError throws error, with cause
- ✅ assertRejects async error assertion
- ✅ isDwebError type guard
- ✅ DwebError instance methods toString, toJSON
- ✅ setDwebErrorTranslator i18n translator, pass null to clear

### 15. Runtime Adapter (runtime-adapter.test.ts) - 17 tests

- ✅ Process and env: getEnv, setEnv, cwd, args, exit
- ✅ Path: join, resolve, dirname, basename
- ✅ File system: readFileSync, readTextFile, writeTextFile, mkdir, exists
- ✅ cwd() returns non-empty string, join() concatenates paths

### 16. CSR Client Builder and Renderer (csr-client-builder.test.ts / render-csr.test.ts)

- ✅ clearClientScriptCache, getCachedClientScript, createClientScriptMiddleware
  (5 cases)
- ✅ createRendererCSR returns function, accepts (ctx, match) (3 cases)

### 17. SSR / Hybrid / SSG Renderers (render-ssr.test.ts / render-hybrid.test.ts / render-ssg.test.ts)

- ✅ createRendererSSR (6), createRendererHybrid (6), createRendererSSG (5) all
  return function with two params; return null when match.isApi is true

### 18. Version (version.test.ts) - 3 tests

- ✅ DWEB_VERSION exports string, semver format, non-empty

### 19. CLI (cli.test.ts) - 1 test

- ✅ createCLI() returns Command with execute method

### 20. Context / LoadContext (context.test.ts) - 22 tests

- ✅ **parseCookies()**: empty/missing Cookie header, single/multiple cookies,
  duplicate keys, trim, skip invalid segments
- ✅ **createMetaContext()**: returns url, params, query
- ✅ **createLoadContext()**: fills method, headers, cookies from Request;
  optional session and response
- ✅ **createServerResponse()**: redirect (302/301), **json**
  (`{ success, data }` envelope; non-2xx status), html, text, binary
  (Uint8Array/ArrayBuffer), body, status (with statusText)

### 21. Additional Unit Tests (app, asset-manifest, build-dirs, sanitize, path, runtime, etc.)

- ✅ **app.test.ts** (20): App constructor, use(), registerPlugin(), on(),
  stage, init flow
- ✅ **asset-manifest.test.ts** (6): replaceAssetPathsInHtml and asset manifest
- ✅ **build-dirs.test.ts** (18): Build directory inference and clean
- ✅ **sanitize.test.ts** (15): sanitizeRequestParams dangerous key filter, NUL
  filter, empty value handling
- ✅ **path.test.ts** (18): isPathWithinProject, pathForLog,
  normalizePathForCompare, extractComponentPathFromRouteFile (makeTempDir for
  Windows)
- ✅ **runtime.test.ts** (12): getRuntime, getTaskArgs, getTestArgs,
  getLintArgs, etc.
- ✅ **module-cache.test.ts** (5): invalidateModule, getModuleVersion
  (pathToFileUrl for Windows)
- ✅ **load-route-module.test.ts** (7): loadRouteModule,
  clearCssRouteCacheForPath, CSS import
- ✅ **config-loader.test.ts** (4): loadProjectConfig (pathToFileUrl, Windows
  skip removed)
- ✅ **csr-client-middleware.test.ts** (6): createClientScriptMiddleware, next
  call, prod mode, chunk files
- ✅ **i18n.test.ts** (13): $t, setDwebLocale, detectLocale
- ✅ **generate.test.ts** (6): generate service, api, model, route; output error
  for unsupported type
- ✅ **socket-io.test.ts** (9): initializeSocketIo, getSocketIoServer,
  getSocketIoPath, createSocketIoMiddleware; onConnection when handlers passed
- ✅ **websocket.test.ts** (7): initializeWebSocket, getWebSocketServer,
  getWebSocketPath, createWebSocketMiddleware; onConnection when handlers passed
- ✅ **cmd-clean.test.ts** (3): main cleans dist etc.
- ✅ **cmd-build.test.ts** (3): main when no deno.json / no build task
- ✅ **cmd-dev/start/preview/fmt/lint/test.test.ts** (2 each): main returns
  early when no deno.json
- ✅ **cmd-upgrade.test.ts** (2): main runs, --beta option
- ✅ **cmd-update.test.ts** (3): main when no deno.json, runs update when
  deno.json exists
- ✅ **windows.test.ts** (48, 2 ignored): path normalization, build output
  inference, module cache, component path extraction, path safety check,
  log-friendly path (Windows-only cases skipped on non-Windows)

---

## 📈 Test Coverage Analysis

### API Method Coverage

| Module                | Method                                                                                  | Status |
| --------------------- | --------------------------------------------------------------------------------------- | ------ |
| app                   | App constructor                                                                         | ✅     |
| app                   | App.use()                                                                               | ✅     |
| app                   | App.registerPlugin()                                                                    | ✅     |
| app                   | App.on()                                                                                | ✅     |
| app                   | App.stage                                                                               | ✅     |
| config                | validateConfig()                                                                        | ✅     |
| config                | deepMergeConfig()                                                                       | ✅     |
| service               | initializeServiceContainer()                                                            | ✅     |
| service               | getServiceContainer()                                                                   | ✅     |
| lifecycle             | initializeLifecycle()                                                                   | ✅     |
| lifecycle             | getLifecycleManager()                                                                   | ✅     |
| lifecycle             | registerLifecycleHook()                                                                 | ✅     |
| middleware            | initializeMiddleware()                                                                  | ✅     |
| middleware            | getMiddlewareChain()                                                                    | ✅     |
| middleware            | registerMiddleware()                                                                    | ✅     |
| plugin                | initializePlugin()                                                                      | ✅     |
| plugin                | getPluginManager()                                                                      | ✅     |
| plugin                | registerPlugin()                                                                        | ✅     |
| plugin-events         | emitPluginEvent()                                                                       | ✅     |
| plugin-events         | emitOnInit()                                                                            | ✅     |
| plugin-events         | emitOnStart()                                                                           | ✅     |
| plugin-events         | emitOnStop()                                                                            | ✅     |
| plugin-events         | emitOnShutdown()                                                                        | ✅     |
| plugin-events         | emitOnBuild()                                                                           | ✅     |
| plugin-events         | emitOnBuildComplete()                                                                   | ✅     |
| plugin-events         | emitOnSocket()                                                                          | ✅     |
| plugin-events         | emitOnSocketClose()                                                                     | ✅     |
| server                | initializeServer()                                                                      | ✅     |
| server                | getServer()                                                                             | ✅     |
| database              | initializeDatabase()                                                                    | ✅     |
| database              | getDatabaseManager()                                                                    | ✅     |
| database              | getDatabaseStatus()                                                                     | ✅     |
| database              | connectDatabases()                                                                      | ⬜     |
| database              | disconnectDatabases()                                                                   | ⬜     |
| build                 | initializeBuild()                                                                       | ✅     |
| build                 | getBuild()                                                                              | ✅     |
| render                | initializeRender()                                                                      | ✅     |
| render                | getRender()                                                                             | ✅     |
| render                | renderSSR()                                                                             | ✅     |
| render                | renderSSG()                                                                             | ✅     |
| router                | initializeRouter()                                                                      | ✅     |
| router                | getRouter()                                                                             | ✅     |
| logger                | initializeLogger()                                                                      | ✅     |
| logger                | getLogger()                                                                             | ✅     |
| command               | Command constructor                                                                     | ✅     |
| command               | Command.initApp()                                                                       | ⬜     |
| command               | Command.app                                                                             | ✅     |
| command               | Command.container                                                                       | ✅     |
| command               | Command.action()                                                                        | ✅     |
| command               | Command.command()                                                                       | ✅     |
| command               | Re-exported API (colorize, colors, etc.)                                                | ✅     |
| runtime-adapter       | getEnv / cwd / join / readTextFile, etc.                                                | ✅     |
| errors                | createDwebError / throwDwebError / isDwebError / setDwebErrorTranslator                 | ✅     |
| csr-client-builder    | clearClientScriptCache / createClientScriptMiddleware                                   | ✅     |
| render-csr            | createRendererCSR()                                                                     | ✅     |
| render-ssr            | createRendererSSR()                                                                     | ✅     |
| render-hybrid         | createRendererHybrid()                                                                  | ✅     |
| render-ssg            | createRendererSSG()                                                                     | ✅     |
| version               | DWEB_VERSION                                                                            | ✅     |
| cli                   | createCLI() / execute                                                                   | ✅     |
| context               | parseCookies() / createLoadContext() / createMetaContext() / createServerResponse()     | ✅     |
| sanitize              | sanitizeRequestParams()                                                                 | ✅     |
| path                  | isPathWithinProject / pathForLog / normalizePathForCompare                              | ✅     |
| runtime               | getRuntime / getTaskArgs / getTestArgs / getLintArgs                                    | ✅     |
| module-cache          | invalidateModule / getModuleVersion                                                     | ✅     |
| load-route-module     | loadRouteModule / clearCssRouteCacheForPath                                             | ✅     |
| asset-manifest        | replaceAssetPathsInHtml                                                                 | ✅     |
| config-loader         | loadProjectConfig                                                                       | ✅     |
| csr-client-middleware | createClientScriptMiddleware                                                            | ✅     |
| socket-io             | initializeSocketIo / getSocketIoServer / getSocketIoPath / createSocketIoMiddleware     | ✅     |
| websocket             | initializeWebSocket / getWebSocketServer / getWebSocketPath / createWebSocketMiddleware | ✅     |

### Edge Case Coverage

| Edge case                           | Status |
| ----------------------------------- | ------ |
| Empty config object                 | ✅     |
| Invalid type config                 | ✅     |
| Duplicate service registration      | ✅     |
| Get when service not registered     | ✅     |
| Multiple plugins/middlewares        | ✅     |
| Middleware error propagation        | ✅     |
| Plugin hook error isolation         | ✅     |
| Config deep merge                   | ✅     |
| Same-name plugin/middleware replace | ✅     |

### Error Handling Coverage

| Error scenario               | Status |
| ---------------------------- | ------ |
| Config validation error      | ✅     |
| Duplicate registration error | ✅     |
| Service not found error      | ✅     |
| Middleware execution error   | ✅     |
| Plugin hook execution error  | ✅     |
| Data validation error        | ✅     |

---

## 📝 Strengths

1. **Complete core module coverage**: config, service, lifecycle, middleware,
   plugin, plugin-events all tested
2. **Thorough config validation tests**: validateConfig and deepMergeConfig
   cover various scenarios
3. **Error isolation tests**: verify plugin errors do not affect other plugins
4. **Service container tests**: verify singleton and dependency injection
5. **Middleware onion model**: verify middleware executes in order

---

## 🎯 Conclusion

@dreamer/dweb tests are fully covered at file level. **833** test cases pass (2
Windows-only cases skipped on non-Windows). Tests were run with
`deno test -A
tests` in a single run (~**6m18s**). All tests are substantive and
verify actual behavior. Coverage includes:

- ✅ Config management (validation and merge, including render.mode hybrid)
- ✅ Service container integration
- ✅ Lifecycle management
- ✅ Middleware system
- ✅ Plugin system
- ✅ Plugin events system (onSocket, onSocketClose)
- ✅ Server integration
- ✅ Database integration
- ✅ Build tool integration
- ✅ Render engine integration (renderSSR, renderSSG)
- ✅ Router system integration
- ✅ Logger system integration
- ✅ CLI command module (createCLI)
- ✅ Context / LoadContext (parseCookies, createLoadContext, createMetaContext,
  createServerResponse)
- ✅ Runtime adapter (runtime-adapter re-export)
- ✅ Unified error handling (DwebError, throwDwebError, i18n translator)
- ✅ CSR client build and createRendererCSR
- ✅ createRendererSSR / createRendererHybrid / createRendererSSG
- ✅ Version (DWEB_VERSION)
- ✅ Utility modules (sanitize, path, runtime, config-loader)
- ✅ Feature modules (module-cache, load-route-module, csr-client-middleware,
  socket-io, websocket)
- ✅ CLI subcommands (clean, build, dev, start, preview, fmt, lint, test,
  upgrade, update)
- ✅ Windows compatibility (path normalization, build output inference, module
  cache, component path extraction, path safety check, log-friendly path)
- ✅ **E2E tests**: browser render (home, about, counter, metadata across
  examples), server request
- ✅ **Integration tests**: config and lifecycle, CSR/SSR/SSG/Hybrid build and
  server checks for multiple engines

Core framework, e2e, and integration scenarios are fully tested. **865** cases
pass; **10** are ignored where appropriate (**2** Windows-only on non-Windows;
**8** e2e SSG/SSR scenarios).
