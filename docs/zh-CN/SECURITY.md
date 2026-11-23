# 安全

本文说明 `@dreamer/dweb`
当前的默认防护，以及生产环境仍须由应用完成的事项。配置细节见
[APP_CONFIG](./APP_CONFIG.md) 和
[PRODUCTION_CHECKLIST](./PRODUCTION_CHECKLIST.md)。

## 框架已提供

- **安全响应头与限流**：非 `dev` 默认开启 `securityHeaders`、`rateLimit` 和
  `compression`。可用 `false` 显式关闭。CSP 不会默认写入，需要时在
  `securityHeaders` 里显式配置（View 水合往往需要
  `unsafe-inline`，因此框架不默认下发严格 CSP）。生产环境若请求本身是
  HTTPS（或在 `trustProxy: true` 下 `X-Forwarded-Proto` 为 `https`），会默认加上
  HSTS（`max-age=15552000; includeSubDomains`）；纯 HTTP 本地访问不会写入。可用
  `securityHeaders.headers["Strict-Transport-Security"]: false` 关闭。
- **XSS 输出编码**：HTML 使用 `escapeHtml()`，内联脚本中的 JSON 使用
  `serializeJsonForInlineScript()`。View / Preact / React 默认转义；使用
  `dangerouslySetInnerHTML` 或不当插值仍会绕过。
- **错误信息**：生产环境不会把详细错误栈返回给客户端。
- **Cookie / Session 签名**：生产环境启用 `session` 时必须配置
  `cookie.secret`（不少于 32
  个字符的随机密钥），否则启动失败（`DWEB_E35`）。有密钥时，session Cookie 使用
  HMAC-SHA256 签名，伪造或未签名的值视为无效。生产未显式配置时默认
  `secure: true`、`sameSite: "strict"`，不覆盖已写的值。开发环境可不设密钥，Cookie
  保持未签名。`@dreamer/session` 也可单独设置 `secret` / `cookie.secret`（供非
  dweb 使用者）；dweb 仍由框架包装层签名，避免与已发布 session 包双重签名。
- **CSRF**：启用 `session` 时自动开启（double-submit cookie）。纯 API 或不需要
  Cookie 时用 `csrf: false` 关闭。未启用 session 的应用默认关闭。
- **路径边界**：preview 静态服务、生产客户端资源、SSG HTML、console 路由和上传
  `localDir` 使用 realpath + 前缀校验，拒绝 `..` 与符号链接逃逸。含 NUL
  的上传路径会拒绝。`isPathWithinProject` 在所有平台都做 canonical / realpath
  比较。`@dreamer/upload` 的 `resolveSafePath`、`@dreamer/middlewares` 的
  `staticFiles`、以及 `@dreamer/plugins/static` 同样使用 realpath
  笼子；目录列表中的文件名和标题会做 HTML 转义。
- **限流与客户端 IP**：默认不信任 `X-Forwarded-For` / `X-Real-IP` /
  `cf-connecting-ip`，也不会把 Host 当成客户端
  IP。仅在确认反向代理会剥离伪造转发头后设置 `trustProxy: true`（或
  `rateLimit: { trustProxy: true }`）。真实远端地址由运行时 `serve()`
  注入（需使用已包含该能力的 `@dreamer/runtime-adapter`）；尚未升级适配器时，在
  `trustProxy: false` 下限流键为 `unknown`（宁可共用一桶，也不接受伪造 IP）。
- **HTTP2Shell / 入站 Brotli**：框架不给请求体做 Brotli 解压。默认拒绝请求头
  `Content-Encoding` 含 `br`（返回 415）；确有需求时设
  `allowBrotliRequestEncoding: true`。响应压缩仍只作用于响应，`enableBrotli`
  默认关闭。`dweb doctor` 会检查 Node / Bun 是否达到修复线（Node ≥22.23.4 /
  ≥24.22.1 / ≥26.12.1，Bun ≥1.4.4）。`package.json` 的 `engines`
  也已相应提高下限。
- **HTTP 报文歧义**：若运行时仍同时暴露 `Content-Length` 与
  `Transfer-Encoding`，框架返回 400。底层 HTTP/1.1 解析由 Deno.serve / Bun.serve
  / Node `http` 负责，框架不另行拆包。
- **开重定向 / 头注入**：`createServerResponse().redirect()` 与 Cookie
  序列化会拒绝包含 CR/LF 的值。
- **原型污染**：合并 AppConfig / params 时忽略
  `__proto__`、`prototype`、`constructor`。
- **点击劫持 / MIME 嗅探**：默认安全头包含 `X-Frame-Options: SAMEORIGIN` 与
  `X-Content-Type-Options: nosniff`。

## 攻击面覆盖

| 攻击类型                   | 状态                  | 说明                                                                               |
| -------------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| XSS                        | 框架已防护 / 应用负责 | 默认输出转义；`dangerouslySetInnerHTML` 与不当插值仍须应用避免                     |
| CSRF                       | 框架已防护 / 需配置   | 启用 session 时自动开；纯 API 用 `csrf: false`                                     |
| SQL 注入                   | 应用负责              | ORM 对象 `where` 已参数化；`where(string)` 是逃生舱，禁止拼接用户输入              |
| 路径穿越 / 符号链接逃逸    | 框架已防护            | 静态资源、preview、上传目录走 realpath 笼子                                        |
| 上传                       | 框架已防护 / 应用负责 | 路径笼子 + 默认 `requireAuth: true`；类型与大小仍须业务校验                        |
| Session 伪造 / 固定        | 框架已防护 / 需配置   | 生产必须 `cookie.secret` 并签名；应用勿把未签名 ID 当身份                          |
| 点击劫持 / MIME 嗅探       | 框架已防护            | 默认 `X-Frame-Options`、`nosniff`                                                  |
| CORS                       | 需配置                | 始终 opt-in，生产请用源白名单，不要 `cors: true`（`*`）                            |
| 限流 / 暴力破解            | 框架已防护 / 需配置   | 生产默认开；多实例需网关限流；`trustProxy` 仅在受信代理后开启                      |
| HTTP2Shell / 入站 Brotli   | 框架已防护 / 需配置   | 默认 415 拒绝请求 `br`；运行时版本见 `dweb doctor` 与 `engines`                    |
| HTTP 请求走私              | 框架已防护            | 两头仍同时可见时 400；解析本身交给运行时                                           |
| SSRF（远程插件）           | 应用负责              | 只安装可信插件；远程 `import()` 不默认加允许名单，以免打断正常 `@dreamer` 插件安装 |
| 开重定向 / 头注入          | 框架已防护 / 应用负责 | 框架拒绝 Location 与 Cookie 中的 CR/LF；业务自己拼 URL 时仍须校验                  |
| Host 头                    | 需配置 / 应用负责     | 框架不用 Host 做限流键；生成对外绝对链接时请用显式公共源，不要盲目信任 Host        |
| WebSocket / Socket.IO 认证 | 应用负责              | 须在插件或应用中实现                                                               |
| 原型污染                   | 框架已防护            | 配置合并跳过危险键                                                                 |
| CSP                        | 需配置                | 不默认下发严格 CSP（水合常需 `unsafe-inline`）                                     |
| HSTS                       | 框架已防护 / 需配置   | 生产 HTTPS 默认开启；HTTP 本地不写                                                 |
| HMR / 开发服务器暴露       | 应用负责              | 不要把 dev / HMR / 详细错误暴露到公网                                              |
| 插件信任                   | 应用负责              | 插件权限很高，只安装可信来源                                                       |
| DoS / 请求体限制           | 需配置 / 应用负责     | 有限流与上传大小策略；整体请求体上限仍须应用或网关配置                             |

## 应用仍须自行负责

- 数据库查询使用参数化，不要拼接用户输入。
- 上传文件的类型、大小仍要在业务里校验；`@dreamer/upload` 默认
  `requireAuth: true`。
- 路由参数、查询字符串按业务做校验（允许名单优于拒绝名单）。
- 插件权限很高，只安装可信插件。
- Socket.IO / WebSocket 的认证要在插件或应用中实现。
- 不要把开发服务器（HMR、详细错误）暴露到公网。
- 仅在会剥离伪造转发头的反向代理后启用 `trustProxy`。
- 将 Node 升到修复线（≥22.23.4 / ≥24.22.1 / ≥26.12.1）或将 Bun 升到
  ≥1.4.4，避免运行时在 `fetch` / 解压 `Content-Encoding: br` 时踩中 HTTP2Shell。
