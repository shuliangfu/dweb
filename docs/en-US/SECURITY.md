# Security

This page describes the protections `@dreamer/dweb` enables by default, and what
an application must still do in production. See [APP_CONFIG](./APP_CONFIG.md)
and [PRODUCTION_CHECKLIST](./PRODUCTION_CHECKLIST.md) for configuration details.

## Provided by the framework

- **Security headers and rate limiting**: Outside `dev`, `securityHeaders`,
  `rateLimit`, and `compression` are on by default. Set them to `false` to opt
  out. CSP is not injected unless you set it explicitly under `securityHeaders`
  (View hydration often needs `unsafe-inline`, so the framework does not ship a
  strict default CSP). In production, HSTS
  (`max-age=15552000; includeSubDomains`) is added when the request is HTTPS (or
  `X-Forwarded-Proto` is `https` with `trustProxy: true`). It is not written for
  local HTTP. Disable it with
  `securityHeaders.headers["Strict-Transport-Security"]: false`.
- **XSS encoding**: HTML is escaped with `escapeHtml()`, and JSON in inline
  scripts with `serializeJsonForInlineScript()`. View, Preact, and React escape
  by default; `dangerouslySetInnerHTML` or unsafe interpolation still bypasses
  this.
- **Error details**: Production responses do not expose stack traces to the
  client.
- **Cookie / session signing**: When `session` is enabled in production,
  `cookie.secret` is required (a random string of at least 32 characters) or
  startup fails with `DWEB_E35`. With a secret, the session cookie is
  HMAC-SHA256-signed; forged or unsigned values are treated as invalid. Unset
  production cookie flags default to `secure: true` and `sameSite: "strict"`
  without overriding values you already set. Development may omit the secret;
  cookies stay unsigned. `@dreamer/session` also accepts `secret` /
  `cookie.secret` for non-dweb users; dweb keeps signing in its wrapper so it
  stays correct against published session 1.1.0 and does not double-sign.
- **CSRF**: Enabling `session` turns CSRF on automatically (double-submit
  cookie). Use `csrf: false` for a pure API or cookieless clients. Apps that
  never enable session keep CSRF off.
- **Path bounds**: Preview static files, production client assets, SSG HTML,
  console routes, and upload `localDir` are resolved with realpath and a prefix
  check, rejecting `..` and symlink escapes. Upload paths that contain NUL are
  rejected. `isPathWithinProject` uses a canonical / realpath comparison on
  every platform. The same realpath cage is applied in `@dreamer/upload`
  `resolveSafePath`, `@dreamer/middlewares` `staticFiles`, and
  `@dreamer/plugins/static`. Directory listing names and the title path are
  HTML-escaped.
- **Rate limiting and client IP**: Forwarded headers (`X-Forwarded-For`,
  `X-Real-IP`, `cf-connecting-ip`) are not trusted by default, and the Host
  header is never used as a client IP. Set `trustProxy: true` (or
  `rateLimit: { trustProxy: true }`) only behind a proxy that strips spoofed
  forwarded headers. The real remote address is recorded by runtime `serve()`
  (when using a `@dreamer/runtime-adapter` that includes this). Until that
  adapter is upgraded, the rate-limit key is `unknown` when `trustProxy` is
  false (shared bucket rather than a spoofable IP).
- **HTTP2Shell / inbound Brotli**: The framework never decompresses request
  bodies with Brotli. Requests whose `Content-Encoding` includes `br` are
  rejected with 415 unless you set `allowBrotliRequestEncoding: true`. Response
  compression stays response-only, and `enableBrotli` defaults to false.
  `dweb doctor` warns unless Node is ≥22.23.4 / ≥24.22.1 / ≥26.12.1 or Bun is
  ≥1.4.4. `package.json` `engines` were raised to match.
- **Ambiguous HTTP framing**: If both `Content-Length` and `Transfer-Encoding`
  are still visible on the Request, the framework responds 400. Raw HTTP/1.1
  parsing is left to Deno.serve / Bun.serve / Node `http`.
- **Open redirects / header injection**: `createServerResponse().redirect()` and
  cookie serialization reject values that contain CR/LF.
- **Prototype pollution**: AppConfig / params merges ignore `__proto__`,
  `prototype`, and `constructor`.
- **Clickjacking / MIME sniffing**: Default security headers include
  `X-Frame-Options: SAMEORIGIN` and `X-Content-Type-Options: nosniff`.

## Coverage

| Attack class                     | Status             | Notes                                                                                                                           |
| -------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| XSS                              | Framework / app    | Default output escaping; the app must still avoid `dangerouslySetInnerHTML` and unsafe interpolation                            |
| CSRF                             | Framework / config | Auto-on with session; use `csrf: false` for pure APIs                                                                           |
| SQL injection                    | App                | Object `where` is parameterized; raw `where(string)` is an escape hatch — never concatenate user input                          |
| Path traversal / symlink escape  | Framework          | Static assets, preview, and upload dirs use a realpath cage                                                                     |
| Uploads                          | Framework / app    | Path cage + `requireAuth: true` by default; type and size remain an app concern                                                 |
| Session forgery / fixation       | Framework / config | Production requires a signed `cookie.secret`; do not treat an unsigned id as identity                                           |
| Clickjacking / MIME sniffing     | Framework          | Default `X-Frame-Options` and `nosniff`                                                                                         |
| CORS                             | Config             | Always opt-in; use an origin allowlist in production, not `cors: true` (`*`)                                                    |
| Rate limit / brute force         | Framework / config | On by default in production; multi-instance deployments need a gateway limiter; enable `trustProxy` only behind a trusted proxy |
| HTTP2Shell / inbound Brotli      | Framework / config | Inbound `br` is rejected with 415; check runtime versions with `dweb doctor` and `engines`                                      |
| HTTP request smuggling           | Framework          | 400 if both framing headers are still visible; parsing stays in the runtime                                                     |
| SSRF (remote plugins)            | App                | Install only trusted plugins; no default remote-import allowlist, so normal `@dreamer` plugin install keeps working             |
| Open redirect / header injection | Framework / app    | Framework rejects CR/LF in Location and cookies; the app must still validate URLs it builds                                     |
| Host header                      | Config / app       | Host is not used as a rate-limit key; use an explicit public origin for security-sensitive absolute links                       |
| WebSocket / Socket.IO auth       | App                | Implement authentication in a plugin or in the app                                                                              |
| Prototype pollution              | Framework          | Config merges skip dangerous keys                                                                                               |
| CSP                              | Config             | No strict default CSP (hydration often needs `unsafe-inline`)                                                                   |
| HSTS                             | Framework / config | Default on for production HTTPS; not written for local HTTP                                                                     |
| HMR / dev server exposure        | App                | Do not expose dev / HMR / detailed errors to the public internet                                                                |
| Plugin trust                     | App                | Plugins are highly privileged; install only trusted sources                                                                     |
| DoS / body limits                | Config / app       | Rate limits and upload size policies exist; overall body limits still belong in the app or gateway                              |

## Still the application's responsibility

- Use parameterized database queries; do not concatenate user input.
- Validate upload file types and sizes in your app; `@dreamer/upload` defaults
  to `requireAuth: true`.
- Validate route params and query strings for your domain (allowlists over
  denylists).
- Plugins are highly privileged; only install ones you trust.
- Implement Socket.IO / WebSocket authentication in a plugin or in the app.
- Do not expose the development server (HMR, detailed errors) to the public
  internet.
- Enable `trustProxy` only behind a reverse proxy that strips spoofed forwarded
  headers.
- Upgrade Node to a patched release (≥22.23.4 / ≥24.22.1 / ≥26.12.1) or Bun to
  ≥1.4.4 so runtime `fetch` / decompression of `Content-Encoding: br` is not
  exposed to HTTP2Shell.
