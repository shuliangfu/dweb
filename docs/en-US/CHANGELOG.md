# Changelog

All notable changes to @dreamer/dweb are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

---

## [3.5.5] - 2026-06-26

### Fixed

- **Hybrid/CSR layout hydration** (`src/feature/csr-client-builder.ts`,
  `_canonicalLayoutPropsForViewState`): read layout `load()` fields from both
  top-level props and nested **`props.data`**, matching how load-data middleware
  serializes layout data. Avoids false “unchanged” snapshots (e.g.
  **`uiLocale`** stuck as null) that skipped client re-renders after navigation
  or HMR.

### Changed

- **JSR dependency**: **`@dreamer/server`** **`^1.1.8`** (action-mode API
  **`index`** fallback and **`takeLastResponse`** fixes).
- **npm dependencies**: Preact **`^10.29.2`**, **`preact-render-to-string`**
  **`^6.7.0`**, React / React-DOM **`^19.2.7`**, PostCSS **`^8.5.15`**,
  Autoprefixer **`^10.5.2`**.
- **Init scaffold** (`src/cmd/init/constants.ts`): **`PREACT_VERSION`**
  **`10.29.2`**, React **`19.2.7`** aligned with root imports.
- **Preact examples**: all **`deno.json`** / **`package.json`** under
  **`examples/preact-*`** synced to Preact **`^10.29.2`**.

## [3.5.4] - 2026-05-09

### Fixed

- **Dev HMR chunk mapping** (`src/feature/csr-client-builder.ts`,
  `getChunkFileNameForComponent`): when esbuild emits a **basename-only** chunk
  for a multi-segment route (e.g. `workspace/projects/create.tsx` →
  `create-<hash>.js`), the matcher previously returned no file, leaving
  `routeChunkUrls` empty so the client fell back to a bare dynamic `import()`
  and the browser kept serving a stale module. A **unique last-segment**
  fallback now resolves the chunk when exactly one candidate matches, restoring
  hot reload for deep routes such as `/workspace/projects/create`.

### Changed

- **Exports** (`getChunkFileNameForComponent`): function is now **exported**
  from `csr-client-builder.ts` for unit tests and advanced tooling.

### Added

- **Tests** (`tests/unit/csr-client-builder.test.ts`): coverage for the
  last-segment HMR chunk resolution case.

## [3.5.3] - 2026-05-08

### Fixed

- **View HMR** (`src/feature/csr-client-builder.ts`): refreshes current route
  `load()` data and layout data before applying a hot update, keeps the View
  reactive root mounted during same-route updates, and avoids forcing a full
  page reload when a hot update cannot resolve a fresh chunk.
- **CSS HMR** (`src/feature/csr-client-builder.ts`): refreshes injected global
  stylesheet links with a preload-and-swap flow, preventing the page from
  briefly losing Tailwind styles while `/assets/tailwind.css` is refreshed.
- **React dependency alignment** (`src/cmd/init/constants.ts`): generated React
  projects now use matching React / react-dom caret baselines (`^19.2.6`), and
  dweb depends on **@dreamer/render** ^1.1.8 to avoid React 19 runtime version
  mismatch errors.

### Repository-only

- **Example** (`examples/view-hybrid/basic/src/routes/about.tsx`): renders
  `load()` data on the about page so View Hybrid HMR can be verified with real
  page data.

## [3.5.2] - 2026-05-08

### Added

- **Route `load` and file-route handler context** (`LoadContext`, `ApiContext`,
  `ApiRouteContext` in `src/types/context.ts`): expose **`app`** (`IApp`) and
  **`container`** (`ServiceContainer`) so route modules can resolve framework
  services. **`createLoadContext`** now requires these; CSR, hybrid, SSR
  renderers and **`createLoadDataMiddleware`** pass them through.
- **Server router wiring** (`src/core/app.ts`): pass **`extendApiContext`** to
  **`server.useRouter`** so API route handlers receive the same **`app`** /
  **`container`** (aligned with **@dreamer/server** ^1.1.7).

### Changed

- **`dweb init` (multi-app)** (`src/cmd/init/templates/config.ts`): generated
  per-app **`config/main.ts`** **`name`** is **`${projectName}-${appName}`**
  (e.g. **`book-backend`**) instead of the app folder name only.
- **Dependencies** (`deno.json` / `package.json`): **@dreamer/server** ^1.1.7,
  **react** / **react-dom** ^19.2.6, **postcss** ^8.5.14, **cssnano** ^7.1.9.

## [3.5.1] - 2026-05-05

### Fixed

- **Client bundle manifest** (`getRouteClientManifest`,
  `src/feature/csr-client-route-manifest.ts`): when reusing the app `Router`
  from the service container, entries whose route files **no longer exist on
  disk** are dropped (e.g. after deleting a page during dev hot reload), then
  merged with a fresh filesystem scan so new pages are included. Layout keys
  always come from a current `routes` directory scan. Prevents generated
  `_client.dep.tsx` from importing missing `./routes/*.tsx` and breaking the
  client esbuild step.

## [3.5.0] - 2026-05-04

### Changed

- **Dependencies** (main `deno.json` / `package.json`): raised ranges for
  **`@dreamer/database`** (^1.1.0), **`@dreamer/server`** (^1.1.6),
  **`@dreamer/socket-io`** (^1.1.0), **`postcss`** (^8.5.13), and **`cssnano`**
  (^7.1.8).

### Repository-only

- **Examples** (not shipped on JSR): **`examples/view-hybrid/basic`** aligned
  **`@dreamer/server`** to ^1.1.6.

## [3.4.9] - 2026-04-27

### Changed

- **CLI** (`dweb dev` / `dweb start`, `src/cmd/dev.ts`, `src/cmd/start.ts`):
  removed the `ℹ` lines that printed the **dev/prod port from `config.server`**
  before spawning the task. **Single-app** `dweb dev` now logs
  **`dev.startingSingle`** (“Starting dev server…”) before spawn, aligned with
  **`start.startingSingle`** for production. Multi-app `dev` / `start` behavior
  for **`dev.starting`** / **`start.starting`** is unchanged; only the redundant
  port-from-config messages were removed. Locales: added
  **`dev.startingSingle`** in all supported languages.

## [3.4.8] - 2026-04-27

### Added

- **Repository tooling**: `update-deps.sh` at the dweb package root runs
  **`deno update`** for the main `deno.json` first, then for every `examples/**`
  project that has a `deno.json`, so maintainers can refresh import specifiers
  and lockfiles in one step.

### Changed

- **Examples** (Git repository only; not included in the JSR published tarball):
  all sample apps under `examples/` were refreshed with **`deno update`** so
  their `deno.json` / `package.json` and lockfiles match current resolution for
  `@dreamer/*` and npm dependencies.

## [3.4.7] - 2026-04-27

### Fixed

- **Global `dweb-cli` install (setup)** (`src/setup.ts`): `deno install` now
  uses a version-pinned entry point, `jsr:@dreamer/dweb@<version>/cli`, where
  `<version>` is read from the same package’s root `deno.json` (via
  `loadDwebDenoJson()`), instead of unversioned `jsr:@dreamer/dweb/cli`. In some
  Deno and cache environments the unversioned specifier could still resolve to
  stale dweb, so the displayed or cached version and new projects’ `imports`
  could look up to date while `dweb init` still used old template code (for
  example, `tasks` without `--dev` / `--start`, or older generated npm import
  baselines in `deno.json`).

## [3.4.6] - 2026-04-27

### Fixed

- **`getDwebVersion()`** (`src/utils/version.ts`): on JSR / remote, **no longer
  prefers** `~/.dreamer/dweb/version.json` **before** the **running** package
  version. That cache could be **newer** than the Deno module cache, so
  **`dweb-cli -v`** showed a recent version (e.g. 3.4.5) while **`init` still
  executed older template code** (e.g. `tasks` without `--dev` / `--start`). The
  CLI version string now **matches `DWEB_VERSION`** from the loaded dweb
  package, with cache only as a fall back.

## [3.4.5] - 2026-04-27

### Changed

- **`dweb init` `deno.json` template** (`src/cmd/init/templates/deno-json.ts`):
  **`tasks.dev`** and **`tasks.start`** now pass **`--dev`** and **`--start`**
  (and **`--build`** was already on the build task) so `App`’s **`RUNTIME_ENV`**
  matches **`dweb-cli`** / argv conventions without relying on defaults.
  Multi-app task names follow the same pattern (**`dev:app`**, **`build:app`**,
  **`start:app`**).

## [3.4.4] - 2026-04-27

### Fixed

- **`router.routesDir` vs `process.cwd()`** in **multi-app / flat** layouts:
  when the working directory is already the app folder (e.g.
  `.../my-app/frontend`) but the config still uses a path relative to the
  **parent** repo root (e.g. `./frontend/routes`), a naive
  `join(cwd, "frontend/routes")` could resolve to `.../frontend/frontend/routes`
  and break **`import` / `loadRouteModule`** and **`GET /__data`**. Added
  **`resolveRouterRoutesDirPath`** in **`src/utils/path.ts`**: if the primary
  resolved path is not an existing directory, try dropping the first path
  segment (`frontend/routes` → `routes` under the same cwd); if **`routesDir`**
  is already **absolute**, only **`resolve`**, do not join to cwd. The same
  helper is used for **`initializeRouter`**, **`createLoadDataMiddleware`**,
  **CSR / SSR / Hybrid** renderers, **build** and **CSR client** pipeline,
  **routes** middleware registration, **SSG** hydration pass, and **dev**
  **`server.dev.watch`** inference so route scanning, data loading, and client
  bundles agree on the routes directory.
- **Windows + CSR client + Router manifest (ROUTE_LOADERS)**: on **Bun** /
  **GHA** `D:/` paths, `path.relative` or string prefix could still leave
  `componentPath` and generated **`_client.dep.tsx`** keys/imports as
  `D:/.../routes/...`, breaking **esbuild** (`import("./routes/D:/...")`).
  - **`src/utils/path.ts`**: **`extractComponentPathFromRouteFile`** now falls
    back to **`path.relative`** after `resolve` (and
    **`realPathWithMissingSegments`** on Windows) and to
    **`subpathFromRoutesDirMarker`**, and **no longer** returns a full
    drive-letter string on failure.
  - **`subpathFromRoutesDirMarker`**: takes the subpath after the last
    `.../routes/…` in the file path.
  - **`src/feature/csr-client-builder.ts`**: **`routeLoaderKeyForClientDep`**
    rejects absolute-looking keys and uses the same marker before **`"index"`**
    (JSON-safe **`import(`./routes/...`)** strings).
  - **`src/feature/csr-client-route-manifest.ts`**: **`getRouteComponentPath`**
    still hardens `relative` / prefix;
    **`collectRouteClientManifestFromRouter`** now returns
    **`sanitizeClientRouteComponents`**, and sanitize uses **`extract` +
    `subpathFromRoutesDirMarker`**; **`getRouteClientManifest`** no longer
    double-sanitizes the Router branch.

### Tests

- **`tests/unit/path.test.ts`**: `resolveRouterRoutesDirPath` for default
  `./src/routes`, duplicate-segment (e.g. `frontend`) fallback, absolute
  `routesDir`, and a **GHA-style** D: path with mismatched `routesDir` that
  still yields **`about`** from the `routes` marker.
- **`tests/unit/csr-client-route-manifest.test.ts`**: D: drive `fullPath` and
  `routesDir` yield `componentPath` **`about`**, not a path with a drive letter.
- **`tests/unit/csr-client-builder.test.ts`**: Windows `componentPath` with full
  D: `routes` string still emits relative **`./routes/about.tsx`** in generated
  client dep.

## [3.4.3] - 2026-04-26

### Fixed

- **Windows + Bun (CI `test-windows-bun`)** — two path-shape issues in
  **`src/utils/path.ts`**:
  - **Verbatim** absolute paths from **`fs.realpath`** (`\\?\C:\...`,
    `\\?\UNC\...`, or `//?/C:/...`) while **`process.cwd()`** is the normal
    `C:\...` form. **`normalizePathForCompare`** now strips these prefixes so
    string comparison and **`isPathWithinProject`** can treat routes as under
    the project.
  - **8.3 short names** (e.g. `C:\Users\RUNNER~1\...`) **vs long**
    (`C:\Users\runner\...`): **`isPathWithinProject`** (Windows) uses
    **`toComparableRealPath`**: **`realPathSync`** when the path exists; if a
    file or parent segment is **missing**, walk up to an existing directory,
    **`realPathSync`** that, then **`join`** the remaining segments so the child
    prefix matches the project root’s canonical form. Then **`path.relative`**
    (not only string **startsWith**) decides containment. This avoids spurious
    `..` from mixing SFN root with a long `resolve` only for non-existent paths
    (Windows CI / browser test runs on temp dirs).
  - **`pathForLog`**: on Windows, uses the same “inside project” rule and
    `toComparableRealPath` + **`relative`** for the returned relative path.

  Together, **`loadRouteModule`** and **`GET /__data`** keep returning page
  **`load()`**, layout, and metadata on **Windows + Bun**; previously
  `loadRouteModule` could return `null` and the load-data middleware unit tests
  could fail.

### Tests

- **`tests/unit/windows.test.ts`**: Verbatim-path normalization, `realPathSync`
  on an existing file under a temp project + **`isPathWithinProject`**
  (Windows); post-fix validation for **`/__data`** on Windows agents.
- **`tests/unit/path.test.ts`**: Child paths that do **not** exist yet (e.g.
  `config/main.ts` under a temp project) must still be treated as inside the
  project, matching GHA / browser test runs.
- **Integration / e2e (Bun)**: **`tests/setup.ts`** adds
  **`ensureExampleDependenciesInstalled`**: if `node_modules/@dreamer/dweb` is
  missing in an example, run **`bun install`** there before build/dev subprocess
  (Deno still uses `deno.json` imports and skips this).
- **`src/feature/load-data-middleware.ts`**: for route module loading in
  `GET /__data`, convert router-returned file paths to absolute paths and pass a
  per-file `routesDirPath` (`dirname(absPath)`) to avoid cross-suite `cwd`
  interference during Bun unit concurrency on Windows.
- **`src/feature/load-route-module.ts`**: keep the strict in-project guard, and
  add a Windows fallback containment check (normalized absolute-prefix against
  `routesDirPath`) when `isPathWithinProject` false-negatives due to 8.3
  short-name vs long-path mismatch (`RUNNER~1` style temp directories in CI).

### Tests

- Re-ran **`bun test tests/unit`** (626 files set in CI workflow scope) after
  the fallback guard update; `load-data-middleware` assertions pass without
  `Path must be in project` false negatives.

## [3.4.2] - 2026-04-25

### Added

- **`src/utils/security.ts`**: `serializeJsonForInlineScript` for safe inline
  `globalThis.__DATA__` / route JSON; `escapeHtml`, `createDefaultErrorHtml`,
  and `createJsonErrorBody` to avoid HTML/script injection and to hide error
  details in production.
- **`src/feature/csr-client-route-manifest.ts`**: shared CSR route manifest
  (component paths + layout keys) with optional reuse of the app `Router` scan
  to reduce duplicate I/O; falls back to filesystem scan when needed.
- **Optional `securityHeaders`** on `AppConfig` and
  **`createSecurityHeadersMiddleware`** (`src/core/middleware.ts`): off by
  default; when enabled, appends conservative security response headers (does
  not set CSP by default; apps can pass `contentSecurityPolicy` if desired).

### Changed

- **Inline hydration data** (`render-ssr`, `render-csr`, `render-hybrid`,
  `render-ssg`, `app` SSG post-pass): use safe JSON serialization for `__DATA__`
  and `__DWEB_ROUTES__`.
- **Default 500 HTML** in render paths uses `createDefaultErrorHtml` (dev shows
  escaped message; production shows a fixed message).
- **`load-data` 500 JSON** uses `createJsonErrorBody` (no internal error detail
  in production).
- **Hybrid** (`render-hybrid.ts`): load page, `_app`, and layout modules in
  **parallel** (`Promise.all`) to reduce cold-start waterfall.
- **CSR client build** (`buildClientScript`, `ensureClientEntryFile`,
  `prepareClientBuildEntry`): consume **`getRouteClientManifest`**; manifest
  normalizes router file paths (absolute, project-relative, and
  `routes/`-relative) so **`ROUTE_LOADERS`** keys match `index`, nested routes,
  etc. (fixes hydration "component not found" when manifest was empty or keys
  were wrong).

### Tests

- `tests/unit/security.test.ts`, `tests/unit/load-data-middleware.test.ts`,
  `tests/unit/csr-client-route-manifest.test.ts`, extended `csr-client-builder`
  and `middleware` unit tests.

## [3.4.1] - 2026-04-18

### Fixed

- **Generated CSR `renderCurrentRoute`** (`src/feature/csr-client-builder.ts` →
  `_client.dep.tsx`): After server-injected `__DATA__` was cleared on first use,
  a later call to `renderCurrentRoute` (e.g. from i18n `onChange` after language
  switch) re-rendered layouts **without** `load()` data. The client now
  **fetches `/__data`** in that case, same as `onRouteChange`, so each layout
  again receives merged `layoutData` (e.g. session in layout `data`).

## [3.4.0] - 2026-04-22

### Changed

- **`configProfileFromRuntimeEnv()`** (`src/utils/runtime.ts`): Profile for
  `main.{env}.ts` / `params.{env}.ts` is **only** derived from **`RUNTIME_ENV`**
  (`dev` | `build` | `start`); default **`dev`** when unset or invalid (no
  `DENO_ENV` override in this helper).
- **`initializeConfigManager`**: Calls **`preloadDotEnvSync`** before reading
  the profile, then loads layered **`main`/`params`** so `.env` keys are
  available to **`main.ts`** during import.
- **`loadMainConfig` / `loadParamsConfig`**: For **`build`** and **`start`**,
  merge **`main.prod.ts` / `params.prod.ts` before** `main.build.ts` /
  `main.start.ts` (or `params.*`) so projects that only ship production overlays
  under the historical **`*.prod.ts`** names still apply.

### Tests

- **`tests/unit/runtime.test.ts`**: Expectations aligned with `RUNTIME_ENV`–only
  profile names.

## [3.3.13] - 2026-04-22

### Added

- **`RUNTIME_ENV`** (`dev` | `build` | `start`): `dweb dev` / `dweb build` /
  `dweb start` pass a full inherited env plus **`RUNTIME_ENV`** to spawned
  `deno task` / `bun` children via **`envWithRuntime()`**
  (`src/utils/runtime.ts`).
- **`configProfileFromRuntimeEnv()`**: maps the current process’s
  **`RUNTIME_ENV`** to a config profile (defaults to **`dev`** when unset or
  invalid) for **`main.{env}.ts`** / `.env` layering.

### Changed

- **`App`**: Auto-sets **`RUNTIME_ENV`** from argv (`--dev`, `--build`,
  `--start`) and **`__DWEB_PROD__`** instead of **`DENO_ENV`**; does not
  override if already set. **Dev no-cache** runs only when
  **`RUNTIME_ENV=dev`**; **request logger** `detailed` when
  **`server.mode=prod`** or **`RUNTIME_ENV`** is **`build`** or **`start`**.
  **`_ensureClientBuildForRender`** branches on **`RUNTIME_ENV`** (dev vs
  build/start).
- **`initializeServer`**: **`@dreamer/server`** `dev` (HMR) only when
  **`RUNTIME_ENV=dev`**.
- **Config** (`config.ts`, `config-loader.ts`): profile name from
  **`configProfileFromRuntimeEnv()`** instead of **`DENO_ENV`** / **`BUN_ENV`**
  / **`NODE_ENV`**.
- **Render / build / CSR** (`build.ts`, `csr-client-*`, `load-route-module.ts`,
  `render-*.ts`): “dev vs prod” and import cache busting use **`RUNTIME_ENV`**
  consistently.
- **Dependencies** (`deno.json` / `package.json`): **`@dreamer/config`**
  **^1.0.4**, **`@dreamer/plugins`** **^1.1.4**, **`@dreamer/server`**
  **^1.1.5**.

### Tests

- **`tests/unit/runtime.test.ts`**: **`envWithRuntime()`** and
  **`configProfileFromRuntimeEnv()`** behavior.
- **`tests/unit/render-ssg.test.ts`**: prod skip uses **`RUNTIME_ENV`**.

## [3.3.12] - 2026-04-21

### Fixed

- **Database integration** (`src/core/database.ts`): After `connectDatabases`
  finishes, call **`setDatabaseManager(manager)`** so **`@dreamer/database`**
  ORM (**`MongoModel`** / **`SQLModel`**) shares the same **`DatabaseManager`**
  instance as the framework **`ServiceContainer`**. Previously
  **`getDatabaseAsync`** tried **`autoInitDatabase`** without
  **`setDatabaseConfigLoader`**, causing "database config loader not set" at
  runtime when using ORM after dweb connected the database.

### Tests

- **`tests/unit/database.test.ts`**: Assert ORM global manager matches the
  container, **`getDatabaseAsync`** without a config loader, and a minimal
  **`SQLModel.init` / `create`** smoke path after **`connectDatabases`**.

---

## [3.3.11] - 2026-04-21

### Changed

- **Root manifests**: **`deno.json`** / **`package.json`** align npm deps on
  semver **carets** (Preact/React/PostCSS/autoprefixer/cssnano/scheduler,
  Tailwind/UnoCSS where applicable); **`package.json`** **`overrides`** keep the
  Preact stack consistent.
- **Examples** (**`examples/**`**): every example **`deno.json`** and
  **`package.json`** uses the same **`^`** ranges for the UI/CSS stack (avoids
  mismatched **`react`** vs **`react-dom`** patches in workspaces).
- **`dweb init`** (**`src/cmd/init`**): templates emit **`npm:pkg@^x.y.z`** /
  **`"^x.y.z"`** for third-party npm deps; **`constants.ts`** baselines bumped
  (e.g. React **19.2.5**, Preact **10.29.1**, PostCSS **8.5.10**).

---

## [3.3.10] - 2026-04-21

### Changed

- **`LoadContext`** (`types/context.ts`): Aligns structurally with
  **`HttpContext`** without **`cookies`** / **`url`** (**`URL`**) /
  **`response`**; adds **`pathname`**, **`search`**, **`requestId`**, optional
  **`clientIp`**, optional **`matchedRoute`** (**`MatchedRouteSnapshot`**).
  **`createLoadContext`** fills **`request`**, **`path`**, **`method`**,
  **`headers`**, optional **`body`** / **`error`**, parses cookies from
  **`req`**, and omits the previous **`LoadContext`** string index signature.
- **Exports**: **`MatchedRouteSnapshot`**; **`pathnameFromLoadUrl`** (alias for
  **`pathnameFromHref`** from **`@dreamer/server`**).
- **`createLoadContext`**: Accepts optional **`matchedRoute`**. SSR, CSR, hybrid
  renderers, and **`load-data`** middleware pass
  **`snapshotMatchedRoute(match.route)`** when constructing **`LoadContext`**.

### Tests

- **`tests/unit/context.test.ts`**: Covers enriched **`createLoadContext`** /
  **`LoadContext`** shape.

---

## [3.3.9] - 2026-04-21

### Changed

- **Client router / metadata** (`csr-client-builder`): On SPA navigation,
  **`loadPageModule`** and **`GET`** **`/_dweb_data`** now run **in parallel**
  (**`Promise.all`** in generated **`_client.dep.tsx`**). Previously they ran
  **sequentially**, which added roughly one round-trip delay before **`head`**
  (**`<title>`**, meta tags) could match the new route’s body after chunk load.

---

## [3.3.8] - 2026-04-20

### Changed

- **Dependencies**: Bump **`@dreamer/test`** to **`^1.1.7`** (JSR and npm
  devDependency). Uses host-side timeouts for Playwright **`page.evaluate`** in
  **`@dreamer/test`** browser context, reducing long-hanging browser e2e on some
  CI hosts (notably macOS Deno pipelines).

---

## [3.3.7] - 2026-04-18

### Changed

- **Dependencies / build chain**: Align with **`@dreamer/esbuild` `1.1.8`**.
  This repo links the sibling **`esbuild`** package via **`file:../esbuild`** in
  **`package.json`** and **`../esbuild/src/mod.ts`** in **`deno.json`**. Before
  publishing **`@dreamer/dweb`** to JSR, publish **`@dreamer/esbuild` `1.1.8`**
  first, then switch constraints to **`npm:@jsr/dreamer__esbuild@^1.1.8`** and
  **`jsr:@dreamer/esbuild@^1.1.8`**. The Bun **`bun-resolver`** resolves
  **unscoped bare npm specifiers** (e.g. **`react-dom`**,
  **`react-dom/client`**, **`scheduler`**) via **`createRequire`** when the
  client build clears **`nodePaths`**, fixing failures loading
  **`@dreamer/render/client/react`** through **`bun-protocol`** paths. Aligns
  Bun bundling with the Deno **`denoResolverPlugin`** behavior.
- **`package.json`**: Add **`overrides`** for **`preact`** and
  **`preact-render-to-string`** to reduce duplicate Preact copies and SSR/SSG
  hook context issues (e.g. **`__H`**).

### Tests

- **Bun**: React / Preact **`tests/integration/**`** build scenarios validated
  against the updated resolver chain.

---

## [3.3.6] - 2026-04-17

### Changed

- **`createServerResponse().json()`** (`src/types/context.ts`): Response body is
  always **`{ success: boolean, data: unknown }`**; **`success`** follows HTTP
  status (2xx → **`true`**). Aligns with **`@dreamer/server`** 1.1.2.
- **Dependencies**: Bump **`@dreamer/server`** to **`^1.1.2`** (JSR).
  **`deno.json`** and **`package.json`** updated.

### Tests

- **`tests/unit/context.test.ts`**: Covers wrapped JSON and non-2xx
  **`success: false`**.

---

## [3.3.5] - 2026-04-17

### Changed

- **Dependencies**: Bump **`@dreamer/server`** to **`^1.1.1`** (JSR).
  Re-exported **`ApiContext` / `ApiRouteContext`** now include optional
  **`body`** (JSON pre-parsed by **`RouterAdapter`** for file-route API
  handlers). `deno.json` and `package.json` updated.

---

## [3.3.4] - 2026-04-17

### Breaking changes

- **`LoadContext`**: Renamed **`request` → `req`** and **`response` → `res`**
  (aligned with `@dreamer/server` file-route API naming). Update `load()`
  handlers and any code reading the old property names.
- **`createLoadContext`**: Options renamed **`request` → `req`**, **`response` →
  `res`**.
- **`ApiContext` / `ApiRouteContext`**: Re-exported from **`@dreamer/server`**
  (same types as **`RouterAdapter`**); **`ApiContext`** is no longer a
  **`LoadContext`** alias — file-route handlers use **`res`** as required on the
  server type.

### Changed

- **Rendering** (`render-ssr`, `render-hybrid`, `render-csr`) and
  **`load-data-middleware`**: Build **`LoadContext`** with **`req` / `res`**.
- **Dependencies**: Bump **`@dreamer/router`** to **`^1.1.4`** and
  **`@dreamer/server`** to **`^1.1.0`** (JSR). `deno.json` and `package.json`
  updated.

### Tests

- **`tests/unit/context.test.ts`**: Updated for
  **`createLoadContext({ req, … })`**.

---

## [3.3.3] - 2026-04-17

### Changed

- **Dependencies**: Bump `@dreamer/plugins` to `^1.1.0` (JSR; scheduled and
  queue plugins, etc.). `deno.json` and `package.json` dependency tables updated
  accordingly.

### Documentation

- **APP_CONFIG** (en-US / zh-CN): Document optional cron/scheduled jobs via
  `scheduledPlugin` in `plugins`; clarify that root `logger` is `LoggerConfig`
  for the whole application.

---

## [3.3.2] - 2026-04-17

### Changed

- **Dependencies**: Bump JSR pins — `@dreamer/config` to `^1.0.3` (layered
  `.env` merge behavior, root re-exports for `getEnv` / `setEnv` / `hasEnv` /
  `deleteEnv`, import-time `preloadDotEnvSync(["."])` from cwd),
  `@dreamer/database` to `^1.0.9` (MongoDB: default `directConnection` when
  `replicaSet` is set and `directConnection` is omitted). `deno.json` and
  `package.json` dependency tables updated accordingly.

---

## [3.3.1] - 2026-04-07

### Changed

- **Dependencies**: Bump `@dreamer/server` to `^1.0.11` (JSR) for HMR client
  fixes (reuse `#__hmr-status-container` on WebSocket reconnect, dedupe
  containers) and server hot-path performance tweaks (`Http`, dev watch ignore
  preprocessing, HMR message merge).

---

## [3.3.0] - 2026-04-07

### Breaking changes

- **`AppConfig.render.compiler` removed:** The View-only
  **`RenderCompilerOptions`** shape (`{ dirs, client?, server? }`) and the
  **`resolveRenderCompilerForClient` / `resolveRenderCompilerForServer`**
  helpers are gone. dweb no longer runs **`compileSource`** inside its own
  esbuild client plugin or a parallel SSR bundle for `.tsx` routes.
- **Deleted modules:** **`src/utils/view-compiler.ts`**,
  **`src/feature/view-tsx-compile-plugin.ts`**, and the real implementation of
  **`loadViewRouteModuleViaSsrBundle`** ( **`view-ssr-route-bundle.ts`** is now
  a thin stub: cache reset / shutdown hooks only). **`src/utils/mod.ts`** no
  longer re-exports **`view-compiler`**.
- **Route loading:** **`loadRouteModule`** always uses native dynamic
  **`import`** for `.ts` / `.tsx` / `.js` / `.jsx` (including View), with the
  existing CSS side-effect stripping path unchanged. Call sites in **`app.ts`**,
  **`render-csr.ts`**, **`render-hybrid.ts`**, **`render-ssr.ts`**, and
  **`load-data-middleware.ts`** no longer pass a **`compiler`** option.
- **Client bundle plugins:**
  **`createDwebClientBundlePlugins(engine,
  routesDirPath)`** no longer accepts
  a third **`options.compiler`** argument. All engines get
  **`createStripLoadPlugin`** only (strip **`load`** from route modules for the
  browser). **`runBuildWithBuilder`** updated accordingly.

### Changed

- **View + JSR subpaths in generated `_client.dep.tsx`:** Client code now
  imports **`createSignal`**, **`mount`**, and **`Signal`** from the root
  **`@dreamer/view`** package only. Imports such as **`@dreamer/view/hybrid`** /
  **`@dreamer/view/csr`** are removed so esbuild resolves against published
  **`exports`** (fixes “Could not resolve `@dreamer/view/hybrid`” for init /
  JSR-only apps).
- **View root mount API:** **`_viewEnsureReactiveRoot`** uses
  **`mount(() => () => …, host)`** (function child + **`insert`** semantics)
  instead of **`mount(selector, (el) => insert(el, …))`**, matching **View
  2.x**. Generated client state uses **`Signal<_ViewStateRoot>`** instead of
  **`SignalRef`** in comments/types where applicable.
- **Dev HMR (`csr-client-builder.ts` + `server.ts`):** Rebuild results can carry
  **`routeChunkUrls`** (map from route **`componentPath`** to chunk URL). The
  injected **`__HMR_REFRESH__`** callback accepts
  **`{ chunkUrl?, routeChunkUrls?
  }`**. When a shared file under **`src/`**
  (but outside **`routes/`**) changes and there is no single **`chunkUrl`**, the
  client tries **`routeChunkUrls[currentRoute.component]`** before falling back
  to a full reload. **`ClientBuildResult`** documents **`routeChunkUrls`**.
- **Noise reduction:** **`isNonRouteSrcUnderAppSrc`** avoids spurious warnings
  when changed files live under **`src/`** but not under **`routes/`** (e.g.
  shared components, config).
- **dweb package `deno.json`:** **`compilerOptions.jsxImportSource`** is
  **`@dreamer/view`** (framework source uses View JSX).
- **`doDevBuild`:** Removed unused **`compilerRoots`** parameter (call chain
  simplified after compiler removal).

### Init (`dweb init`)

- **No root `jsx.d.ts`:** View projects no longer get a generated **`jsx.d.ts`**
  file; **`deno.json`** no longer sets **`compilerOptions.types`** to
  **`["./jsx.d.ts"]`**. TSX typing relies on **`@dreamer/view`** and
  **`jsxImportSource`**.
- **Bun `tsconfig.json` template:** **`include`** is **`["src/**/*"]`** only (no
  **`jsx.d.ts`** entry).
- **Config templates:** Removed **`render.compiler`** blocks and helpers
  (**`getInitViewCompilerObjectBlock`**, etc.) from **`config.ts`** /
  **`config-full.ts`**.

### Documentation & i18n

- **`docs/en-US/APP_CONFIG.md`** / **`docs/zh-CN/APP_CONFIG.md`:** Removed the
  **`render.compiler`** section and sample config; **`render`** row in the
  overview table updated.
- **Locale files:** Dropped **`renderCompiler*`** init comment keys and trimmed
  **`renderDesc`** (no compiler wording).

### Fixed

- **E2E (Deno):** `view-hybrid-flat` basic dev subprocess could exit before the
  counter/metadata browser tests; **`skipCounterAndMetadataOnLinux`** now also
  skips those two cases under **Deno** on any OS (Bun still runs them).
- **E2E:** **`tests/e2e/browser-render-utils.ts`** hardening
  (`ensureServerAlive`, dev spawn handling notes).

### Dependencies (`deno.json`)

- **`@dreamer/render`**: **`^1.1.4`**
- **`@dreamer/server`**: **`^1.0.10`**
- **`@dreamer/view`**: **`^2.0.0`**
- **`@dreamer/test`**: **`^1.1.3`** (tests; Bun suite nesting + browser cache +
  synthetic `afterAll` timeout fixes)

---

## [3.2.9] - 2026-03-27

### Changed

- **Dependencies (`deno.json` / `package.json`):** **`@dreamer/view`**
  **`^1.3.9`** (was **`^1.3.8`**), aligned with View [1.3.9] — single-argument
  **`createSignal`**, iterable **`const [get, set] = createSignal(x)`**, and
  related typing / **`<For>`** inference fixes.
- **Init template (`src/cmd/init/templates/components.ts`):** View home counter
  keeps **`createSignal(0)`** + **`count.value`**; JSDoc notes optional
  destructuring when desired.
- **Examples (View CSR / hybrid / hybrid-flat / SSR / SSG, basic + advanced):**
  **`deno.json`** and **`package.json`** import maps use **`@dreamer/view`
  `^1.3.9`**.

### Added

- **`tests/unit/init.test.ts`:** View **`generate()`** case asserts
  **`createSignal`** + **`.value`** in **`index.tsx`** and rejects tuple
  destructuring in the generated template (init default remains **SignalRef**
  style).

---

## [3.2.8] - 2026-03-27

### Changed

- **Dependencies (`deno.json` imports):** **`@dreamer/render`**,
  **`@dreamer/router`**, and **`@dreamer/view`** use **JSR** specifiers
  (**`^1.1.3`**, **`^1.1.3`**, **`^1.3.8`**) instead of monorepo-relative
  **`../render`** / **`../view`**. **`@dreamer/view`** has a **single** root
  mapping; subpaths (**`/ssr`**, **`/compiler`**, **`/jsx-runtime`**,
  **`/csr`**, **`/hybrid`**, etc.) resolve via the published package
  **`exports`**.
- **Dependencies (`package.json`):** Removed the erroneous **`@dreamer/dweb`:
  `file:../dweb`** entry. **`@dreamer/render`**, **`@dreamer/router`**, and
  **`@dreamer/view`** **`npm:@jsr/dreamer__*`** ranges match **`deno.json`**
  (**`^1.1.3`** / **`^1.1.3`** / **`^1.3.8`**).
- **`@dreamer/view` ^1.3.8:** Aligns with View [1.3.8] — **`view-cli init`**
  generated **`src/main.tsx`** uses **`mountWithRouter`** so SPA navigation
  updates page content; **`getRoot`** JSDoc in the init template is driven by
  locale keys.
- **`src/feature/csr-client-builder.ts` — `scanRouteComponents`:** File
  extension filter is **`.tsx` / `.jsx` only** (not **`.ts` / `.js`**). Only JSX
  pages are registered for the client lazy-load / **`_client.dep`** graph,
  aligned with **`@dreamer/router`** (non-**`api/`** **`.ts`/`.js`** under
  **`routes/`** are not pages). Utility **`.ts`** files are not treated as
  hydrateable route entries.

---

## [3.2.7] - 2026-03-23

### Changed

- **Dependencies:** **`@dreamer/router` ^1.1.2**, **`@dreamer/view` ^1.3.6** in
  root **`deno.json`**, **`package.json`**, and **all example `deno.json`**
  import maps (Preact/React/View CSR, hybrid, hybrid-flat, SSR, SSG — basic and
  advanced). Aligns with router client fixes (link intercept, bundle-path match
  skip) and View **`setIntrinsicDomAttribute`** / compileSource dynamic DOM
  props.

### Added

- **Router debug flag wired to the client (`config.router.debug`):** When
  **`router.debug`** is **`true`**, dweb injects
  **`globalThis.__DWEB_ROUTER_DEBUG__ = true`** (unless already set) in the
  inline bootstrap script so **`@dreamer/router/client`** can enable
  **`createRouter({ debug: true })`** without tying router logs to
  **`render.debug`** / **`__DWEB_DEBUG__`** (which mainly affects View/render
  verbosity).
- **`DwebGlobal` (`csr-client-builder.ts`):** documents
  **`__DWEB_ROUTER_DEBUG__`** and clarifies that **`__DWEB_DEBUG__`** comes from
  **`render.debug`**.
- **Client bootstrap (`csr-client-builder.ts`):** **`createRouter`** now uses
  **`debug: !!__DWEB_DEBUG__ || !!__DWEB_ROUTER_DEBUG__`** so either flag
  enables router client diagnostics (click intercept, skip reasons when debug is
  on).

### Changed (render / SSG)

- **`render-csr.ts`:** Reads **`config.router.debug`**, passes **`routerDebug`**
  into **`generateFallbackCSRHtml`**, and emits the **`__DWEB_ROUTER_DEBUG__`**
  line in both the normal CSR shell and the no-**`_app`** fallback HTML.
- **`render-hybrid.ts`:** Same injection in the hybrid hydration inline script
  next to existing dev **`__DWEB_DEBUG__`** / HMR flags.
- **`render-ssr.ts`:** Same injection in the SSR client config script alongside
  **`render.debug`** → **`__DWEB_DEBUG__`**.
- **`app.ts` (SSG static HTML):** Same injection in the generated client config
  script for static export pages so SSG + client hydration can debug router
  behavior consistently.

---

## [3.2.6] - 2026-03-23

### Changed

- **View (config shape):** **`render.compiler`** is **`RenderCompilerOptions`**
  — **`{ dirs: string[]; client?: boolean; server?: boolean }`**. Use a
  **non-empty `dirs`** list for compile roots (e.g. **`{ dirs: ["./src"] }`**);
  add more entries for monorepo / JSR packages when routes import `.tsx` outside
  the app tree. Omitting **`compiler`**, or **`dirs` empty**, disables
  jsx-compiler on that side’s resolution path. **`client`** / **`server`**
  control whether the **client bundle** vs **server route loading** uses the
  compiler (**omitted** or **`true`** means on, **`false`** means off — same as
  **`!== false`** in code). **CSR-only doc sites** may set **`server: false`**
  while keeping client compilation.
- **View:** **`createViewClientTsxPlugin`** no longer accepts **`appSrcRoot`**;
  it requires **`compileRoots`** (absolute roots derived from
  **`render.compiler`** via **`resolveRenderCompilerForClient`** in the
  framework).
- **View:** **`createDwebClientBundlePlugins`** accepts an optional third
  argument **`{ compiler?: string[] }`** (already **resolved** absolute roots).
  For View, an empty **`compiler`** registers only **`createStripLoadPlugin`**
  (no **`compileSource`**).
- **Dependencies:** **`@dreamer/esbuild` ^1.1.6**, **`@dreamer/view` ^1.3.5**
  (`deno.json`, `package.json`, and example import maps where applicable).
- **`render-hybrid.ts` / `render-ssr.ts` / `render-csr.ts`:** Resolve with
  **`resolveRenderCompilerForServer`** and pass
  **`renderCompilerRootsResolved`** into **`loadRouteModule`** (and
  error-boundary loads where applicable).
- **`build.ts` (production client):** Uses **`resolveRenderCompilerForClient`**
  before **`createDwebClientBundlePlugins`**.
- **`app.ts` (SSG):** Uses **`resolveRenderCompilerForServer`** when calling
  **`loadRouteModule`** for page/layout loading.
- **`csr-client-builder.ts`:** Uses **`resolveRenderCompilerForClient`** for dev
  client bundle roots.
- **Documentation:** **`docs/en-US/APP_CONFIG.md`** and
  **`docs/zh-CN/APP_CONFIG.md`** — **`render.compiler`** as
  **`RenderCompilerOptions`** (field table, **`client` / `server`**, monorepo
  example, **`server: false`** note).
- **`load-data-middleware.ts`:** Comments only — explicitly documents that the
  **`/__data`** path does **not** pass **`render.compiler`** (native module load
  for **`load()`** only); import order tidy.
- **Integration tests (`config-lifecycle.test.ts`):** Temp projects created
  under **`tests/data/`** with **`makeTempDir(..., { dir: dataParent })`**;
  comments on workspace vs esbuild Deno cache.

### Added

- **`src/types/app.ts`:** **`RenderCompilerOptions`** and
  **`AppConfig.render.compiler`** typed as that object.
- **`src/utils/view-compiler.ts`** (exported via **`src/utils/mod.ts`**):
  **`resolveRenderCompilerForClient`** / **`resolveRenderCompilerForServer`**
  apply **`client` / `server`** flags then normalize **`dirs`** to **absolute**
  paths (forward slashes); **`normalizeRenderCompiler(compiler, cwdPath?)`**
  normalizes **`dirs` only** (ignores flags — for tooling). Missing compiler or
  empty **`dirs`** yields **`undefined`**.
- **Hybrid hydration data:** **`globalThis.__DATA__.pathname`** — the request
  **pathname** (trailing slash stripped), aligned with **`location.pathname`**.
  Used so the client can decide whether to hydrate on **dynamic** URLs where
  **`match.route.path`** is still a **pattern** (e.g. `/user/:id` vs `/user/1`).
- **Client bootstrap (`csr-client-builder.ts`):** Hydration guard compares
  **`__DATA__.pathname ?? __DATA__.route`** to **`location.pathname`** instead
  of relying on **`route` alone**.
- **View `createViewClientTsxPlugin`:** **In-memory cache** inside a single
  esbuild **`setup`**: **`Map<SHA-256 hex, compiled source>`** where the key is
  **`pathNorm + insertImportPath + source after strip-load`** (via
  **`crypto.subtle.digest`**), avoiding repeated **`compileSource`** for
  identical inputs during one build / watch cycle.
- **View SSR route bundle (`view-ssr-route-bundle.ts`):**
  - **Disk cache file names** use a **content fingerprint** of the logical route
    file: raw `.tsx` if no CSS imports; otherwise **stripped TSX + sorted CSS
    file contents**, consistent with **`load-route-module`** CSS route caching.
  - **Exported helpers:** **`getViewSsrBundleDiskCacheDirs`**,
    **`clearViewSsrBundledModuleMemoryCache`**,
    **`removeViewSsrBundleDiskCacheDirs`**,
    **`resetViewSsrBundleShutdownInterruptFlag`**,
    **`consumeViewSsrBundleShutdownInterruptFlag`**.
  - **Graceful shutdown:** **`isLikelyEsbuildShutdownInterruption`** detects
    **`EPIPE`** / **`The service was stopped`** after **SIGINT** so teardown
    does not spam **ERROR** logs; **`loadRouteModule`** calls
    **`resetViewSsrBundleShutdownInterruptFlag`** at the start of each load.
- **`loadRouteModule`:** Optional **`compiler`** in the options object — when
  **`engine === "view"`**, **`.tsx`**, and **`compiler`** is non-empty, the View
  SSR bundle path is used; **`compileRoots`** is forwarded into
  **`loadViewRouteModuleViaSsrBundle`**.
- **Root `deno.json` `workspace`:** **`./tests/data/dweb-integration-*`** so
  integration temp projects satisfy Deno’s workspace membership rule.
- **`.gitignore`:** **`tests/data/dweb-integration-*/`** so integration temp
  dirs under `tests/data/` are not committed.
- **Init templates (`config.ts`, `config-full.ts`):** View engine emits
  **`compiler: { dirs: [...], client: true, server: true }`** with i18n line
  comments (**`getInitViewCompilerObjectBlock`** / commented variant for
  non-View); same default root convention as **`routesDir`** parent.
- **Examples:** **`view-hybrid/basic`** — Chart.js demo route using
  **`createEffect` / `onCleanup`**, **`getDocument()`**, and SPA-safe chart
  teardown; **`chart.js`** dependency; **`render.compiler`** as object in
  config; other examples’ **`deno.json` / `package.json`** aligned with
  dependency bumps.

### Fixed

- **Hybrid dynamic routes:** Hydration could be skipped when
  **`__DATA__.route`** was a **pattern** and **`location.pathname`** was a
  **concrete** URL; fixed by injecting and comparing **`pathname`**.

### Internationalization

- **Locale packs (`src/locales/*.json`):** Completed translations for remaining
  **log**, **CLI**, and **render-mode** strings across **de-DE**, **en-US**,
  **es-ES**, **fr-FR**, **id-ID**, **ja-JP**, **ko-KR**, **pt-BR**, **zh-CN**,
  **zh-TW**.
- **`init.comments`:** **`renderCompilerDesc`**,
  **`renderCompilerDirsComment`**, **`renderCompilerClientComment`**,
  **`renderCompilerServerComment`**, and updated **`renderCompilerExampleHint`**
  for the **`compiler` object** template; **ja-JP**, **ko-KR**, **de-DE**,
  **fr-FR**, **es-ES**, **pt-BR**, **id-ID** use full localized sentences (not
  English stubs).

---

## [3.2.5] - 2026-03-22

### Fixed

- **`view-ssr-route-bundle.ts`:** On bundle/import failure, call
  **`logger.error(message, data, error)`** with the caught value as the
  **third** argument (not the second). The second slot is **structured `data`**;
  passing an **`Error`** there was serialized as **`{}`**, hiding **message**
  and **stack**. **`console.error`** path now logs **`entry`** and
  **`diskPath`** alongside the error for consistency.

---

## [3.2.4] - 2026-03-22

### Changed

- **Dependencies:** @dreamer/view **^1.3.4** (mirrored in `package.json`,
  `deno.json`).
- **CSR client builder (`csr-client-builder.ts`):** View **`client.dep.tsx`**
  template imports **`SignalRef`** with **`insert`**; **`viewState`** is
  explicitly typed as **`SignalRef<_ViewStateRoot>`** so checkers do not treat
  **`createSignal`** as an iterable tuple (e.g. **TS2488**). Embedded **`__data`
  / CSR / HMR** route snippets use **`const`**/**`let`** instead of **`var`**
  and arrow callbacks where appropriate for **deno lint** (**no-var**,
  **no-inner-declarations**). **`setupHydrationRouterAndHmr`** omits unused
  **`engine`** from destructuring when the generated client is View-only;
  **`DOMContentLoaded`** waits via **`globalThis.addEventListener`**; the View
  hybrid bootstrap line **`else if (!_viewReactiveRoot)`** is emitted only for
  the View engine; HMR **`.then`** uses **`async`** only for non-View engines.

---

## [3.2.3] - 2026-03-22

### Added

- **View engine: esbuild + jsx-compiler for app TSX on server and client.**
  `view-tsx-compile-plugin.ts` (`createViewClientTsxPlugin`) runs
  `compileSource` for `.tsx` under the app `src` tree (with `stripLoadInRoutes`
  for client bundles). `view-ssr-route-bundle.ts`
  (`loadViewRouteModuleViaSsrBundle`) bundles View route `.tsx` for dynamic
  import so SSR/SSG/`load()` match client JSX semantics. **`loadRouteModule`**
  accepts **`routesDirPath`** and uses this path when **`engine === "view"`**
  and the file is **`.tsx`**.
- **User-level per-project cache helpers:** `getDreamerProjectDirCacheSegment`
  and `getDreamerProjectCacheRoot` in **`cache-dirs.ts`**
  (`~/.dreamer/<project>/`) for other features (e.g. build dirs). **View SSR
  route bundle** disk output uses **`<cwd>/runtime/cache/bundle-out`** and
  **`<cwd>/runtime/cache/bundle-cache`** so dynamic `import` resolves
  **external** deps from the project (Bun-compatible).
- **CSR client builder:**
  **`createDwebClientBundlePlugins(engine, routesDirPath)`** registers the View
  compile plugin or **`createStripLoadPlugin`** for React/Preact.

### Changed

- **Dependencies:** @dreamer/esbuild **^1.1.5**, @dreamer/router **^1.1.1**,
  @dreamer/view **^1.3.3** (mirrored in `package.json`).
- **View SSR route bundle disk cache:** Writes under **`<cwd>/runtime/cache/`**
  (`bundle-out`, `bundle-cache`) instead of **`~/.dreamer/`** or **`.dweb/`**,
  so Bun resolves **external** imports from the project.
- **App (SSG) and load-data middleware:** Pass **`engine`** and resolved
  **`routesDir`** into **`loadRouteModule`** so View SSG and route **`load`**
  use the new pipeline.
- **Server / HMR:** **`clearViewSsrBundleCacheForPath`** on file change, with
  CSS route cache clearing.
- **Init templates (`components.ts`):** View samples use **SignalRef** (`.value`
  / `{count}`).
- **Basic examples:** Counter sections use **`data-testid="e2e-counter"`** and
  **`data-counter-value`**; View examples use SignalRef consistently.
- **E2E `browser-render-utils`:** Counter detection prefers
  **`data-counter-value`** with **`count: N`** text fallback.

### Fixed

- **view-ssg basic example:** Increment button no longer used invalid
  **`setCount(count() + 1)`**; updates **`count.value`** correctly.

---

## [3.2.2] - 2026-03-21

### Changed

- **GitHub Actions**: Workflow-level
  `env.FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` in `ci.yml`, `publish.yml`, and
  `block-legacy-merge.yml` so Node-based actions use the Node 24 runtime early.
  Bun jobs keep `oven-sh/setup-bun@v2`.

---

## [3.2.1] - 2026-03-21

### Changed

- **`src/cmd/init/templates/deno-json.ts`:** For **View** engine, the generated
  project `deno.json` **imports** block only adds **`@dreamer/view`** (single
  JSR line built from `viewSpec`); removed extra rows for `/csr`, `/hybrid`,
  `/jsx-runtime`, `/compiler`, etc.
- **`src/cmd/init/templates/components.ts`:** When **engine === "view"**,
  generated **App**, **Layout**, **About**, and **user detail** route templates
  use the **`class`** attribute instead of **`className`** for HTML elements;
  **`getUserByIdTsx`** now takes **`opts`** so it can branch on engine like
  other templates.
- **`src/feature/csr-client-builder.ts`:** **View + CSR** generated
  **`client.dep.tsx`** now imports **`insert`** from **`@dreamer/view`** next to
  **`createSignal` / `mount`** from **`@dreamer/view/csr`** (aligned with View
  v1.3 **mount fn + insert**). Module docs updated: **hybrid / SSR / SSG**
  client paths use **`@dreamer/render/client/view-hybrid`** and describe
  **`mount` + `insert`** on the container.

---

## [3.2.0] - 2026-03-19

### Changed

- **View engine: single data-view-dynamic layer.** Generated client no longer
  wraps the root in a `_viewStateRoot` getter; the root effect now returns the
  layout + page tree directly with only `_viewPageContent` as a getter. This
  produces a single `data-view-dynamic` wrapper for page content instead of two
  nested layers.

---

## [3.1.13] - 2026-03-19

### Changed

- **View engine: split layout and page content into two getter layers.**
  Generated client now uses `_viewPageContent` in addition to `_viewStateRoot`:
  layouts are built in `_viewStateRoot`'s getter, and only the page body is
  built in `_viewPageContent`'s getter. When page-level state (e.g. Segmented
  `value()`) changes, only the page-content effect re-runs, so only that layer's
  `data-view-dynamic` updates instead of the whole tree.

---

## [3.1.12] - 2026-03-19

### Changed

- **View engine: avoid whole-tree re-render on page state change.** Generated
  client now uses a `_viewStateRoot` wrapper: the root effect only reads
  `getViewState()` and renders this wrapper; the full page tree (layouts + page)
  is built inside the wrapper’s getter. Page-level state (e.g. component
  signals) is only read when that getter runs, so updating it re-runs only that
  effect and no longer triggers a full tree re-render (no more flashing of all
  `data-view-dynamic` nodes when interacting with controls like Segmented).

---

## [3.1.11] - 2026-03-15

### Added

- **zh-TW (Traditional Chinese) locale:** New `zh-TW.json` and support in
  `SUPPORTED_APP_LANGUAGES`, `SUPPORTED_LOCALES`, and `LOCALE_DATA` for
  Traditional Chinese.
- **Init template comments and i18n:** Init templates (`config-full.ts`,
  `config.ts`) now include detailed comments for options; all locale files
  (zh-CN, en-US, ja-JP, etc.) include `init.comments` i18n keys for config
  generation.

### Changed

- **Dependencies:** Bump @dreamer/view to ^1.1.6.

---

## [3.1.10] - 2026-03-15

### Fixed

- **Hydrate / CSR only when route matches URL:** Generated client runs hydrate
  (Hybrid/SSR/SSG) only when `__DATA__.route` equals the current pathname; CSR
  first-screen render already used `__DATA__` only when `__DATA__.route` matched
  the current route (`__use` check). Fixes direct navigation to nested routes
  (e.g. `/desktop`) where the sidebar did not appear until refresh.
- **onRouteChange uses current route layouts:** Client navigation now loads
  layouts via `loadLayouts(match)` for the target route instead of the initial
  route. Fixes the desktop sidebar persisting when navigating back to the
  homepage.
- **HMR chunk matching for multi-segment routes:**
  `getChunkFileNameForComponent` now prefers full path match (e.g.
  `desktop-basic-button`) and only allows first-segment match for two-segment
  paths (e.g. `desktop/index`). Fixes hot reload on `/desktop/basic/button`
  incorrectly rendering `/desktop/index` after editing `button.tsx`.

### Added

- **Generated _client.dep.tsx:** `DwebGlobal.__DATA__` now includes
  `layoutData?: unknown[]`; layout arrays are typed as `LayoutComponent[]` with
  proper props cast for type-checking.

---

## [3.1.9] - 2026-03-14

### Changed

- **Dependencies**: Bumped @dreamer/render to ^1.1.1 and @dreamer/view to ^1.1.4
  in root and all examples (preact/react/view CSR, SSR, SSG, hybrid,
  hybrid-flat) for compatibility with render v1.1.1 and view v1.1.4.

---

## [3.1.8] - 2026-03-14

### Changed

- **Init templates (logger):** Generated config uses
  `logger.output.console: "auto"` and no longer includes `auto: true`.
- **Init templates (format):** Config template objects in `config-full.ts` and
  `config.ts` are now formatted in multi-line style (e.g. `server.dev.hmr`,
  `logger.output`, database/socket/session comments, redirects, plugins,
  middlewares).

---

## [3.1.7] - 2026-03-14

### Changed

- **Strip-load plugin in separate module:** The client build plugin that strips
  route `load` exports is now in `src/feature/strip-load-plugin.ts`. Exports
  `createStripLoadPlugin(routesDirPath)` and `stripLoadExport(source)` for
  easier debugging and reuse.
- **Full build uses strip-load plugin:** `runBuildWithBuilder` now passes
  `plugins: [createStripLoadPlugin(routesDirPath)]` in the client config so that
  `deno run src/main.ts --build` (and Builder-based builds) also strip `load`
  from route modules in the client bundle, avoiding `node:*` and other
  server-only deps in browser chunks.

---

## [3.1.6] - 2026-03-13

### Added

- **Client bundle strip of route `load`:** CSR client build uses an esbuild
  plugin that removes the `load` export (and its body) from route modules before
  bundling, so server-only dependencies (e.g. `@dreamer/runtime-adapter`,
  `node:*`) used only inside `load()` are not included in browser chunks.
- **Strip supports `export const load = ...`:** The strip logic now also removes
  `export const load = () => { }`, `export const load = async () => { }`, and
  `export const load = function (...) { }` / `async function (...) { }` forms,
  in addition to `export function load(...)` and
  `export async function load(...)`.

### Fixed

- **stripLoadExport brace matching:** Function body is found by skipping the
  parameter list `(...)` then counting all `{` and `}` so nested braces (e.g.
  `return Promise.resolve({ ... });`) are handled correctly; this fixes
  "Unexpected }" and "Expected identifier" errors when building the client
  bundle for routes that use `load()`.

---

## [3.1.5] - 2026-03-13

### Added

- **Layout and page `load()` support:** Layout and page route modules can export
  a `load(context)` function. The return value is passed to components as
  `props.data` (layout: `layouts[i].props.data`, page: `pageProps.data`).
  Supported in SSR, hybrid, and CSR modes. No longer flattened into other props.
- **Hydration and client-side navigation:** `hydrationData.layoutData` is
  included in the initial HTML so layout `data` is available after hydrate.
  Client-side navigation requests `/_dweb_data` for the new path; the response
  includes `layoutData` for the layout chain, which is merged so layout
  components receive `data` on route change (e.g. clicking a link) without a
  full reload.
- **CSR first-screen layout data:** For CSR mode, layout load results from
  `__DATA__._layoutData` are merged so the first paint has correct layout
  `data`; the initial router `onRouteChange` is skipped to avoid double render.
- **React/Preact CSR loading overlay:** After the first CSR render (non-View
  engine), `__DWEB_ON_READY__` is invoked so the loading overlay can be removed
  and e2e “click about” tests no longer time out.
- **Load-data middleware:** The `/_dweb_data` endpoint (handled by
  load-data-middleware) runs each layout’s `load()` for the current path and
  returns `layoutData` in the JSON body for client navigation.
- **Public exports:** `LoadContext` and `ApiContext` are exported from
  `@dreamer/dweb` for use in route modules (e.g. typing `load` parameters).
- **E2E load-data assertion:** New helper `assertLoadDataInjected(t, port)`
  visits the home page, waits for content and for `[data-testid="layout-load"]`
  and `[data-testid="page-load"]` to have `data-value` equal to `layout-load-ok`
  and `page-load-ok`. `createBasicExampleBrowserSuite` accepts an optional
  `assertLoadData: true` to add a test case that runs this assertion.
- **Examples (CSR and hybrid basic):** All basic examples that use CSR or hybrid
  (view-csr, view-hybrid, view-hybrid-flat, react-csr, react-hybrid,
  react-hybrid-flat, preact-csr, preact-hybrid, preact-hybrid-flat) now define
  `load()` in `_layout` and index returning `layoutLoadMarker` /
  `pageLoadMarker` and render
  `<span data-testid="layout-load" data-value={...} />` and
  `<span data-testid="page-load" data-value={...} />` for e2e. Their e2e suites
  pass `{ assertLoadData: true }` so the “应能注入 layout 与页面 load 数据” test
  runs.

### Changed

- **Examples:** All `load()` functions in the above CSR/hybrid basic examples
  now return `Promise.resolve(...)` instead of
  `async function load(...) { return
  { ... }; }` to satisfy the Deno lint rule
  `require-await` (no unnecessary async).

### Fixed

- **E2E (Linux Deno):** Skip counter and metadata tests for view-hybrid-flat
  basic on Linux to avoid flaky failures when the dev process exits mid-suite
  (connection reset/refused). Option `skipCounterAndMetadataOnLinux: true` in
  `createBasicExampleBrowserSuite`.

### Changed

- **CI:** Upgrade to `actions/checkout@v5`, `denoland/setup-deno@v2`,
  `oven-sh/setup-bun@v2.1.3` for Node 24 readiness.

---

## [3.1.4] - 2026-03-13

### Fixed

- **Generated client (_client.dep.tsx):** Resolved TypeScript errors in
  generated code when using View engine and strict type checking.
  `loadLayouts(match)` now accepts `match` with optional `route.path` and uses a
  safe path key for layout lookup. `DwebGlobal.__DATA__` type in the generated
  file now includes `route?: string` so `__d.route` is valid. HMR CSS update
  uses `(el as HTMLLinkElement).href` when the element is a link. CSR initial
  props snippet uses optional chaining for `__d` and `__d.route` / `__d.page` to
  avoid "possibly undefined" and missing property errors.

### Changed

- **Examples:** Aligned all 30 example projects’ dependencies with
  dweb/deno.json: @dreamer/database ^1.0.8, @dreamer/logger ^1.0.3,
  @dreamer/middlewares ^1.0.4, @dreamer/plugins ^1.0.9, @dreamer/render ^1.1.0,
  @dreamer/router ^1.1.0, @dreamer/view ^1.1.3, and preact-render-to-string
  6.2.0 where used.
- **CI:** GitHub Actions Node.js 20 deprecation warning removed: set
  `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` and upgraded `actions/checkout`
  from v3 to v4.

---

## [3.1.3] - 2026-03-13

### Fixed

- **View (generated client):** Always call `unmountPrevious()` on route change
  in generated `_client.dep.tsx`. Previously the reactive root was only
  unmounted when it did not exist, so in-place patch could leave DOM from the
  previous page (e.g. bonus detail list) visible on the new page. Now each
  navigation unmounts then mounts, avoiding cross-page DOM leakage.

---

## [3.1.2] - 2026-03-12

### Changed

- **Dependencies**: Bumped @dreamer/render to ^1.1.0 and @dreamer/view to ^1.1.3
  for compatibility with view dynamic-child single-node optimization and render
  1.1.x.

---

## [3.1.1] - 2026-03-11

### Fixed

- **SSR/CSR/Hybrid:** Use optional chaining for `router.getLayoutPathsForPath`
  in render-ssr, render-hybrid, and render-csr. When the method is missing (e.g.
  unit test mocks or older @dreamer/router), layout paths default to `[]`
  instead of throwing, so the renderer correctly returns `null` when
  `loadRouteModule` returns null (path outside project) or when pageModule has
  no default/Page export (fixes CI test failures).

---

## [3.1.0] - 2026-03-11

### Fixed

- **HMR:** Multi-segment routes (e.g. `admin/index`, `bgb-x-admin/index`) now
  resolve to the correct chunk instead of the root index. Chunk matching prefers
  path-style keys and first-segment names (e.g. `bgb-x-admin-XXX.js`) when
  esbuild emits them.
- **HMR:** Client accepts chunk URL with path (e.g.
  `/routes/admin/index-XXX.js`) via `chunkFullBase` and
  `comp.startsWith(chunkBaseFromUrl + "/")`, so the correct chunk is loaded
  without full page reload.
- **HMR:** When no matching chunk URL is available, fall back to full page
  reload so updated code is still applied.

---

## [3.0.95] - 2026-02-25

### Changed

- **Init:** Directory existence check and overwrite confirm now run inside
  `generate()` before any `ensureDir(targetDir)`. The project directory is
  created only after validation (and user confirmation if it already exists); no
  directory is created before this check.

---

## [3.0.94] - 2026-02-25

### Changed

- **Init:** Project directory is created only after parameter selection and
  version fetch complete. Previously the directory was created at the start of
  `generate()`; now version fetch runs first (no directory creation), then
  `ensureDir(targetDir)` runs so validation ("directory exists" in `main()`) is
  not affected by an early-created directory.

---

## [3.0.93] - 2026-02-25

### Fixed

- **module-cache (Windows):** Path normalization for `getModuleVersion()` /
  `invalidateModule()` so `file://` URLs and Windows paths (`D:\path`,
  `D:/path`) resolve to the same cache key. On Windows, path input is normalized
  via `pathToFileUrl()` so `pathToFileUrl(testPath)` and `testPath` look up the
  same entry; drive letter is normalized to uppercase. On non-Windows, synthetic
  Windows-style paths (e.g. in tests) are normalized without `pathToFileUrl` so
  cross-platform tests pass.

### Changed

- **E2E:** afterAll now kills the dev process first (SIGKILL, no await), then
  runs `cleanupAllBrowsers()`, to avoid Bun treating the process as "dangling"
  when afterAll times out and to reduce "browser close timeout" / afterAll
  timeout failures.
- **E2E:** Removed `unref()` on e2e dev server child processes so Bun does not
  kill them as dangling when another suite times out.
- **E2E:** Browser test timeout reduced from 90s to 30s per test.
- **CI (Bun Linux/macOS):** E2E tests run per file (one process per
  `tests/e2e/*.test.ts`) to reduce afterAll and browser cleanup interference
  between suites.
- **CI (Bun Windows):** Only unit tests run; e2e and integration are skipped on
  Windows Bun due to dev server often not becoming ready in time and browser e2e
  instability on Windows runners (aligned with @dreamer/view; Deno test-windows
  still runs full tests including e2e). Removed "Install Playwright Chromium"
  step (Windows does not run e2e).
- **Dependencies:** Bumped @dreamer/logger to ^1.0.3, @dreamer/middlewares to
  ^1.0.4, @dreamer/plugins to ^1.0.8, @dreamer/render to ^1.0.41, @dreamer/view
  to ^1.1.2. All examples updated accordingly.
- **Init template:** i18n-ally `usageMatchRegex` in
  `.vscode/i18n-ally-custom-framework.yml` template fixed (quote escape
  sequences for `$t`/`$tr` key matching).

---

## [3.0.92] - 2026-02-24

### Changed

- **Init (Bun):** `tsconfig.json` template now includes
  `allowImportingTsExtensions: true` and `include: ["src/**/*", "jsx.d.ts"]` for
  view engine JSX types.

---

## [3.0.91] - 2026-02-24

### Changed

- **Init:** Removed leading newline before the runtime selection menu prompt
  (Deno/Bun) for a cleaner CLI output.
- **Dependencies:** Bumped `@dreamer/esbuild` to ^1.0.38 in CLI template and all
  examples (includes Bun server build fix for `@dreamer/plugins/*` resolution).

---

## [3.0.90] - 2026-02-24

### Added

- **CLI setup:** Install success message now shows the installed version (e.g.
  "dweb-cli v3.0.90 installed"); new i18n key `installSuccessWithVersion` in all
  locales.

### Changed

- **CI:** JSR publish workflow no longer uses `--no-check`; publish step runs
  full type check.

---

## [3.0.89] - 2026-02-24

### Added

- **Init:** Runtime choice (Deno or Bun) as the first step; then app mode
  (single/multi). Deno projects get only `deno.json`; Bun projects get
  `package.json`, `.npmrc`, and `tsconfig.json`. Dockerfile and docker-compose
  generated per runtime (Deno: denoland/deno, Bun: oven/bun; no env var in
  compose).
- **Init (Bun):** `tsconfig.json` with `module: "NodeNext"`,
  `moduleResolution: "nodenext"`, `lib: ["ESNext","DOM","DOM.Iterable"]`,
  `resolveJsonModule`, `isolatedModules`, `include: ["src/**/*"]`,
  `exclude: ["node_modules","dist"]`; `jsxImportSource` follows selected engine
  (preact/react/view).
- **Init (Bun):** `build.server.external` in config when runtime is Bun (by
  engine + style: tailwind adds tailwindcss/lightningcss; preact/react add
  engine packages). Single-app in `config/main.ts`, multi-app in
  `common/config/main.ts`.
- **Init:** `.vscode/settings.json` generated by runtime: Deno keeps
  `deno.enable`/`deno.lint` and Deno formatter; Bun uses built-in TypeScript
  formatter and excludes `.bun` (no Deno config).
- **Init:** `.vscode/i18n-ally-custom-framework.yml` generated (no comments) for
  `$t`/`$tr` recognition; `i18n-ally.enabledFrameworks` set to
  `["react","i18next","general","custom"]`.
- **Errors / Hybrid:** New i18n keys for hybrid render:
  `errors.hybridNeedAppComponent`, `errors.hybridAppLoadFailed`,
  `errors.hybridAppNotFound`, `errors.hybridMountContainerRequired`; and for
  entry: `errors.entryPathInvalidReasonServerEntryNotFound`,
  `errors.entryPathInvalidHintServerEntry`.

### Changed

- **Init:** Runtime menu has a blank line above the title. Removed
  `DENO_ENV`/`BUN_ENV` from docker-compose service block.
- **Init (Bun):** `package.json` scripts use `bun run` (e.g.
  `bun run src/main.ts`, `bun run dist/server.js`). Dockerfile comments use i18n
  key `dockerBaseStageBun`; WORKDIR comment uses `dockerWorkDirMountBun` (bun
  run build on host).
- **Bun compatibility:** This release includes several changes for Bun
  runtime/build compatibility. All example projects now set
  `build.server.external: ["tailwindcss", "lightningcss"]` (single-app in
  `config/main.ts` or entry `main.ts`, multi-app in `common/config/main.ts`) to
  avoid Bun `buildWithBun` bundling lightningcss (with native
  `require('../pkg')`) errors.
- **i18n:** Framework i18n no longer uses global `$t`. All internal usage now
  imports and uses `$tr` from `utils/i18n.ts`. Init runs via top-level await on
  first module load; locale order: `setDwebLocale()` &gt; project `language`
  &gt; env &gt; default. `setDwebLocale` can be called before init or after
  (updates instance).
- **View / CSR client:** View engine adapter is chosen by render mode: CSR uses
  `@dreamer/render/client/view-csr`, hybrid/SSR/SSG use
  `@dreamer/render/client/view-hybrid` (with hydrate). Client dep generation and
  hybrid init block updated accordingly.
- **Dependencies:** Bumped @dreamer/* deps (e.g. render ^1.0.39, view ^1.0.31,
  runtime-adapter ^1.0.17, server ^1.0.9, and others). Workspace glob set to
  `./examples/*/*`.
- **Init:** Config and template tweaks (config-full, config, components, docker,
  main, static).

### Removed

- **i18n:** Removed global `$t` export and `src/types/i18n.d.ts`. Use `$tr` from
  `utils/i18n.ts` (or re-export from `mod.ts`).
- **Locales:** Dropped unused keys (e.g. `log.database.*`, `log.validation.*`)
  from locale JSON files.
- **Tests:** Removed monolithic `tests/e2e/browser-render.test.ts` (replaced by
  per-render e2e tests where applicable).

---

## [3.0.88] - 2026-02-18

### Changed

- **Dependencies and examples:** Updated example `deno.json` configs and
  dependencies; adjusted build, features (database, socket-io, websocket,
  csr-client-builder, build-dirs, version), and tests (e2e, unit) for CI.

---

## [3.0.87] - 2026-02-17

### Added

- **SSG:** Support query-style dynamic routes (e.g. `/user?id=[id]`) in addition
  to path segments; production serving and hydration use `routeToFilePath` /
  `filePathToRoute` from @dreamer/render.
- **Init:** Config and TSX template comments are i18n; generated comments follow
  init locale (en/zh). New keys in `init.comments` and `init.template`.

### Changed

- **Upgrade:** `main()` returns exit code (0/1) instead of calling `exit()`; CLI
  layer calls `exit(code)` so tests do not hit "attempted to exit".
- **Init:** dynamicRoutes template comments now state both path-segment and
  query form are supported.

### Removed

- **Test:** Removed two cmd-upgrade tests (spawn stdin null, setup install) to
  avoid exit-code and resource-leak failures.

---

## [3.0.86] - 2026-02-17

### Fixed

- **Setup:** Use `stdin: "null"` for deno install spawn so the child does not
  wait for terminal input; call `child.unref()` right after spawn so the setup
  process can exit. Entry point calls `exit(0)` when `installGlobalCli()`
  resolves so the process exits (Deno keeps refs otherwise).
- **Upgrade:** Spawn setup with `stdin: "null"`, call `child.unref()` after
  spawn, and call `exit(0)` on success / `exit(1)` on failure so the CLI process
  exits when the command finishes.

---

## [3.0.85] - 2026-02-17

### Fixed

- **Client /__data on same-page anchor**: Same-page anchor links
  (pathname+search unchanged, only hash changed) no longer trigger /__data
  requests. The router does not intercept such links, but the browser may fire
  popstate and still invoke onRouteChange; we now skip the __data request when
  pathname+search equals the last recorded path (`__DWEB_LAST_PATHNAME__`).

---

## [3.0.84] - 2026-02-17

### Changed

- **@dreamer/runtime-adapter**: Bumped to `^1.0.8` (SpawnedProcess.unref()).
  Upgrade command now calls `child.unref()` directly so the process exits after
  spawn (Deno no longer hangs).

---

## [3.0.83] - 2026-02-17

### Changed

- **Client /__data:** Do not request `/__data` for pathnames that align with
  router’s non-intercepted links: reserved path (/_*), data path itself, empty
  path, or invalid path (contains "//"). Reduces failed requests for anchor
  links and reserved URLs.

---

## [3.0.82] - 2026-02-17

### Changed

- **Dependencies:** Updated related dependency versions (e.g. @dreamer/render
  ^1.0.26, @dreamer/view ^1.0.15).

---

## [3.0.81] - 2026-02-17

### Changed

- **@dreamer/console**: Bumped dependency to `^1.0.7` (includes CLI exit fix and
  license/docs updates).

### Fixed

- **CLI process not exiting**: After `-v`/`--version` or `--help`, the CLI now
  exits with code 0 instead of hanging; relies on @dreamer/console@1.0.7
  behavior.

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
