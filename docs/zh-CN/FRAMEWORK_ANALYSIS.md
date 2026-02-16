# Dweb 框架分析：不足、扩展与优化

> 本文档对 dweb 框架的现状做整体分析，指出缺口与不足，并给出可扩展与优化方向。英文版见 [../en-US/FRAMEWORK_ANALYSIS.md](../en-US/FRAMEWORK_ANALYSIS.md)。

---

## 1. 当前优势

- **全栈能力**：单应用 / 多应用，SSR / CSR / SSG / Hybrid，View / Preact / React。
- **路由**：基于文件的路由（`@dreamer/router`），`_app` / `_layout` / `_404` / `_error` / `_middleware`，API 模式 restful 与 action。
- **数据流**：服务端 `load()`、客户端 `/__data`，CSR/Hybrid 下无需手写 API 请求。
- **实时**：Socket.IO 与 WebSocket 适配器，挂载在同一 HTTP 服务上。
- **会话、插件、中间件**：可选 session、插件生命周期、带条件的中间件链。
- **国际化与错误**：9 种语言、DwebError 错误码（DWEB_E01–E34）、`setDwebErrorTranslator`。
- **开发体验**：HMR、CLI（init / dev / build / start / generate / db migrate），Deno + Bun。
- **测试**：单元 + 集成 + e2e（浏览器），800+ 用例；CI 稳定性已通过超时调整改善。

---

## 2. 不足与缺口

### 2.1 安全

| 方面       | 状态     | 说明 |
| ---------- | -------- | ---- |
| CORS       | 无内置   | 文档建议用户中间件（如 `./middlewares/cors.ts`）；AppConfig 无 `server.cors`。 |
| CSP        | 无内置   | 无 Content-Security-Policy 中间件或配置。 |
| 限流       | 无内置   | 框架层无限流；需自定义中间件或配合 @dreamer/middlewares。 |
| XSS        | 部分     | SSR 对样式内 HTML 做转义；用户内容的通用规范未集中说明。 |
| 安全头     | 无       | 无类似 Helmet 的安全头集合（X-Frame-Options、X-Content-Type-Options 等）。 |

### 2.2 渲染与数据

| 方面           | 状态 | 说明 |
| -------------- | ---- | ---- |
| SSR 流式输出   | 无   | SSR 一次性返回完整 HTML；无 ReadableStream 流式 HTML。 |
| ISR / 再验证   | 无   | SSG 为构建时静态；无按需再验证或 TTL。 |
| 局部 hydrate  | 无   | 当前为整页 hydrate；无「岛屿」或局部 hydrate 配置。 |

### 2.3 API 与契约

| 方面         | 状态   | 说明 |
| ------------ | ------ | ---- |
| OpenAPI      | 无     | 已有 restful/action；无基于路由的 OpenAPI 3 / Swagger 生成。 |
| API 版本     | 无     | 无内置 `/v1/...` 或版本头处理。 |
| 校验         | 用户侧 | 请求体/查询参数无内置 schema 校验（如 Zod）。 |

### 2.4 部署与运行时

| 方面         | 状态   | 说明 |
| ------------ | ------ | ---- |
| Edge         | 仅文档 | 无「在 Deno Deploy / edge 上运行」的专项指南或适配说明。 |
| Docker       | 有     | init 可生成 Dockerfile；核心未提供 Compose / K8s 示例。 |
| 环境/密钥    | 配置   | envPrefix 与环境变量；无独立「密钥/保险库」方案。 |

### 2.5 可观测与性能

| 方面           | 状态   | 说明 |
| -------------- | ------ | ---- |
| 响应压缩       | 无     | 无内置 gzip/brotli。 |
| 缓存头         | 部分   | CSR 开发模式有部分 Cache-Control；无统一静态资源缓存策略。 |
| 链路追踪       | 无     | 有 Request ID；无 OpenTelemetry 或 trace 导出。 |
| 指标           | 无     | 除 /health 外无内置 Prometheus 等指标。 |

### 2.6 文档与 DX

| 方面               | 状态   | 说明 |
| ------------------ | ------ | ---- |
| 安全最佳实践       | 缺失   | 无独立「安全」章节（CORS、CSP、Cookie 等）。 |
| 性能调优           | 缺失   | 无「性能」或「生产清单」文档。 |
| 错误码说明         | 分散   | 错误码存在；无集中「错误码参考」页。 |
| E2E 稳定性        | 已改善 | 已提高超时；view-hybrid-flat metadata 在慢 CI 上仍可能偶发失败。 |

---

## 3. 建议的扩展与优化

### 3.1 安全（高优先级）

- **CORS**：在 AppConfig 中增加可选 `server.cors`，并提供内置 CORS 中间件（或与 @dreamer/middlewares 的推荐用法文档）。
- **CSP**：提供可选中间件，根据配置（如 `security.csp`）设置 Content-Security-Policy。
- **限流**：内置限流中间件（内存或可插拔 store），或撰写「限流」文档与现有中间件配合方式。
- **安全文档**：在 README/APP_CONFIG 中增加「安全」小节：CORS、CSP、Cookie、Session、不信任客户端输入。

### 3.2 渲染与数据

- **SSR 流式**：考虑支持流式 SSR（如 ReadableStream），用于大页面或慢数据，改善 TTFB/LCP；默认保持当前一次性输出。
- **ISR / 再验证**：SSG 可选按需或按时间再验证（如按路由 revalidate 或 TTL）。
- **局部 hydrate**：中长期可考虑仅对部分区域 hydrate，减少首屏 JS。

### 3.3 API 与契约

- **OpenAPI**：可选基于路由（及 load 形状）生成 OpenAPI 3，用于文档与代码生成。
- **校验**：文档化推荐做法（如在 load 或 API 中用 Zod），或提供轻量 body/query 校验辅助。

### 3.4 部署与运行时

- **Edge 指南**：撰写在 Deno Deploy（或其他 edge）上运行的说明及限制（如部分平台无长连接 WebSocket）。
- **Docker**：保留 init 的 Dockerfile；可增加最小 docker-compose（应用 + 数据库）示例。

### 3.5 可观测与性能

- **压缩**：可选 gzip/brotli 响应体中间件或文档化接入方式。
- **静态缓存**：对构建产物约定或实现默认 Cache-Control 策略（如带 hash 长期缓存）。
- **指标**：可选 /metrics 端点（请求数、延迟等），便于对接 Prometheus。

### 3.6 文档与 DX

- **错误码参考**：单页或单节列出所有 DWEB_Exx，含原因与处理建议。
- **生产清单**：安全、压缩、缓存、日志、环境、健康检查。
- **E2E**：持续关注超时与重试策略；若 CI 仍不稳定可考虑拆分重用例或再放宽超时。

---

## 4. 优先级概览

| 优先级 | 方向     | 建议 |
| ------ | -------- | ---- |
| 高     | 安全     | CORS 选项 + 安全文档 |
| 高     | 文档     | 错误码参考、生产清单 |
| 中     | 性能     | 压缩中间件、静态缓存策略 |
| 中     | API      | OpenAPI 生成（可选） |
| 中     | 部署     | Edge 运行指南 |
| 低     | 渲染     | SSR 流式、ISR/再验证、局部 hydrate |
| 低     | 可观测   | 链路追踪、指标端点 |

---

## 5. 小结

Dweb 已具备完整的全栈基础（路由、多种渲染模式、会话、插件、i18n、错误体系）。当前主要缺口在：**内置安全（CORS、CSP、限流）**、**安全与生产环境文档**、**响应压缩与缓存策略**，以及**可选的 API 契约（OpenAPI）**。优先补齐安全与文档可提升生产可用性；随后可逐步做压缩/缓存与 OpenAPI/Edge 文档。
