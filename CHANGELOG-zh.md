# 变更日志

本文档记录 @dreamer/dweb 的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
- **Windows 兼容性文档**：`WINDOWS_COMPATIBILITY_ANALYSIS.md`（英文）与
  `WINDOWS_COMPATIBILITY_ANALYSIS-zh.md`（中文）。

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
