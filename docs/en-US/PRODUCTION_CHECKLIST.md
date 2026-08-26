# Production checklist (@dreamer/dweb)

> Companion to `OPTIMIZATION_ANALYSIS`. All options below are **opt-in** (off by
> default) so existing apps keep working.

## 0. App kind (`AppConfig.kind`)

- [ ] Confirm top-level `kind`: `web` (default) / `api` / `console`
- [ ] **api**: prefer enabling `cors` / `rateLimit` / `compression` in prod; handlers flat under `routes/`
- [ ] **console**: no HTTP listen; ops via `dweb-cli run <route>` (Cron/K8s CronJob); do not bind a port
- [ ] Multi-app: **at most one** `console/`; each HTTP app has its own `dev`/`build`/`start`

## 1. Dependencies & engine

- [ ] `@dreamer/view` ≥ **2.0.4** (recommended engine)
- [ ] Align dweb + view versions in `deno.json` / `package.json`
- [ ] Production build via `dweb build` / `RUNTIME_ENV=prod` or
      `server.mode: "prod"`

## 2. Security (AppConfig)

```ts
export default {
  securityHeaders: true, // or { contentSecurityPolicy: "default-src 'self'; ..." }
  cors: {
    origin: ["https://app.example.com"],
    credentials: true,
  },
  rateLimit: { windowMs: 60_000, max: 120 },
};
```

- [ ] Enable `securityHeaders` in production
- [ ] Prefer an explicit **`cors` allowlist**; avoid `cors: true` in prod (it means
      `origin: "*"`, and non-dev logs a warning)
- [ ] Never use `origin: "*"` with credentials
- [ ] For cross-origin Socket.IO, set `socket.config.cors.origin` (or rely on
      `AppConfig.cors.origin` bridging); do not depend on reflecting arbitrary
      Origins with credentials
- [ ] Consider `rateLimit` or edge/gateway limits (do not trust
      `X-Forwarded-For` unless the proxy strips client spoofing)
- [ ] Session cookies: `secure` + `httpOnly` + appropriate `sameSite`
- [ ] Do not leak stack traces to clients in production
- [ ] For request timing, set `onRequestEnd` (or a plugin hook); for a scrape endpoint, opt-in `metrics: true` (default `/metrics`)

## 3. Performance & transfer

```ts
export default {
  // compression is on by default outside RUNTIME_ENV=dev; customize or disable:
  // compression: { threshold: 1024, enableBrotli: true },
  // compression: false,
};
```

- [ ] Confirm production compression (on by default; set `false` to disable; brotli optional)
- [ ] Hashed `/_client*.js` uses long cache (`max-age=31536000, immutable`)
- [ ] Keep HTML / `__data` short-lived or no-store

## 4. Ops

- [ ] Health: `GET /health`
- [ ] Terminate TLS at reverse proxy
- [ ] Avoid permanent debug logging in production

## 5. Regression

- [ ] Full Deno suite
- [ ] Bun unit/integration + e2e as needed

## Config quick reference

| Key               | Default | Notes                       |
| ----------------- | ------- | --------------------------- |
| `securityHeaders` | off     | CSP / frame / referrer      |
| `cors`            | off     | `@dreamer/middlewares` cors |
| `compression`     | **on outside dev** | gzip / optional brotli; `false` disables |
| `rateLimit`       | off     | simple in-memory limit      |
| `metrics`         | off     | Prometheus-style `/metrics` |
| `session`         | off     | enables `ctx.session`       |

See also [OPTIMIZATION_ANALYSIS.md](./OPTIMIZATION_ANALYSIS.md).
