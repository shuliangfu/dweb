# dweb 控制台应用（Console App）架构规划

> **⚠ 产品范围修订（2026-08-25）**\
> §3.2.0「**仅多应用**可建 console、单应用 init 不询问」**已废止**。\
> 新产品：`AppKind = web | api | console` 一等公民——**单应用也可选纯 Console**；多应用下 **每个 app 选类型**，共用 `common/config`。\
> **补充约定（同日拍板）**：config 用顶层 **`kind`**；**一项目只一个 console**，多应用目录名默认 **`console`**。\
> **init / 分期实现 / 与 API 并列** 以专文为准：\
> **[2026-08-25-app-kinds-init-实现分析.md](./2026-08-25-app-kinds-init-实现分析.md)**。\
> 本文仍作 **Console 运行时 / 路由 DSL / 退出码 / 安全** 详设；实现时 init 边界服从专文。

> **核心设想**\
> 在现有 **Web 应用**（HTTP + 文件路由 + 渲染）之外，提供并列的
> **控制台应用**：\
> 通过 **`dweb-cli` 文件路由** 调用业务命令，例如：\
> `dweb-cli crond/start` → 执行 `console/routes/crond.ts` 导出的 **`start`
> 方法**。\
> 拥有与 Web 应用同级的 **独立 config / 生命周期 / 服务容器 / 插件**，但
> **不启动 HTTP Server**。

| 项       | 值                                                                                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 文档性质 | **架构规划 / 可行性分析**（非已实现 changelog）；**init 产品范围见 2026-08-25 专文**                                                                                 |
| 基准     | `@dreamer/dweb` **3.5.11**；`@dreamer/console` **1.0.x**（CLI 工具库）                                                                                                 |
| 日期     | **2026-07-22**（原稿）；**2026-08-25** 文首修订（废止「仅多应用」）                                                                                                   |
| 语言     | 仅中文                                                                                                                                                                 |
| 相关     | [2026-08-25-app-kinds-init-实现分析.md](./2026-08-25-app-kinds-init-实现分析.md)、[APP_CONFIG.md](./APP_CONFIG.md)、[全面分析-优化与增强.md](./全面分析-优化与增强.md)、`src/cmd/init/*`、`src/utils/project.ts`、`src/feature/command.ts`、`src/cli.ts` |

---

## 1. 结论先行

### 1.1 这个方向好不好？

**很好，而且和 dweb 现有心智高度同构。**

| 维度   | Web 应用                             | Console 应用（设想）                       |
| ------ | ------------------------------------ | ------------------------------------------ |
| 入口   | `dweb-cli dev/start` → HTTP          | `dweb-cli <route>/<action>` → 进程内调用   |
| 路由   | `routes/**` 文件路由                 | `console/routes/**` 命令路由               |
| 配置   | `config/main.ts`（含 server/render） | **独立 config**（无 server/render 或忽略） |
| 运行时 | Server + 中间件 + 页面               | **CLI + 服务容器 + 可选 DB/插件**          |
| 输出   | HTML/JSON                            | **终端**（`@dreamer/console` 已具备）      |

类比生态：**Laravel Artisan**、**Symfony Console**、**Nest CLI 自定义
command**、**Rails runner**——都是「框架内一等公民的控制台面」。

### 1.2 为何适合 dweb？

1. **已有半成品**
   - `@dreamer/console`：Command、参数解析、表格、prompt、spinner。
   - dweb `feature/command.ts` 扩展 `Command`，**`initApp()` 已写「console
     模式」**：加载配置、`delete loadedConfig.server`、创建 `App` 并 `start()`。
   - 框架内置命令（`db` / `generate` / `dev`…）已证明「CLI + 项目上下文」可行。

2. **与文件路由同构**\
   Web：`routes/users/index.tsx` → URL `/users`。\
   Console：`console/routes/crond.ts` + `start` → CLI `crond/start`。\
   **学习成本低**，generate 也可对称生成。

3. **配置独立**\
   控制台任务常要 DB/队列/密钥，**不必**起 3000 端口；独立 config
   避免「为了跑迁移硬开 Web 配置」。

4. **运维场景刚需**\
   定时任务触发、数据修复、种子、缓存预热、对账脚本、一次性运维——若全散落
   `scripts/*.ts`，会失去统一配置、插件、日志与错误码。

### 1.3 一句话产品定义

> **Console App = 无 HTTP 的 dweb 应用：同一套 App/Config/Service/Plugin
> 骨架，用「文件命令路由」替代「文件 HTTP 路由」。**

---

## 2. 现状与缺口（以源码为准）

### 2.1 已有能力

| 能力          | 位置                          | 说明                                     |
| ------------- | ----------------------------- | ---------------------------------------- |
| CLI 工具库    | `@dreamer/console`            | 解析参数、子命令、美化输出、交互         |
| dweb CLI 入口 | `src/cli.ts`                  | **硬编码**注册 init/dev/build/start/db/… |
| Command + App | `src/feature/command.ts`      | `initApp()` console 模式雏形             |
| 项目配置加载  | `config-loader` / `getConfig` | 多应用 common + app 配置                 |
| 内置运维命令  | `cmd/db.ts` 等                | 写死在框架里，非用户路由                 |
| 计划任务      | `plugins.scheduledPlugin`     | **跑在 Web 进程内**，不是独立 CLI 路由   |

### 2.2 缺口（本规划要补的）

| 缺口                                 | 影响                                   |
| ------------------------------------ | -------------------------------------- |
| 无用户侧 `console/routes/**` 约定    | 业务命令只能手写脚本或改框架 CLI       |
| CLI 路由未动态发现                   | 每个命令都要改 `cli.ts`                |
| Console 与 Web 配置未分型            | 易误开 server/render；校验规则混在一起 |
| 无 `dweb-cli list` 列出可用命令      | DX 差                                  |
| 无统一上下文（args/options/cwd/app） | 各脚本风格不一                         |
| 与 cron/systemd/K8s CronJob 未文档化 | 运维接入靠猜                           |

---

## 3. 目标架构

```text
                  ┌──────────────────────────────────────┐
运维 / 开发者     │  dweb-cli  [全局选项]  <路由>  [参数]  │
                  └──────────────────┬───────────────────┘
                                     │ 1. 解析 argv
                                     │ 2. 识别内置命令 vs 用户命令
                                     ▼
                  ┌──────────────────────────────────────┐
                  │  Console Router（新增）                │
                  │  crond/start  →  module + method       │
                  │  user:seed    →  可选别名语法          │
                  └──────────────────┬───────────────────┘
                                     │ dynamic import
                                     ▼
                  ┌──────────────────────────────────────┐
                  │  console/routes/crond.ts               │
                  │  export async function start(ctx)      │
                  └──────────────────┬───────────────────┘
                                     │
                  ┌──────────────────▼───────────────────┐
                  │  ConsoleApp / App（console 模式）      │
                  │  · 独立 ConsoleConfig                  │
                  │  · ServiceContainer / DB / 插件        │
                  │  · 不 listen HTTP                      │
                  │  · 生命周期：boot → run → shutdown     │
                  └──────────────────────────────────────┘
```

### 3.1 双应用形态并列

|          | **Web App**              | **Console App**                                     |
| -------- | ------------------------ | --------------------------------------------------- |
| 角色     | HTTP 服务、页面/API      | CLI 命令、运维/批处理                               |
| 配置     | Web 的 `config/main.ts`  | Console 自己的 `config/main.ts`                     |
| 命令路由 | `routes/**`（HTTP）      | `console/**` 或「console 应用目录」下的 `routes/**` |
| 启动     | `dweb-cli dev` / `start` | `dweb-cli run <route>/<action>`                     |
| 必需依赖 | server、router、render   | **否**；可选 database、logger、plugins              |
| 退出码   | 进程常驻                 | **0 成功 / 非 0 失败**（CI/cron 关键）              |

### 3.2 init 与目录布局（**仅多应用**支持 Console）

#### 3.2.0 产品决策（硬约束）

> **Superseded（2026-08-25）**  
> 下表为 **历史决策**，实现时 **不要**再按此限制。  
> **现行（见 app-kinds 专文）：**  
> - 单应用可选纯 Console（项目根即 console 根）  
> - 多应用每个 app 选顶层 `kind`；**一项目至多一个** console，目录名 **默认 `console`**  
> - config 写顶层 `kind: "console"`（与顶层 `name` 同级）  
> 见 [app-kinds 实现分析](./2026-08-25-app-kinds-init-实现分析.md) §3–§5、§8 Phase 0。

| 模式       | init 是否询问 console | init 是否生成 `console/` | 说明（历史 → 现行）                                                    |
| ---------- | --------------------- | ------------------------ | ---------------------------------------------------------------------- |
| **单应用** | **否**（已废止）      | **否**（已废止）         | **现行：可选 kind=console**；根即应用根，不再套一层 `console/`         |
| **多应用** | **是**（已演进）      | 用户选是则生成           | **现行：选 kind=console 时目录默认 `console`；一项目只允许一个**       |

**历史理由（仅作档案，已不适用）：** 旧文认为单应用不应塞 console、须走 multi。  
**现行理由：** Console 与 Web/API 同级一等公民；多应用仍用 common 共享 model/service；目录固定 `console` 降低 `-a` 歧义。

---

#### 3.2.1 多应用目录与 useSrc

现有：`prefix = useSrc ? "src/" : ""`（`generate.ts`）。Console **同一规则**：

```text
prefix = useSrc ? "src/" : ""

# 多应用 + 用户同意创建控制台
{prefix}common/…           # 公共 config / model / service
{prefix}<webApp>/…         # 一个或多个 Web 应用
{prefix}console/
  config/main.ts           # Console 独立配置（合并 common）
  routes/                  # CLI 命令文件路由（非 HTTP）
    crond.ts
    …
```

```text
# useSrc = true（默认）
my-project/
  src/
    common/
      config/
      model/
      service/
    web/                    # 示例 Web 应用名（用户自定）
      main.ts
      config/
      routes/               # HTTP
    console/                # ★ 多应用 + kind=console（一项目只一个；目录名固定）
      config/
        main.ts             # 顶层 kind: "console"
      routes/
        crond.ts            # export start / stop …
      middlewares/          # 可选

# useSrc = false
my-project/
  common/
  web/
  console/
    config/
    routes/
```

| 点       | 约定                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| 目录名   | **固定默认 `console`**（一项目只一个；init 拦截第二个）                                |
| 配置     | `common/config` → `console/config` 覆盖；顶层 **`kind: "console"`**                    |
| 模板     | **命令** `routes/*.ts`，**不**生成页面 tsx；**不**强制 `dev:console` / `start:console` |
| CLI      | `dweb-cli run crond/start`（默认解析唯一 `console`；`-a console` 可选）                |
| 构建 Web | 扫描静态资源时 **排除** `console/**`                                                   |

---

#### 3.2.2 单应用（**现行：可选纯 Console**）

> 旧文「单应用不生成 console」**已废止**。现行：

```text
# 单应用 + kind=web|api —— 无 console 子目录（根即该应用）
my-project/
  src/   # 或不用 src
    main.ts
    config/main.ts   # kind: "web" | "api"
    routes/

# 单应用 + kind=console —— 项目根即 console 根（不再套一层 console/）
my-project/
  src/
    config/main.ts   # kind: "console"
    routes/
      crond.ts
```

| init 选「单应用」+ 类型 | 行为 |
| --- | --- |
| Web / API | 生成 HTTP 骨架（API 无 `_app`） |
| Console | 生成 CLI 命令骨架；**不** listen；文档引导 `dweb-cli run` |

若单应用已是 Web，又要加 CLI：应改为 **多应用**（Web + 唯一 `console/`），而不是在 Web 根下半吊子塞 `console/`。

---

#### 3.2.3 路径解析算法（single + multi）

```text
function resolveConsoleRoot(projectRoot, options):
  if options.consoleDir: return options.consoleDir

  info = getProjectInfo(projectRoot)   # 现有：看 deno.json tasks 判 single/multi
  useSrc = detectUseSrc(projectRoot)
  base = useSrc ? join(projectRoot, "src") : projectRoot

  if info.mode === "single":
    # 单应用纯 Console：根即应用根；靠顶层 kind === "console" 校验
    return base

  # 多应用：一项目只一个 console，目录名默认固定
  app = options.app ?? "console"
  root = join(base, app)

  if exists(join(root, "routes")) or exists(join(root, "config")):
    return root
  error: 未找到控制台目录 {root}（init 多应用时请选择应用类型 Console）
```

**配置 / 路由：**

| 模式 | useSrc | console 根 | config | 命令 routes |
| --- | --- | --- | --- | --- |
| multi | true | `src/console` | `src/console/config`（+ `src/common/config`） | `src/console/routes` |
| multi | false | `console` | `console/config`（+ `common/config`） | `console/routes` |
| single + kind=console | true | `src` | `src/config` | `src/routes` |
| single + kind=console | false | 项目根 | `config` | `routes` |

`crond/start` → `…/console/routes/crond.ts` 的 `start`。

---

#### 3.2.4 init 交互（最终）

```text
? 应用模式: 单应用 / 多应用
? 是否使用 src 目录?  (Y/n)

# —— 单应用 ——
  （结束应用相关提问：引擎、渲染、样式…）
  ★ 不询问、不生成 console

# —— 多应用 ——
? 应用名称…（可多次，如 web / backend）
? 是否创建控制台应用 console?  (Y/n)     # ★ 仅此处询问
  → Yes: appNames 加入 "console"，生成 {prefix}console/…
         使用命令路由模板（非页面 tsx）
  → No:  仅用户输入的 Web 应用名
```

| init 选项（规划）      | 说明                                               |
| ---------------------- | -------------------------------------------------- |
| `appMode === "single"` | **`createConsole` 固定 false**，UI 不展示          |
| `appMode === "multi"`  | 可问 `createConsole`；或允许应用名直接填 `console` |
| `useSrc`               | 决定 `src/console` 还是根级 `console`              |
| `consoleExample`       | 多应用且创建 console 时是否带示例命令（默认 true） |

---

#### 3.2.5 对照表

| 场景                 | init 问 console？ | 生成目录           | CLI                        |
| -------------------- | ----------------- | ------------------ | -------------------------- |
| 单应用               | **否**            | **无**             | 仅框架内置命令             |
| 多应用 + 否          | 问了选否          | 无 console         | 仅内置 + 各 Web app        |
| 多应用 + 是 · useSrc | 问了选是          | **`src/console/`** | `dweb-cli run crond/start` |
| 多应用 + 是 · 无 src | 问了选是          | **`console/`**     | 同上                       |

```text
单应用（任意 useSrc）     多应用 + console + useSrc
───────────────────       ────────────────────────
无 console 目录             src/common/
                           src/web/
                           src/console/config + routes
```

**一句话：**

- **单应用 = 纯 Web，init 与 console 无关。**
- **多应用才问「是否创建 console」**；目录与其它 app 同级，并遵循 **useSrc →
  `src/console` / 根 `console`**。

**仍否决：** 单应用半吊子 `console/`；与 Web 共用 config；命令塞进 HTTP
`routes/`。

### 3.3 路由约定（核心 DSL）

#### 3.3.1 默认：`路径/动作`

| CLI                    | 文件                                                      | 调用         |
| ---------------------- | --------------------------------------------------------- | ------------ |
| `dweb-cli crond/start` | `console/routes/crond.ts`                                 | `start(ctx)` |
| `dweb-cli crond/stop`  | 同上                                                      | `stop(ctx)`  |
| `dweb-cli user/seed`   | `console/routes/user/seed.ts` **或** `user.ts` 的 `seed`  | 见解析优先级 |
| `dweb-cli cache/clear` | `console/routes/cache/clear.ts` 的 `default`/`run`/`main` | 单动作文件   |

**解析优先级（建议写死并测 golden）：**

1. 精确文件：`console/routes/{segments...}.ts` 存在 →
   - 若还有下一段作为 **方法名** 且 export 存在 → 调方法；
   - 否则调 `default` / `run` / `main`。
2. 目录 + 文件：`console/routes/a/b.ts` + 动作 `c` → `c` 方法。
3. 聚合文件：`console/routes/a.ts` + 动作 `b` → `export function b`。
4. 失败 → 清晰错误：列出候选路径（类似 HTTP 404）。

用户举例 **`crond/start` → `console/routes/crond.ts` 的 `start`** 正好是规则
3，**优先支持**。

#### 3.3.2 可选语法糖（后期）

| 语法                   | 映射                                           |
| ---------------------- | ---------------------------------------------- |
| `dweb-cli crond:start` | 同 `crond/start`（Artisan 风格）               |
| `dweb-cli make:user`   | `console/routes/make/user.ts` 或 generate 别名 |

**首版建议只做 `/` 分隔**，避免与全局选项、内置子命令歧义。

#### 3.3.3 与内置命令冲突

| 规则         | 说明                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------ |
| **内置优先** | `init`/`dev`/`build`/`start`/`db`/… 永不走 console 路由                                          |
| **保留字**   | 文档列出；用户勿用 `dev.ts` 当业务命令名，或强制 `console/` 命名空间：`dweb-cli run crond/start` |

**推荐首版增加显式前缀（更安全）：**

```bash
dweb-cli run crond/start
dweb-cli run user/seed -- --force
```

- `run` 为唯一内置入口，后面全是用户路由。
- **优点**：零冲突、可 `--help` 专门文档。
- **缺点**：多打一个词。

**备选**：无 `run`，靠「非内置名 → console 路由」；实现简单但对用户隐藏规则。

**规划建议：首版 `dweb-cli run <route>`；稳定后可选「裸路由」兼容。**

---

## 4. 命令模块契约

### 4.1 导出形态

```ts
// console/routes/crond.ts
import type { ConsoleContext } from "@dreamer/dweb/console"; // 规划中的类型导出

export async function start(ctx: ConsoleContext): Promise<void> {
  ctx.log.info("cron daemon starting…");
  // ctx.app / ctx.container / ctx.args / ctx.options
}

export async function stop(ctx: ConsoleContext): Promise<void> {/* … */}

export async function status(ctx: ConsoleContext): Promise<number> {
  // 可选：返回 process exit code
  return 0;
}
```

单文件单动作：

```ts
// console/routes/cache/clear.ts
export default async function (ctx: ConsoleContext) {
  await ctx.container.get("cache").flush();
}
// 或 export async function run(ctx) {}
```

### 4.2 `ConsoleContext`（建议字段）

| 字段        | 类型               | 说明                                     |
| ----------- | ------------------ | ---------------------------------------- |
| `app`       | `App`              | console 模式启动的 App（无 HTTP listen） |
| `container` | `ServiceContainer` | 与 Web 相同 DI                           |
| `config`    | `ConsoleConfig`    | 已合并的控制台配置                       |
| `args`      | `string[]`         | 位置参数（路由之后）                     |
| `options`   | `ParsedOptions`    | `--foo` 等                               |
| `cwd`       | `string`           | 项目根                                   |
| `log`       | Logger             | 统一日志（勿直接 console 混乱）          |
| `signal`    | `AbortSignal`      | Ctrl+C / 超时取消                        |
| `name`      | `string`           | 当前命令路由名如 `crond/start`           |

### 4.3 元数据（可选 export）

```ts
export const meta = {
  description: "计划任务守护相关",
  /** 供 dweb-cli run --help 或 list */
  actions: {
    start: {
      description: "启动",
      options: [{ name: "daemon", type: "boolean" }],
    },
    stop: { description: "停止" },
  },
};
```

用于 **自动 help** 与 **list**，不必手写进 `cli.ts`。

### 4.4 中间件 / 钩子

```text
console/middlewares/*.ts  或  模块 export before/after
```

典型：分布式锁（防重复 cron）、环境检查（仅 production）、确认交互（`confirm`
删除数据）。

---

## 5. 配置体系（独立 config）

### 5.1 原则

| 原则           | 说明                                                            |
| -------------- | --------------------------------------------------------------- |
| **物理独立**   | Web 与 Console 各有 `config/main.ts`（或分文件），避免互相污染  |
| **可共享片段** | `common/config/database.ts` 被两边 import 合并                  |
| **类型分型**   | `ConsoleConfig` ⊆ 或 ∥ `AppConfig`，**无 server/render 必填**   |
| **加载顺序**   | 与 Web 类似：common → console 应用配置 → CLI 覆盖（`--env` 等） |

### 5.2 `ConsoleConfig` 草案

```ts
interface ConsoleConfig {
  name: string;
  version?: string;
  language?: AppLanguage;
  envPrefix?: string;
  logger?: LoggerConfig;
  database?: DatabaseAppConfig;      // 运维命令高频
  plugins?: AppPlugin[];             // 可复用 scheduled 以外的插件
  pluginManagerOptions?: …;
  /** console 专有 */
  console?: {
    /** 路由根目录，默认 console/routes */
    routesDir?: string;
    /** 命令默认超时 ms */
    timeout?: number;
    /** 是否允许交互 prompt（CI 应 false） */
    interactive?: boolean;
    /** 全局 before/after */
    middlewares?: string[];
  };
  // 明确不包含或忽略：server、router、render、build（Web 专用）
}
```

### 5.3 与 `Command.initApp()` 的关系

现状（`feature/command.ts`）：

- `getConfig` → `delete loadedConfig.server` → `new App` → `app.start()`。

规划演进：

1. **`AppStartMode = "web" | "console"`**（或 `listen: false`）。
2. console 启动：**初始化 service/plugin/database/logger**，**跳过**
   `initializeServer` / listen / 客户端构建。
3. 结束后 **`shutdown` 排空连接**（DB pool），保证 CLI 进程可退出。

这是实现上最关键的一点，否则「起了 App 进程不退出 / 误绑端口」。

### 5.4 环境变量

- Web：`APP_PORT`…
- Console：可用同一 `envPrefix`，或 `CONSOLE_` / `DWEB_CONSOLE_`。
- CI：`CI=1` → `interactive: false`。

---

## 6. CLI 体验设计

### 6.1 推荐命令面

```bash
# 执行（首版）
dweb-cli run crond/start
dweb-cli run crond/start -- --verbose --once
dweb-cli run user/seed --app console          # 多应用
dweb-cli run cache/clear -a backend

# 发现
dweb-cli run --list                 # 或 dweb-cli list
dweb-cli run crond --help           # 列出 crond.ts 上的 actions

# 生成
dweb-cli generate -t console -n crond
dweb-cli g -t console -n user/seed
```

`--` 之后为 **传给命令模块的参数**（与框架全局选项分离）。

### 6.2 全局选项（与 Web 对齐）

| 选项               | 说明                  |
| ------------------ | --------------------- |
| `-a / --app`       | 多应用名              |
| `--cwd`            | 项目根（可选）        |
| `--config`         | 指定 console 配置路径 |
| `-v / --verbose`   | 详细日志              |
| `--no-interactive` | 禁用 prompt           |
| `--timeout <ms>`   | 覆盖默认超时          |

### 6.3 退出码约定

| Code | 含义                  |
| ---- | --------------------- |
| 0    | 成功                  |
| 1    | 业务失败 / 未捕获错误 |
| 2    | 路由未找到 / 参数非法 |
| 130  | SIGINT                |
| 124  | 超时（若采用）        |

---

## 7. 与 Web、计划任务、db 命令的关系

| 能力                  | 关系                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| **Web App**           | 并列产品；共享 common 模型/服务代码，**不共享 HTTP 管道**                                      |
| **`scheduledPlugin`** | 仍可在 Web 进程内定时；**也可** cron 调 `dweb-cli run crond/tick`（更易水平扩展与观测）        |
| **`dweb-cli db *`**   | 保持框架内置；长期可迁到 `console/routes/db/*` 但 **非必须**（避免破坏兼容）                   |
| **`generate`**        | 增加 `type=console` 模板                                                                       |
| **插件**              | console 启动时可加载同一套业务插件（发邮件、连队列），但禁用「依赖 HTTP 的插件钩子」或文档标明 |

### 7.1 典型场景映射

| 场景             | 用法                                           |
| ---------------- | ---------------------------------------------- |
| 系统 cron 每分钟 | `* * * * * cd /app && dweb-cli run crond/tick` |
| K8s CronJob      | 容器 command：`dweb-cli run report/daily`      |
| 本地修数据       | `dweb-cli run fix/orders -- --id 123`          |
| 发版后迁移       | 继续 `dweb-cli db migrate` 或 console 包装     |
| 交互式种子       | `dweb-cli run user/seed` + `confirm()`         |

---

## 8. 安全与治理

| 风险                         | 对策                                                                     |
| ---------------------------- | ------------------------------------------------------------------------ |
| 任意人可在服务器执行危险命令 | 部署面：仅运维镜像含 CLI；文件系统权限；禁生产 interactive 删库          |
| 命令注入                     | 只 `import` 项目内 `console/routes` 白名单路径；禁止用户传入绝对路径模块 |
| 配置泄露                     | 日志默认脱敏；verbose 不打印密钥                                         |
| 重复执行                     | 中间件文件锁 / Redis lock；cron 用 `flock`                               |
| 与 Web 共用 DB 误操作        | 命令 `meta.requiresConfirm`；staging 先跑                                |

---

## 9. 实现分层（模块建议）

| 模块                                | 职责                                       |
| ----------------------------------- | ------------------------------------------ |
| `feature/console-router.ts`         | 路径解析、模块加载、方法绑定               |
| `feature/console-context.ts`        | 构建 `ConsoleContext`                      |
| `feature/console-app.ts` 或扩 `App` | `start({ mode: "console" })` / 不 listen   |
| `core/config` 扩展                  | `loadConsoleConfig` / 类型 `ConsoleConfig` |
| `cmd/run.ts`                        | `dweb-cli run` 实现                        |
| `cmd/init` 模板                     | 可选生成 `console/` 骨架                   |
| `cmd/generate`                      | `-t console`                               |
| 测试                                | 解析 golden、mock 命令退出码、不启动端口   |

**尽量复用**：`@dreamer/console` 的解析与输出；`ServiceContainer`；现有
`loadProjectConfig`。

---

## 10. 分阶段路线图

### Phase 0 — 决策（文档确认）

- [x] **产品范围**：**已修订**——单应用可选 Console；详见 app-kinds 专文（废止「仅 multi」）
- [x] **目录**：多应用 `{prefix}console/`（**固定名**，一项目一个）；`prefix` 跟 **useSrc**；单应用纯 Console 时根即应用根
- [x] **config**：顶层 `kind: "console"`（与顶层 `name` 同级）
- [x] 采用 **`dweb-cli run <route>`**（首版不做裸路由）
- [x] `App.start({ mode: "console" })`（扩展 App，非独立 ConsoleApp）
- [x] 多应用 init：`kind=console` 文案与示例命令（见 app-kinds Phase 1）

### Phase 1 — MVP（可用）✅ 已落地（见 app-kinds Phase 3，2026-08-25）

- [x] 路径解析：`resolveConsoleRoot`（single=项目根；multi=`{prefix}console/`）
- [x] `console/routes` + `crond.ts` 多 export 方法
- [x] `dweb-cli run crond/start`（默认唯一 console / 可选 `-a console`）
- [x] 独立 `console/config/main.ts`（含顶层 `kind`）+ common 合并
- [x] App console 模式：装 DB/logger，不 listen，退出前 shutdown
- [x] 错误信息 + 退出码
- [x] 单测：路由解析 + 一次 e2e 脚本

### Phase 1.5 — init 模板（可与 MVP 并行；**以 app-kinds Phase 1 为准**）✅

- [x] 单应用可选 `kind=console` 骨架
- [x] 多应用：选 Console → 目录默认 `console`；拦截第二个
- [x] 示例：`routes/hello.ts` / `crond.ts`
- [x] **不**生成 `dev:console` / `start:console`（或仅文档说明）

### Phase 2 — DX ✅ 部分落地（app-kinds Phase 4 + Console 加固，2026-08-25）

- [x] `run --list` / 读 `meta` 描述（模块过滤）
- [x] `generate -t console`（单/多应用；多应用默认 `console/`）
- [x] 全局中间件雏形：`console/middlewares/*.ts` + 模块 `before`/`after`（锁/确认等可后续加）
- [x] 模块 help（`run hello` 列出动作）/ 超时 / `--` 透传 / did-you-mean
- [x] 文档：README / PRODUCTION / example 仓（cron/K8s 仍可再扩）

### Phase 3 — 增强

- [ ] `:` 语法糖
- [ ] 交互式菜单 `dweb-cli run` 无参时列出
- [ ] 与 scheduledPlugin 统一「任务注册表」
- [ ] 远程执行（可选，安全要求高，默不做）

---

## 11. 风险与反模式

| 反模式                     | 说明                    |
| -------------------------- | ----------------------- |
| 把所有业务塞进 `cli.ts`    | 失去文件路由红利        |
| Console 强行渲染 HTML      | 边界混乱                |
| 不 shutdown 导致 CLI 挂死  | 必须测「进程退出」      |
| 与内置命令抢名             | 用 `run` 前缀或保留字表 |
| 配置与 Web 强耦合必填 port | 违背独立 config         |

---

## 12. 成功标准

1. **多应用**项目中新增 `console/routes/xxx.ts` + config，**无需改框架源码**
   即可 `dweb-cli run xxx/yyy`。
2. 同一多应用 monorepo 内 Web 与 Console **配置分离**（common 可共享）。
3. 命令可访问 **DB/服务容器**，且执行完 **进程正常退出**。
4. 内置 `dev/build/db` **行为不变**；**单应用 init 行为不变**（无 console
   提问）。
5. 文档 + 至少 1 个 **多应用** example（含 `console/routes/hello.ts`）。

---

## 13. 与用户设想的对照

| 用户设想                                                      | 本规划结论                                                       |
| ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `dweb-cli crond/start` → `console/routes/crond.ts` 的 `start` | **支持**；解析规则优先「文件 + 方法」                            |
| 独立 config，像 web 应用一样                                  | **支持**；`ConsoleConfig` 分型，无 server 必填                   |
| 控制台应用 vs Web 应用                                        | **并列一等公民**，共享 common，分离入口与路由根                  |
| **多应用时增加 console 目录**                                 | **正确**；init **仅多应用**询问；与 web 同级，路径跟 **useSrc**  |
| **单应用是否创建 console？**                                  | **否**；init **不询问、不生成**；需要 CLI 应用面请用多应用       |
| 很好吗？                                                      | **很好**；补齐 Artisan 式能力，且复用现有 console + initApp 雏形 |

**建议微调**：首版用 **`dweb-cli run crond/start`**
避免与内置命令冲突；习惯稳定后可加裸命令别名。

---

## 14. 摘要

| 问题                    | 答案                                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| 要不要做？              | **建议做**，产品完整度与运维体验提升明显                               |
| 本质是什么？            | **文件式 CLI 路由 + 无 HTTP 的 App 运行时**                            |
| 最大实现点              | `App` console 模式生命周期 + 路由解析器 + 独立配置加载                 |
| 最先交付                | `run` 子命令 + 单例 hello + 配置 + 退出码测试                          |
| **单应用 + console**    | **产品不支持**（init 不建；run 可对 single 直接报错引导多应用）        |
| **多应用 console 目录** | **`{prefix}console/`**（useSrc → `src/console/`，否则根级 `console/`） |
| **useSrc 影响**         | 仅多应用：与 common/web 同一 prefix                                    |

---

_文档结束。目录策略见 §3.2；确认 Phase 0 其余项后可按 §10 开工实现。_
