# dweb 框架 i18n 国际化分析文档

> 本文档分析 dweb 框架如何支持 i18n 国际化，实现自动检测系统语言、自动使用翻译语言，使框架内所有文本根据系统语言自动切换。

---

## 一、现状分析

### 1.1 需要翻译的文本类型

| 类型 | 位置 | 示例 | 运行环境 |
|------|------|------|----------|
| **错误消息** | `src/utils/errors.ts` | `DEFAULT_ERROR_MESSAGES`、`throwDwebError` | 服务端 / CLI |
| **CLI 帮助** | `src/setup.ts` | `printUsage()` 使用方式、命令说明 | CLI |
| **CLI 输出** | `src/cmd/init.ts`、`db.ts`、`generate.ts` 等 | 初始化提示、迁移状态、生成结果 | CLI |
| **日志/控制台** | `src/core/app.ts`、`plugin-events.ts`、`render-*.ts` | `console.error`、`console.warn` | 服务端 |
| **客户端提示** | `src/feature/csr-client-builder.ts` | Hydration 失败、HMR 回退、页面加载错误 | 浏览器 |
| **HTML 默认** | `render-csr.ts`、`init.ts` 模板 | `<html lang="zh-CN">` | 服务端 / 生成 |

### 1.2 已有 i18n 基础设施

- **错误处理**：`DwebError` 已支持 `messageKey`、`params`，提供 `setDwebErrorTranslator` 可接入翻译器
- **@dreamer/i18n**：项目内已有 `@dreamer/i18n` 库，支持 `createI18n`、`$t()` 全局翻译、`setLocale`、`formatNumber` 等
- **init 模板**：`init.ts` 已生成 `i18n-ally` 配置，说明业务层 i18n 已有约定

### 1.3 运行环境差异

| 环境 | 语言检测来源 | 说明 |
|------|--------------|------|
| **CLI（Deno/Bun）** | `LANG`、`LC_ALL`、`LANGUAGE` 环境变量 | 终端/系统语言 |
| **服务端（SSR）** | 请求头 `Accept-Language`、环境变量 | 按请求或进程 |
| **浏览器** | `navigator.language`、`navigator.languages` | 用户浏览器语言 |

---

## 二、系统语言检测方案

### 2.1 检测优先级

```
1. 用户显式设置（config.i18n.locale 或 --lang 参数）
2. 环境变量：LANGUAGE > LC_ALL > LANG
3. 浏览器：navigator.languages[0] > navigator.language
4. 默认回退：zh-CN
```

### 2.2 环境变量解析

| 变量 | 示例 | 说明 |
|------|------|------|
| `LANG` | `zh_CN.UTF-8`、`en_US.UTF-8` | 主语言 |
| `LC_ALL` | 同上 | 覆盖所有 locale |
| `LANGUAGE` | `zh_CN:en_US:en` | 多语言优先级（冒号分隔） |

解析逻辑：取第一个有效 locale，将 `zh_CN` 规范化为 `zh-CN`，`en_US` 规范化为 `en-US`。

> **实现注意**：环境变量读取应使用 `@dreamer/runtime-adapter` 的 `getEnv()`，以兼容 Deno/Bun，符合框架 Bun 兼容性规范。

### 2.3 浏览器检测

```typescript
// 客户端
const locale = navigator.language || navigator.languages?.[0] || "zh-CN";
```

### 2.4 服务端请求检测

```typescript
// 从 Accept-Language 解析
const acceptLanguage = request.headers.get("Accept-Language");
// 例: "zh-CN,zh;q=0.9,en;q=0.8" → 取 zh-CN
```

---

## 三、架构设计

### 3.1 统一翻译入口

框架内所有需要翻译的文本统一通过**全局方法 `$t(key, params?)`** 获取，不直接写死中文/英文。

`$t` 挂载到 `globalThis`，无需 import，任意模块可直接调用。

```
┌─────────────────────────────────────────────────────────────┐
│                    dweb i18n 架构                             │
├─────────────────────────────────────────────────────────────┤
│  $t(key, params?)  ←── 全局统一入口（globalThis.$t）           │
│       │                                                     │
│       ├── 检测当前 locale（系统/请求/配置）                    │
│       ├── 查找翻译：src/locales/{locale}/dweb.json             │
│       ├── 回退：zh-CN → en-US → key                           │
│       └── 插值：{path}、{name} 等                             │
├─────────────────────────────────────────────────────────────┤
│  接入层                                                       │
│  - setDwebErrorTranslator() 桥接到 $t()                       │
│  - initDwebI18n() 初始化时挂载 globalThis.$t                  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 翻译文件结构

```
dweb/
└── src/
    ├── locales/                 # 框架内置翻译（随包发布，需加入 publish.include）
    │   ├── zh-CN/
    │   │   └── dweb.json        # 错误、CLI、日志等
    │   └── en-US/
    │       └── dweb.json
    └── utils/
        └── i18n.ts              # 框架 i18n 工具（检测、t、加载）
```

> **说明**：`locales` 放在 `src` 下，便于通过 `import.meta.url` 做相对路径解析（如 `new URL("../locales/zh-CN/dweb.json", import.meta.url)`），且与源码同目录便于维护。发布时需在 `deno.json` 的 `publish.include` 中增加 `src/locales/**/*.json`。

### 3.3 入口初始化原则

**所有入口在执行任何可能产生可翻译文本的逻辑之前，必须调用 `initDwebI18n()` 初始化 i18n。**

`initDwebI18n()` 应设计为**幂等**：已初始化则跳过，避免重复加载。

| 入口文件 | 初始化时机 | 说明 |
|----------|------------|------|
| `src/cli.ts` | `import.meta.main` 分支内、`createCLI`/`execute` 之前 | CLI 主入口，**所有子命令（dev/build/init/generate/db 等）均经此分发**，此处初始化即可覆盖全部 CLI 场景 |
| `src/setup.ts` | `import.meta.main` 分支内、`installGlobalCli` 之前 | 安装全局 dweb-cli 的独立入口（`deno run setup`） |
| `src/core/app.ts` | `createApp()` 或 `init` 阶段开始处 | 应用启动入口，用户 main.ts 通过 createApp 间接进入 |

**实现建议**：在 `src/utils/i18n.ts` 中提供 `initDwebI18n(options?)`，内部完成：
1. 检测 locale（环境变量 / 配置）
2. 加载翻译文件
3. 挂载 `globalThis.$t` 全局翻译方法
4. 设置 `setDwebErrorTranslator((key, params) => $t(key, params))` 桥接
5. 标记已初始化，后续调用直接返回（幂等）

### 3.4 键命名规范

| 前缀 | 用途 | 示例 |
|------|------|------|
| `errors.` | 错误消息 | `errors.DWEB_E01`、`errors.DWEB_E30` |
| `cli.` | CLI 帮助与输出 | `cli.usage`、`cli.commands.init` |
| `log.` | 日志/控制台 | `log.configInitFailed`、`log.ssrError` |
| `client.` | 客户端提示 | `client.hydrationFailed`、`client.pageLoadError` |

---

## 四、实现方案

### 4.1 阶段一：基础设施

1. **新增 `src/utils/i18n.ts`**
   - `initDwebI18n(options?)`：**入口必须调用**，幂等初始化，检测 locale、加载翻译、桥接 `setDwebErrorTranslator`
   - `detectLocale()`：从环境变量/浏览器检测
   - `getLocale()` / `setLocale()`：当前语言
   - `$t(key, params?)`：全局翻译入口，挂载到 `globalThis.$t`，支持回退
   - `loadDwebTranslations(locale)`：加载 `src/locales/{locale}/dweb.json`

2. **新增 `src/locales/zh-CN/dweb.json`、`src/locales/en-US/dweb.json`**
   - 将 `DEFAULT_ERROR_MESSAGES` 迁移为 JSON
   - 补充 CLI、log、client 等键

3. **桥接错误模块**
   - 调用 `setDwebErrorTranslator((key, params) => $t(key, params))`，错误消息通过 `$t` 翻译

### 4.2 阶段二：CLI 与日志

1. **CLI 输出**
   - `setup.ts`：`printUsage()` 使用 `$t("cli.usage")` 等
   - `cmd/init.ts`：初始化成功/失败提示
   - `cmd/db.ts`：迁移状态、提示文案
   - `cmd/generate.ts`：生成结果

2. **日志**
   - `app.ts`：配置初始化失败
   - `plugin-events.ts`：插件错误
   - `render-ssr.ts`、`render-csr.ts` 等：渲染错误

3. **语言检测时机**
   - CLI：进程启动时读取 `LANG` 等，调用 `setLocale(detectLocale())`
   - 服务端：可在 `app.start` 前设置，或按请求在中间件中设置（若需按请求切换）

### 4.3 阶段三：客户端

1. **注入 locale 到 HTML**
   - 服务端渲染时根据 `Accept-Language` 或配置写入 `<html lang="...">`
   - 将 `locale` 注入到 `window.__DWEB_LOCALE__` 或类似变量

2. **客户端提示**
   - `csr-client-builder.ts` 中 `console.error`、`console.warn` 改为使用 `$t()` 或预编译的翻译映射
   - 客户端需在构建时或运行时加载对应 locale 的翻译

3. **与业务 i18n 协同**
   - 若用户使用 `@dreamer/i18n`，其 `install()` 已挂载 `$t`，框架可复用或扩展
   - 框架独立维护 `dweb` 命名空间，与业务翻译隔离

### 4.4 配置项设计

```typescript
// AppConfig 扩展
interface AppConfig {
  // ...
  i18n?: {
    /** 默认语言，不设置则自动检测 */
    defaultLocale?: string;
    /** 支持的语言列表 */
    locales?: string[];
    /** 是否自动检测系统/请求语言 */
    autoDetect?: boolean;
    /** 自定义翻译加载器（可选，用于覆盖框架内置） */
    loadTranslations?: (locale: string) => Promise<Record<string, string>>;
  };
}
```

---

## 五、技术要点

### 5.1 服务端 vs 客户端

| 场景 | 语言来源 | 翻译加载 |
|------|----------|----------|
| CLI | `LANG` 等环境变量 | 启动时同步加载 |
| SSR | `Accept-Language` 或配置 | 按请求或进程启动时加载 |
| CSR 客户端 | `navigator.language` 或服务端注入 | 构建时打包或运行时 fetch |

### 5.2 构建时 vs 运行时

- **CLI/服务端**：运行时加载 JSON，按需切换
- **客户端**：可构建时内联当前 locale，或运行时动态加载以支持多语言切换

### 5.3 默认语言与回退

- 框架默认 `zh-CN`，与当前 `DEFAULT_ERROR_MESSAGES` 一致
- 回退链：`请求 locale` → `zh-CN` → `en-US` → 显示 key

### 5.4 与 @dreamer/i18n 的关系

- **方案 A**：dweb 内置轻量 i18n，仅负责框架自身文案，不依赖 `@dreamer/i18n`
- **方案 B**：dweb 依赖 `@dreamer/i18n`，将框架文案作为其一个 namespace（如 `dweb`），用户可统一管理
- **推荐**：方案 A，减少依赖，框架自洽；用户可通过 `setDwebErrorTranslator` 或配置接入自己的 i18n

---

## 六、改造清单（按文件）

| 文件 | 改造内容 |
|------|----------|
| `src/utils/errors.ts` | 启动时注册 `setDwebErrorTranslator`，桥接到 `$t()` |
| `src/utils/i18n.ts` | **新建**：`initDwebI18n`、`detectLocale`、`$t`（挂载 globalThis）、`loadDwebTranslations` |
| `src/locales/zh-CN/dweb.json` | **新建**：所有中文文案 |
| `src/locales/en-US/dweb.json` | **新建**：所有英文文案 |
| `src/setup.ts` | `printUsage` 使用 `$t()` |
| `src/cmd/init.ts` | 提示文案使用 `$t()` |
| `src/cmd/db.ts` | 迁移状态、提示使用 `$t()` |
| `src/cmd/generate.ts` | 生成结果使用 `$t()` |
| `src/core/app.ts` | 日志使用 `$t()` |
| `src/core/plugin-events.ts` | 错误日志使用 `$t()` |
| `src/feature/render-*.ts` | 渲染错误使用 `$t()` |
| `src/feature/csr-client-builder.ts` | 客户端提示使用 `$t()` 或预编译映射 |
| `src/core/config.ts` | 新增 `i18n` 配置项 |
| `src/cli.ts` | 入口处调用 `initDwebI18n()`（覆盖所有 CLI 子命令） |
| `src/setup.ts` | 入口处调用 `initDwebI18n()` |

---

## 七、总结

1. **入口初始化**：所有入口（cli、setup、各 cmd、app）必须在执行前调用 `initDwebI18n()`，幂等设计
2. **自动检测**：CLI 用 `LANG`/`LC_ALL`/`LANGUAGE`，浏览器用 `navigator.language`，服务端用 `Accept-Language` 或配置
3. **统一入口**：所有框架文案通过全局 `$t(key, params)` 获取，支持插值，挂载于 `globalThis.$t`
4. **翻译文件**：`src/locales/{locale}/dweb.json`，随包发布（需加入 publish.include）
5. **分阶段实施**：先错误+CLI，再日志，最后客户端
6. **可扩展**：支持用户传入自定义翻译器或 `@dreamer/i18n` 实例
