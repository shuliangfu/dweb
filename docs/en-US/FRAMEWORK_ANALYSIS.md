# Dweb Framework Analysis: Gaps, Extensions & Optimizations

> This document summarizes the current state of the dweb framework, identifies
> gaps and limitations, and suggests directions for extension and optimization.
>
> **Deeper optimization roadmap (architecture, build, view upgrade, P0–P2):**\
> **[OPTIMIZATION_ANALYSIS.md](./OPTIMIZATION_ANALYSIS.md)** · Chinese:
> **[../zh-CN/OPTIMIZATION_ANALYSIS.md](../zh-CN/OPTIMIZATION_ANALYSIS.md)**

---

## 1. Current Strengths

- **Full-stack**: Single-app / multi-app, SSR / CSR / SSG / Hybrid, View /
  Preact / React.
- **Routing**: File-based routing (`@dreamer/router`), `_app` / `_layout` /
  `_404` / `_error` / `_middleware`, API modes restful & action.
- **Data flow**: Route `load()` on server, `/__data` for client, no manual API
  calls in CSR/Hybrid.
- **Real-time**: Socket.IO and WebSocket adapters, mounted on same HTTP server.
- **Session, plugins, middlewares**: Optional session, plugin lifecycle,
  middleware chain with conditions.
- **i18n & errors**: 9 locales, DwebError codes (DWEB_E01–E34),
  `setDwebErrorTranslator`.
- **DX**: HMR, CLI (init / dev / build / start / generate / db migrate), Deno +
  Bun.
- **Tests**: Unit + integration + e2e (browser), 800+ cases; timeout tuning for
  CI stability.

---

## 2. Gaps & Limitations

### 2.1 Security

| Area        | Status      | Note                                                                                         |
| ----------- | ----------- | -------------------------------------------------------------------------------------------- |
| CORS        | No built-in | Documented as user middleware (e.g. `./middlewares/cors.ts`); no `server.cors` in AppConfig. |
| CSP         | No built-in | No Content-Security-Policy middleware or config.                                             |
| Rate limit  | No built-in | No framework-level rate limiting; would require custom middleware or @dreamer/middlewares.   |
| XSS         | Partial     | SSR escapes HTML in styles; general guidance for user content not centralized.               |
| Helmet-like | No          | No bundle of security headers (X-Frame-Options, X-Content-Type-Options, etc.).               |

### 2.2 Rendering & Data

| Area              | Status | Note                                                                       |
| ----------------- | ------ | -------------------------------------------------------------------------- |
| SSR streaming     | No     | SSR returns full HTML in one Response; no ReadableStream / streaming HTML. |
| ISR / revalidate  | No     | SSG is static at build time; no on-demand revalidation or TTL.             |
| Partial hydration | No     | Hydrate is full page; no “islands” or partial hydrate config.              |

### 2.3 API & Contract

| Area           | Status | Note                                                                          |
| -------------- | ------ | ----------------------------------------------------------------------------- |
| OpenAPI        | No     | apiMode restful/action exists; no OpenAPI 3 / Swagger generation from routes. |
| API versioning | No     | No built-in `/v1/...` or version header handling.                             |
| Validation     | User   | No built-in request body/query schema validation (e.g. Zod) in core.          |

### 2.4 Deployment & Runtime

| Area          | Status   | Note                                                              |
| ------------- | -------- | ----------------------------------------------------------------- |
| Edge          | Doc only | No dedicated “run on Deno Deploy / edge” guide or adapter.        |
| Docker        | Yes      | init can generate Dockerfile; no Compose or K8s examples in core. |
| Env / secrets | Config   | envPrefix and env vars; no dedicated “secrets” or vault story.    |

### 2.5 Observability & Performance

| Area                 | Status  | Note                                                                |
| -------------------- | ------- | ------------------------------------------------------------------- |
| Response compression | No      | No built-in gzip/brotli for HTTP body.                              |
| Caching headers      | Partial | Some Cache-Control in CSR dev; no global static-asset cache policy. |
| Tracing              | No      | Request ID exists; no OpenTelemetry or trace export.                |
| Metrics              | No      | No built-in Prometheus/health metrics beyond /health.               |

### 2.6 Documentation & DX

| Area                    | Status   | Note                                                                           |
| ----------------------- | -------- | ------------------------------------------------------------------------------ |
| Security best practices | Missing  | No dedicated “Security” section (CORS, CSP, cookies, etc.).                    |
| Performance tuning      | Missing  | No “Performance” or “Production checklist” doc.                                |
| Error code reference    | Partial  | Error codes exist; no single “Error code reference” page.                      |
| E2E stability           | Improved | Timeouts increased; view-hybrid-flat metadata test still sensitive on slow CI. |

---

## 3. Suggested Extensions & Optimizations

### 3.1 Security (high impact)

- **CORS**: Add optional `server.cors` in AppConfig and a built-in CORS
  middleware (or document a single recommended pattern with
  @dreamer/middlewares).
- **CSP**: Provide an optional middleware that sets Content-Security-Policy from
  config (e.g. `security.csp`).
- **Rate limiting**: Either a built-in middleware (in-memory or pluggable store)
  or a short “Rate limiting” doc using existing middlewares.
- **Security doc**: Add “Security” section in README/APP_CONFIG: CORS, CSP,
  cookie flags, session, and “don’t trust client input”.

### 3.2 Rendering & Data

- **SSR streaming**: Consider streaming SSR (e.g. ReadableStream) for large or
  slow pages to improve TTFB/LCP; keep current non-streaming as default.
- **ISR / revalidate**: For SSG, consider optional on-demand or time-based
  revalidation (e.g. per-route revalidate or TTL) for content that changes
  occasionally.
- **Partial hydration**: Long-term option to hydrate only certain parts of the
  page to reduce JS and improve metrics.

### 3.3 API & Contract

- **OpenAPI**: Add optional OpenAPI 3 generation from route definitions (and/or
  from load shapes) for documentation and codegen.
- **Validation**: Document recommended approach (e.g. Zod in load or API
  handlers) or provide a small helper for body/query validation.

### 3.4 Deployment & Runtime

- **Edge guide**: Document running on Deno Deploy (or other edge) and any
  constraints (e.g. no long-lived WebSocket on some platforms).
- **Docker**: Keep current Dockerfile from init; optionally add a minimal
  docker-compose example for app + DB.

### 3.5 Observability & Performance

- **Compression**: Add optional gzip/brotli middleware for response body (or
  document how to add it).
- **Static cache**: Document (or add) a default Cache-Control strategy for built
  assets (e.g. long-lived with hash in filename).
- **Metrics**: Optional /metrics endpoint (e.g. request count, latency) for
  Prometheus or similar.

### 3.6 Documentation & DX

- **Error reference**: Single page or section listing all DWEB_Exx codes with
  cause and suggested fix.
- **Production checklist**: Security, compression, caching, logging, env, health
  checks.
- **E2E**: Keep timeout and retry strategy under review; consider splitting
  heavy suites or increasing timeouts further if CI remains flaky.

---

## 4. Priority Overview

| Priority | Area          | Suggestion                                       |
| -------- | ------------- | ------------------------------------------------ |
| High     | Security      | CORS option + Security doc                       |
| High     | Docs          | Error code reference, Production checklist       |
| Medium   | Performance   | Compression middleware, static cache policy      |
| Medium   | API           | OpenAPI generation (optional)                    |
| Medium   | Deployment    | Edge run guide                                   |
| Lower    | Rendering     | SSR streaming, ISR/revalidate, partial hydration |
| Lower    | Observability | Tracing, metrics endpoint                        |

---

## 5. Summary

Dweb already provides a solid full-stack base (routing, render modes, session,
plugins, i18n, errors). The main gaps are: **built-in security (CORS, CSP, rate
limit)**, **security and production documentation**, **response compression and
caching strategy**, and **optional API contract (OpenAPI)**. Addressing security
and docs first will improve production readiness; then compression/caching and
optional OpenAPI/edge docs can follow.
