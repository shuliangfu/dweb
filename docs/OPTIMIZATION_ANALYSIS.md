# dweb 框架优化分析报告

> 分析日期：2025-02-05\
> 分析范围：`dweb/src/` 全量代码\
> 分析维度：性能、代码质量、安全

---

## 一、性能分析

### 1.1 已做得较好的方面

| 方面                 | 实现                    | 说明                                                                                                      |
| -------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| **模块缓存**         | `module-cache.ts`       | 开发模式通过 `versionMap` + `?t=version` 实现 cache-busting，避免 Deno/Bun 缓存导致热重载失效             |
| **客户端脚本缓存**   | `csr-client-builder.ts` | `cachedClientScript` 缓存构建结果，开发模式避免重复构建；`clearClientScriptCache()` 在 rebuild 时正确清理 |
| **代码分割**         | esbuild 配置            | 生产模式启用 `splitting`，按路由 chunk 按需加载                                                           |
| **HMR 无感刷新**     | `chunkUrl` 回退         | 变更文件时优先用 `chunkUrl` 拉取新 chunk，避免整页刷新                                                    |
| **配置扫描深度限制** | `config-loader.ts`      | `MAX_CONFIG_SCAN_DEPTH = 3`，防止递归过深                                                                 |
| **单例服务**         | ServiceContainer        | 配置、路由、渲染等通过 `registerSingleton` 复用实例                                                       |

### 1.2 可优化点

| 优先级 | 问题                             | 位置                    | 建议                                                                     |
| ------ | -------------------------------- | ----------------------- | ------------------------------------------------------------------------ |
| 中     | ~~**versionMap 无界增长**~~      | `module-cache.ts`       | **✅ 已优化**：超出 `MAX_VERSION_MAP_SIZE`（2000）时淘汰最早条目         |
| 中     | ~~**loadRouteModule 串行**~~     | `render-ssr.ts`         | **✅ 已优化**：页面、App、Layout 已改为 `Promise.all` 并行加载           |
| 低     | ~~**scanRouteComponents 递归**~~ | `csr-client-builder.ts` | **✅ 已优化**：改为迭代（队列）+ 最大深度限制（MAX_ROUTE_SCAN_DEPTH=10） |
| 低     | ~~**插件事件顺序执行**~~         | `plugin-events.ts`      | **✅ 已评估**：保持顺序执行，因插件有隐式依赖且 onRequest 需短路返回     |

### 1.3 性能优化建议代码示例

**loadRouteModule 并行加载（render-ssr.ts）：**

```ts
// 当前：串行
const pageModule = await loadRouteModule(match.route.fullPath);
// ...
const appModule = await loadRouteModule(appPath);
const layoutModule = await loadRouteModule(layoutPath);

// 建议：并行
const [pageModule, appModule, layoutModule] = await Promise.all([
  loadRouteModule(match.route.fullPath),
  appPath ? loadRouteModule(appPath) : Promise.resolve(null),
  layoutPath ? loadRouteModule(layoutPath) : Promise.resolve(null),
]);
```

---

## 二、代码质量分析

### 2.1 已做得较好的方面

| 方面             | 实现                 | 说明                                       |
| ---------------- | -------------------- | ------------------------------------------ |
| **类型安全**     | 全量 TypeScript      | 配置、路由、插件等均有类型定义             |
| **错误码体系**   | `errors.ts`          | `DwebErrorCode` 分段管理，支持 i18n        |
| **配置验证**     | `validateConfig`     | 启动前校验 middlewares、plugins、server 等 |
| **生命周期管理** | `@dreamer/lifecycle` | 明确的 init → start → stop → shutdown 阶段 |
| **插件事件集中** | `plugin-events.ts`   | 统一 `pluginEvents` 命名空间，调用点清晰   |
| **运行时适配**   | `runtime-adapter`    | 统一 Deno/Bun 文件、路径、环境变量等 API   |

### 2.2 可改进点

| 优先级 | 问题                     | 位置                                                                          | 建议                                                                                                |
| ------ | ------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 中     | ~~**any 类型**~~         | `render-ssr.ts`、`render-ssg.ts`、`render-hybrid.ts`、`csr-client-builder.ts` | **✅ 已优化**：`ctx` 统一使用 `HttpContext`（来自 `@dreamer/server`），类型安全且与服务器上下文一致 |
| 中     | ~~**动态 import 路径**~~ | `app.ts` `_loadMiddlewareFromFile`                                            | **✅ 已优化**：使用 `pathToFileURL` 正确编码特殊字符（空格、#、? 等）                               |
| 低     | ~~**大文件拆分**~~       | `csr-client-builder.ts`                                                       | **✅ 已优化**：`createClientScriptMiddleware` 拆至 `csr-client-middleware.ts`                       |
| 低     | ~~**魔法字符串**~~       | `middleware.ts`                                                               | **✅ 已优化**：`SERVICE_KEY_MIDDLEWARE_CHAIN`、`SERVICE_KEY_SERVER_MIDDLEWARES`                     |

### 2.3 代码规范建议

- 统一使用 `deno fmt`、`deno lint` 保持风格一致
- 对复杂函数补充 JSDoc `@param`、`@returns`
- 错误处理：优先使用 `throwDwebError`，避免裸 `throw new Error`

---

## 三、安全分析

### 3.1 已做得较好的方面

| 方面                   | 实现                          | 说明                                                           |
| ---------------------- | ----------------------------- | -------------------------------------------------------------- |
| **路径规范化**         | `realPath`、`resolve`         | 配置加载、中间件加载前做路径解析                               |
| **迁移名 sanitize**    | `db.ts`                       | `sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, "_")` 防止注入 |
| **健康检查无敏感信息** | `createHealthCheckMiddleware` | 仅返回 `status`、`checks`，不暴露内部路径                      |
| **默认 host**          | `server.ts`                   | `host: "127.0.0.1"` 默认不对外暴露                             |

### 3.2 潜在风险与建议

| 优先级 | 风险                     | 位置                    | 说明与建议                                                                                                                                                                                          |
| ------ | ------------------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **高** | **XSS（innerHTML）**     | `csr-client-builder.ts` | ~~`renderError`、构建失败回退脚本~~ → **✅ 已修复**：`renderError` 增加 `escapeHtml` 转义；构建失败脚本内联 `escapeHtml` 并在运行时转义 `errorMessage`。`renderNotFound` 仅用 i18n 静态文案，无风险 |
| 中     | ~~**动态 import 路径**~~ | `load-route-module.ts`  | **✅ 已优化**：`isPathWithinProject` 校验 + `pathToFileURL`，禁止路径穿越                                                                                                                           |
| 中     | ~~**插件/中间件路径**~~  | `app.ts`                | **✅ 已修复**：`_loadMiddlewareFromFile`、`pluginManager.loadFromFile` 前增加 `_isPathWithinProject` 校验，路径必须在 `cwd()` 下                                                                    |
| 低     | ~~**配置热重载**~~       | `config.ts`             | **✅ 已优化**：`loadModuleConfig` 中增加 `isPathWithinProject` 校验，仅加载项目目录内配置                                                                                                           |

### 3.3 XSS 修复建议

**当前代码（csr-client-builder.ts 约 418–430 行）：**

```ts
// renderError 中：error.message 直接插入 innerHTML
const message = error instanceof Error ? error.message : String(error);
container.innerHTML = `...<p>${message}</p>...`;
```

**建议：增加 HTML 转义**

```ts
/** 将字符串转义为安全 HTML 文本，防止 XSS */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 使用
container.innerHTML = `...<p>${escapeHtml(message)}</p>...`;
```

或改用 `textContent`（若不需要富文本）：

```ts
const p = document.createElement("p");
p.textContent = message;
container.appendChild(p);
```

---

## 四、总结与优先级

| 维度     | 整体评价 | 优先改进项                                                                     |
| -------- | -------- | ------------------------------------------------------------------------------ |
| **性能** | 良好     | ~~versionMap 无界增长~~、~~SSR 模块并行加载~~ → **✅ 已完成**                  |
| **代码** | 良好     | ~~减少 any~~、~~路径校验~~ → **✅ 已完成**；大文件拆分、路径常量提取为低优先级 |
| **安全** | 已加强   | ~~**innerHTML XSS**~~、~~插件/中间件路径校验~~ → **✅ 已完成**                 |

**已完成的优化（2025-02-05）**：

1. **安全**：`renderError`、构建失败脚本增加 `escapeHtml` 防
   XSS；插件/中间件路径限制在项目目录内；配置热重载仅加载项目内配置
2. **性能**：SSR 中 `loadRouteModule` 改为 `Promise.all` 并行；`versionMap` 超出
   2000 时淘汰最早条目；`scanRouteComponents` 改为迭代+深度限制
3. **代码**：`ctx` 统一为 `HttpContext`；`_isPathWithinProject` 路径校验；动态
   import 使用 `pathToFileURL`；`createClientScriptMiddleware`
   拆至独立模块；魔法字符串提取为常量

---

## 五、分析说明

- 分析基于静态代码阅读与 grep 搜索
- 未进行动态测试或渗透测试
- 建议配合 `deno check`、单元测试与人工 review 使用本报告
