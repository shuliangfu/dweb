# Preact SSR 空字符串与单实例说明

## 现象

- **生产（Bun）**：`renderToString` 得到空字符串，日志中 `htmlLength: 0`。
- **开发（dev 服务器）**：同样可能出现空字符串；dev 没有走编译，是直接运行源码。

## 为什么 Deno 不会出现这种情况？

在 **Deno** 下，模块解析是**进程级单一解析结果**：

- 项目的 `deno.json` 里有 **imports**（相当于 import
  map），例如：`"preact": "npm:preact@10.28.3"`。
- 进程中**任意**文件执行 `import "preact"` 或 `import "preact/hooks"` 时，Deno
  都先查这份 import map，得到同一个 `npm:preact@10.28.3` 的 URL。
- 模块缓存按该 URL 作为 key，因此**全进程只有一份 preact 实例**，路由组件和
  @dreamer/render 用的是同一份 → 不会出现空字符串。

在 **Bun** 下则不同：

- 默认没有进程级 import map；解析按 **Node 规则**：从**当前模块所在目录**向上找
  `node_modules`。
- 若 @dreamer/render 来自 JSR 缓存（例如 `~/.bun/.../node_modules/...`），其
  `import "preact"` 会在**缓存目录**的 node_modules 里解析到一份 preact。
- 路由文件在**项目目录**下（如 `file:///project/routes/index.tsx`），其
  `import "preact"` 会在**项目根**的 node_modules 里解析。
- 两条解析路径可能指向**不同物理路径** → 两个模块实例 → 双实例 → SSR 空字符串。

所以：**Deno 的“全进程同一 import map”保证了单实例；Bun 的“按 importer
目录解析”在 JSR + 项目混用时会变成双实例。**

## 根因：Preact 双实例

`renderToString` 和组件树必须使用**同一个** Preact 实例（同一份 `preact`
模块），否则会得到空字符串。

1. **@dreamer/render** 的 Preact 适配器里：
   - `createElement` 来自 `import { createElement } from "preact"`
   - `renderToString` 来自
     `import { renderToString } from "preact-render-to-string"`
   - `preact-render-to-string` 内部也依赖同一份 `preact`（peer dependency）。

2. **页面/布局组件**（如 `routes/index.tsx`）里：
   - 使用 `import { useState } from "preact/hooks"` 和 JSX。
   - JSX 运行时用的 `createElement`/`h` 由该模块解析到的 `preact` 提供。

3. **双实例出现时**：
   - 适配器用 Preact 实例 A 的 `createElement` 建树（根节点是 A 的 VNode）。
   - 执行页面组件时，组件内部用 Preact 实例 B 的 `h`/JSX 创建子 VNode。
   - `renderToString`（来自实例 A 的 preact-render-to-string）遍历到 B 的 VNode
     时无法识别，输出为空。

## 为什么 dev 也会出现？

Dev 服务器**不经过 esbuild 打包**，直接运行入口（如 `main.ts`）和动态
`import(routeFile)`。

- 入口链：`main.ts` → `@dreamer/dweb` → `@dreamer/render` → 解析
  `"preact"`（可能来自 JSR/cache 或 node_modules）。
- 路由模块：`loadRouteModule` 使用 `import(routeFileUrl)` 加载
  `routes/index.tsx`，该文件中的 `import "preact/hooks"`
  在**另一条解析路径**下解析（例如以 `file://` 或项目根为起点）。

在 Bun（以及部分 Deno/Node
的解析与缓存策略）下，两条解析路径可能得到**不同物理路径**的
`preact`，即两个模块实例 → 双实例 → SSR 空字符串。

## 让 Bun 和 Deno 一样（单实例，不写全局）

JSR 不允许写全局；因此不采用 `globalThis` 注入，改为**应用侧配置**，利用 Bun 的
**tsconfig paths** 实现进程级单一解析（效果等同 Deno 的 import map）。

### 1. package.json：项目直接依赖 preact

在应用 **package.json** 里把 `preact` 和 `preact-render-to-string`
列为直接依赖，保证项目根只有一份：

```json
{
  "dependencies": {
    "preact": "^10.28.0",
    "preact-render-to-string": "^6.2.0"
  }
}
```

### 2. tsconfig.json：Bun 进程级单一解析（推荐）

Bun 会读取项目根 **tsconfig.json** 的 `compilerOptions.paths`，对**整个进程**的
import 做重写。把 `preact` / `preact-render-to-string` 固定到项目
`node_modules`，即可和 Deno 一样做到单进程单实例：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "preact": ["./node_modules/preact"],
      "preact/*": ["./node_modules/preact/*"],
      "preact-render-to-string": ["./node_modules/preact-render-to-string"]
    }
  }
}
```

这样**同一进程内**所有 `import "preact"` 都会被重写到项目根的
`./node_modules/preact`：包括你的路由、布局、以及 **@dreamer/render** 内部（无论
render 来自 JSR 缓存还是 node_modules）。Bun 用的是**项目根**的 tsconfig，paths
对全进程生效，所以 render 也会读到这个目录，和 Deno 的 import map 一样是单实例。

### 2.1 示例为 dweb workspaces 时（推荐）

若示例在 dweb 的 `workspaces` 下（如 `examples/*/basic`）：

- **dweb/tsconfig.json**：已包含 `preact`、`preact/*`、`preact-render-to-string`
  的 paths，指向 `./node_modules/...`（dweb 根安装后 preact 在这里）。从 **dweb
  根** 跑 dev/build 时生效。
- **示例 tsconfig.json**：从 **示例目录**（如 `basic/`）跑 `bun dev` 时，Bun
  以当前目录为 baseUrl 解析 paths，继承的 `./node_modules/preact` 会被当成
  `basic/node_modules/preact`（可能不存在），导致仍出现
  `htmlLength: 0`。因此示例里需要**显式**把 preact 指到 dweb 根的
  node_modules，并保留 `@dreamer/dweb` 的 paths，例如：

```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@dreamer/dweb": ["../../../src/mod.ts"],
      "@dreamer/dweb/*": ["../../../src/*"],
      "preact": ["../../../node_modules/preact"],
      "preact/*": ["../../../node_modules/preact/*"],
      "preact-render-to-string": [
        "../../../node_modules/preact-render-to-string"
      ]
    }
  }
}
```

这样从示例目录运行时，全进程的 `import "preact"` 都会解析到
`dweb/node_modules/preact`，单实例一致。

### 2.2 若仍出现 htmlLength: 0：NODE_PATH 与 Bun 解析顺序

Bun **支持 NODE_PATH**（[官方文档](https://bun.sh/docs/runtime/modules)），但
NODE_PATH 是**额外**的解析目录，默认会先从**请求文件所在目录**向上找
`node_modules`。在 **workspace + isolated 安装**（Bun 1.3+
默认）下，`@dreamer/render` 可能被装在 `node_modules/.bun/...`
并有自己的依赖，其 `import "preact"` 会先解析到嵌套的
preact，而路由从示例目录解析到 dweb 根的 preact → 仍是双实例。

可选方案（任选其一或组合）：

**方案 A：改用 hoisted 安装（推荐）**

在 **dweb 根目录** 使用扁平化安装，避免子包嵌套 preact，全进程只解析到 dweb
根的一份 preact：

```bash
cd /path/to/dweb
bun install --linker=hoisted
```

或在 dweb 根目录添加 `bunfig.toml`，长期生效：

```toml
[install]
linker = "hoisted"
```

然后仍在示例目录执行 `bun dev`（或带 NODE_PATH 的脚本）。

**方案 B：NODE_PATH**

Bun 文档说明 NODE_PATH 会作为**额外**目录参与解析。先保证 dweb 根已有一份
preact，再在示例 scripts 里为 dev/build 加上 NODE_PATH（指向 dweb 的
node_modules）：

```json
"scripts": {
  "dev": "NODE_PATH=../../../node_modules bun run main.ts",
  "build": "NODE_PATH=../../../node_modules bun run main.ts --build",
  "start": "DENO_ENV=prod bun run dist/server.js"
}
```

若在 isolated 安装下 NODE_PATH 仍不生效，优先尝试方案 A。

### 2.3 Bun 版本差异（1.3.5 vs 1.3.9）

若在 **Bun 1.3.6+**（如 1.3.9）出现 `htmlLength: 0`，而在 **Bun 1.3.5**
下正常，可能与新版模块解析或 JSC 升级有关（1.3.9 未在 release notes 中明确列出
Preact/SSR 变更，但解析或缓存行为可能变化）。

**建议排查顺序：**

1. **确认 hoisted 安装**\
   在 **dweb 根目录** 执行一次安装，确保 `bunfig.toml` 的 `linker = "hoisted"`
   生效：
   ```bash
   cd /path/to/dweb
   rm -rf node_modules
   bun install
   ```
   再从示例目录跑 `bun dev`。

2. **临时锁定 Bun 1.3.5 验证**\
   若 1.3.5 正常、1.3.9 异常，可安装指定版本验证（Bun 用安装脚本指定 tag）：
   ```bash
   curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.5"
   ```
   安装后当前终端或新开终端会使用 1.3.5。之后要回到最新版再执行 `bun upgrade`。\
   也可在项目 `package.json` 中写 `"engines": { "bun": "1.3.5" }`
   提醒团队使用该版本。

3. **确认 tsconfig 生效**\
   从**示例目录**（如 `basic/`）运行时，Bun
   使用的「项目根」是当前工作目录，示例的 `tsconfig.json` 必须显式写 `preact` /
   `preact/*` 指向 `../../../node_modules/preact`（见 2.1），不能只依赖 dweb
   根的 tsconfig。

### 2.4 诊断脚本与运行时日志

**诊断脚本（与 bun dev 同环境）**\
在示例目录执行，可检查「主链」与「路由上下文」是否同一份 preact，以及
`renderToString` 是否正常：

```bash
cd examples/preact-hybrid-flat/basic
NODE_PATH=../../../node_modules bun run check-preact-instance.ts
```

若输出 `Same preact instance: true` 且
`renderToString(...) length: 16 (OK)`，说明在该进程下单实例成立；若仍出现
`htmlLength: 0`，则可能是 **bun dev 运行时** 的加载顺序或上下文与脚本不一致。

**运行时诊断（render.debug: true 时）**\
在 `@dreamer/render` 的 Preact 适配器里，每次 SSR 前会打一条
`diagnostic: minimal tree renderToString length = N`：

- 若 **N > 0** 且真实树仍为 `htmlLength: 0`：说明 adapter 自用的 preact 与
  preact-render-to-string 一致，但**组件树**里混入了路由侧另一份 preact 的
  VNode（双实例在「路由组件」侧）。
- 若 **N = 0**：说明 adapter 内部的 createElement 与 renderToString 就来自不同
  preact（较少见）。

**参考**：Bun 模块解析
[Module Resolution](https://bun.sh/docs/runtime/modules)，Preact 单实例讨论
[preact/discussions#3966](https://github.com/preactjs/preact/discussions/3966)（浏览器侧用
Import Maps 保证同一份 Preact）。

### 3. 生产 Bun 的补充

在 **@dreamer/esbuild** 的服务端构建中，Bun 下将 preact/react 等从 external
中过滤掉，打进 server bundle，避免运行时再解析出一份（参见 esbuild 包实现）。

## 小结

| 场景              | 原因                            | 建议（不写全局）                                                           |
| ----------------- | ------------------------------- | -------------------------------------------------------------------------- |
| Dev 空字符串      | 路由与 render 解析出两份 preact | package.json 直接依赖 preact + tsconfig paths 指向 `./node_modules/preact` |
| Prod Bun 空字符串 | server 与运行时各一份 preact    | 同上 + esbuild 在 Bun 下把 preact 打进 server bundle                       |

**Bun 的 import 单进程**：通过项目根 tsconfig 的 `paths` 把 `preact` /
`preact-render-to-string` 固定到 `./node_modules/...`，即可实现与 Deno
类似的进程级单一解析，无需写全局。
