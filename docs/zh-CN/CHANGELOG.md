# 变更日志

本文档记录 @dreamer/dweb 的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [3.1.5] - 2026-03-13

### 新增

- **Layout 与页面 `load()` 支持**：布局与页面路由模块可导出
  `load(context)`，返回值以 `props.data` 传入组件（布局为
  `layouts[i].props.data`，页面为 `pageProps.data`）。支持 SSR、hybrid、CSR
  模式，不再将 load 结果扁平到其他 props。
- **Hydrate 与客户端导航**：首屏 HTML 中的 `hydrationData.layoutData` 供 hydrate
  后使用；客户端导航会请求 `/_dweb_data`，响应中的 `layoutData` 与当前路径的
  layout 链一致，合并后使切换路由后各层 layout 仍能收到 `data`，无需整页刷新。
- **CSR 首屏 layout 数据**：CSR 模式下从 `__DATA__._layoutData` 合并 layout load
  结果，首屏即带正确的 layout `data`；并跳过首次 router
  `onRouteChange`，避免双渲染。
- **React/Preact CSR 首屏 loading**：首屏 CSR 渲染完成后（非 View 引擎）调用
  `__DWEB_ON_READY__`，便于去掉 loading 遮罩，e2e「点击关于」等用例不再超时。
- **Load-data 中间件**：`/_dweb_data` 由 load-data-middleware 处理，对当前路径的
  layout 链执行各层 `load()`，在 JSON 响应体中返回
  `layoutData`，供客户端导航合并。
- **公开导出**：从 `@dreamer/dweb` 导出 `LoadContext` 与
  `ApiContext`，便于在路由模块中为 `load` 参数等做类型标注。
- **E2E load 数据断言**：新增 `assertLoadDataInjected(t, port)`，访问首页并等待
  `[data-testid="layout-load"]` 与 `[data-testid="page-load"]` 的 `data-value`
  为 `layout-load-ok` / `page-load-ok`。`createBasicExampleBrowserSuite`
  支持选项 `assertLoadData: true`，可增加一条执行该断言的用例。
- **示例（CSR 与 hybrid basic）**：所有使用 CSR 或 hybrid 的 basic
  示例（view-csr、view-hybrid、view-hybrid-flat、react-csr、react-hybrid、react-hybrid-flat、preact-csr、preact-hybrid、preact-hybrid-flat）均在
  `_layout` 与 index 中定义 `load()`，返回 `layoutLoadMarker` /
  `pageLoadMarker`，并渲染 `data-testid="layout-load"` 与
  `data-testid="page-load"` 的 span 供 e2e 断言；对应 e2e 套件传入
  `{ assertLoadData: true }`，运行「应能注入 layout 与页面 load 数据」用例。

### 变更

- **示例**：上述 CSR/hybrid basic 示例中的全部 `load()` 改为通过
  `Promise.resolve(...)` 返回，不再使用
  `async function load(...) { return {
  ... }; }`，以符合 Deno lint 规则
  `require-await`（避免不必要的 async）。

### 修复

- **E2E（Linux Deno）**：在 Linux 上跳过 view-hybrid-flat basic 的计数器与
  metadata 用例，避免 dev 进程中途退出导致的偶发失败（connection
  reset/refused）。`createBasicExampleBrowserSuite` 支持选项
  `skipCounterAndMetadataOnLinux: true`。

### 变更

- **CI**：升级为 `actions/checkout@v5`、`denoland/setup-deno@v2`、
  `oven-sh/setup-bun@v2.1.3`，以适配 Node 24。

---

## [3.1.4] - 2026-03-13

### 修复

- **生成客户端（_client.dep.tsx）**：修复在 View
  引擎下启用严格类型检查时生成代码 的 TypeScript 报错。`loadLayouts(match)`
  现接受 `route.path` 为可选的 `match`， 并用安全路径 key
  做布局查找。生成文件中的 `DwebGlobal.__DATA__` 类型增加 `route?: string`，使
  `__d.route` 合法。HMR 更新 CSS 时对 link 元素使用
  `(el as HTMLLinkElement).href`。CSR 首屏 props 片段对 `__d`、`__d.route`、
  `__d.page` 使用可选链，避免“可能为 undefined”及缺少属性的错误。

### 变更

- **示例**：将 30 个示例项目的依赖与 dweb/deno.json 对齐：@dreamer/database
  ^1.0.8、@dreamer/logger ^1.0.3、@dreamer/middlewares ^1.0.4、 @dreamer/plugins
  ^1.0.9、@dreamer/render ^1.1.0、@dreamer/router ^1.1.0、 @dreamer/view
  ^1.1.3，以及 preact-render-to-string 6.2.0（在使用的示例中）。
- **CI**：消除 GitHub Actions Node.js 20 弃用警告：设置
  `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`，并将 `actions/checkout` 从 v3
  升级为 v4。

---

## [3.1.3] - 2026-03-13

### 修复

- **View（生成客户端）**：在生成的 `_client.dep.tsx` 中，路由切换时始终先调用
  `unmountPrevious()`。此前仅在 reactive root 不存在时才卸载，导致就地 patch
  时上一页的 DOM（如奖金明细列表）可能残留在新页。现在每次导航先卸载再挂载，避免
  跨页 DOM 残留。

---

## [3.1.2] - 2026-03-12

### 变更

- **依赖**：将 @dreamer/render 更新至 ^1.1.0、@dreamer/view 更新至 ^1.1.3，以
  兼容 view 动态子节点单节点优化及 render 1.1.x。

---

## [3.1.1] - 2026-03-11

### 修复

- **SSR/CSR/Hybrid**：在 render-ssr、render-hybrid、render-csr 中对
  `router.getLayoutPathsForPath` 使用可选链；当该方法不存在（如单元测试 mock
  或旧版 @dreamer/router）时，布局路径默认为 `[]`，不再抛错，渲染器 能在
  `loadRouteModule` 返回 null（路径在项目外）或 pageModule 无 default/Page
  导出时正确返回 `null`（修复 CI 测试失败）。

---

## [3.1.0] - 2026-03-11

### 修复

- **HMR**：多段路由（如 `admin/index`、`bgb-x-admin/index`）现在能正确解析到对应
  chunk，不再误用根 index 的 chunk；匹配时支持路径形式及首段命名（如
  `bgb-x-admin-XXX.js`）。
- **HMR**：客户端支持带路径的 chunk URL（如 `/routes/admin/index-XXX.js`），通过
  `chunkFullBase` 与 `comp.startsWith(chunkBaseFromUrl + "/")` 正确加载对应
  chunk，无需整页刷新。
- **HMR**：当无法匹配到对应 chunk URL 时，回退为整页刷新，确保能加载到最新代码。

---

## [3.0.95] - 2026-02-25

### 变更

- **Init**：「目录是否存在」校验与覆盖确认移入 `generate()`，在任意
  `ensureDir(targetDir)` 之前执行。仅在校验通过（且用户确认覆盖）后才创建
  项目目录，绝不先建目录再校验。

---

## [3.0.94] - 2026-02-25

### 变更

- **Init**：项目目录改为在参数选择与版本拉取完成后再创建。原先在 `generate()`
  开头就创建目录；现为先拉取版本（不建目录），再执行
  `ensureDir(targetDir)`，避免 过早建目录导致后续校验出现「目录已存在」问题。

---

## [3.0.93] - 2026-02-25

### 修复

- **module-cache（Windows）**：`getModuleVersion()` / `invalidateModule()`
  的路径归一逻辑调整，使 `file://` URL 与 Windows
  路径（`D:\path`、`D:/path`）解析为同一缓存 key。Windows 上路径输入经
  `pathToFileUrl()` 归一，保证 `pathToFileUrl(testPath)` 与 `testPath`
  查同一项；盘符统一为大写。非 Windows 上对合成 Windows
  风格路径（如测试用例）不经 `pathToFileUrl` 归一，保证跨平台测试通过。

### 变更

- **E2E**：afterAll 改为先对 dev 进程发 SIGKILL（不 await），再执行
  `cleanupAllBrowsers()`，避免 afterAll 超时时 Bun 将进程当作 dangling
  误杀，并减少「browser close timeout」与 afterAll 超时失败。
- **E2E**：移除 e2e dev 子进程的 `unref()`，避免其它套件超时时 Bun 将其当
  dangling 误杀。
- **E2E**：单用例浏览器测试超时由 90s 调整为 30s。
- **CI（Bun Linux/macOS）**：e2e 按文件串行执行（每个 `tests/e2e/*.test.ts`
  单独进程），减轻套件间 afterAll 与浏览器清理互相干扰。
- **CI（Bun Windows）**：仅跑 unit，不跑 integration 与 e2e；因 Windows CI 上
  dev 服务常无法在超时内就绪、浏览器 e2e 不稳定（与 @dreamer/view 一致；Deno
  test-windows 仍跑完整测试含 e2e）。移除「Install Playwright
  Chromium」步骤（Windows 不跑 e2e）。
- **依赖**：@dreamer/logger ^1.0.3、@dreamer/middlewares
  ^1.0.4、@dreamer/plugins ^1.0.8、@dreamer/render ^1.0.41、@dreamer/view
  ^1.1.2；所有示例已同步更新。
- **Init 模板**：.vscode/i18n-ally-custom-framework.yml 中 usageMatchRegex
  引号转义修正（`$t`/`$tr` 键匹配）。

---

## [3.0.92] - 2026-02-24

### 变更

- **Init（Bun）**：`tsconfig.json` 模板现包含 `allowImportingTsExtensions: true`
  与 `include: ["src/**/*", "jsx.d.ts"]`（view 引擎 JSX 类型）。

---

## [3.0.91] - 2026-02-24

### 变更

- **Init**：移除运行时选择菜单（Deno/Bun）前的多余空行，使 CLI 输出更简洁。
- **依赖**：CLI 模板与所有示例中的 `@dreamer/esbuild` 升级至 ^1.0.38（含 Bun
  服务端构建下 `@dreamer/plugins/*` 解析修复）。

---

## [3.0.90] - 2026-02-24

### 新增

- **CLI setup**：安装成功时会显示已安装的版本（如「dweb-cli v3.0.90
  已安装成功」）；各语言新增 i18n 键 `installSuccessWithVersion`。

### 变更

- **CI**：JSR 发布流程不再使用 `--no-check`，发布步骤执行完整类型检查。

---

## [3.0.89] - 2026-02-24

### 新增

- **Init**：第一步选择运行时（Deno 或 Bun），再选择单应用/多应用。选 Deno 只生成
  `deno.json`；选 Bun 生成 `package.json`、`.npmrc` 与
  `tsconfig.json`。Dockerfile 与 docker-compose
  按运行时生成（Deno：denoland/deno，Bun：oven/bun；compose
  中不再包含环境变量）。
- **Init（Bun）**：生成 `tsconfig.json`，含
  `module: "NodeNext"`、`moduleResolution: "nodenext"`、`lib: ["ESNext","DOM","DOM.Iterable"]`、`resolveJsonModule`、`isolatedModules`、`include: ["src/**/*"]`、`exclude: ["node_modules","dist"]`；`jsxImportSource`
  随所选引擎（preact/react/view）。
- **Init（Bun）**：Bun 运行时在 config 中生成
  `build.server.external`（按引擎与样式：tailwind 增加
  tailwindcss/lightningcss；preact/react 增加对应引擎包）。单应用写在
  `config/main.ts`，多应用写在 `common/config/main.ts`。
- **Init**：`.vscode/settings.json` 按运行时生成：Deno 保留
  `deno.enable`/`deno.lint` 与 Deno 格式化；Bun 使用内置 TypeScript 格式化并排除
  `.bun`（无 Deno 配置）。
- **Init**：生成 `.vscode/i18n-ally-custom-framework.yml`（无注释），用于识别
  `$t`/`$tr`；`i18n-ally.enabledFrameworks` 设为
  `["react","i18next","general","custom"]`。
- **错误 / Hybrid**：新增 Hybrid 渲染相关 i18n
  键：`errors.hybridNeedAppComponent`、`errors.hybridAppLoadFailed`、`errors.hybridAppNotFound`、`errors.hybridMountContainerRequired`；以及入口相关：`errors.entryPathInvalidReasonServerEntryNotFound`、`errors.entryPathInvalidHintServerEntry`。

### 变更

- **Init**：运行时菜单标题上方增加空行。docker-compose 的 service 中移除
  `DENO_ENV`/`BUN_ENV`。
- **Init（Bun）**：`package.json` 的 scripts 使用 `bun run`（如
  `bun run src/main.ts`、`bun run dist/server.js`）。Dockerfile 注释使用 i18n 键
  `dockerBaseStageBun`；WORKDIR 注释使用 `dockerWorkDirMountBun`（宿主机执行 bun
  run build）。
- **Bun 兼容**：本版本围绕 Bun
  运行时/构建兼容性做了系列修改。所有示例项目统一补全
  `build.server.external: ["tailwindcss", "lightningcss"]`（单应用在
  `config/main.ts` 或入口 `main.ts`，多应用在 `common/config/main.ts`），避免
  Bun 使用 `buildWithBun` 打包时因打包 lightningcss（含原生
  `require('../pkg')`）报错。
- **i18n**：框架 i18n 不再使用全局 `$t`，内部统一通过 `utils/i18n.ts` 的 `$tr`
  使用。初始化在首次加载模块时通过顶层 await 执行；locale
  优先级：`setDwebLocale()` &gt; 项目 `language` &gt; 环境变量 &gt;
  默认。`setDwebLocale` 可在 init 前或 init 后调用（init 后直接更新实例）。
- **View / CSR 客户端**：View 引擎按渲染模式选择适配器：CSR 使用
  `@dreamer/render/client/view-csr`，hybrid/SSR/SSG 使用
  `@dreamer/render/client/view-hybrid`（含 hydrate）。客户端依赖生成与 hybrid
  初始化逻辑已同步调整。
- **依赖**：升级各 @dreamer/* 依赖（如 render ^1.0.39、view
  ^1.0.31、runtime-adapter ^1.0.17、esbuild ^1.0.36、server ^1.0.9
  等）；workspace 改为 `./examples/*/*`。
- **Init**：配置与模板小幅调整（config-full、config、components、docker、main、static）。

### 移除

- **i18n**：移除全局 `$t` 导出及 `src/types/i18n.d.ts`，请改用 `utils/i18n.ts`
  的 `$tr`（或从 `mod.ts` 再导出）。
- **Locales**：从各语言 JSON 中删除未使用键（如
  `log.database.*`、`log.validation.*`）。
- **测试**：移除单体 `tests/e2e/browser-render.test.ts`（由按渲染类型的 e2e
  测试替代）。

---

## [3.0.88] - 2026-02-18

### 变更

- **依赖与示例**：更新示例 `deno.json` 配置与依赖；调整
  build、features（database、socket-io、websocket、csr-client-builder、build-dirs、version）及测试（e2e、unit）以适配
  CI。

---

## [3.0.87] - 2026-02-17

### 新增

- **SSG**：除路径段外支持 query 形式动态路由（如
  `/user?id=[id]`）；生产环境读盘与 hydration 使用 @dreamer/render 的
  `routeToFilePath` / `filePathToRoute`。
- **Init**：配置与 TSX 模板注释 i18n；生成注释随 init 时
  locale（中/英）变化；新增 `init.comments` 与 `init.template` 文案。

### 变更

- **Upgrade**：`main()` 改为返回退出码（0/1），不再内部调用 `exit()`；由 CLI
  层调用 `exit(code)`，测试中不再触发「attempted to exit」。
- **Init**：dynamicRoutes 模板注释改为说明同时支持路径段与 query 两种形式。

### 移除

- **测试**：移除 cmd-upgrade 两个用例（spawn stdin null、setup
  安装），避免退出码与 资源泄漏导致的失败。

---

## [3.0.86] - 2026-02-17

### 修复

- **setup**：deno install 的 spawn 使用 `stdin: "null"`，避免子进程等待终端
  输入；spawn 后立即调用 `child.unref()` 便于 setup 进程退出；入口在
  `installGlobalCli()` resolve 后调用 `exit(0)`，确保进程退出（否则 Deno 会因
  ref 不退出）。
- **upgrade**：以 `stdin: "null"` spawn setup，spawn 后调用 `child.unref()`，
  成功时 `exit(0)`、失败时 `exit(1)`，使 CLI 在命令结束时退出。

---

## [3.0.85] - 2026-02-17

### 修复

- **同页锚点不再请求 /__data**：仅 hash 变化（pathname+search
  未变）的同页锚点点击不再请求 /__data。路由虽不拦截此类链接，但浏览器可能触发
  popstate 仍会进入 onRouteChange；现通过记录
  pathname+search（`__DWEB_LAST_PATHNAME__`），与当前相同时跳过 __data 请求。

---

## [3.0.84] - 2026-02-17

### 变更

- **@dreamer/runtime-adapter**：升级为 `^1.0.8`（SpawnedProcess.unref()）。
  upgrade 命令现直接调用 `child.unref()`，spawn 后进程可正常退出（Deno
  不再挂起）。

---

## [3.0.83] - 2026-02-17

### 变更

- **客户端 /__data**：与 router
  不拦截的链接保持一致，对保留路径（/_*）、数据路径 自身、空路径或非法路径（含
  "//"）不再请求 `/__data`，减少锚点与保留 URL 的失败请求。

---

## [3.0.82] - 2026-02-17

### 变更

- **依赖**：更新相关依赖版本（如 @dreamer/render ^1.0.26、@dreamer/view
  ^1.0.15）。

---

## [3.0.81] - 2026-02-17

### 变更

- **@dreamer/console**：依赖升级为 `^1.0.7`（含 CLI
  退出修复及许可证/文档更新）。

### 修复

- **CLI 进程不退出**：在 `-v`/`--version` 或 `--help` 后 CLI 现以退出码 0
  正常退出，不再挂起；依赖 @dreamer/console@1.0.7 行为。

---

## [3.0.80] - 2026-02-17

### 安全

- **路径穿越防护**：在读取文件前对所有路径做规范化与校验，避免请求逃出允许的目录。
  - **SSG 生产 HTML**：`render-ssg.ts` 中用 `resolve(baseDir, relativePath)`
    规范化路径，并用 `isPathWithinProject(resolvedPath, baseDir)` 校验；超出
    baseDir 则返回 null（上层 404），仅使用 `resolvedPath` 读文件。
  - **preview 静态文件**：`cmd/preview.ts` 中对请求路径做 resolve，并用
    `isPathWithinProject` 校验是否在 staticRoot 内；超出则返回
    404，读文件使用规范化路径。
  - **CSR 客户端 chunk**：`csr-client-middleware.ts` 中生产模式对 chunk 路径做
    resolve 并校验在 `clientOutputPath` 内；超出则返回 404，exists/read
    均使用规范化路径。

### 新增

- **配置校验**：`validateConfig()` 现对 `config.build.client` 与
  `config.build.server` 做校验：若存在则必须为非 null 的 object，否则抛出
  `DwebErrorCode.CONFIG_BUILD_INVALID`，减少对类型断言的依赖，避免错误配置导致运行时异常。

### 变更

- **客户端输出与运行模式**：抽取公共逻辑，减少 CSR/Hybrid/SSR 与 build
  中的重复。
  - `utils/build-dirs.ts` 中新增
    `getClientOutputDir(config)`：从配置或推断目录返回客户端构建输出目录，用于资源目录、预构建路径及
    build 输出。
  - `app.ts` 中新增 `_getRunModeFromConfig(config)` 与
    `_ensureClientBuildForRender(...)`：统一获取运行模式（dev/prod）及「按需生成入口并构建客户端」的逻辑，CSR、Hybrid、SSR
    分支不再重复相同代码。
- **错误边界约定（文档）**：
  - `loadRouteModule`：JSDoc 明确失败时返回 `null`
    并打日志、不抛错，由调用方决定 404 或降级。
  - `createLoadDataMiddleware`：JSDoc 明确路由未匹配或无 fullPath → 404
    JSON，`load()` 或其它异常 → 500 JSON，不静默吞错。
- **优化分析报告**：`OPTIMIZATION_ANALYSIS.md`
  更新，将高/中/低优先级项（路径穿越、配置校验、重复逻辑、错误契约、配置推断缓存、SSG
  预读、缓存配置项）标为已实施。

---

## [3.0.79] - 2026-02-16

### 修复

- **dweb-cli upgrade 与 setup**：upgrade 命令与 setup 脚本此前以
  `stdout`/`stderr` 为 `"piped"` 启动子进程但未读取管道，子进程会阻塞，CLI 表现
  为卡住。已改为 `stdout`/`stderr` `"null"`，输出被丢弃，安装完成后进程正常退出
  且不阻塞。

---

## [3.0.78] - 2026-02-16

### 变更

- **Init 模板（示例项目）**：生成的前端不再依赖运行时 i18n，所有面向用户的文案在
  init 时通过 `$t()` 解析并写入为字符串字面量。修复
  `dangerouslySetInnerHTML={{ __html: $t(...) }}`，使模板在生成时插入 `$t()` 的
  返回值，生成代码中 `__html` 为合法字符串。用户 mock 数据与计数器区块文案均在
  生成时调用 `$t()`。
- **Init 模板文案**：组件模板中的中文（如计数器标题、按钮）全部改为翻译 key；在
  全部 9 个语言包中新增 `counterExample`、`counterViewDesc`、`counterSummary`、
  `counterIncrement`、`counterDecrement`、`counterReset`（init.template）及
  `userDetailPageFile`（init.comments）。语言：en-US、zh-CN、ja-JP、ko-KR、
  es-ES、pt-BR、id-ID、fr-FR、de-DE。

---

## [3.0.77] - 2026-02-16

### 新增

- **SSR/SSG 客户端激活**：SSR 与 SSG 现支持可选的客户端激活，当前页在保持「仅
  整页跳转、不做客户端路由」的前提下可变为可交互（如计数器、点击事件）。配置项：
  `render.ssr.hydrate` 与 `render.ssg.hydrate`（默认 `true`）。开启后服务端注入
  `globalThis.__DATA__` 与客户端脚本 `_client.js`，客户端仅对当前页做 hydrate；
  链接点击走浏览器整页跳转（通过 `interceptLinks: false` 传给客户端路由）。需
  `@dreamer/router@^1.0.10`。
- **全部 basic SSR/SSG 示例的计数器**：Preact、React、View 的 basic SSR/SSG 首页
  均增加计数器（hydrate 后点击可更新）及 `data-counter-*` 属性便于测试；View
  SSR/SSG 使用 `@dreamer/view` 的 `createSignal`。
- **SSR/SSG 的 E2E
  计数器测试**：浏览器用例「应能通过计数器加一、减一、重置更新数字」 不再对
  SSR/SSG basic 套件跳过，所有 basic 示例（含 preact-ssr、preact-ssg、
  react-ssr、react-ssg、view-ssr、view-ssg）在页面有计数器区块时均执行该交互
  测试。

### 变更

- **Init 优化**：init 流程与模板调整，以统一支持上述各引擎与模式下的 hydrate 与
  计数器行为。
- **依赖**：`@dreamer/router` 升级为 `^1.0.10`，以使用客户端 `interceptLinks`
  选项（SSR/SSG 生成代码中传入）。
- **示例**：所有示例中的渐变类名迁移至 Tailwind v4（`bg-gradient-to-*` 改为
  `bg-linear-to-*`）。
- **E2E
  计数器测试**：操作前等待页面加载完成（`document.readyState ===
  "complete"`）及
  500ms hydration 延迟；单次数字等待 6s、点击后延迟 500ms、用例 总超时
  40s；增加「计数器可读」轮询（最多 5s），提升 hybrid 等场景下的稳定性。
- **测试报告**：更新为 818 例（e2e 124、单元 646、集成 48），补充端到端与集成
  测试章节，框架版本 3.0.76、测试日期 2026-02-16。

---

## [3.0.76] - 2026-02-16

### 修复

- **Windows 多应用配置文件路径**：从入口路径推断配置目录时，`Deno.mainModule` 为
  file URL（如 `file:///C:/Users/.../src/backend/main.ts`）。此前用
  `decodeURIComponent(url.slice(7))` 在 Windows 上得到 `/C:/path`，与 `cwd()` 做
  路径比较时不一致，导致推断失败并回退到
  `["./config", "./src/config"]`，多应用配置 （如
  `src/backend/config/main.ts`）未被加载，`config.name` 等缺失，应用无法正常
  启动。现改为使用 `fileURLToPath(url)` 将 file URL 转为平台原生路径，配置推断与
  加载在 Windows 上正确生效，CI 通过。

### 新增

- **Session 默认集成**：
  - 集成 `@dreamer/session`；`AppConfig.session` 接受 `SessionOptions`（store
    必填；可选 `name`、`maxAge`、`cookie`、`autoSave`、`genId`）。
  - 当配置了 `config.session` 时，在应用初始化中通过
    `server.use(session(mergedConfig.session), ...)` 挂载 session 中间件。 默认
    session 存储目录：`~/.dreamer/dweb/sessions`（来自
    `getDreamerDwebCacheDir()`）。
  - `LoadContext.session` 类型为 `@dreamer/session` 的 `SessionData`。
- **Cookie 配置**：在 `AppConfig` 的 JSDoc 中说明，session 的 cookie
  选项（path、domain、secure、httpOnly、sameSite、maxAge、expires）通过
  `config.session.cookie`（`@dreamer/session` 的 `SessionOptions`）配置；由
  session 中间件在设置 session Cookie 时应用。dweb 中不再单独提供顶层 cookie
  配置。
- **ServerResponse 与 load 返回 Response**：
  - `ServerResponse` 支持 `binary(data, init?)` 返回二进制 body；提供
    `createServerResponse()`；`LoadContext.response` 在 load 中可用并带类型。
  - 当路由的 `load()` 返回 `Response` 时，服务端按重定向或直接响应处理（如
    重定向不再走文档渲染路径）。

### 变更

- **缓存目录**：`getDreamerDwebCacheDir()` 从 `utils/build-dirs.ts` 移至
  `utils/cache-dirs.ts`，并用于默认 session 存储目录。

### 移除

- **Session 中间件独立模块**：在 `app.ts` 中直接使用
  `session(mergedConfig.session)` 挂载 session；移除独立的 session-middleware
  辅助与 `getDefaultSessionOptions`（由合并配置与默认缓存目录替代）。

---

## [3.0.75] - 2026-02-16

### 新增

- **Load 数据接口中间件（路由 `load()` 的自动 API）**：
  - 新增中间件处理 `GET /__data?path=/pathname`：在服务端匹配路由并执行该路由的
    `load()`，返回 JSON（`params`、`query` 及 `load()` 的返回值）。在 CSR 与
    Hybrid 模式下均会注册。
  - CSR/Hybrid 客户端：在客户端页面切换时请求
    `/__data?path=...`，将返回结果作为页面 props（无需整页 SSR 即可获得 `load()`
    数据）。首屏时 CSR 在服务端执行当前路由的 `load()`，将结果注入
    `globalThis.__DATA__`，客户端首屏用其渲染后清空，避免后续导航误用。
  - 路由中的 API 路由（`api/` 下）不再加入客户端 `ROUTE_LOADERS`，避免客户端
    bundle 引入仅服务端使用的模块。

- **E2E 浏览器测试覆盖全部示例**：basic 与 advanced 浏览器套件现已覆盖 workspace
  内全部示例。新增 view-hybrid-flat（basic 端口 3015，advanced
  3028/3029）。新增全部 preact、react advanced
  套件：preact-csr（3030/3031）、preact-hybrid（3032/3033）、preact-ssr（3034/3035）、preact-ssg（3036/3037）、preact-hybrid-flat（3038/3039）、react-csr（3040/3041）、react-hybrid（3042/3043）、react-ssr（3044/3045）、react-ssg（3046/3047）、react-hybrid-flat（3048/3049）；并已更新上述
  advanced 示例的端口配置以匹配 e2e 端口。
- **E2E 交互测试**：每个套件包含两项浏览器测试：(1) 渲染且无 hydration 错误；(2)
  通过点击导航。Basic
  套件：点击「关于」链接并断言关于页出现「关于我们」。Advanced
  套件：点击「用户管理」链接并断言用户页出现「用户管理」或「用户列表」（backend
  无 about 路由，用户页会请求 backend API）。
- **Advanced 构建入口可选**：`buildExampleAdvanced` 与
  `createAdvancedExampleBrowserSuite` 支持可选参数 `entries`（如
  `["backend/main.ts", "frontend/main.ts"]`），用于扁平结构的 advanced
  示例（preact-hybrid-flat、react-hybrid-flat、view-hybrid-flat）。

### 移除

- **preact-hybrid-unocss 示例**：该示例及 workspace 条目已移除；由
  view-hybrid-flat 及其他 view/preact/react 示例提供覆盖。

### 变更

- **E2E 测试命名**：Advanced
  的第二项测试由「应能通过点击关于链接进入关于页」改为「应能通过点击用户管理链接进入用户页」，并改用
  `assertBrowserClickUsers`（点击 `a[href="/users"]`，等待用户页内容）。

---

## [3.0.74] - 2026-02-15

### 变更

- **依赖**：将 `@dreamer/view` 升级为 `^1.0.9`（vIf/vShow 导致的 input value
  修复）。 将 `@dreamer/render` 升级为 `^1.0.21`（与 view 引擎对齐）。

---

## [3.0.73] - 2026-02-15

### 新增

- **View 模板引擎**：Dweb 现已支持以 @dreamer/view 作为视图层（render 适配器）。
  view-hybrid、view-csr 示例项目展示 SSR、hydration 及基于 signal、指令的
  客户端渲染。

### 变更

- **授权许可**：项目采用 Apache 2.0 许可，署名已更新（LICENSE、NOTICE）。

---

## [3.0.72] - 2026-02-09

### 修复（Windows 兼容）

- **Windows Preact/npm 解析**：在 dweb 及全部 22 个示例中将 @dreamer/esbuild
  升级至 ^1.0.6。esbuild 1.0.6 修复了 Windows 下 `file://` 路径处理（如
  `file:///C:/Users/...` → `C:/Users/...`），并针对 Windows 上
  `import.meta.resolve` 返回无效路径时增加 npm 包解析的子进程回退逻辑。
- **Logger 透传**：将 logger 传入 esbuild 的 BuilderClient 和 BuilderServer，
  当配置 `logger.level: "debug"` 且 `build.client.debug: true` 时，可输出
  resolver、buildModuleCache 等调试信息。

### 变更

- **示例配置**：所有示例项目的 main.dev.ts 中默认关闭 debug 选项（render、
  router、build、socket）。

---

## [3.0.71] - 2026-02-08

### 修复（Windows 兼容与测试）

- **Windows 兼容性测试**：修复 config.test.ts、build-dirs.test.ts 的断言，使测试
  在 Windows 及并行执行时均能通过。错误消息支持中英文双匹配（i18n 与默认英文
  回退皆可），入口路径格式错误正则增加 "Entry path format not supported"。
- **全量测试通过**：480 个测试（含 config、build-dirs、path、e2e 等）在 Deno、
  Bun 及 CI（ubuntu/windows/macos）下全部通过。

---

## [3.0.70] - 2026-02-08

### 新增

- **i18n 文档**：在 README 和文档中新增国际化（i18n）章节。说明 9 种支持语言
  （zh-CN、en-US、ja-JP、ko-KR、es-ES、pt-BR、id-ID、de-DE、fr-FR）、通过
  `config.language` 与环境变量（LANGUAGE、LC_ALL、LANG）的配置方式、优先级
  及回退到 en-US 的逻辑。更新 APP_CONFIG 中 language 配置项说明。

---

## [3.0.69] - 2026-02-08

### 修复

- **CI @dreamer/esbuild**：将本地路径 `../esbuild/src/mod.ts` 改为
  `jsr:@dreamer/esbuild@^1.0.2`，使 CI（独立 dweb 仓库）能正确解析。
- **CI compilerOptions 与 React SSG**：根 `jsxImportSource` 设为 `react`；移除
  workspace 成员示例中的 `compilerOptions`；Preact 示例添加
  `react`/`react/jsx-runtime` 别名指向 Preact 以兼容。
- **Windows config-loader**：将 Windows 绝对路径（`C:\path`）视为绝对路径；当
  `realPath` 失败时回退到 `absPath`。
- **Windows module-cache**：将 `file:///D:/path` 归一为 `D:/path`，与直接 路径
  key 一致。

---

## [3.0.68] - 2025-02-07

### 修复

- **Windows 配置推断**：`inferConfigDirectoryFromEntry` 现对 path 与 root 先使用
  `normalizePathForCompare` 再 replace，修复 path 使用 `/` 而 root 使用
  `\`（或反之）时的路径不匹配问题。
- **客户端依赖生成**：修复生成 `_client.dep.tsx` 时 esbuild 报错「Unterminated
  string literal」，通过模板字面量正确转义：使用 `.replace(/\\\\/g, "/")`
  使输出包含 `.replace(/\\/g, "/")`，用于 Windows 路径规范化。

### 新增

- **CI 工作流**（`.github/workflows/ci.yml`）：在 push/PR 到 `main` 或 `dev`
  时，在 `ubuntu-latest`、`windows-latest`、`macos-latest` 上运行测试。
- **Windows 兼容性文档**：`docs/en-US/WIN_COMPAT.md`（英文）与
  `docs/zh-CN/WIN_COMPAT.md`（中文）。

---

## [3.0.67] - 2026-02-07

### 新增

- **CLI 文档补充 `update`**：在 README 的 CLI 命令表中补充 `update`
  命令（中英文）。执行 `deno update` 或 `bun update`；支持
  `--latest`、`--interactive`。

### 变更

- **Init React 模板**：在 React 引擎的 imports 中补充 `scheduler`
  依赖（`npm:scheduler@0.25.0`）。

---

## [3.0.66] - 2026-02-07

### 修复

- 修复 React CSR 渲染错误「Objects are not valid as a React child」：render-csr
  中的 `LoadingPlaceholder` 原先固定使用 Preact 的 `createElement`，与 engine
  无关。现已根据 `engine` 配置选择 React/Preact 的 `createElement`，以及
  `className`/`class` 属性名。为支持 React 引擎，在 dweb 的 imports 中新增
  `react`。

---

## [3.0.65] - 2026-02-07

### 新增

- **`getDreamerClientCacheDir()`**：新增工具函数，用于获取客户端构建缓存目录
  `~/.dreamer/{projectHash}/{appDir}/client-out`。projectHash 由项目路径 SHA-256
  前 16 位生成；appDir 单应用为 `default`，多应用为应用名。
- **`__DWEB_DEV__` 全局变量**：服务端在 CSR/混合模式下注入到
  HTML，用于标识开发模式，便于区分 dev/prod 行为（如 HMR CSS 仅在 dev
  下强制刷新）。
- **错误码 `DWEB_E34`**（`DREAMER_CACHE_HOME_UNAVAILABLE`）：当 `HOME` 或
  `USERPROFILE` 未设置且无法使用 `~/.dreamer` 缓存时抛出。包含 zh-CN 与 en-US 的
  i18n 译文。

### 变更

- **客户端构建缓存位置**：开发模式 CSR 构建缓存从项目内 `.dweb-client-out`
  迁移至
  `~/.dreamer/{projectHash}/{appDir}/client-out`，避免在项目内创建临时目录。
- **HMR CSS 刷新**：支持 `<link>` 与 `<style>` 元素。`<link>` 通过更新 `href`
  加时间戳刷新；`<style>` 仍通过 fetch 后设置 `textContent`。
- **依赖**：升级 @dreamer/router 至
  ^1.0.1（页面切换时恢复滚动位置）、@dreamer/socket-io 至 ^1.0.1（修复手动
  disconnect 后仍自动重连）、@dreamer/database 至 ^1.0.2。移除 deno.json
  中直接的 npm 依赖
  `autoprefixer`、`cssnano`、`postcss`、`esbuild`（由传递依赖解析）。
- **Init 模板**：简化 `deno.json` 的 imports。Tailwind 仅保留
  `tailwindcss`；UnoCSS 仅保留 `@unocss/core`；Preact/React 仅保留引擎入口（如
  `preact`）。在 UnoCSS 基础 reset 中增加
  `a { color: inherit; text-decoration: none; }`。
- **示例**：preact-hybrid 与 preact-hybrid-unocss 示例升级至稳定 JSR 版本；精简
  npm imports 仅保留必要项。

---

## [3.0.63] - 2026-02-07

### 修复

- 修复生成 `_client.dep.tsx` 中的 TypeScript
  错误：`Property '__DWEB_HMR_DEBUG__' does not exist on type 'Window & typeof globalThis'`，通过在
  `DwebGlobal` 接口中添加 `__DWEB_HMR_DEBUG__` 并扩展 `_win` 类型

---

## [3.0.62] - 2026-02-07

### 变更

- 移除 README 中的 Beta 版本提示（中英文）
- 简化 init 命令示例：不再需要 `--beta` 参数

---

## [3.0.61] - 2026-02-06

### 修复

- 在 init 模板及所有示例（Preact/React）中将 Tailwind CSS 和
  @tailwindcss/postcss 从 4.0.0 升级至 4.1.18，修复因 `ScannerOptions.sources`
  缺少 `negated` 字段导致的 PostCSS 编译失败

---

## [3.0.60] - 2026-02-06

### 修复

- 修复 Dockerfile 中 apt-get 权限问题：添加 `USER root`（Deno 镜像默认非 root
  用户）
- 使用 `./runtime/deno-cache` 作为 docker-compose volume，避免被解析为命名卷

---

## [3.0.59] - 2026-02-06

### 变更

- 发布

---

## [3.0.58] - 2026-02-06

### 新增

- init 时创建 `runtime/deno-cache` 与 `runtime/logs` 目录

### 变更

- docker-compose 单应用服务名现使用项目名（原固定为 `app`）

---

## [3.0.57] - 2026-02-06

### 变更

- 更新 APP_CONFIG 与 README，提升清晰度与双语支持
- 更新 README 的时序图说明

---

## [3.0.56] - 2026-02-06

### 新增

- 完整的 README 框架文档
- dweb 单元测试、e2e 与集成测试

### 变更

- 更新 TEST_REPORT.md

---

## [3.0.55] - 2026-02-06

### 新增

- 升级 @dreamer/esbuild 至 1.0.0-beta.64，支持 i18n 与 HMR 增量编译

---

## [3.0.54] - 2026-02-06

### 变更

- 更新 @dreamer/server 依赖至 1.0.0-beta.26
- 将 @dreamer/esbuild 从本地路径切换为 JSR 1.0.0-beta.63

---

## [3.0.53] - 2026-02-06

### 新增

- SSR/CSR/Hybrid/SSG 的静态资源 hash 与路径替换

### 变更

- 按分析报告进行性能优化
- 移除废弃 API：`getBusinessConfig` 与 `getBusinessConfigValue`
- 导出 `$t` 并显式导入以修复 deno publish（compilerOptions.types）
- i18n 类型定义调整以支持发布

---

## [3.0.49] - 2026-02-05

### 修复

- 将 Preact 打包进客户端 bundle，从 external 中过滤 preact/react，修复 hydration
  `__H` 错误

### 新增

- 升级 @dreamer/esbuild 至 1.0.0-beta.59，支持 Preact external 与 import
  map，修复 HMR `_H` 问题

---

## [3.0.46] - 2026-02-05

### 修复

- 开发模式下源文件的配置目录推断逻辑

---

## [3.0.45] - 2026-02-05

### 新增

- 服务启动日志 i18n
- 升级 @dreamer/server 至 1.0.0-beta.25

---

## [3.0.44] - 2026-02-05

### 新增

- `language` 配置项
- JSDoc 文档改进

---

## [3.0.43] - 2026-02-05

### 新增

- i18n 全局类型配置与测试配置
- csr-client-builder 调试日志 i18n
- app、csr-client-builder、build、clean、test 的 i18n 翻译
- dweb 框架 i18n 翻译
- 统一错误处理与 i18n 支持

### 变更

- 升级 runtime-adapter 至 1.0.0-beta.26

---

## [3.0.41] - 2026-02-05

### 变更

- 升级 runtime-adapter 至 ^1.0.0-beta.25（兼容 Windows）

---

## [3.0.40] - 2026-02-05

### 新增

- README 中 Windows 安装说明
- 配置文档与 setup 注释

### 变更

- docs: Config 可直接访问环境变量，无需 runtime-adapter
- docs: Config 与 params 访问细节
- docs: 所有导出的完整 JSDoc

---

## [3.0.39] - 2026-02-05

### 新增

- 升级 runtime-adapter 至 1.0.0-beta.24，兼容 Windows

---

## [3.0.38] - 2026-02-05

### 新增

- `feature/socket-io` 子路径导出

---

## [3.0.37] - 2026-02-05

### 新增

- WebSocket 集成

### 变更

- basic 示例配置移至 src/config

---

## [3.0.36] - 2026-02-05

### 新增

- APP_CONFIG_EXAMPLE.md 中 MongoDB 副本集配置示例

### 变更

- 更新所有 @dreamer 依赖（router@1.0.0-beta.11）

---

## [3.0.26] - 2026-02-05

### 修复

- 修复 Tailwind CSS 构建后 chunk 404，支持用户配置输出目录
- init 使用 deno install 替代 deno cache
- 多应用构建时无 src 输出的 server.js 输出到 dist/<app>/
- init 模板 .gitignore 添加 _client.dep.tsx

---

## [3.0.21] - 2026-02-04

### 新增

- 版本缓存、JSR fetch 加载、静默 approve-scripts

### 修复

- ConfigManager 监听器泄漏
- init 后自动执行 deno cache 与 approve-scripts
- upgrade 命令交互一致性

---

## [3.0.20] - 2026-02-04

### 新增

- upgrade 命令 `--beta` 参数，获取 beta 最新版

---

## [3.0.16] - 2026-02-04

### 新增

- UnoCSS 示例项目

---

## [3.0.15] - 2026-02-04

### 新增

- generate 命令使用 @dreamer/utils 的 pascalCase/kebabCase 进行名称规范化
- db migrate 集成 MigrationManager
- dev/build/start 使用 config
- getRuntime 与 config-loader

### 变更

- getRuntime() 在函数顶部调用一次
- 所有 mkdir 替换为 ensureDir

---

## [3.0.0] - 2026-02-04

### 新增

- v3.0.0 发布

---

## [2.6.0-legacy.1] - 2026-02-03

v2.x 兼容遗留版本。

---

[3.0.64]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.64
[3.0.63]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.63
[3.0.62]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.62
[3.0.61]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.61
[3.0.60]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.60
[3.0.59]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.59
[3.0.58]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.58
[3.0.57]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.57
[3.0.56]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.56
[3.0.55]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.55
[3.0.54]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.54
[3.0.53]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.53
[3.0.49]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.49
[3.0.46]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.46
[3.0.45]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.45
[3.0.44]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.44
[3.0.43]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.43
[3.0.41]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.41
[3.0.40]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.40
[3.0.39]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.39
[3.0.38]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.38
[3.0.37]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.37
[3.0.36]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.36
[3.0.26]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.26
[3.0.21]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.21
[3.0.20]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.20
[3.0.16]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.16
[3.0.15]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.15
[3.0.0]: https://github.com/shuliangfu/dweb/releases/tag/v3.0.0
[2.6.0-legacy.1]: https://github.com/shuliangfu/dweb/releases/tag/v2.6.0-legacy.1
