# dweb init 脚手架分析文档

本文档分析 `init.ts` 脚手架的需求与设计要点，用于初始化 dweb 项目（单应用 / 多应用），支持选择样式方案（Tailwind / UnoCSS）等。

---

## 一、已明确需求

| 项 | 说明 |
|----|------|
| **应用模式** | 可选「单应用」或「多应用」 |
| **样式方案** | 可选 Tailwind、UnoCSS（至少二选一或都不选） |
| **多应用目录** | 多应用时需为每个应用输入「应用名称」，作为应用目录名（如 backend、frontend、admin） |

### 1.1 多应用形态约定（模板与文档统一）

| 形态 | 含义 | 目录与路由 | 说明 |
|------|------|------------|------|
| **后台（默认）** | 后台管理 | 有 `_app.tsx`，有 `routes/` 页面路由（如 index、users、settings） | 带视图的管理后台，与 frontend 类似但用途为管理端 |
| **API 应用** | 纯 API，无视图 | 无 `_app.tsx`，仅 `routes/api/`（或仅 API 路由） | 仅提供接口，不做页面渲染；建议应用名单独为 `api` 等以区分 |

- **backend**：在模板与文档中**默认指「后台管理」**，即带页面、带 `_app.tsx`、带路由视图；除非显式选择「API 应用」形态。
- 若需要**纯 API 服务**（无 _app.tsx、仅 routes/api、无视图），应在脚手架或文档中作为**单独应用形态**（如应用名 `api`），与「后台」区分，并在模板中生成仅 API 路由的目录结构。

### 1.2 init 自身依赖与运行方式（已约定）

| 项 | 约定 |
|----|------|
| **依赖** | init.ts 依赖 `@dreamer/runtime-adapter`、`@dreamer/console` 以及 dweb 内部 `src/utils/version.ts`。版本与 deno.json 读取统一由 version.ts 提供（DWEB_VERSION、loadDwebDenoJson、兜底常量等），init 不再单独维护重复逻辑。 |
| **运行** | 在 dweb 包内执行：`deno run -A src/cmd/init.ts` 或 `bun run src/cmd/init.ts`（或通过 dweb CLI 子命令调用）。 |
| **Bun 兼容** | 必须兼容 Bun：文件系统、环境变量、路径、进程等一律通过 runtime-adapter 抽象，禁止直接使用 `Deno.*`，以便 Deno 与 Bun 下同一套代码均可运行。 |

### 1.3 模板存放方式（已约定）

| 方案 | 约定 |
|------|------|
| **不建 src/template** | **不单独建 `src/template/` 目录**，模板内容**全部在 init.ts 里**（字符串字面量、或按需拆成仅导出字符串的 `init-templates.ts`）。版本与 deno.json 读取由 `src/utils/version.ts` 提供。 |
| **全部在 init 内** | 生成用的“模板”（deno.json、main.ts、_app.tsx、config 等）一律在代码里写成字符串或常量，init 依赖 runtime-adapter + console + version，读输入、拼内容、写文件即可。 |
| **可选拆分** | 若后续模板很多，可拆成单文件如 `init-templates.ts`，**仅导出字符串/对象**，与 init.ts 一起发布。 |

结论：**不创建 src/template 目录**；模板在 init.ts（或 init-templates.ts）；版本与 deno 配置由 version.ts 统一提供，兼容 Bun。

---

## 二、建议补充的选项与考虑

### 2.1 与「应用形态」相关

| 项 | 说明 | 建议 |
|----|------|------|
| **UI 引擎** | Preact / React | 提供选项，默认 Preact；影响 deno.json 的 jsxImportSource、依赖与示例代码 |
| **渲染模式** | ssr / csr / ssg / hybrid | 可默认 hybrid 或 ssr；影响 config 中 `render.mode` 与示例注释 |
| **是否使用 src 目录** | 使用 `src/` 或根目录 | 可选，默认「使用 src」；影响路径与 deno.json tasks 中的入口路径 |

### 2.2 与「多应用」相关

| 项 | 说明 | 建议 |
|----|------|------|
| **应用名称校验** | 目录名合法性（仅小写、数字、连字符等） | 校验并提示，避免非法目录名与后续构建问题 |
| **端口分配** | 各应用默认端口 | 可自动分配（如 3000、3001、3002…）并写入各应用 `config/main.ts` |
| **common 目录** | 是否生成公共代码目录 | 多应用时默认生成 `common/config`、`common/utils`、`common/types` 等，并在各应用 config 中引用 |
| **deno.json 路径别名** | 多应用时 `@backend/`、`@frontend/`、`@common/` | 按应用名称动态生成 imports（如 `@admin/`、`@common/`） |
| **tasks 命名** | dev/build/start 的 task 名 | 按应用名生成 `dev:backend`、`build:frontend`、`start:admin` 等 |

### 2.3 与「样式」相关

| 项 | 说明 | 建议 |
|----|------|------|
| **「无样式」选项** | 不集成 Tailwind/UnoCSS | 提供「无」或「稍后配置」，仅生成空 CSS 或占位入口 |
| **Tailwind 版本** | v3 / v4 | 与当前 dweb/plugins 兼容性一致（如 v4），并在文档中注明 |
| **UnoCSS 集成方式** | 是否通过 @dreamer/plugins 的 UnoCSS 插件 | 若使用插件，需在 config 的 plugins 中写入对应插件配置；模板中需预留插件配置 |
| **CSS 入口位置** | 单应用 `src/assets/tailwind.css`，多应用每应用各自 assets | 与现有示例一致；生成对应空文件或基础 @tailwind 指令 |

### 2.4 与「项目元信息」相关

| 项 | 说明 | 建议 |
|----|------|------|
| **项目名称** | 根目录名或用户输入 | 可用于 `name`、README 标题、默认 config 中的 `name` |
| **项目版本** | 默认 `1.0.0` | 写入根 config 或各应用 config |
| **目标目录** | 在当前目录初始化 vs 新建子目录 | 支持 `dweb init`（当前目录）与 `dweb init my-app`（新建 my-app 并初始化） |

### 2.5 与「模板与文件」相关

| 项 | 说明 | 建议 |
|----|------|------|
| **示例代码粒度** | 空壳（仅 _app、_layout、index）vs 带 about、user/[id] 等 | 可选「最小」与「带示例路由」，便于不同习惯用户 |
| **deno.json** | 单应用/多应用、是否带 workspace | 单应用一个 deno.json；多应用一个根 deno.json，tasks/imports 按应用名生成；若后续支持子包再考虑 workspace |
| **.gitignore** | 忽略 .deno、dist、.env、node_modules 等 | 建议生成与 dweb 示例一致的 .gitignore |
| **.env.example** | 端口、环境等占位 | 可选生成，便于后续扩展 |
| **覆盖行为** | 目标目录已存在且非空 | 询问「覆盖 / 合并 / 取消」；若为合并，避免覆盖用户可能改过的文件（如只写缺失文件） |

### 2.6 与「运行与工具链」相关

| 项 | 说明 | 建议 |
|----|------|------|
| **运行时** | 仅 Deno / 仅 Bun / 双支持 | 当前以 Deno 为主（deno.json、deno run）；Bun 可注明「可用 bun run 运行相同 tasks」 |
| **依赖版本** | @dreamer/* 等版本号 | 与 dweb 主库或示例的 deno.json 对齐，便于复现；可集中维护一个「推荐版本」常量 |
| **init 入口** | 通过 `deno run -A src/cmd/init.ts` 或 CLI 子命令 | 若 dweb 有 CLI（如 `dweb init`），可把 init 作为子命令统一入口 |

---

## 三、交互流程草图（仅供参考）

```
1. 选择/输入目标目录
   → 当前目录 或 输入目录名（新建）
   → 若目录非空：覆盖 / 合并 / 取消

2. 应用模式
   → 单应用 / 多应用

3. 若多应用
   → 输入应用名称列表（逗号或逐行），校验合法
   → 每个应用可选形态：后台管理（默认，带 _app.tsx + 页面路由）/ API 应用（无 _app.tsx，仅 routes/api）
   → 是否生成 common 目录（默认是）
   → 各应用默认端口（可自动递增）

4. UI 引擎
   → Preact（默认）/ React

5. 渲染模式
   → ssr / csr / ssg / hybrid（默认可 hybrid）

6. 样式方案
   → Tailwind / UnoCSS / 无（稍后配置）

7. 是否使用 src 目录
   → 是（默认）/ 否

8. 示例代码
   → 最小（_app、_layout、index）/ 带示例路由（about、user/[id] 等）

9. 确认并生成
   → 输出目录结构说明与下一步命令（deno task dev 等）
```

---

## 四、生成物清单（核对用）

- [ ] 根目录 `deno.json`（tasks、imports、compilerOptions）
- [ ] 单应用：`src/main.ts`、`src/config/main.ts`（及可选 main.dev.ts）、`src/routes/`（_app、_layout、index 等）、`src/assets/`（可选 tailwind.css / uno 入口）
- [ ] 多应用：每个应用 `src/<appName>/main.ts`、`src/<appName>/config/`、`src/<appName>/routes/`、`src/<appName>/assets/`；可选 `src/common/config/`、`src/common/utils/`、`src/common/types/`
- [ ] 样式：若选 Tailwind，对应 CSS 入口及（若用插件）config 中 plugins 配置；若选 UnoCSS，同理
- [ ] `.gitignore`、可选 `.env.example`
- [ ] 可选 `README.md`（项目名、如何 dev/build/start）

---

## 五、尚未考虑或待定的点

- **i18n / 主题等**：是否在 init 中提供「预置 @dreamer/plugins 的 i18n/theme 插件」选项。
- **测试**：是否生成 `tests/` 占位或简单单测示例（deno test）。
- **类型**：根目录或 common 下是否生成共享类型（如 `types/mod.ts`）。
- **多应用时 backend 形态**：已约定（见 1.1）：backend 默认为「后台管理」带页面；纯 API 形态单独为「API 应用」（如 api），无 _app.tsx、仅 routes/api、无视图。
- **init 自身依赖**：已约定（见 1.2）：仅依赖 @dreamer/runtime-adapter 与 @dreamer/console，可单独运行，兼容 Bun；不依赖 dweb 主包。
- **模板存放**：已约定（见 1.3）：不建 src/template 目录，模板全部在 init.ts（或仅导出字符串的 init-templates.ts）内嵌，便于 init 单独运行、不依赖 dweb。

以上内容供实现 `init.ts` 时按需采纳与裁剪。
