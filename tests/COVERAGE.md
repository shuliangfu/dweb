# dweb 测试覆盖检查报告

## 一、源码与单元测试对应关系

### 1. 已有单元测试的模块 ✅

| 源码                    | 测试文件                | 说明                                                                          |
| ----------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| `core/app.ts`           | `app.test.ts`           | App 类、use、registerPlugin、on、配置与容器                                   |
| `core/config.ts`        | `config.test.ts`        | validateConfig、deepMergeConfig                                               |
| `core/service.ts`       | `service.test.ts`       | initializeServiceContainer、getServiceContainer                               |
| `core/middleware.ts`    | `middleware.test.ts`    | initializeMiddleware、registerMiddleware、getMiddlewareChain                  |
| `core/plugin.ts`        | `plugin.test.ts`        | initializePlugin、registerPlugin、getPluginManager                            |
| `core/plugin-events.ts` | `plugin-events.test.ts` | emitOnInit/OnStart/OnStop/OnBuild/OnShutdown                                  |
| `core/lifecycle.ts`     | `lifecycle.test.ts`     | initializeLifecycle、getLifecycleManager、钩子                                |
| `core/database.ts`      | `database.test.ts`      | initializeDatabase、getDatabaseManager、getDatabaseStatus                     |
| `feature/build.ts`      | `build.test.ts`         | initializeBuild、getBuild、构建配置                                           |
| `feature/command.ts`    | `command.test.ts`       | Command 类、子命令、选项、@dreamer/console 重导出                             |
| `feature/render.ts`     | `render.test.ts`        | initializeRender、getRender、renderSSR/renderSSG（**存在与当前 API 不一致**） |
| `feature/router.ts`     | `router.test.ts`        | initializeRouter、getRouter、路由扫描                                         |
| `feature/server.ts`     | `server.test.ts`        | initializeServer、getServer、服务器配置                                       |
| `utils/logger.ts`       | `logger.test.ts`        | initializeLogger、getLogger、日志配置                                         |

### 2. 已有单元测试的补充 ✅（本次新增）

| 源码                            | 测试文件                     | 说明                                                                        |
| ------------------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| `core/runtime-adapter.ts`       | `runtime-adapter.test.ts`    | re-export 的 getEnv、cwd、join、mkdir、ensureDir、文件系统等 API 存在性     |
| `feature/csr-client-builder.ts` | `csr-client-builder.test.ts` | clearClientScriptCache、getCachedClientScript、createClientScriptMiddleware |
| `feature/render-csr.ts`         | `render-csr.test.ts`         | createRendererCSR 返回函数                                                  |
| `feature/render-ssr.ts`         | `render-ssr.test.ts`         | createRendererSSR 返回函数                                                  |
| `feature/render-hybrid.ts`      | `render-hybrid.test.ts`      | createRendererHybrid 返回函数                                               |
| `feature/render-ssg.ts`         | `render-ssg.test.ts`         | createRendererSSG 返回函数、路径映射                                        |
| `utils/version.ts`              | `version.test.ts`            | DWEB_VERSION 格式与存在性                                                   |
| `cli.ts`                        | `cli.test.ts`                | createCLI() 返回 Command、execute 方法                                      |
| `cmd/db.ts`                     | `db.test.ts`                 | migrate create 创建迁移文件（ensureDir 覆盖）                               |
| `cmd/generate.ts`               | `generate.test.ts`           | main() 生成 service/api/model/route（ensureDir 覆盖）                       |

### 3. 新增单测（本次补充）

| 源码                               | 测试文件                        | 说明                                                                                 |
| ---------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| `utils/sanitize.ts`                | `sanitize.test.ts`              | sanitizeRequestParams 危险键、NUL 过滤、空值处理                                     |
| `utils/path.ts`                    | `path.test.ts`                  | isPathWithinProject、pathForLog、normalizePathForCompare                             |
| `utils/runtime.ts`                 | `runtime.test.ts`               | getRuntime、getTaskArgs、getTestArgs、getLintArgs 等                                 |
| `utils/asset-manifest.ts`          | `asset-manifest.test.ts`        | replaceAssetPathsInHtml                                                              |
| `utils/config-loader.ts`           | `config-loader.test.ts`         | loadProjectConfig                                                                    |
| `feature/module-cache.ts`          | `module-cache.test.ts`          | invalidateModule、getModuleVersion                                                   |
| `feature/load-route-module.ts`     | `load-route-module.test.ts`     | loadRouteModule、clearCssRouteCacheForPath                                           |
| `feature/csr-client-middleware.ts` | `csr-client-middleware.test.ts` | createClientScriptMiddleware、next 调用、生产模式静态文件                            |
| `cmd/clean.ts`                     | `cmd-clean.test.ts`             | main 清理 dist 等目录                                                                |
| `cmd/build.ts`                     | `cmd-build.test.ts`             | main 无 deno.json / 无 build task 时行为                                             |
| `cmd/dev.ts`                       | `cmd-dev.test.ts`               | main 无 deno.json 时提前返回                                                         |
| `cmd/start.ts`                     | `cmd-start.test.ts`             | main 无 deno.json 时提前返回                                                         |
| `cmd/preview.ts`                   | `cmd-preview.test.ts`           | main 无 deno.json 时提前返回                                                         |
| `cmd/fmt.ts`                       | `cmd-fmt.test.ts`               | main 无 deno.json 时提前返回                                                         |
| `cmd/lint.ts`                      | `cmd-lint.test.ts`              | main 无 deno.json 时提前返回                                                         |
| `cmd/test.ts`                      | `cmd-test.test.ts`              | main 无 deno.json 时提前返回                                                         |
| `cmd/upgrade.ts`                   | `cmd-upgrade.test.ts`           | main 正常执行、--beta 选项                                                           |
| `feature/socket-io.ts`             | `socket-io.test.ts`             | initializeSocketIo、getSocketIoServer、getSocketIoPath、createSocketIoMiddleware     |
| `feature/websocket.ts`             | `websocket.test.ts`             | initializeWebSocket、getWebSocketServer、getWebSocketPath、createWebSocketMiddleware |

### 4. 仍无单测或仅间接覆盖

| 源码                                   | 说明                                                               |
| -------------------------------------- | ------------------------------------------------------------------ |
| `mod.ts`                               | 主入口（re-export，通过其它测试间接覆盖）                          |
| `types/app.ts`                         | 类型定义（通过使用方测试间接覆盖）                                 |
| `feature/csr-client-builder`           | ensureDir（生产构建输出目录）由 build 集成测试间接覆盖，无独立单测 |
| `config.inferConfigDirectoryFromEntry` | 依赖 Deno.mainModule 只读，无法 mock，由 build-dirs 等间接覆盖     |

---

## 二、e2e / 集成测试

- **e2e/**：`server-request.test.ts` - 使用 preact-ssr basic
  示例启动服务器，发起 HTTP 请求，验证返回 HTML 包含 `<!DOCTYPE` 或 `<html`。
- **integration/**：`config-lifecycle.test.ts` - 临时目录创建
  config、routes，验证 App 能加载 config、`app.name`/`app.version` 正确、init
  生命周期事件触发。

---

## 三、覆盖结论

| 维度                 | 情况                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **核心层 (core)**    | 9 个文件均有对应单元测试（含 runtime-adapter.test.ts）                                                                |
| **功能层 (feature)** | 10 个文件均有对应单元测试（含 render-ssg.test.ts）                                                                    |
| **工具 (utils)**     | logger、version 有单测；**cli** 有 cli.test.ts                                                                        |
| **可运行性**         | `deno test -A tests/` 可完整通过（含 unit、e2e、integration）；类型检查使用 `deno check .` |

**结论**：dweb 的单元测试在**文件级**已基本全面覆盖；仅 `mod.ts`（主入口
re-export）与
`types/app.ts`（类型定义）无独立单测，依赖使用方间接覆盖。e2e、integration
已补充实际用例。

---

## 四、详细覆盖率分析

**行/分支覆盖率**：运行 `deno test -A --coverage=coverage tests` 后执行
`deno coverage coverage` 可查看。

**完整分析报告**：参见
[docs/TEST_COVERAGE_ANALYSIS.md](../docs/TEST_COVERAGE_ANALYSIS.md)，包含：

- 各模块行/分支覆盖率明细
- 无独立单测的模块列表
- 关键逻辑未覆盖项
- 改进建议与优先级
