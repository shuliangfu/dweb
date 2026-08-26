# 生产部署检查清单（@dreamer/dweb）

> 与 `OPTIMIZATION_ANALYSIS` 配套。以下配置均为
> **opt-in**（默认关闭），避免破坏现有项目。

## 0. 应用种类（`AppConfig.kind`）

- [ ] 确认顶层 `kind`：`web`（默认）/ `api` / `console`
- [ ] **api**：生产可优先启用 `cors` / `rateLimit` / `compression`；handler 在
      `routes/` 平铺
- [ ] **console**：无 HTTP listen；运维用 `dweb-cli run <route>`（Cron/K8s
      CronJob）；勿误绑端口
- [ ] 多应用：**至多一个** `console/`；HTTP 应用各自 `dev`/`build`/`start`

## 1. 依赖与引擎

- [ ] `@dreamer/view` ≥ **2.0.4**（推荐引擎；IME/路由 SSR/For 键控修复）
- [ ] `deno.json` / `package.json` 中 dweb 与 view 版本一致
- [ ] 生产构建使用 `dweb build` / `RUNTIME_ENV=prod` 或 `server.mode: "prod"`

## 2. 安全（AppConfig）

```ts
// config/main.ts 示例（按业务收紧）
export default {
  securityHeaders: true, // 或 { contentSecurityPolicy: "default-src 'self'; ..." }
  cors: {
    origin: ["https://app.example.com"],
    credentials: true,
  },
  // 可选：简易内存限流（多实例需自备网关限流）
  rateLimit: { windowMs: 60_000, max: 120 },
};
```

- [ ] 生产启用 `securityHeaders`（至少 `true`）
- [ ] 跨域 API 时配置 **`cors` 白名单**（推荐对象）；避免生产使用
      `cors: true`（等价 `origin: "*"`，非 dev 会打警告）
- [ ] 勿在 credentials 场景使用 `origin: "*"`
- [ ] 使用 Socket.IO 跨域时配置 `socket.config.cors.origin` 白名单，或依赖
      `AppConfig.cors.origin` 桥接；勿依赖「反射任意 Origin + credentials」
- [ ] 公共接口评估 `rateLimit` 或前置网关限流（勿在无受信代理时盲信
      `X-Forwarded-For`）
- [ ] Session Cookie：`secure` + `httpOnly` + 合适 `sameSite`（生产示例勿留
      `secure: false`）
- [ ] 勿将 `load()` / 错误栈细节暴露给生产客户端（框架 JSON 错误体已区分环境）
- [ ] 需要请求耗时观测时配置 `onRequestEnd`（或插件同名钩子）；需要 scrape
      端点时 opt-in `metrics: true`（默认 `/metrics`）

## 3. 性能与传输

```ts
export default {
  // start/build 默认已开启压缩；仅需自定义阈值或显式关闭时再写
  // compression: { threshold: 1024, enableBrotli: true },
  // compression: false,
};
```

- [ ] 确认生产压缩行为（默认开；需关则 `compression: false`；可按需 brotli）
- [ ] 带 hash 的 `/_client*.js` 已使用长缓存（框架默认
      `max-age=31536000, immutable`）
- [ ] HTML / `__data` 保持 no-store / 短缓存，勿与静态资源混用

## 4. 进程与运维

- [ ] 健康检查：`GET /health`
- [ ] 反向代理终止 TLS；上游可只开 HTTP
- [ ] 日志级别生产勿长期 debug
- [ ] 多应用 / monorepo 确认 `build.server.output` 与 client 输出目录

## 5. 回归

- [ ] `deno test -A tests/`（或项目约定路径）
- [ ] 若用 Bun：`bun test tests/unit tests/integration` + e2e（可按文件串行）

## 相关配置键速查

| 键                | 默认              | 说明                        |
| ----------------- | ----------------- | --------------------------- |
| `securityHeaders` | 关                | CSP / frame / referrer 等   |
| `cors`            | 关                | `@dreamer/middlewares` cors |
| `compression`     | **非 dev 默认开** | 响应 gzip/br；`false` 可关  |
| `rateLimit`       | 关                | 简易限流                    |
| `metrics`         | 关                | Prometheus 风格 `/metrics`  |
| `session`         | 关                | 启用后 ctx.session 可用     |

更完整的分析见 [OPTIMIZATION_ANALYSIS.md](./OPTIMIZATION_ANALYSIS.md)。
