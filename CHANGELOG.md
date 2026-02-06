# Changelog

All notable changes to @dreamer/dweb are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

- Upgrade @dreamer/esbuild to 1.0.0-beta.64 with i18n and HMR incremental compilation support

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

- Bundle Preact into client bundle, filter preact/react from external to fix hydration `__H` error

### Added

- Upgrade @dreamer/esbuild to 1.0.0-beta.59 with Preact external and import map for HMR `_H` fix

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

- generate command uses @dreamer/utils pascalCase/kebabCase for name normalization
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
