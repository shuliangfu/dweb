# dweb 测试覆盖检查报告

## 一、源码与单元测试对应关系

### 1. 已有单元测试的模块 ✅

| 源码 | 测试文件 | 说明 |
|------|----------|------|
| `core/app.ts` | `app.test.ts` | App 类、use、registerPlugin、on、配置与容器 |
| `core/config.ts` | `config.test.ts` | validateConfig、deepMergeConfig |
| `core/service.ts` | `service.test.ts` | initializeServiceContainer、getServiceContainer |
| `core/middleware.ts` | `middleware.test.ts` | initializeMiddleware、registerMiddleware、getMiddlewareChain |
| `core/plugin.ts` | `plugin.test.ts` | initializePlugin、registerPlugin、getPluginManager |
| `core/plugin-events.ts` | `plugin-events.test.ts` | emitOnInit/OnStart/OnStop/OnBuild/OnShutdown |
| `core/lifecycle.ts` | `lifecycle.test.ts` | initializeLifecycle、getLifecycleManager、钩子 |
| `core/database.ts` | `database.test.ts` | initializeDatabase、getDatabaseManager、getDatabaseStatus |
| `feature/build.ts` | `build.test.ts` | initializeBuild、getBuild、构建配置 |
| `feature/command.ts` | `command.test.ts` | Command 类、子命令、选项、@dreamer/console 重导出 |
| `feature/render.ts` | `render.test.ts` | initializeRender、getRender、renderSSR/renderSSG（**存在与当前 API 不一致**） |
| `feature/router.ts` | `router.test.ts` | initializeRouter、getRouter、路由扫描 |
| `feature/server.ts` | `server.test.ts` | initializeServer、getServer、服务器配置 |
| `utils/logger.ts` | `logger.test.ts` | initializeLogger、getLogger、日志配置 |

### 2. 已有单元测试的补充 ✅（本次新增）

| 源码 | 测试文件 | 说明 |
|------|----------|------|
| `core/runtime-adapter.ts` | `runtime-adapter.test.ts` | re-export 的 getEnv、cwd、join、文件系统等 API 存在性 |
| `feature/csr-client-builder.ts` | `csr-client-builder.test.ts` | clearClientScriptCache、getCachedClientScript、createClientScriptMiddleware |
| `feature/render-csr.ts` | `render-csr.test.ts` | createRendererCSR 返回函数 |
| `feature/render-ssr.ts` | `render-ssr.test.ts` | createRendererSSR 返回函数 |
| `feature/render-hybrid.ts` | `render-hybrid.test.ts` | createRendererHybrid 返回函数 |
| `feature/render-ssg.ts` | `render-ssg.test.ts` | createRendererSSG 返回函数、路径映射 |
| `utils/version.ts` | `version.test.ts` | DWEB_VERSION 格式与存在性 |
| `cli.ts` | `cli.test.ts` | createCLI() 返回 Command、execute 方法 |

### 3. 仍无单测或仅间接覆盖

| 源码 | 说明 |
|------|------|
| `mod.ts` | 主入口（re-export，通过其它测试间接覆盖） |
| `types/app.ts` | 类型定义（通过使用方测试间接覆盖） |

---

## 二、e2e / 集成测试

- **e2e/**：仅有 README，无实际用例。
- **integration/**：仅有 README，无实际用例。

---

## 三、覆盖结论

| 维度 | 情况 |
|------|------|
| **核心层 (core)** | 9 个文件均有对应单元测试（含 runtime-adapter.test.ts） |
| **功能层 (feature)** | 10 个文件均有对应单元测试（含 render-ssg.test.ts） |
| **工具 (utils)** | logger、version 有单测；**cli** 有 cli.test.ts |
| **可运行性** | `deno test -A tests/unit` 可完整通过（需在 dweb 目录下执行，排除 examples 等） |

**结论**：dweb 的单元测试在**文件级**已基本全面覆盖；仅 `mod.ts`（主入口 re-export）与 `types/app.ts`（类型定义）无独立单测，依赖使用方间接覆盖。未统计行/分支覆盖率。e2e、integration 目录仍无实际用例，可按需求补充。
