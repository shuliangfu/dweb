# dweb 应用类型升级实现分析：Web / API / Console 一等公民

| 项       | 值                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 日期     | 2026-08-25                                                                                                                                                               |
| 目标版   | 建议纳入 **dweb 3.7.x**（产品能力 minor；行为兼容旧 Web 脚手架）                                                                                                         |
| 文档性质 | **实现分析 + 产品决策刷新**（可据此开工；非 changelog）                                                                                                                  |
| 输入     | 现有 [CONSOLE应用架构规划.md](./CONSOLE应用架构规划.md)、README「API 应用」约定、`cmd/init/*` 现状、[2026-08-25-dweb-升级全面分析.md](./2026-08-25-dweb-升级全面分析.md) |
| 非目标   | 本文不展开 builder 拆分 / Streaming SSR / 生产 CSP 等其它浪潮；只列关联                                                                                                  |

---

## 0. 结论先行

1. **有分析文档，但不完整、部分决策已过时**
   - Console：**有**完整架构规划（`CONSOLE应用架构规划.md`），但
     **未实现**；且旧文写死「**仅多应用**可建 console、单应用绝不询问」。
   - API：README / 中文 README **口头约定**「纯 API 单独建应用、无
     `_app.tsx`」，**init 从未按类型生成**——现在每个 app 都当 Web（必有 `_app` /
     `_layout` / 页面）。
2. **需要另写「升级实现分析」——即本文**：把 **Web / API / Console** 收成统一的
   **`AppKind`**，刷新 init / 配置 / 运行时 / CLI / generate，并**废止**旧
   CONSOLE §3.2.0「单应用禁止 console」。
3. **产品决策（已拍板，2026-08-25）**
   - **单应用**：init 可选类型 **Web | API | Console**。
   - **多应用**：每添加一个 app 时选择类型；**各自 `config/`**；**共用
     `common/config`（及 model/service…）**。
   - Console / API 与 Web **同级一等公民**，不是「Web
     项目里勾选附属目录」的二等公民。
   - **配置**：顶层 **`kind`**（与现有顶层 `name` 同级）。
   - **API**：handler 直接放在 **`routes/`**，不强制再套 `routes/api/`。
   - **Console**：一项目 **只一个**；多应用目录名默认 **`console`**。
4. **实现顺序建议**：类型模型 + init 脚手架（可立刻用）→ API 运行配置（弱化
   render）→ Console 运行时（`dweb-cli run` + 不 listen）→ generate / 文档 /
   example。

---

## 1. 既有文档够不够？还差什么？

| 主题                               | 已有                                 | 缺口                                                                               |
| ---------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| Console 运行时 / 路由 DSL / 退出码 | CONSOLE 规划 §3–§9 较完整            | **代码未落地**；`feature/command.initApp` 仅雏形（删 server 后 `App.start`）       |
| Console × init                     | 旧规划仅 multi + 勾选 `console` 目录 | **与新产品冲突**：单应用也要能建纯 Console；多应用应按 **app 类型** 而非固定目录名 |
| API 应用                           | README 一小节约定                    | **无专文、无 AppKind、init 全生成页面壳**                                          |
| 统一三种类型                       | 无                                   | **缺总控实现分析**（本文补齐）                                                     |
| 依赖/Node 升级                     | 升级全面分析、3.6.0 已发             | 本能力属 **下一波产品**，不重复 Node 工程                                          |

**答案：**

- 「Console 要不要做、怎么跑」→ **有架构文，可复用 70% 运行时设计**。
- 「init 直接创建 console + api，且单/多应用都一等公民」→
  **旧文不够，必须用本文替换产品边界后再实现**。

---

## 2. 现状（以源码为准）

### 2.1 init 今天只能建「Web」

`collect.ts` 固定询问：runtime → single/multi →（multi 时只收集
**名字字符串**）→ **UI 引擎** → **渲染模式** → 样式 → useSrc → 示例。

`generate.ts` 对每个 app **一律**：

- 写 `routes/_app.tsx`、`_layout.tsx`、`index.tsx`（及 about/user）
- 写带 `server.port` 的 config
- multi 时才有 `common/config`

**没有** `AppKind` 字段（见 `init/types.ts`）。

### 2.2 配置加载其实已支持「common + app」

`core/config.ts` / `config-loader.ts`：多应用先加载 `common/config`，再叠 app
`config`。\
→ **API/Console 独立 config + 共用 common** 在加载链路上 **可复用**，缺的是
**分型模板与校验**（Console 不应强制 port/render；API 可无页面引擎）。

### 2.3 Console 半成品

| 能力                                     | 状态    |
| ---------------------------------------- | ------- |
| `@dreamer/console` 工具库                | ✅      |
| `Command.initApp()` 删 `server` 后起 App | 雏形 ✅ |
| 用户 `routes/**` 文件命令路由            | ❌      |
| `dweb-cli run`                           | ❌      |
| init 生成 console 骨架                   | ❌      |

### 2.4 API「半约定」

文档说可建名为 `api` 的应用且无视图；实际 init 仍生成完整 Web 壳。开发者只能手删
`_app` / 改 config——**无官方类型、无校验、无 tasks 区分**。

---

## 3. 目标产品模型：`AppKind`

```ts
/** 应用种类——与「单应用 / 多应用」正交 */
type AppKind = "web" | "api" | "console";
```

| Kind        | 本质                     | HTTP         | 视图 / render                       | 路由根                                                                  | 主入口命令                          |
| ----------- | ------------------------ | ------------ | ----------------------------------- | ----------------------------------------------------------------------- | ----------------------------------- |
| **web**     | 全栈页面应用（现状默认） | ✅ listen    | ✅ engine + mode                    | `routes/**`（页+可含 `routes/api/**`）                                  | `dev` / `build` / `start`           |
| **api**     | 纯 HTTP API              | ✅ listen    | ❌ 无 `_app`/`_layout`/CSS 引擎必选 | **整棵 `routes/**` 直接放 handler**（**不再**强制套一层 `routes/api/`） | 同 web（无客户端包或极简）          |
| **console** | CLI 命令应用             | ❌ 不 listen | ❌                                  | `routes/**` 导出动作方法                                                | **`dweb-cli run <route>/<action>`** |

**配置：**

|      | 单应用                            | 多应用                                        |
| ---- | --------------------------------- | --------------------------------------------- |
| 公共 | 无 `common/`（或可选空）          | **`{prefix}common/config` + model/service/…** |
| 应用 | `{prefix}config`（或根下 config） | `{prefix}<appName>/config`                    |
| 合并 | 仅自身                            | **common → app 覆盖**（现有机制）             |

**目录名（Phase 0 已拍板）：**

| Kind        | 命名约定                                                                                                                                             |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **web**     | 用户自定（多应用常见 `web` / `frontend` / …）                                                                                                        |
| **api**     | 用户自定；习惯可用 `api`，不强制                                                                                                                     |
| **console** | **一项目只允许一个 console**；init / 脚手架目录名 **默认固定为 `console`**（单应用纯 Console 时即项目根，不再套一层；多应用则为 `{prefix}console/`） |

类型以配置顶层 **`kind`** 为准（见 §5.4），不以目录名猜测。

---

## 4. 对旧 CONSOLE 规划的修订（Breaking 产品决策）

| 旧决策（CONSOLE §3.2.0 / §10 Phase0）   | 新决策（本文）                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| 单应用 **不**询问、**不**生成 console   | 单应用可选 **纯 Console 项目**                                                        |
| 仅 multi 勾选「是否创建 console 目录」  | multi 下每个 app 选 kind；**console 目录默认名固定 `console`**，且 **一项目至多一个** |
| 成功标准含「单应用 init 行为不变」      | **单应用 init 交互会变**（增加类型步骤）；旧「只建 Web」可通过默认选 Web 保持兼容     |
| `resolveConsoleRoot` 对 single 直接报错 | single + kind=console → 项目根即 console 根；multi → `{prefix}console/`               |

**仍保留的 CONSOLE 规划精华（实现时直接复用）：**

- 文件路由：`crond/start` → `routes/crond.ts` 的 `start`
- 推荐子命令前缀：`dweb-cli run …`（防撞内置命令）
- App 启动模式：装 service/DB/plugin，**不** `initializeServer` / listen，结束
  **shutdown**
- 退出码、安全白名单、`generate -t console`、与 cron/K8s 文档

运行时章节以 CONSOLE 文 §3.3–§9 为详设；**init 与产品范围以本文为准**。

---

## 5. init 交互与数据结构

### 5.1 扩展 `InitOptions`

```ts
type AppKind = "web" | "api" | "console";

interface InitAppSpec {
  name: string; // single 可用 projectName 或固定 "app"
  kind: AppKind;
}

interface InitOptions {
  // …既有字段
  appMode: "single" | "multi";
  /** 单应用：一个元素；多应用：N 个 */
  apps: InitAppSpec[];
  /** 兼容：可从 apps 推导；逐步弃用裸 appNames */
  appNames?: string[];

  // Web 专用（仅当存在 kind=web 的 app 时询问 / 写入）
  engine?: Engine;
  renderMode?: RenderMode;
  style?: Style;

  // API 可选
  apiExampleLevel?: "minimal" | "with-crud"; // hello + 可选资源示例

  // Console 可选
  consoleExampleLevel?: "minimal" | "with-crond"; // hello / crond
}
```

### 5.2 交互草图

```text
? 运行时: Deno / Bun
? 应用模式: 单应用 / 多应用
? 使用 src 目录? (Y/n)

# —— 单应用 ——
? 应用类型: Web / API / Console
  → Web:    再问 引擎 / 渲染 / 样式 / 示例粒度
  → API:    问 API 示例粒度（跳过引擎/渲染/样式或样式默认 none）
  → Console: 问 Console 示例（跳过引擎/渲染/样式/port）

# —— 多应用 ——
循环:
  ? 应用类型: Web / API / Console
  ? 应用名称
      → Console：名称默认填 `console`（只允许创建一个；再次选 Console 应拒绝）
      → Web / API：用户自定名
  （可按类型收集差异化选项；或统一收集「项目级默认 Web 选项」仅用于 web apps）
直到名称留空结束（至少一个 app）
→ 始终生成 common/（config + model + service + …）
```

**默认兼容：** 菜单默认项仍为 **Web**，老用户心智接近现状。\
**Console 约束：** 收集阶段若已有 `kind=console`，不再提供 Console
选项（或选中时报错）。

### 5.3 生成物矩阵

| Kind    | `main.ts`                           | `config`                                                                            | `routes`                                                                                                           | assets/CSS | deno tasks                                                                    |
| ------- | ----------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------- |
| web     | `App` + server                      | 顶层 `name` + `kind: "web"`；server + render + plugins                              | `_app` `_layout` 页面…（仍可另有 `routes/api/`）                                                                   | 按 style   | `dev/build/start[:name]`                                                      |
| api     | `App` + server                      | 顶层 `name` + `kind: "api"`；server；**render 关闭或极简**；无 UI 插件              | **无** `_app`/`_layout`；handler **直接**在 `routes/`（如 `routes/hello.ts` → `/hello`，**不**再套 `routes/api/`） | 通常无     | 同 web（可无 client build 或空客户端）                                        |
| console | 可选薄入口或仅 config；主路径走 CLI | 顶层 `name` + `kind: "console"`；**无 server.listen**；database/logger/plugins 可选 | `hello.ts` / `crond.ts` 导出方法                                                                                   | 无         | **不**生成 `dev:console` 起 HTTP；文档写 `dweb-cli run`；可选 `task run` 包装 |

**多应用 common：** 三种 kind 都生成同一套 `common/`；app config 注释标明「覆盖
common」。

### 5.4 类型元数据落盘（**已拍板：顶层 `kind`**）

与现有写法一致：`config/main.ts` 已是顶层 **`name` / `version` / `server` /
…**（见 init 模板与 [APP_CONFIG.md](./APP_CONFIG.md)），**不加**嵌套
`app: { kind }`。

```ts
export default {
  name: "api", // 现有顶层字段
  kind: "api", // ★ 新增顶层字段；缺省视为 "web"（旧项目兼容）
  version: "1.0.0",
  server: { port: 3001 },
  // …
};
```

框架 `dev` / `start` / `run` 读顶层 `kind`：是否构建客户端、是否允许
`run`、校验是否要求 port。\
可选后续再加发现缓存（`.dweb/apps.json`），**首版不需要**。

---

## 6. 运行时实现要点

### 6.1 Web

保持现状；回归门禁：默认 init Web ≡ 今天行为（路径/任务名可对齐）。

### 6.2 API

| 点                        | 约定（已拍板）                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 路由布局                  | handler **直接**放在 `routes/` 下（例：`routes/hello.ts` → `/hello`，`routes/users/index.ts` → `/users`）；**不要**再强制一层 `routes/api/` |
| URL 前缀                  | 若业务需要 `/api/...` 路径，用文件路径表达即可（如 `routes/api/hello.ts`），属用户自选，**不是**框架强制目录约定                            |
| 文件形态                  | 只认 API handler（`GET`/`POST`/… export）；禁止依赖页面组件                                                                                 |
| render                    | `render.enabled = false` 或 engine 占位但不打客户端包                                                                                       |
| `_app.tsx`                | **不生成**；请求纯 JSON/Response                                                                                                            |
| 中间件                    | cors / 限流等可在模板里 opt-in 注释块                                                                                                       |
| 与「web 里的 routes/api」 | 并存：Web 应用仍可有嵌套 `routes/api/`；**纯 API 应用**是整 app 无页面，根目录即 API 路由根                                                 |

### 6.3 Console（复用 CONSOLE 规划）

| 模块                                    | 职责                                                  |
| --------------------------------------- | ----------------------------------------------------- |
| `cmd/run.ts`                            | 解析 `run <route>/<action>`、`-a`、退出码             |
| `feature/console-router.ts`             | 路径 → 模块 → 方法                                    |
| `App.start({ mode: "console" })` 或等价 | 跳过 listen / 客户端构建；必 shutdown                 |
| config                                  | 顶层 `kind: "console"` 时校验不要求 port；忽略 render |

**目录与 `-a`（已拍板）：**

| 模式                  | console 根                  | `-a`                                                                      |
| --------------------- | --------------------------- | ------------------------------------------------------------------------- |
| 单应用 `kind=console` | 项目根（即应用根）          | 可省略                                                                    |
| 多应用                | **固定** `{prefix}console/` | 默认可解析到唯一的 `console`；一般不必强求 `-a`（一项目只有一个 console） |

### 6.4 CLI 分发规则

```text
argv 命中内置命令（init/dev/build/start/test/…）→ 旧逻辑
否则若 subcommand === "run" → Console 路由器
否则 → 未知命令帮助（首版不做裸 `crond/start`，减少冲突；与 CONSOLE 建议一致）
```

---

## 7. generate / examples / 文档

| 项                  | 内容                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------ |
| `dweb-cli generate` | `-t page`（web）、`-t api`、`-t console`；按当前 app `kind` 限制或警告               |
| examples            | 至少：`multi-web-api-console` 最小仓；单应用各 kind 各一 smoke（或 init 黄金快照测） |
| README              | 「三种应用类型」专节；废止「只能手建 api 名」的模糊描述                              |
| CONSOLE 规划文      | 文首加 **被本文修订** 横幅；§3.2.0 标 **Superseded**                                 |
| 升级全面分析        | 浪潮 E3 从「仅多应用 Console MVP」改为「AppKind + init + run」                       |

---

## 8. 分阶段实现路线（可排期）

### Phase 0 — 决策冻结（本文 · **已全部拍板 2026-08-25**）

- [x] 单应用可选 Web/API/Console
- [x] 多应用每 app 选 kind；common 共享
- [x] **config 字段**：顶层 **`kind`**（与现有顶层 `name` 同级；**不用**
      `app.kind`）
- [x] **API 路由**：整棵 **`routes/`** 直接放 handler；**不**强制 `routes/api/`
- [x] **Console 数量**：一项目 **只一个** console；多应用目录名 **默认
      `console`**；`-a` 可省略（唯一可解析）

### Phase 1 — Init 脚手架（用户立刻可感）✅ 已落地（2026-08-25）

1. [x] 扩展 `types` / `collect` / i18n 文案；multi 收集时 **拦截第二个 console**
2. [x] 按 kind 分支 `generate` 模板（api/console 新模板文件）；config 写入顶层
       `kind`
3. [x] multi：`apps: {name,kind}[]`；console 的 `name` 默认 `console`；生成
       common + 各 app
4. [x] deno.json tasks：web/api 有 `dev/build/start`；console 无 HTTP task 或仅
       `run` 包装
5. [x] 单测：三种 single + 一种 multi 混合（含唯一 console）的目录快照

**附带：** `@dreamer/router` 增加 `apiOnly` 并已按规范 **全量测试 + 发 JSR
`1.2.1`**（tag `v1.2.1`）；dweb `initializeRouter` 在 `kind==="api"`
时开启；dweb 依赖 `router@^1.2.1`。

> **跨包规则（已确认）：** 升级 dweb
> 时若因扩展包能力受限必须先升扩展包，则扩展包升完后 **必须全量测试通过**，并
> **按 dreamer-jsr-publish 流程发 JSR**，再继续 dweb。

**退出标准：** `dweb-cli init` 能生成可打开的目录结构；Web 回归与现网一致。

### Phase 2 — API 运行时硬化 ✅ 已落地（2026-08-25）

1. [x] 发布 **router@1.2.1** 并让 dweb 依赖 `^1.2.1`
2. [x] config 顶层 `kind: "api"` → 跳过客户端构建 / 无 HTML
       壳（加固：`isApiKind`；`App` 不挂渲染器；`build`/`initializeBuild`
       skipClient；dev HMR 仅 invalidate）
3. [x] 示例：`routes/hello.ts` 提供 `GET/POST /hello`（JSON）— fixture + init
       generate integration
4. [x] 文档 + README「三种应用类型」专节（中/英 README、APP_CONFIG）

### Phase 3 — Console 运行时 MVP ✅ 已落地（2026-08-25）

1. [x] `dweb-cli run` + 路由解析 +
       退出码；解析根：single→项目根，multi→`console/`
2. [x] App console 模式不 listen + shutdown（`isConsoleKind`；剥离 common 泄漏的
       `server`；禁 hotReload）
3. [x] init 生成的 `hello` / `crond` 可执行（模板接 `ConsoleContext`）
4. [x] 单测：解析 golden + `resolveConsoleRoot`；集成：fixture + init 子进程
       `run`（**防挂死**）

（详设见 CONSOLE §5–§6。）

### Phase 4 — DX ✅ 已落地（2026-08-25，暂不发 JSR）

- [x] `run --list` / `--timeout` / `--` 透传（cli 预处理 + console parser
      本地修复）
- [x] `generate -t console`（及 kind 交叉警告；`kind=api` 时 api 平铺
      `routes/`）
- [x] example：`examples/app-kinds/multi-web-api-console`
- [x] PRODUCTION_CHECKLIST / README / APP_CONFIG 补 kind 说明
- [x] **Console 再加固**：`middlewares/` + `before`/`after`；`run hello` 模块
      help；路由 did-you-mean；超时/多应用边界测

（仍未发 JSR。）

### Phase 5 — 与其它升级浪潮衔接（非阻塞）

- 生产 CORS 预设对 **api** 模板默认更有用
- test 报告、builder 拆分可并行，**不**堵 Phase 1–3

---

## 9. 风险与兼容

| 风险                                | 缓解                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| 改变 init 提问吓到老用户            | 默认仍 Web；文档写迁移                                                          |
| 无 `kind` 的旧项目                  | 缺省 **web**（行为与今相同）                                                    |
| Console 进程不退出                  | Phase 3 强制 shutdown 测                                                        |
| API 与 web 内 `routes/api` 概念混淆 | 文档对照表：web 可嵌套 `routes/api/`；**api kind 根即 routes/**，不强制再套一层 |
| 与旧 CONSOLE「仅 multi」文档冲突    | 本文 + 旧文首横幅                                                               |
| 用户想建多个 console                | **产品禁止**；init 拦截；文档写清「一项目一个 console」                         |

---

## 10. 成功标准

1. **单应用** init 可选 Web / API / Console，目录与 config 符合 §5.3；config
   含顶层 `kind`。
2. **多应用** init 可为每个 app 选类型；存在 **`common/config`**，各 app **自有
   config** 且可覆盖 common；**至多一个** `console/`。
3. API 应用：**无** `_app.tsx`，handler 在 **`routes/` 根下**，`dev/start`
   能提供 JSON API。
4. Console 应用：`dweb-cli run hello/world`（或示例动作）成功且 **进程退出码
   0**。
5. 未指定 `kind` 的旧项目仍按 **web** 工作。
6. 内置 `dev/build/start/db/test` 对 web/api 不回归；console 不误绑端口。

---

## 11. 是否还要再写文档？

| 文档                     | 还要不要写                                                                     |
| ------------------------ | ------------------------------------------------------------------------------ |
| 本文（实现分析）         | **已齐**；Phase 0 **已全部拍板**，可直接按 Phase 1→3 开工                      |
| CONSOLE 规划             | **保留作 Console 运行时详设**；目录/数量约定与本文对齐即可                     |
| 单独「API 架构规划」长文 | **不必**；API 比 Console 简单，本文 §6.2 + 模板足够；若后续要 OpenAPI 再开专文 |
| 升级全面分析             | **已有交叉引用**，勿再复制粘贴                                                 |

---

## 12. 摘要

| 问题                     | 答案                                                              |
| ------------------------ | ----------------------------------------------------------------- |
| Console 有没有分析文档？ | **有**架构规划，但 **未实现**，且「仅多应用」**已过时**           |
| API 有没有？             | **仅有 README 约定**，无实现分析、init 未支持                     |
| 要不要再写实现分析？     | **要，即本文**：统一 `AppKind` + init + 配置 + 运行时分期         |
| 和「全面升级」关系？     | 属 3.7 产品主交付之一；与 Node 3.6.0 已完成线正交                 |
| Phase 0 三项             | **顶层 `kind`**；API **`routes/` 平铺**；**一项目一个 `console`** |
| 先做什么？               | **Phase 1 init 三类型脚手架** → API 硬化 → **Console `run` MVP**  |

---

_文档结束。Phase 0 已冻结，可按 Phase 1→3 开工。_
