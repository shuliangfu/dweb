# Changelog

All notable changes to @dreamer/dweb are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.80] - 2026-02-17

### Security

- **Path traversal hardening**: Resolve and validate all file paths before
  reading so requests cannot escape allowed directories.
  - **SSG production HTML**: In `render-ssg.ts`, the path is normalized with
    `resolve(baseDir, relativePath)` and checked with
    `isPathWithinProject(resolvedPath, baseDir)`; if outside, the handler
    returns null (upstream 404). File reads use `resolvedPath` only.
  - **Preview static files**: In `cmd/preview.ts`, the request path is resolved
    and checked against `staticRoot` via `isPathWithinProject`; requests outside
    the static root return 404. Reads use the resolved path.
  - **CSR client chunks**: In `csr-client-middleware.ts`, production chunk paths
    are resolved and checked against `clientOutputPath`; paths outside
    return 404. Existence and read use the resolved path.

### Added

- **Config validation**: `validateConfig()` now validates `config.build.client`
  and `config.build.server`: when present, each must be a non-null object;
  otherwise the framework throws `DwebErrorCode.CONFIG_BUILD_INVALID`. Reduces
  reliance on type assertions and avoids runtime errors from malformed config.

### Changed

- **Client output and run mode**: Extracted shared helpers to remove duplication
  in CSR/Hybrid/SSR and build.
  - `getClientOutputDir(config)` in `utils/build-dirs.ts`: returns client build
    output dir from config or inferred dirs; used for assets dir, prebuilt
    client path, and build output.
  - `_getRunModeFromConfig(config)` and `_ensureClientBuildForRender(...)` in
    `app.ts`: centralize run mode (dev/prod) and “ensure client entry + build
    when needed” so CSR, Hybrid, and SSR branches no longer repeat the same
    logic.
- **Error boundary contract (documentation)**:
  - `loadRouteModule`: JSDoc states that on failure it returns `null` and logs;
    it does not throw. Callers decide 404 or fallback.
  - `createLoadDataMiddleware`: JSDoc states route not matched or no `fullPath`
    → 404 JSON; `load()` or other errors → 500 JSON; errors are not swallowed.
- **Optimization analysis**: `OPTIMIZATION_ANALYSIS.md` updated to mark
  high/medium/low priority items as implemented (path traversal, config
  validation, duplication, error contract, config inference cache, SSG preload,
  cache options).

---

## [3.0.79] - 2026-02-16

### Fixed

- **dweb-cli upgrade and setup**: The upgrade command and setup script ran
  subprocesses with `stdout`/`stderr` set to `"piped"` but did not read the
  pipes, so the child could block and the CLI appeared stuck. Switched to
  `stdout`/`stderr` `"null"` so output is discarded and the process exits after
  installation without blocking.

---

## [3.0.78] - 2026-02-16

### Changed

- **Init templates (example project)**: Generated frontend no longer relies on
  runtime i18n; all user-facing text is resolved at init time via `$t()` and
  written as string literals. Fixed
  `dangerouslySetInnerHTML={{ __html: $t(...) }}` so the template interpolates
  the `$t()` result (generated output now has valid `__html: "..."`). User mock
  data and counter section labels use `$t()` at generation time.
- **Init template copy**: All Chinese copy in component templates (e.g. counter
  title, buttons) replaced with translation keys. Added keys to all 9 locale
  files: `counterExample`, `counterViewDesc`, `counterSummary`,
  `counterIncrement`, `counterDecrement`, `counterReset` (init.template), and
  `userDetailPageFile` (init.comments). Locales: en-US, zh-CN, ja-JP, ko-KR,
  es-ES, pt-BR, id-ID, fr-FR, de-DE.

---

## [3.0.77] - 2026-02-16

### Added

- **SSR/SSG client hydration**: SSR and SSG now support optional client-side
  hydration so the current page can become interactive (e.g. counters, click
  handlers) without enabling client-side routing. Config: `render.ssr.hydrate`
  and `render.ssg.hydrate` (default `true`). When enabled, the server injects
  `globalThis.__DATA__` and the client script (`_client.js`); the client
  hydrates the current page only. Link clicks perform full page navigation (no
  SPA routing) by passing `interceptLinks: false` to the client router when
  `__DWEB_MODE__` is `ssr` or `ssg`. Requires `@dreamer/router@^1.0.10`.
- **Counter on all basic SSR/SSG examples**: Preact, React, and View basic
  SSR/SSG examples now include a counter on the index page (hydrate-after-click
  behavior) and `data-counter-*` attributes for tests. View SSR/SSG use
  `createSignal` from `@dreamer/view`.
- **E2E counter test for SSR/SSG**: The browser test
  “应能通过计数器加一、减一、重置更新数字” is no longer skipped for SSR/SSG
  basic suites; all basic examples (including preact-ssr, preact-ssg, react-ssr,
  react-ssg, view-ssr, view-ssg) run the counter interaction test when the page
  has a counter block.

### Changed

- **Init improvements**: Init flow and templates adjusted for consistency and to
  support the above hydration and counter behavior across engines and modes.
- **Dependency**: `@dreamer/router` raised to `^1.0.10` for the client
  `interceptLinks` option used in SSR/SSG generated client code.
- **Examples**: All examples migrated to Tailwind v4 gradient utilities
  (`bg-gradient-to-*` → `bg-linear-to-*`).
- **E2E counter test**: Wait for page load
  (`document.readyState === "complete"`) and 500ms hydration delay before
  interaction; single-value wait 6s, post-click delay 500ms, test timeout 40s;
  add “counter readable” poll (up to 5s) for stability on hybrid and similar
  setups.
- **Test report**: Updated to 818 cases (e2e 124, unit 646, integration 48) with
  e2e and integration sections; framework 3.0.76, test date 2026-02-16.

---

## [3.0.76] - 2026-02-16

### Fixed

- **Windows multi-app config path**: When inferring the config directory from
  the entry path, `Deno.mainModule` is a file URL (e.g.
  `file:///C:/Users/.../src/backend/main.ts`). Using
  `decodeURIComponent(url.slice(7))` on Windows yields `/C:/path`, which does
  not match `cwd()` in path comparison and causes config directory inference to
  fail. The framework then fell back to `["./config", "./src/config"]`, so
  multi-app configs (e.g. `src/backend/config/main.ts`) were never loaded,
  `config.name` and other options were missing, and the app failed to start. Now
  the entry path is converted with `fileURLToPath(url)` so the path is a proper
  filesystem path on Windows; config inference and loading work correctly and
  Windows CI passes.

### Added

- **Session integration (default)**:
  - Integrated `@dreamer/session`; `AppConfig.session` accepts `SessionOptions`
    (store required; optional `name`, `maxAge`, `cookie`, `autoSave`, `genId`).
  - Session middleware is mounted in app init via
    `server.use(session(mergedConfig.session), ...)` when `config.session` is
    set. Default session store directory: `~/.dreamer/dweb/sessions` (from
    `getDreamerDwebCacheDir()`).
  - `LoadContext.session` is typed as `SessionData` from `@dreamer/session`.
- **Cookie configuration**: Documented in `AppConfig` JSDoc that session cookie
  options (path, domain, secure, httpOnly, sameSite, maxAge, expires) are
  configured via `config.session.cookie` (`SessionOptions` from
  `@dreamer/session`); the session middleware applies them when setting the
  session cookie. No separate top-level cookie config in dweb.
- **ServerResponse and load return Response**:
  - `ServerResponse` with `binary(data, init?)` for binary body; helper
    `createServerResponse()`; `LoadContext.response` typed for use in load.
  - When a route's `load()` returns a `Response`, the server handles it as
    redirect or direct response (e.g. redirects without going through the
    document render path).

### Changed

- **Cache dirs**: `getDreamerDwebCacheDir()` moved from `utils/build-dirs.ts` to
  `utils/cache-dirs.ts` and used for default session store directory.

### Removed

- **Session middleware module**: Session is applied directly in `app.ts` with
  `session(mergedConfig.session)`; removed standalone session-middleware helper
  and `getDefaultSessionOptions` (replaced by merged config and default cache
  dir).

---

## [3.0.75] - 2026-02-16

### Added

- **Load-data middleware (automatic API for route `load()`)**:
  - New middleware handles `GET /__data?path=/pathname` to run the matched
    route’s `load()` on the server and return JSON (`params`, `query`, and
    whatever `load()` returns). Registered in both CSR and Hybrid modes.
  - CSR/Hybrid client: on client-side navigation, the client fetches
    `/__data?path=...` and uses the result as page props (so `load()` data is
    available without full SSR). On first paint, CSR runs `load()` on the
    server, injects the result as `globalThis.__DATA__`, and the client uses it
    for initial render then clears it to avoid reuse on later navigations.
  - API routes (`api/` under routes) are excluded from client `ROUTE_LOADERS` so
    the client bundle does not pull in server-only API modules.

- **E2E browser tests – all example variants**: Basic and advanced browser
  suites now cover every workspace example. View-hybrid-flat added (basic port
  3015, advanced 3028/3029). All preact and react advanced suites added:
  preact-csr (3030/3031), preact-hybrid (3032/3033), preact-ssr (3034/3035),
  preact-ssg (3036/3037), preact-hybrid-flat (3038/3039), react-csr (3040/3041),
  react-hybrid (3042/3043), react-ssr (3044/3045), react-ssg (3046/3047),
  react-hybrid-flat (3048/3049). Advanced example port configs updated to use
  these e2e ports.
- **E2E interaction tests**: Each suite has two browser tests: (1) render and no
  hydration errors, (2) navigation by click. Basic suites: click “About” link
  and assert “关于我们” on the about page. Advanced suites: click “用户管理”
  link and assert “用户管理” or “用户列表” on the users page (backend has no
  about route; users page calls backend API).
- **Advanced build entries option**: `buildExampleAdvanced` and
  `createAdvancedExampleBrowserSuite` accept optional `entries` (e.g.
  `["backend/main.ts", "frontend/main.ts"]`) for flat-structure advanced
  examples (preact-hybrid-flat, react-hybrid-flat, view-hybrid-flat).

### Removed

- **preact-hybrid-unocss example**: Example and workspace entries removed;
  coverage is provided by view-hybrid-flat and other view/preact/react examples.

### Changed

- **E2E test naming**: Advanced second test renamed from
  “应能通过点击关于链接进入关于页” to “应能通过点击用户管理链接进入用户页” and
  uses `assertBrowserClickUsers` (click `a[href="/users"]`, wait for users page
  content).

---

## [3.0.74] - 2026-02-15

### Changed

- **Dependencies**: Bump `@dreamer/view` to `^1.0.9` (input value fix with
  vIf/vShow directives). Bump `@dreamer/render` to `^1.0.21` (view engine
  alignment).

---

## [3.0.73] - 2026-02-15

### Added

- **View template engine**: Dweb now supports @dreamer/view as the view layer
  (render adapter). View-hybrid and view-csr example projects demonstrate SSR,
  hydration, and client-side rendering with signals and directives.

### Changed

- **License**: Project is licensed under Apache 2.0; attribution updated
  (LICENSE, NOTICE).

---

## [3.0.72] - 2026-02-09

### Fixed (Windows compatibility)

- **Windows Preact/npm resolution**: Update @dreamer/esbuild to ^1.0.6 in dweb
  and all 22 example projects. esbuild 1.0.6 fixes Windows `file://` path
  handling (e.g. `file:///C:/Users/...` → `C:/Users/...`) and adds subprocess
  fallback for npm package resolution when `import.meta.resolve` returns invalid
  paths on Windows.
- **Logger passthrough**: Pass logger to esbuild BuilderClient and BuilderServer
  so debug output (resolver, buildModuleCache, etc.) appears when
  `logger.level: "debug"` and `build.client.debug: true` are set.

### Changed

- **Example configs**: Disable all debug options (render, router, build, socket)
  in example project main.dev.ts by default.

---

## [3.0.71] - 2026-02-08

### Fixed (Windows compatibility & tests)

- **Windows compatibility testing**: Fix config.test.ts and build-dirs.test.ts
  assertions so tests pass on Windows and when running in parallel. Error
  messages support bilingual matching (i18n and default English fallback); entry
  path format error regex adds "Entry path format not supported".
- **All 480 tests passing**: Unit, integration, and e2e tests pass on Deno, Bun,
  and CI (ubuntu/windows/macos).

---

## [3.0.70] - 2026-02-08

### Added

- **i18n documentation**: Add Internationalization (i18n) section to README and
  docs. Document 9 supported locales (zh-CN, en-US, ja-JP, ko-KR, es-ES, pt-BR,
  id-ID, de-DE, fr-FR), configuration via `config.language` and env vars
  (LANGUAGE, LC_ALL, LANG), priority, and fallback to en-US. Update APP_CONFIG
  language option description.

---

## [3.0.69] - 2026-02-08

### Fixed

- **CI @dreamer/esbuild**: Switch from local path `../esbuild/src/mod.ts` to
  `jsr:@dreamer/esbuild@^1.0.2` so CI (standalone dweb repo) can resolve.
- **CI compilerOptions & React SSG**: Root `jsxImportSource` set to `react`;
  remove `compilerOptions` from workspace-member examples (Deno allows only
  root); Preact examples add `react`/`react/jsx-runtime` aliases to Preact for
  compat.
- **Windows config-loader**: Treat Windows absolute paths (`C:\path`) as
  absolute; fallback to `absPath` when `realPath` fails (e.g. symlinks in CI).
- **Windows module-cache**: Normalize `file:///D:/path` to `D:/path` so it
  matches direct path keys.

---

## [3.0.68] - 2025-02-07

### Fixed

- **Windows config inference**: `inferConfigDirectoryFromEntry` now uses
  `normalizePathForCompare` for path and root before replace, fixing path
  mismatch when path uses `/` and root uses `\` (or vice versa).
- **Client dep generation**: Fix esbuild "Unterminated string literal" in
  generated `_client.dep.tsx` by correcting template literal escape: use
  `.replace(/\\\\/g, "/")` so output contains `.replace(/\\/g, "/")` for Windows
  path normalization.

### Added

- **CI workflow** (`.github/workflows/ci.yml`): Run tests on `ubuntu-latest`,
  `windows-latest`, and `macos-latest` on push/PR to `main` or `dev`.
- **Windows compatibility docs**: `docs/en-US/WIN_COMPAT.md` (English) and
  `docs/zh-CN/WIN_COMPAT.md` (Chinese).

---

## [3.0.67] - 2026-02-07

### Added

- **CLI `update` in docs**: Add `update` command to CLI commands table in README
  (English and Chinese). Runs `deno update` or `bun update`; supports `--latest`
  and `--interactive`.

### Changed

- **Init React template**: Add `scheduler` dependency (`npm:scheduler@0.25.0`)
  to React engine imports in generated `deno.json`.

---

## [3.0.66] - 2026-02-07

### Fixed

- Fix React CSR rendering error "Objects are not valid as a React child":
  `LoadingPlaceholder` in render-csr was built with Preact's `createElement`
  regardless of engine. Now select `createElement` (React vs Preact) and prop
  name (`className` vs `class`) based on `engine` config. Add `react` to dweb
  imports for React engine support.

---

## [3.0.65] - 2026-02-07

### Added

- **`getDreamerClientCacheDir()`**: New utility to resolve the client build
  cache directory at `~/.dreamer/{projectHash}/{appDir}/client-out`. Project
  hash is derived from the project path SHA-256 (first 16 chars); app dir is
  `default` for single-app or the app name for multi-app.
- **`__DWEB_DEV__` global**: Injected by the server into CSR/hybrid HTML to
  indicate dev mode. Used to distinguish dev-only behavior (e.g. HMR CSS refresh
  only in dev).
- **Error code `DWEB_E34`** (`DREAMER_CACHE_HOME_UNAVAILABLE`): Thrown when
  `HOME` or `USERPROFILE` is not set and the framework cannot use `~/.dreamer`
  cache. Includes i18n messages in zh-CN and en-US.

### Changed

- **Client build cache location**: Dev mode CSR build cache moved from
  project-local `.dweb-client-out` to
  `~/.dreamer/{projectHash}/{appDir}/client-out`. Avoids temporary directories
  inside the project.
- **HMR CSS refresh**: Support both `<link>` and `<style>` elements. For
  `<link>`, refresh by updating `href` with a timestamp; for `<style>`, fetch
  and set `textContent` as before.
- **Dependencies**: Upgrade @dreamer/router to ^1.0.1 (scroll position restore
  on page change), @dreamer/socket-io to ^1.0.1 (fix reconnect on manual
  disconnect), @dreamer/database to ^1.0.2. Remove direct npm deps
  `autoprefixer`, `cssnano`, `postcss`, `esbuild` from deno.json (resolved
  transitively).
- **Init template**: Simplify `deno.json` imports. Tailwind: only `tailwindcss`;
  UnoCSS: only `@unocss/core`; Preact/React: only engine entry (e.g. `preact`).
  Add `a { color: inherit; text-decoration: none; }` to base UnoCSS reset.
- **Examples**: Bump preact-hybrid and preact-hybrid-unocss to stable JSR
  versions; reduce npm imports to essential entries only.

---

## [3.0.63] - 2026-02-07

### Fixed

- Fix TypeScript error
  `Property '__DWEB_HMR_DEBUG__' does not exist on type 'Window & typeof globalThis'`
  in generated `_client.dep.tsx` by adding `__DWEB_HMR_DEBUG__` to `DwebGlobal`
  interface and extending `_win` type

---

## [3.0.62] - 2026-02-07

### Changed

- Remove Beta version notice from README (English and Chinese)
- Simplify init command examples: `--beta` is no longer required

---

## [3.0.61] - 2026-02-06

### Fixed

- Upgrade Tailwind CSS and @tailwindcss/postcss from 4.0.0 to 4.1.18 in init
  template and all examples (Preact/React), fixing PostCSS compilation failure
  caused by missing `negated` field in `ScannerOptions.sources`

---

## [3.0.60] - 2026-02-06

### Fixed

- Fix Dockerfile apt-get permission issue: add `USER root` (Deno image defaults
  to non-root user)
- Use `./runtime/deno-cache` for docker-compose volume to avoid being
  interpreted as named volume

---

## [3.0.59] - 2026-02-06

### Changed

- Release

---

## [3.0.58] - 2026-02-06

### Added

- Create `runtime/deno-cache` and `runtime/logs` directories during init

### Changed

- docker-compose single-app service name now uses project name (was fixed as
  `app`)

---

## [3.0.57] - 2026-02-06

### Changed

- Update APP_CONFIG and README for improved clarity and bilingual support
- Update README sequence diagram description

---

## [3.0.56] - 2026-02-06

### Added

- Comprehensive README framework documentation
- Unit tests, e2e and integration tests for dweb

### Changed

- Update TEST_REPORT.md

---

## [3.0.55] - 2026-02-06

### Added

- Upgrade @dreamer/esbuild to 1.0.0-beta.64 with i18n and HMR incremental
  compilation support

---

## [3.0.54] - 2026-02-06

### Changed

- Update @dreamer/server dependency to 1.0.0-beta.26
- Switch @dreamer/esbuild from local path to JSR 1.0.0-beta.63

---

## [3.0.53] - 2026-02-06

### Added

- Static asset hash and path replacement for SSR/CSR/Hybrid/SSG

### Changed

- Performance optimizations per analysis report
- Remove deprecated APIs: `getBusinessConfig` and `getBusinessConfigValue`
- Export `$t` and explicit import for deno publish fix (compilerOptions.types)
- i18n type definitions adjustments for publish

---

## [3.0.49] - 2026-02-05

### Fixed

- Bundle Preact into client bundle, filter preact/react from external to fix
  hydration `__H` error

### Added

- Upgrade @dreamer/esbuild to 1.0.0-beta.59 with Preact external and import map
  for HMR `_H` fix

---

## [3.0.46] - 2026-02-05

### Fixed

- Config directory inference logic for development source files

---

## [3.0.45] - 2026-02-05

### Added

- Server startup log i18n
- Upgrade @dreamer/server to 1.0.0-beta.25

---

## [3.0.44] - 2026-02-05

### Added

- `language` config option
- JSDoc documentation improvements

---

## [3.0.43] - 2026-02-05

### Added

- i18n global type setup and test configuration
- i18n translation for csr-client-builder debug logs
- i18n translation for app, csr-client-builder, build, clean, test
- i18n translation for dweb framework
- Unified error handling with i18n support

### Changed

- Upgrade runtime-adapter to 1.0.0-beta.26

---

## [3.0.41] - 2026-02-05

### Changed

- Upgrade runtime-adapter to ^1.0.0-beta.25 (Windows compatibility)

---

## [3.0.40] - 2026-02-05

### Added

- Windows installation notes in README
- Config docs and setup comments

### Changed

- docs: Config can access env vars without runtime-adapter
- docs: Config and params access details
- docs: Full JSDoc for all exports

---

## [3.0.39] - 2026-02-05

### Added

- Upgrade runtime-adapter to 1.0.0-beta.24 for Windows compatibility

---

## [3.0.38] - 2026-02-05

### Added

- `feature/socket-io` subpath export

---

## [3.0.37] - 2026-02-05

### Added

- WebSocket integration

### Changed

- basic example config moved to src/config

---

## [3.0.36] - 2026-02-05

### Added

- MongoDB replica set config example in APP_CONFIG_EXAMPLE.md

### Changed

- Update all @dreamer dependencies (router@1.0.0-beta.11)

---

## [3.0.26] - 2026-02-05

### Fixed

- Build after Tailwind CSS and chunk 404, support user config output dir
- init use deno install instead of deno cache
- Multi-app build without src outputs server.js to dist/<app>/
- init template .gitignore add _client.dep.tsx

---

## [3.0.21] - 2026-02-04

### Added

- Version cache, JSR fetch loading, silent approve-scripts

### Fixed

- ConfigManager listener leak
- Auto run deno cache and approve-scripts after init
- upgrade command prompt consistency

---

## [3.0.20] - 2026-02-04

### Added

- upgrade command `--beta` option for beta latest

---

## [3.0.16] - 2026-02-04

### Added

- UnoCSS example project

---

## [3.0.15] - 2026-02-04

### Added

- generate command uses @dreamer/utils pascalCase/kebabCase for name
  normalization
- db migrate integrates MigrationManager
- dev/build/start use config
- getRuntime and config-loader

### Changed

- getRuntime() called once at function top
- Replace all mkdir with ensureDir

---

## [3.0.0] - 2026-02-04

### Added

- v3.0.0 release

---

## [2.6.0-legacy.1] - 2026-02-03

Legacy version for v2.x compatibility.

---

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
