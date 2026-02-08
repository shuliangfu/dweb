# Changelog

All notable changes to @dreamer/dweb are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  remove `compilerOptions` from workspace-member examples (Deno allows only root);
  Preact examples add `react`/`react/jsx-runtime` aliases to Preact for compat.
- **Windows config-loader**: Treat Windows absolute paths (`C:\path`) as absolute;
  fallback to `absPath` when `realPath` fails (e.g. symlinks in CI).
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
