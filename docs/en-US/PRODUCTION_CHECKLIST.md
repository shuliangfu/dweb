# Production checklist (@dreamer/dweb)

> Companion to `OPTIMIZATION_ANALYSIS`. All options below are **opt-in** (off by default) so existing apps keep working.

## 1. Dependencies & engine

- [ ] `@dreamer/view` ≥ **2.0.4** (recommended engine)
- [ ] Align dweb + view versions in `deno.json` / `package.json`
- [ ] Production build via `dweb build` / `RUNTIME_ENV=prod` or `server.mode: "prod"`

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
- [ ] Configure `cors` for cross-origin APIs (never `origin: "*"` with credentials)
- [ ] Consider `rateLimit` or edge/gateway limits
- [ ] Session cookies: `secure` + `httpOnly` + appropriate `sameSite`
- [ ] Do not leak stack traces to clients in production

## 3. Performance & transfer

```ts
export default {
  compression: true, // or { threshold: 1024, enableBrotli: true }
};
```

- [ ] Enable `compression` in production
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

| Key | Default | Notes |
|-----|---------|--------|
| `securityHeaders` | off | CSP / frame / referrer |
| `cors` | off | `@dreamer/middlewares` cors |
| `compression` | off | gzip / optional brotli |
| `rateLimit` | off | simple in-memory limit |
| `session` | off | enables `ctx.session` |

See also [OPTIMIZATION_ANALYSIS.md](./OPTIMIZATION_ANALYSIS.md).
