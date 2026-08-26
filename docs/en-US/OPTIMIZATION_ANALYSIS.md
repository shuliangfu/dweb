# @dreamer/dweb Comprehensive Optimization Analysis

> **Bottom line: yes — dweb can and should keep evolving.**\
> It is already a full-stack framework (multi-engine × multi-render mode × CLI ×
> plugins/middleware × realtime) with a broad test surface.\
> **Next gains** come mainly from: build-pipeline maintainability (especially
> `csr-client-builder`), aligning **@dreamer/view**, production defaults
> (security/compression), SSR streaming and observability — not another parallel
> API surface.

| Item            | Value                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| Subject         | `@dreamer/dweb` **3.5.11** (`dweb/src/`)                                                             |
| Date            | **2026-07-10**                                                                                       |
| Source size     | ~**21k** lines under `src/**/*.ts`; largest file `csr-client-builder.ts` ~**2600** lines             |
| View dependency | `jsr:@dreamer/view@^2.0.5` (aligned with view 2.0.5; minimum ≥ 2.0.4)                                |
| Related doc     | [FRAMEWORK_ANALYSIS.md](./FRAMEWORK_ANALYSIS.md) (gaps & product extensions)                         |
| Tests           | Historical report ~**865** passed (3.4.2 / 2026-04); re-run `deno test -A tests` for current numbers |

This document focuses on **architecture evolvability, performance, engineering
debt, and upgrade priority**. It complements `FRAMEWORK_ANALYSIS.md`.\
Chinese: [../zh-CN/OPTIMIZATION_ANALYSIS.md](../zh-CN/OPTIMIZATION_ANALYSIS.md).

> **Update (2026-07-22):** Full roadmap (view 2.1, no Islands, Console boundary,
> and **unified `dweb-cli test` launcher + `@dreamer/test`** (analysis + L1
> status) — not a third test engine; **§7.4.10 test report demand** json/html/md
> planned only) lives in Chinese:\
> [../zh-CN/全面分析-优化与增强.md](../zh-CN/全面分析-优化与增强.md) §7.4 /
> §7.4.10.

---

## 1. Architecture snapshot

```
┌──────────────────────────────────────────────────────────────┐
│  CLI (init / dev / build / start / generate / db / upgrade)  │
├──────────────────────────────────────────────────────────────┤
│  core/: App · config · service · middleware · plugin · DB    │
├──────────────────────────────────────────────────────────────┤
│  feature/: router · render-{ssr,csr,ssg,hybrid} · build      │
│            csr-client-builder · load-data · module-cache     │
│            socket-io · websocket                             │
├──────────────────────────────────────────────────────────────┤
│  @dreamer/*: server · router · render · esbuild · session …  │
│  Engines: view (recommended) | preact | react                │
└──────────────────────────────────────────────────────────────┘
```

| Layer        | Key paths                                     | Role                                                 |
| ------------ | --------------------------------------------- | ---------------------------------------------------- |
| App kernel   | `core/app.ts` (~1500 LOC)                     | Lifecycle, middleware stack, plugins, start/stop     |
| Config       | `core/config.ts` (~900 LOC)                   | Deep merge, validation, multi-root inference         |
| Client build | `feature/csr-client-builder.ts` (**largest**) | esbuild entry, HMR, chunk index, multi-engine client |
| Render       | `feature/render-*.ts`                         | SSR/CSR/SSG/Hybrid HTML paths                        |
| Data         | `load-data-middleware` + route `load()`       | Server data; CSR via `/_dweb_data`                   |
| Module HMR   | `module-cache.ts`                             | Import cache-bust, LRU                               |
| Utils        | `utils/*`                                     | Path, security, error codes, i18n, versions          |

**Positioning**: Next/Remix-class **Deno/Bun full-stack framework** unifying
routing, render, build, plugins, session, and realtime.

---

## 2. What is already strong

1. **Engine × mode matrix** — View / Preact / React × SSR / CSR / SSG / Hybrid
   (+ hybrid-flat); large examples tree.
2. **File routes + `load()`** — CSR/Hybrid need no hand-rolled data APIs;
   `/_dweb_data` shares server `load()`.
3. **runtime-adapter** — FS/env/path via adapter (Deno + Bun).
4. **DX** — HMR, chunk name matching, module-cache LRU, careful dev
   Cache-Control.
5. **Security base** — security headers middleware, sanitize, safe inline JSON,
   error codes.
6. **Tests** — unit / integration / multi-engine e2e.
7. **Subpath exports** — `./core/*`, `./feature/*` for selective imports.

**Verdict: product surface is complete enough; optimization is about quality
ceiling, build complexity, and production defaults.**

---

## 3. Can we still upgrade/optimize?

| Dimension                 | Room? | Urgency  | Notes                                            |
| ------------------------- | ----- | -------- | ------------------------------------------------ |
| Deps / view alignment     | Done  | —        | dweb pins `^2.0.4`; track future view releases   |
| Build/HMR maintainability | Yes   | **High** | oversized `csr-client-builder`                   |
| Production performance    | Yes   | Med–high | compression, asset cache policy, streaming SSR   |
| Security defaults         | Yes   | Med–high | CORS/CSP/rate-limit not first-class config       |
| Observability             | Yes   | Medium   | requestId exists; no metrics/tracing             |
| API contracts (OpenAPI)   | Yes   | Low–med  | product feature                                  |
| Full rewrite              | No    | —        | matrix locked to examples/tests; evolve in place |

**Overall: worth continuous investment. Prefer dependency upgrades + builder
split + production defaults over rewriting `App`.**

---

## 4. Deep dive: priority issues

### 4.1 Dependency drift (high)

| Issue                   | Impact                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `@dreamer/view@^2.0.3`  | Misses 2.0.4 router SSR, shell-less keyed For, controlled-input IME/number focus fixes |
| Other `@dreamer/*` pins | Need periodic JSR alignment                                                            |
| init templates          | `jsr-versions` / init templates must track release line                                |

**Actions (patch/minor)**

1. Bump view to `^2.0.4`; run view-engine unit/integration/e2e.
2. Confirm `render.engine: "view"` hybrid/CSR uses main-package `mount` /
   `jsx-runtime` (code already trends that way).
3. Changelog note: “requires @dreamer/view ≥ 2.0.4”.

### 4.2 `csr-client-builder.ts` size (high / engineering debt)

- **~2600 LOC** single module: entry generation, esbuild options, chunk index,
  HMR, engines, Windows paths.
- Heavy historical compatibility (chunk name variants) — correct but costly to
  change safely.

**Direction (no CLI contract break)**

| Step              | Work                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Split files       | `chunk-index.ts`, `hmr.ts`, `esbuild-options.ts`, `entry-generators/{view,preact,react}.ts` |
| Contract tests    | Fixtures for multi-segment routes, root index, layout chunks → golden index                 |
| Simplify defaults | Unify esbuild `entryNames`/`chunkNames` to reduce filename guessing                         |
| Observability     | Optional dev log: request path → resolved chunk                                             |

**Payoff**: faster HMR debugging; lower regression risk.

### 4.3 Render & data

| Item         | Today            | Suggestion                                                  |
| ------------ | ---------------- | ----------------------------------------------------------- |
| SSR response | Full HTML string | Optional **streaming SSR** (align with render/view streams) |
| SSG          | Build-time only  | Optional **ISR/revalidate**                                 |
| Hydration    | Full page        | Long-term **islands / partial hydrate**                     |
| `load()`     | Per request      | Doc + optional short cache (off in dev)                     |
| Hybrid       | Dual paths       | Explore view `renderRouterToString` for isomorphism         |

### 4.4 Production performance

| Item           | Today                   | Suggestion                                                |
| -------------- | ----------------------- | --------------------------------------------------------- |
| Compression    | Not first-class         | Optional `server.compression` or documented middleware    |
| Static assets  | Some `max-age=31536000` | Document **hashed asset long-cache** policy in APP_CONFIG |
| HTML documents | Often `no-store`        | Keep; distinguish docs vs hashed JS/CSS                   |
| Build          | esbuild strong          | Optional cache/worker strategies for huge monorepos       |

### 4.5 Security

Echoes `FRAMEWORK_ANALYSIS`, with implementation bias:

1. **CORS** — `server.cors` + built-in middleware.
2. **CSP** — `security.csp` optional middleware.
3. **Rate limit** — simple in-memory / pluggable store.
4. **Security chapter** — cookies, session, untrusted input, production
   checklist.

Extend `createSecurityHeadersMiddleware` rather than inventing a parallel stack.

### 4.6 Observability

- Have: requestId, logger, health.
- Missing: latency metrics, error rates, OpenTelemetry.
- Suggest: optional `/metrics` or `onRequestEnd` hooks (off by default).

### 4.7 Code health

| Issue                          | Suggestion                                       |
| ------------------------------ | ------------------------------------------------ |
| Heavy `core/app.ts`            | Split bootstrap stacks into focused modules      |
| Hollow `view-ssr-route-bundle` | Remove dead call sites or clarify “legacy no-op” |
| Widespread `any`               | Tighten public APIs over time                    |
| Stale TEST_REPORT version      | Refresh on release (per monorepo rules)          |

### 4.8 Product gaps (not performance blockers)

OpenAPI, API versioning, edge guides, compose examples — see
`FRAMEWORK_ANALYSIS`.

---

## 5. Collaboration with @dreamer/view

View is the **recommended** engine. Relevant **2.0.4** capabilities:

| View capability                                 | Impact on dweb                               |
| ----------------------------------------------- | -------------------------------------------- |
| Router SSR (`url`/`ssr`/`renderRouterToString`) | Hybrid/SSR isomorphism                       |
| Shell-less keyed For                            | List perf & CSS (`space-y`, etc.)            |
| Controlled input focus / IME                    | Form UX in examples                          |
| Compiler static lifting                         | Fewer Effects when view compile path is used |

**dweb follow-ups**

1. Depend on `^2.0.4`.
2. Document recommended `createRouter({ url })` for view SSR.
3. Optional e2e: continuous typing without focus loss.
4. Long-term: unify server matching with view `matchRoute` if beneficial.

---

## 6. Roadmap

### P0 — short term (1–2 weeks)

| # | Item                                 | Status  | Outcome                   |
| - | ------------------------------------ | ------- | ------------------------- |
| 1 | Upgrade `@dreamer/view` → **^2.0.4** | ✅      | Package + examples        |
| 2 | Refresh TEST_REPORT                  | partial | On release                |
| 3 | Builder split + goldens              | ✅      | `csr-client-chunk.ts`     |
| 4 | Security + production checklist      | ✅      | `PRODUCTION_CHECKLIST.md` |

### P1 — medium term

| # | Item                                        | Status      |
| - | ------------------------------------------- | ----------- |
| 1 | Further builder split (dep gen)             | in progress |
| 2 | Optional compression + hashed Cache-Control | ✅          |
| 3 | CORS/CSP/rateLimit config                   | ✅          |
| 4 | Streaming SSR pilot (view first)            | done        |

### P2 — architecture / product (RFC)

ISR, partial hydration, OpenAPI, OTel/metrics, deeper App split.

### Do not do without evidence

- Rewrite file-routing semantics
- Drop Preact/React
- Complex default scheduling (belongs in view)
- Untested mega-refactor of builder

---

## 7. Summary

| Question               | Answer                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Can we still optimize? | **Yes.** Feature completeness is high; ceiling is not.                                          |
| Biggest levers?        | **view ≥ 2.0.4** + **split csr-client-builder** + **production security/compression defaults**. |
| Is the core healthy?   | **Yes.** Evolve; do not rewrite.                                                                |
| Biggest risks?         | Builder regressions; lagging view; inconsistent user-side security setup.                       |

---

## 8. Index

| Topic          | Path                                         |
| -------------- | -------------------------------------------- |
| Entry          | `src/mod.ts`, `src/core/app.ts`              |
| Config         | `src/core/config.ts`, `docs/*/APP_CONFIG.md` |
| Client build   | `src/feature/csr-client-builder.ts`          |
| Render modes   | `src/feature/render-*.ts`                    |
| Load data      | `src/feature/load-data-middleware.ts`        |
| Module cache   | `src/feature/module-cache.ts`                |
| Gaps (product) | `docs/en-US/FRAMEWORK_ANALYSIS.md`           |
| Tests          | `docs/en-US/TEST_REPORT.md`                  |

---

## 9. Revisions

- Written **2026-07-10** against current `dweb` sources and dependency pins.
- When bumping view or splitting the builder, cross-link P0/P1 in the
  Chinese/English CHANGELOG.
- Prefer: deps + tests → file split → production middleware defaults.
