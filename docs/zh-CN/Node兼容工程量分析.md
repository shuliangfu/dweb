# 全面兼容 Node.js：工程量与可行性分析

> **一句话结论**\
> **能做，但不便宜。**\
> monorepo 已用 `runtime-adapter` 把 **Deno / Bun 双跑** 扛住，且大量 API
> **底层已是 `node:*`（fs/path/crypto/child_process）**——这是好事。\
> 但适配层在 **模块加载时直接拒绝非 Deno/Bun**，HTTP `serve` / WebSocket
> 升级、`@dreamer/esbuild` 解析器、**JSR 模块图**、CLI/测试矩阵都是 **Node
> 原生缺口**。\
> **「全栈 Node 一等公民」≈ 数个季度的跨包工程**，不是给 `detect.ts` 加一个
> `IS_NODE` 就完事。\
> **更划算的路径**：分阶段——先 RA 底座 Node → 再 server/dweb 起服 → 再构建/CLI →
> view 几乎无额外服务端成本。

| 项       | 值                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------ |
| 分析日期 | **2026-07-22**                                                                                         |
| 范围     | `runtime-adapter` → dweb 直接依赖链 → `dweb` → `view`                                                  |
| 现状定位 | **官方目标：Deno + Bun**；Node = **未支持**（`Runtime = "deno" \| "bun" \| "unknown"`）                |
| 相关     | [依赖分析-优化与升级.md](./依赖分析-优化与升级.md)、[全面分析-优化与增强.md](./全面分析-优化与增强.md) |

---

## 1. 现状：双跑已经做了什么

### 1.1 设计中心：`@dreamer/runtime-adapter`

| 事实                                                                                                             | 含义                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| ~**47** 个 monorepo 包声明依赖 RA                                                                                | Node 兼容必须从 RA 打开闸门，否则下游全红                                                                 |
| `detect.ts` 顶层：`if (!IS_SUPPORTED) throw onlyBunOrDenoError`                                                  | **Node 现在 import 即炸**                                                                                 |
| API 面：file / path / env / process / network.serve / WS upgrade / signal / terminal / cron / system-info / hash | 双分支（Deno vs Bun）遍布；**~55+ 处** `IS_DENO`/`IS_BUN` 类分支量级                                      |
| 大量实现 **已经走 `node:fs` / `node:path` / `node:crypto` / `node:child_process` / `node:os`**                   | Bun 路径与 Node 高度重合 → **文件/路径/哈希/部分进程** 复用成本低                                         |
| 真正「双实现」的是                                                                                               | **`serve` + WebSocket 升级**、部分 **watchFs**、**Deno.Command vs Bun.spawn**、TTY/`setRaw`、系统信息细节 |

### 1.2 业务包是否直接绑死 Deno？

对 **dweb 关键路径** 粗扫（`src`）：

| 包                                      | 直接 `Deno.` / `Bun.`     | 主要靠 RA？                | Node 备注                                          |
| --------------------------------------- | ------------------------- | -------------------------- | -------------------------------------------------- |
| **runtime-adapter**                     | 大量                      | 自身                       | 主战场                                             |
| **dweb**                                | 极少（入口/诊断）         | **是**                     | 编排层相对干净                                     |
| **server / render / router / session…** | 少                        | **是**                     | 跟 RA serve 契约                                   |
| **esbuild**                             | 有 + **双解析器**         | 部分                       | **第二主战场**（`resolver-deno` / `resolver-bun`） |
| **test**                                | Deno.test / bun:test      | 混合                       | **第三主战场**（CI 矩阵 ×3）                       |
| **view**                                | 几乎无服务端 runtime 特判 | N/A（浏览器 + SSR 字符串） | **服务端 Node 成本最低**                           |
| **utils / console**                     | 少量                      | 部分                       | 补漏即可                                           |

**好消息**：dweb / 多数中间件 **没有** 满地 `Deno.readTextFile`；抽象方向正确。\
**坏消息**：抽象层 **故意不支持 Node**，且 **HTTP + 模块解析** 两块最难。

### 1.3 分发与生态现实

| 维度      | Deno                   | Bun                         | Node                                    |
| --------- | ---------------------- | --------------------------- | --------------------------------------- |
| 包消费    | `jsr:@dreamer/*` 一等  | JSR + npm `@jsr/dreamer__*` | **主路径是 npm**；纯 JSR 体验差         |
| dweb 已有 | `deno.json`            | `package.json` + bun        | package.json **有**，但 RA 加载即拒     |
| 锁/解析   | deno.lock + import map | bun.lock                    | package-lock / pnpm；**无 `jsr:` 原生** |
| 权限模型  | 细粒度 `--allow-*`     | 较松                        | 无 Deno 权限模型                        |

Node 兼容 **不只写代码**，还包括：**npm 发布一致性、exports 条件、双文档、三
CI**。

---

## 2. 难点拆解（按工程痛度）

### 2.1 P0 硬核：`runtime-adapter` 打开 Node

#### A. 检测与错误模型（小）

- `Runtime` 增加 `"node"`；`IS_NODE`；`IS_SUPPORTED = deno|bun|node`。
- 去掉或改为可配置的「顶层 throw」（否则任何副作用 import 都挂）。
- **工作量：0.5～1 人日**（含测试）。

#### B. 文件系统 / 路径 / env / hash（中低）

- Bun 分支多数已是 `node:fs` → **Node 可复用 Bun 实现** 或抽 `node-like`
  公共实现。
- 风险点：`watchFs` 语义、权限错误码映射、Windows 路径、symlink type。
- **工作量：3～7 人日**（对齐现有 RA 单测）。

#### C. 进程 / signal / terminal（中）

- `child_process` spawn 对齐 `createCommand` / `execCommandSync`。
- 信号：Node `process.on('SIGTERM')` vs Deno `addSignalListener`。
- TTY raw mode：Node `readline` / `tty.setRawMode`，行为与 Deno 不完全一致。
- **工作量：5～10 人日**。

#### D. HTTP `serve` + WebSocket 升级（**高**）

| 运行时 | 现状                                                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Deno   | `Deno.serve` + 同步 `upgradeWebSocket`（已踩坑修过）                                                                                        |
| Bun    | `Bun.serve` + 每请求 ALS 绑 server（1.1.0 修过多实例串台）                                                                                  |
| Node   | **无对等一等 API**；需 `node:http` / `node:http2` 或第三方（`@hono/node-server`、`srvx`、undici 等）把 **Fetch Request/Response** 接到 Node |

额外坑：

- dweb/server 假设 **Web 标准 Request/Response** 与 **某种 upgrade 契约**。
- WebSocket：`ws` 包 vs 原生实验 API；与现有 `@dreamer/websocket` / socket-io
  联调。
- 长连接、keep-alive、HTTP/2、优雅关闭与 Deno/Bun 句柄形状对齐。

**工作量：2～4 周**（仅 RA network + 契约测试，不含全业务）。\
**这是整条链路上的最大单点。**

#### E. system-info / cron 等（中低）

- 已有 `node:os`；Node 分支多半复制 Bun。
- cron 已用 `node-cron`。
- **工作量：2～4 人日**。

**RA 合计粗估：约 4～8 人周（一位熟手）做到「API 面 Node 可跑 +
主测通过」；生产级 serve/WS 取上界。**

---

### 2.2 P0/P1 硬核：`@dreamer/esbuild` 与构建

| 现状                                                                  | Node 缺口                 |
| --------------------------------------------------------------------- | ------------------------- |
| `resolver-deno.ts`：依赖 `deno info`、`import.meta.resolve`、JSR 缓存 | Node **没有** Deno 模块图 |
| `resolver-bun.ts`：Bun resolve + node builtins                        | **最接近 Node**，可作蓝本 |
| dweb `csr-client-builder`                                             | 再叠一层引擎入口/HMR      |

Node 路径现实选择：

1. **Node 上只用 npm 依赖图**（用户项目不用 `jsr:` 裸说明符）→ 实现
   `resolver-node`（类 bun，`createRequire` / `import.meta.resolve` Node 20+）。
2. **Node 仍想消费 JSR** → 需 `npx jsr` / 预装到 `node_modules` /
   自定义解析，**复杂度再 ×2**。

**建议产品边界（强烈）：**

> Node 一等公民 = **npm 安装的 `@dreamer/*` + 用户代码 ESM**；**不承诺** 与 Deno
> 相同的 `jsr:` 源码直引体验。

**工作量：**

| 范围                           | 估时                        |
| ------------------------------ | --------------------------- |
| resolver-node + 客户端构建冒烟 | **2～3 周**                 |
| 与 dweb CSR/HMR/多引擎矩阵对齐 | **+2～4 周**                |
| 坚持 Node 上完整 JSR 解析      | **+数周～月**（不推荐首期） |

---

### 2.3 P1：`@dreamer/server` 与 dweb App 起服

- 薄封装 RA.serve + 路由/中间件：若 RA 契约稳，**server
  改动中等**（类型、升级、错误映射）。
- dweb：`dev` / `start` / 热更新 / 静态 / session：跟 serve + watch + 动态
  `import()`。
- Node 动态加载 TS：
  - **tsx / ts-node / 先 build 再跑** 三选一；
  - Deno/Bun **可直接跑 TS**，Node **默认不能** → **产品必须定义「Node
    工作流」**（例如：`node --import tsx` 或只支持 dist）。

**工作量：2～4 周**（含 dev 体验最低可用），强依赖 RA.serve 质量。

---

### 2.4 P1：CLI（`@dreamer/console` + dweb-cli）

| 项                             | 难度                                            |
| ------------------------------ | ----------------------------------------------- |
| 参数解析/TTY 输出              | 低（已偏 Node 风格）                            |
| `dweb-cli` shebang / npm `bin` | 中：双发 `bin` 与 deno 安装脚本                 |
| 子进程调 deno/bun 专用命令     | 高：凡「内部 spawn deno」要改成 node 等价或去掉 |

**工作量：1～2 周**（bin + 文档 + 去掉硬编码 runtime 假设）。

---

### 2.5 P2：其余 dweb 依赖（database / session / ws / plugins…）

| 类型        | 代表                                                   | Node 预期                                      |
| ----------- | ------------------------------------------------------ | ---------------------------------------------- |
| 纯逻辑 + RA | service、lifecycle、middleware、plugin、logger、config | RA 通了后 **小改或零改**                       |
| 网络扩展    | websocket、socket-io                                   | **跟 serve 升级契约**，各 **数日～2 周**       |
| DB 驱动     | database                                               | 多数驱动本就 Node 友好；注意 Deno 专有驱动路径 |
| 插件        | plugins（tailwind/unocss/static）                      | 构建侧跟 esbuild Node 路径                     |
| image       | ImageMagick CLI                                        | 与 runtime 无关，**跨三端都要本机 binary**     |

**工作量（dweb 直接依赖全集回归）：2～4 周** 分散在联调，而非重写。

---

### 2.6 view 前端框架

| 层                            | Node 含义                                         |
| ----------------------------- | ------------------------------------------------- |
| 浏览器 CSR / 水合             | **与 Node 无关**（已是 DOM）                      |
| SSR `renderToString` / stream | 只要有 JS 运行时 + 可选 stream；**Node 20+ 友好** |
| 编译器 / optimize             | 若在 Node 跑 esbuild 插件：跟 esbuild Node 路径   |
| 直接 `Deno.`                  | **几乎无**                                        |

**结论：view 是全链路里 Node 成本最低的一环。**\
估时：**数日～1.5 周**（SSR 单测在 Node 跑通 + CI job），前提是测试 runner 支持
Node。

**不做 Islands 的决策对 Node 无负面影响**（少一套运行时特判）。

---

### 2.7 测试与 CI（`@dreamer/test`）— 常被低估

现状：Deno.test + bun:test 双实现，e2e Playwright。

Node 要：

- 第三套 runner 适配（node:test / vitest / 继续封装 test 包），或
- 规定 Node 只用「已编译测试」

矩阵从 **2 引擎 × OS** 变成 **3 引擎 × OS** → **CI 时间与 flaky 面 +50% 量级**。

**工作量：2～4 周**（test 包 + dweb/view 抽样 job），长期维护成本上升。

---

## 3. 工程量总表（粗估，1 名熟手全职）

| 阶段     | 内容                                              | 人周（约） | 累计       |
| -------- | ------------------------------------------------- | ---------- | ---------- |
| **M1**   | RA：detect + fs/path/env/hash/process 基础 Node   | 2～3       | 2～3       |
| **M2**   | RA：`serve` + WS 升级 + 契约测                    | 3～5       | 5～8       |
| **M3**   | server + session + middlewares 联调               | 1～2       | 6～10      |
| **M4**   | esbuild `resolver-node` + dweb build/dev 最小闭环 | 4～6       | 10～16     |
| **M5**   | dweb-cli bin、文档、init 模板 Node 说明           | 1～2       | 11～18     |
| **M6**   | view SSR Node CI + 依赖包回归                     | 1～2       | 12～20     |
| **M7**   | test 三引擎 + 全矩阵压 flaky                      | 2～4       | **14～24** |
| （可选） | Node 完整 JSR 解析、HTTP/2、与 Deno 行为 1:1      | +4～12+    | 显著膨胀   |

**量级结论：完整「Node 一等公民」≈ 3.5～6 个月单人，或 2 人并行约 2～3.5
个月。**\
**MVP「`node dist/server.js` 能起 SSR」≈ 6～10 人周**（砍 dev HMR、砍
JSR、砍部分 e2e）。

---

## 4. 好不好实现？——利弊与决策框架

### 4.1 为什么「相对可行」

1. **抽象层已经存在**，不是从 Next 式 Node-only 硬掰 Deno。
2. **Bun 路径 ≈ Node API**，fs/path/crypto 可复用，不是三套重写。
3. **view 不绑 Deno**，SSR 是标准 JS。
4. dweb **已有 package.json / npm 导出骨架**，不是纯 JSR-only 仓。
5. 业界有可参考适配（Hono/srrvx/uWebSockets 等）做 Node fetch server。

### 4.2 为什么「并不轻松」

1. **serve + WS** 历史债证明：双端已够难，第三端升级语义极易回归。
2. **模块解析**（JSR / deno.json imports）是 Deno 护城河，Node
   要嘛砍范围要嘛砸解析器。
3. **TS 直跑**体验 Deno/Bun 免费，Node 要工具链约定。
4. **CI ×3** 维护税永久存在。
5. **产品优先级**：当前主线是 view 2.1、构建债、Console、生产可观测——Node 会
   **抢同一批核心人力**。

### 4.3 战略选项（推荐排序）

| 选项                      | 描述                                                                       | 建议                                     |
| ------------------------- | -------------------------------------------------------------------------- | ---------------------------------------- |
| **A. 不做 Node 一等公民** | 文档明确：仅 Deno + Bun；Node 用户用 Docker/边缘适配                       | **默认**；成本最低                       |
| **B. Node 运行时 MVP**    | 仅 production：build 产物在 Node 用 `node:http` 适配跑；**无**完整 dev/HMR | 若有强客户/部署诉求                      |
| **C. Node 开发体验对齐**  | dev + HMR + CLI 三端对齐                                                   | **贵**；仅当 Node 开发者占比成为增长瓶颈 |
| **D. 假兼容**             | 只改 detect 不炸，serve 抛「请用 Deno/Bun」                                | 价值低，别做                             |

**推荐路径（若一定要做）：B → 再评估 C。**\
**不推荐**一上来承诺「与 Deno 完全相同的 DX + JSR」。

### 4.4 与「依赖全面升级」的关系

- Node 兼容是 **横切能力**，应 **排在** view 2.1 / RA 底座卫生 / builder 拆分
  **之后或并行专人**，避免同一 PR 搅在一起。
- 做 Node 前，**先完成 RA 1.1 能力与错误模型稳定**，否则 Node
  分支会建立在旧分叉上。

---

## 5. 分阶段落地草案（若立项）

### Phase 0 — 产品边界书面冻结（0.5 周）

写清：

- Node 最低版本（建议 **20 LTS+** 或 22）。
- 是否支持 TS 直跑 / 仅 dist。
- 是否支持 `jsr:` 用户代码。
- WebSocket / socket-io 是否首期必达。
- CI：哪些包必须 node job。

### Phase 1 — RA Node 底座（不含完美 WS）

- `IS_NODE`、fs/path/env/process 绿。
- `serve` 最小 HTTP（可先无 WS）。
- 单测在 Node 跑通子集。

### Phase 2 — server + dweb `start`（prod）

- 构建仍可在 Deno/Bun 完成，产物 Node 起服；或 Node 上 esbuild 最小路径。

### Phase 3 — esbuild resolver-node + `dweb dev` 子集

### Phase 4 — WS / 插件 / 全矩阵 / 文档

每阶段有 **退出标准**（测试列表 + 示例 app），避免无限「对齐 Deno 行为」。

---

## 6. 风险清单

| 风险                     | 影响         | 缓解                                |
| ------------------------ | ------------ | ----------------------------------- |
| WS 升级三端语义不一致    | 实时功能假绿 | 契约测试 + 明确 Node 用 `ws` 适配层 |
| 为 1:1 Deno 行为过度投入 | 工期翻倍     | 产品边界写「行为近似」              |
| JSR 在 Node              | 解析地狱     | 首期 npm-only                       |
| CI 时间爆炸              | 交付变慢     | Node job 仅 core 包 + 抽样 e2e      |
| 与 Bun 实现复制粘贴漂移  | 三端 bug     | 抽 `node-like.ts` 供 Bun+Node 共用  |
| 抢占 dweb 主线优化       | 战略分心     | 专人/专里程碑，不塞进 view 发版     |

---

## 7. 摘要表

| 问题                                                   | 答案                                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| 从 RA 开始扩到 dweb + view，全面 Node 兼容工程量大吗？ | **大**：完整一等公民约 **14～24 人周**；MVP prod 约 **6～10 人周**      |
| 好不好实现？                                           | **架构上可行**（RA + Bun≈Node）；**工程上偏难**（serve/WS + 解析 + CI） |
| 最难三点？                                             | ① HTTP/WS 适配 ② esbuild/JSR 模块图 ③ 三引擎测试维护税                  |
| 最容易？                                               | **view** SSR/CSR；多数纯逻辑包                                          |
| 现在该不该做？                                         | **非默认**；有明确 Node 部署/客户再上 **MVP（选项 B）**；完整 DX 延后   |
| 和当前优化主线冲突吗？                                 | **会抢人**；建议先 view 2.1 / 依赖卫生 / builder，Node 单独立项         |

---

## 8. 建议决策话术（对内）

> 我们 **具备** 做成 Node 第三运行时的结构基础（runtime-adapter + 已有 npm
> 包形态），\
> 但 **官方双目标仍是 Deno + Bun**。\
> 若业务需要 Node：立项 **「生产运行时兼容」**，不承诺开发期与 Deno 完全一致；\
> 工期按 **一季度 MVP、两季度稳态** 规划，而不是「加个 runtime 枚举」。

---

_文档结束。若立项，建议另开 RFC：Node serve 选型（原生 http vs srvx vs hono
node-server）与 WS 契约一页纸。_
