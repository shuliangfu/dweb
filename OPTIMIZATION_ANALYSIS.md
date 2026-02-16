# Dweb 框架优化分析报告

本文档从**性能**、**代码质量**、**安全**三个维度对 @dreamer/dweb
框架进行梳理，给出可优化点与实施建议。分析基于当前源码结构（core/、feature/、cmd/、utils/）与依赖（@dreamer/server、esbuild、render、router
等）。

---

## 一、性能

### 1.1 现状与亮点

- **开发态**：dev 使用 @dreamer/esbuild 内存构建 + @dreamer/server，HMR 通过
  rebuild 回调 + 模块缓存失效（`invalidateModule`）+ CSS
  路由缓存（`clearCssRouteCacheForPath`）实现，按需编译、体感快。
- **构建态**：统一走 `Builder.build()`，支持
  client/server/assets、incremental、watch；客户端入口通过
  `prepareClientBuildEntry` 生成 `_client.tsx` 再打包。
- **运行态**：生产使用同一套 server 托管静态资源 + SPA fallback；SSR/SSG
  从内存或磁盘读 HTML/模块，路由匹配与 load 数据接口（`/__data`）按需执行。

### 1.2 可优化点

| 维度               | 现状                                                                                                                               | 建议                                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **路由模块加载**   | `loadRouteModule` 对含 CSS 的路由做内容哈希缓存（`MAX_CSS_ROUTE_CACHE_SIZE = 500`），相同内容复用模块，避免重复临时文件与 import。 | ✅ 已实施：`config.build.devCache.maxCssRouteCacheSize` 可配置（默认 500），常量集中至 `src/utils/constants.ts`。                                                                                                    |
| **模块版本缓存**   | `module-cache` 使用 versionMap + LRU 淘汰（`MAX_VERSION_MAP_SIZE = 2000`），防止 dev 长期运行无界增长。                            | ✅ 已实施：`config.build.devCache.maxVersionMapSize`、`evictionBatchInterval` 可配置（默认 2000、50），常量集中至 `src/utils/constants.ts`。                                                                         |
| **客户端脚本缓存** | `cachedClientScript` + `cachedDevBuilder`（dev 增量 context）减少全量重建。                                                        | ✅ 已实施：在 `server.ts` 的 `rebuild` 中补充注释，明确需传入 `options.changedPath` 以命中 chunk 级 HMR。                                                                                                            |
| **配置加载**       | 配置从 main.ts、main.{env}.ts、params 等合并，`inferConfigDirectoryFromEntry` 依赖入口路径推断 config 目录。                       | ✅ 已实施：按 `cwd + entry` 规范化后做 key 缓存推断结果（Windows 兼容），避免热路径重复解析。                                                                                                                        |
| **SSG 生产读文件** | 生产 start 时从 `outputDir` 按 pathname 读 HTML（`pathnameToFile`），每次请求一次 `readTextFile`。                                 | ✅ 已实施：① `render.ssg.preloadHtml` 可选（true 或 `{ maxPages?, maxSizeMb? }`，默认约 200 页/10 MB），首次请求触发预读并缓存；② 读文件前 `isPathWithinProject(resolvedPath, baseDir)` 防路径穿越（Windows 兼容）。 |
| **构建**           | 依赖 @dreamer/esbuild，支持 incremental、watch。                                                                                   | 保持；当前 esbuild 方案已满足「按需编译、约 20ms 级」需求，不再考虑接入 Vite。                                                                                                                                       |

### 1.3 性能优化小结

- 开发/构建链路已有缓存与淘汰策略，重点保持「路径→模块版本」「CSS
  路由内容哈希」「客户端脚本与增量 builder」的一致性。
- 可选增强：配置推断缓存、SSG
  生产态可选内存缓存；数值类配置（缓存容量、淘汰间隔）可上浮到 config
  或环境变量，便于按项目调优。

---

## 二、代码质量

### 2.1 现状与亮点

- **结构**：core（app、config、middleware、plugin、lifecycle、database、service）、feature（server、build、render*、router、load-route-module、csr-client-builder、module-cache
  等）、cmd（init、dev、build、start、preview
  等）、utils（path、errors、sanitize、i18n、build-dirs 等）分层清晰，职责明确。
- **类型**：TypeScript 全量使用，AppConfig、IApp、HttpContext、BuilderConfig
  等类型从 types/ 与依赖包导出，可维护性高。
- **错误**：统一 `DwebError` + `throwDwebError` +
  i18n（`$t`），错误码集中管理，便于日志与监控。
- **运行时抽象**：通过 `core/runtime-adapter.ts` 统一 Deno/Bun 的
  fs、path、env、process 等，便于跨运行时与测试。

### 2.2 可优化点

| 维度                | 现状                                                                                            | 建议                                                                                                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **类型断言**        | `build.ts`、`config.ts` 等处存在 `as ServerConfig`、`as Record<string, unknown>` 等断言。       | ✅ 已实施：在 config 层 `validateConfig()` 中增加对 `config.build.client`、`config.build.server` 的运行时校验（非 object 时抛 `DwebErrorCode.CONFIG_BUILD_INVALID`），减少对用户配置形状的隐式假设。                      |
| **重复逻辑**        | 多应用（multi）与单应用（single）在 config 推断、静态根目录、构建输出目录等有分支。             | ✅ 已实施：抽成 `getClientOutputDir(config)`（`utils/build-dirs.ts`）、`_getRunModeFromConfig(config)`、`_ensureClientBuildForRender(config, isProd, hasPrebuiltClient)`（`app.ts`），CSR/Hybrid/SSR 分支复用，减少重复。 |
| **魔法数字/字符串** | 如 `MAX_CSS_ROUTE_CACHE_SIZE = 500`、`MAX_VERSION_MAP_SIZE = 2000`、`/_client.js`、`/__data`。  | ✅ 已实施：已集中至 `src/utils/constants.ts`（缓存容量、路径常量），并加注释与 `getCacheOptions`/`setCacheOptions`；路径常量由各模块从 constants 引用或 re-export。                                                       |
| **异步与错误边界**  | 部分 `async` 中仅 `try/catch` 后 `logger.error` 或返回 null，未统一向上抛出或转换为 DwebError。 | ✅ 已实施：`loadRouteModule` JSDoc 明确「失败返回 null、不抛错、由调用方决定 404/降级」；`createLoadDataMiddleware` JSDoc 明确「路由未匹配→404 JSON，load 抛错→500 JSON」，避免静默吞错。                                 |
| **依赖体量**        | 依赖较多 @dreamer/* 与 npm 包（react、esbuild、postcss 等）。                                   | 保持按需导出与 tree-shaking；CLI 与运行时分离（如 init 不拉取 render/esbuild）在 monorepo 中已通过包边界控制，可继续维持。                                                                                                |

### 2.3 代码质量小结

- 整体架构与类型、错误、运行时抽象已较成熟。优化以「减少隐式假设、收敛魔法数、统一错误契约、抽取重复分支」为主，无需大规模重构。

---

## 三、安全

### 3.1 现状与亮点

- **路径穿越防护**：`utils/path.ts` 提供
  `isPathWithinProject(resolvedPath, projectRoot)`，在
  `loadRouteModule`、`core/config.ts`、`core/app.ts`
  等处对「加载的模块路径」「配置路径」进行校验，禁止加载项目外文件。
- **请求参数过滤**：`utils/sanitize.ts` 对 params/query 做
  `sanitizeRequestParams`，过滤 `__proto__`、`constructor`、`prototype` 及含 NUL
  的键，防止原型污染与异常键名；SSR/hybrid/load-data 的 pageProps 均经 sanitize
  后传入。
- **Load 数据接口**：`/__data` 仅根据 `path` 做路由匹配并执行该路由的
  load()，返回 JSON；path 来自 query，通过 router.match
  限定在已声明路由内，不直接拼文件路径。
- **Init 脚手架**：`init` 的 targetDir 由用户输入或 argv 传入，通过
  `isValidAppName` 限制应用名格式；生成文件仅在 `targetDir`
  下，未发现未校验的路径拼接导致写盘到项目外。

### 3.2 需加强或建议修复的点

| 风险点                    | 现状                                                                                                                                                                                                                                                                                       | 建议                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SSG 生产读文件路径**    | `render-ssg.ts` 中生产态用 `pathnameToFile(pathname)` 得到相对路径（如 `about.html`），再 `join(baseDir, relativePath)` 读文件。若 `pathname` 被篡改为 `/../../../etc/passwd` 等形式，`pathnameToFile` 会得到 `../../../etc/passwd.html`，`join(baseDir, relativePath)` 可能解析到项目外。 | ✅ **已修复**：读取前用 `resolve(baseDir, relativePath)` 得到规范化路径，校验 `isPathWithinProject(resolvedPath, baseDir)`；不通过则返回 null（上层 404）。使用 `resolvedPath` 做 exists/readTextFile，不读项目外文件。 |
| **preview 静态文件路径**  | `cmd/preview.ts` 的 `getFilePath(staticRoot, pathname)` 使用 `join(staticRoot, pathname.replace(/^\//, ""))`。若 pathname 为 `/../../etc/passwd`，会得到 `staticRoot/../../etc/passwd`，存在路径穿越。                                                                                     | ✅ **已修复**：请求处理中对 `filePath` 做 `resolve(filePath)` 与 `resolve(staticRoot)`，校验 `isPathWithinProject(resolvedFilePath, resolvedStaticRoot)`；不通过则返回 404。使用 `resolvedFilePath` 读文件。            |
| **CSR 客户端 chunk 路径** | `csr-client-middleware.ts` 中 dev 从内存、prod 从磁盘读 chunk：`fileName = pathname.replace("/_client/", "")` 等，`filePath = join(clientOutputPath, fileName)`。若 pathname 含 `../`，fileName 可能带目录穿越，导致读 output 外文件。                                                     | ✅ **已修复**：生产模式读 chunk 前对 `filePath` 做 `resolve(filePath)`，校验 `isPathWithinProject(resolvedChunkPath, clientOutputPath)`；不通过则返回 404。使用 `resolvedChunkPath` 做 exists/readTextFile。            |
| **配置/入口路径**         | 配置加载与入口推断依赖 `getMainModulePath()`、`inferConfigDirectoryFromEntry()` 等，已在使用前对 resolved 路径做 `isPathWithinProject` 校验。                                                                                                                                              | 保持现状；新增从用户配置或环境变量读取的路径时，继续统一用 `isPathWithinProject` 或等价校验。                                                                                                                           |
| **依赖与脚本**            | 使用 JSR 与 npm 依赖，`deno.json` 中 `allowScripts` 对部分包 deny。                                                                                                                                                                                                                        | 定期审查依赖版本与 CVE；发布前通过 `deno publish --dry-run` 与 CI 检查，避免引入恶意依赖。                                                                                                                              |

### 3.3 安全小结

- 路径穿越：**SSG 生产读 HTML、preview 静态服务、CSR chunk
  服务**三处已对「最终读盘路径」做规范化（resolve）与边界校验（isPathWithinProject），不通过则
  404/不读文件。
- 输入与注入：params/query 已做 sanitize；load 的 path 通过路由匹配限制；init
  目标目录与应用名有校验。建议在文档中明确「仅信任路由声明与 path
  校验，不信任任意用户 path 直接拼文件路径」。
- 依赖与发布：维持现有脚本与发布流程，定期更新依赖与安全通告。

---

## 四、实施优先级建议

1. **高优先级（安全）**
   - ✅ 修复 SSG 生产态读 HTML 的路径穿越（`render-ssg.ts`）。
   - ✅ 修复 preview 静态文件的路径穿越（`cmd/preview.ts`）。
   - ✅ 对 CSR 客户端 chunk 的文件路径做边界校验（`csr-client-middleware.ts`）。

2. **中优先级（代码与可维护性）**
   - ✅ 将缓存容量、路径常量等抽到配置或 constants，并补充注释（见 2.2
     魔法数字/字符串、五、已实施）。
   - ✅ 对配置边界做简单校验或类型收窄，减少 `as` 断言（`validateConfig()` 对
     build.client/server 校验，见 2.2 类型断言）。
   - ✅ 统一关键路径的错误处理契约：`loadRouteModule` 返回
     null、`createLoadDataMiddleware` 404/500 已在 JSDoc 中明确（见 2.2
     异步与错误边界）。

3. **低优先级（性能）**
   - ✅ 配置推断结果缓存：`config.ts` 中 `inferConfigDirectoryFromEntry()` 使用
     `configDirCache`（key = root+path 规范化），避免热路径重复推断（见 1.2
     配置加载）。
   - ✅ SSG 生产态可选「预加载 HTML 到内存」：`render.ssg.preloadHtml`（true 或
     `{ maxPages?, maxSizeMb? }`，默认约 200 页/10 MB），见 1.2 SSG
     生产读文件、五、已实施。
   - ✅ 将缓存容量等暴露为配置项：`config.build.devCache` 可覆盖
     `maxCssRouteCacheSize`、`maxVersionMapSize`、`evictionBatchInterval`，见
     constants.ts 与 2.2 魔法数字/字符串。

---

## 五、本次已实施优化（✅）

- ✅ **路由模块加载**：`config.build.devCache.maxCssRouteCacheSize`
  可配置，常量集中至 `src/utils/constants.ts`。
- ✅
  **模块版本缓存**：`config.build.devCache.maxVersionMapSize`、`evictionBatchInterval`
  可配置，常量集中至 `src/utils/constants.ts`。
- ✅ **客户端脚本缓存**：在 dev `rebuild` 中明确需传入 `changedPath` 以命中
  chunk 级 HMR（注释补充）。
- ✅ **配置加载**：`inferConfigDirectoryFromEntry` 按 cwd+entry
  缓存推断结果（Windows 兼容）。
- ✅ **SSG 生产读文件**：`render.ssg.preloadHtml` 可选小站预读（默认约 200 页/10
  MB）；读文件前 `isPathWithinProject` 防路径穿越（Windows 兼容）。
- ✅ **魔法数字/字符串**：集中至
  `src/utils/constants.ts`（缓存选项、路径常量），并支持通过 config
  覆盖缓存相关数值。
- ✅ **类型断言 / 运行时校验**：`validateConfig()` 对
  `config.build.client`、`config.build.server` 做对象类型校验，非法时抛
  `DwebErrorCode.CONFIG_BUILD_INVALID`。
- ✅
  **重复逻辑**：`getClientOutputDir(config)`、`_getRunModeFromConfig(config)`、`_ensureClientBuildForRender(...)`
  抽取并在 CSR/Hybrid/SSR 及 build 中复用。
- ✅ **异步与错误边界**：`loadRouteModule`、`createLoadDataMiddleware` 的 JSDoc
  中明确失败时的返回与状态码契约（null/404/500），避免静默吞错。
- ✅ **安全：路径穿越防护**：SSG 生产读文件（`render-ssg.ts`）、preview
  静态文件（`cmd/preview.ts`）、CSR 客户端
  chunk（`csr-client-middleware.ts`）三处均在读取前对路径做 resolve 规范化并校验
  `isPathWithinProject`，不通过则 404 或不读文件。

---

## 六、结论

- **性能**：当前 dev/build 与缓存设计已较合理，可按需做配置化与 SSG
  内存缓存等小步优化。
- **代码质量**：结构清晰、类型与错误体系完善，优化以收敛魔法数、增强校验与抽取重复逻辑为主。
- **安全**：路径穿越防护在「路由模块加载、配置加载」已落实；**SSG
  读文件、preview 静态服务、CSR chunk
  服务**三处已补充「最终路径在预期目录内」的校验（resolve +
  isPathWithinProject，不通过则 404/不读文件）。

本报告可作为后续迭代与 Code Review
的检查清单使用。本次已完成性能、代码质量与高优先级安全优化：SSG 读文件、preview
静态服务、CSR chunk 三处路径穿越防护均已落地。可在 CHANGELOG
中注明「安全加固：路径穿越防护」。
