# dweb 框架死代码 / 无效代码分析报告

> 分析日期：2025-02-05  
> 分析范围：`dweb/src/` 及 `dweb/tests/`

---

## 一、已移除的死代码

以下死代码已移除（2025-02-05）：

- `isDwebI18nInitialized`（`src/utils/i18n.ts`）：仅定义无调用，已删除
- `getNpmPackagesFromLockfile`（`src/cmd/init.ts`）：注释称用于 allowScripts 写入但未集成，已删除
- `getBusinessConfig` / `getBusinessConfigValue`（`src/core/config.ts`）：废弃 API，已删除，请使用 `getParams` / `getParamValue`

---

## 二、插件事件已完成集成（非死代码）

以下为**插件事件触发器**，设计用于在对应时机调用已注册插件的钩子。框架已统一通过 `plugin-events.ts` 的 `pluginEvents` 命名空间调用，中间件在 `middleware.ts` 中实现。

### `emitOnHealthCheck` / `emitOnHotReload` / `emitOnBuildComplete`（`src/core/plugin-events.ts`）

- **位置**：`plugin-events.ts` 中定义
- **设计意图**：在构建完成、HMR 热重载完成、健康检查时，触发插件的 `onBuildComplete`、`onHotReload`、`onHealthCheck` 钩子。
- **调用点**：✅ 已全部接入
  | 事件 | 调用位置 |
  |------|----------|
  | `emitOnBuildComplete` | `app.ts` 的 `build()` 末尾、`this.emit("build")` 之前 |
  | `emitOnHotReload` | `feature/server.ts` 默认 `builder.rebuild` 中，`buildClientScript` 返回后 |
  | `emitOnHealthCheck` | `middleware.ts` 的 `createHealthCheckMiddleware`，处理 `GET /health` 时调用；在 `app.ts` 中注册 |

---

## 三、已确认有使用的导出（非死代码）

以下导出在框架或测试中有明确使用，**不是死代码**：

| 导出 | 使用位置 |
|------|----------|
| `emitOnInit` | `app.ts` |
| `emitOnStart` | `app.ts` |
| `emitOnStop` | `app.ts` |
| `emitOnShutdown` | `app.ts` |
| `emitOnBuild` | `app.ts` |
| `emitOnRequest` | `middleware.ts` |
| `emitOnResponse` | `middleware.ts` |
| `emitOnError` | `middleware.ts` |
| `emitOnRoute` | `feature/router.ts` |
| `emitOnBuildComplete` | `app.ts` |
| `emitOnHotReload` | `feature/server.ts` |
| `emitOnHealthCheck` | `middleware.ts`（`createHealthCheckMiddleware`） |
| `pluginEventsMiddleware` | `middleware.ts` 实现，`app.ts` 注册 |
| `createHealthCheckMiddleware` | `middleware.ts` 实现，`app.ts` 注册 |
| `createDwebError` | `middleware.ts`、`errors.test.ts` |
| `getDwebErrorTranslator` | `errors.test.ts` |
| `DEFAULT_ERROR_MESSAGES` | `errors.test.ts` |
| `loadDwebDenoJson` | `init.ts`、`setup.ts`、`version.ts` |
| `getMainModulePath` | `build-dirs.ts`、`app.ts`（内部 `_getMainModulePath`） |
| `fromFileUrl` / `getPackageRoot` | `setup.ts`、`version.ts` |

> **已完成**：`emitOnBuildComplete`、`emitOnHotReload`、`emitOnHealthCheck` 均已接入；`isDwebI18nInitialized`、`getNpmPackagesFromLockfile`、`getBusinessConfig`、`getBusinessConfigValue` 已移除。

---

## 四、分析说明

- 分析基于静态 grep 搜索，未使用类型/控制流分析工具
- 未覆盖通过字符串或动态导入的间接调用
- 建议配合 `deno check`、测试覆盖和人工 review 使用本报告
