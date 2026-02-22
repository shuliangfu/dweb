# Preact 双实例原因分析：为什么「同一缓存」仍会多实例？

## 现象回顾

- 日志里 **minimal tree renderToString length = 12**（adapter 自用的 preact
  正常）
- **renderToString complete { htmlLength: 0 }**（真实组件树输出为空）
- 说明：adapter 用的是一份 preact（A），路由组件（_app、页面）用的是另一份
  preact（B）；B 的 VNode 对 A 的 `renderToString` 来说不可识别 → 空字符串。

即使配置了 NODE_PATH、tsconfig
paths、hoisted，仍可能出现双实例。下面说明**为什么看起来「同一套 preact
缓存」仍会解析出多份实例**。

---

## 根本原因：两条互不共享的解析链

在 Node/Bun 的 ESM 里，**`import "preact"` 的解析起点 = 当前执行到该 import
的「请求方模块」所在目录**，而不是进程里“某一份全局缓存”。

所以有两条互不重叠的解析链：

| 谁在 import "preact"？                 | 解析起点（importer 所在目录）                                               | 解析结果可能落在                                           |
| -------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **@dreamer/render** 的 preact 适配器   | `.../node_modules/@jsr/dreamer__render/...` 或 Deno 缓存下的 render 包目录  | 该目录向上的 `node_modules/preact`（可能是嵌套或 hoisted） |
| **路由模块**（_app.tsx、index.tsx 等） | `.../examples/preact-hybrid-flat/basic/routes/`（file:// 下该文件所在目录） | 从 routes/ 向上找，或受 NODE_PATH 影响                     |

只要这两条链**最终解析到的 preact
物理路径不同**，运行时就会存在**两个不同的模块实例**，和“是否用了缓存”无关。

---

## 导致解析结果不同的具体因素

### 1. 两条链的「起点」本来就不一样

- **Render 适配器**：在 dweb 的依赖树里，例如\
  `dweb/node_modules/.deno/@jsr+dreamer__render@x.x.x/...` 或\
  `dweb/node_modules/@dreamer/render/...`\
  它的 `import "preact"` 从**这个目录**往上找 `node_modules/preact`。

- **路由模块**：通过 `loadRouteModule` 被 **动态** `import(fileUrl)` 加载，例如
  `file:///.../basic/routes/_app.tsx`（dev 下可能带 `?v=version`）。\
  它的 `import "preact"` 从 **routes 所在目录**（即 `.../basic/routes/`）往上找。

两个起点不同 → 向上遍历的 `node_modules` 顺序可能不同 → 可能命中**不同层级的
preact**（例如一个在 dweb 根 node_modules，一个在嵌套包里的 node_modules）。

### 2. 依赖安装方式：嵌套 vs 扁平（hoisted）

- **嵌套**：`@dreamer/render` 下可能有自己的 `node_modules/preact`。
  - Render 适配器：从 render 包目录向上 → 先遇到 **render 自己的
    node_modules/preact**。
  - 路由：从 basic/routes 向上（再加 NODE_PATH）→ 可能命中
    **dweb/node_modules/preact**。\
    → 两个路径 → 两个实例。

- **扁平（hoisted）**：只有顶层一份 preact 时，两条链**有机会**都解析到同一路径；但在 Bun 下仍可能因下面第 3 点而分叉。

### 3. 已排除：开发模式的 `?v=version`（cache-busting）

`load-route-module.ts` 在 dev 下会给路由 URL 加 `?v=version` 做 cache-busting。曾怀疑带 query 的 URL 会参与解析/缓存 key 导致双实例。**实测：注释掉该逻辑（不再给 moduleUrl 加 ?v=）后，双实例现象不变**，故 **?v= 不是原因**。根因仍是两条链的解析起点不同（见上）。

### 4. NODE_PATH 不一定对两条链都生效

- 你设置了 `NODE_PATH=../../../node_modules`（从 basic 看是 dweb 的
  node_modules）。
- NODE_PATH 一般是**在解析 bare specifier
  时**作为额外搜索路径；但**从哪条链、在什么时机**应用，取决于运行时。
- **Render 适配器**：在 dweb 依赖树里加载，可能**先**从 render
  所在目录向上找，已经命中嵌套的 preact，**根本不会用到 NODE_PATH**。
- **路由**：从 `basic/routes/` 向上，可能**会**用到 NODE_PATH，最终命中 dweb 的
  preact。

这样一条链用 NODE_PATH、一条链用嵌套 node_modules，就会得到两个实例。

### 5. Deno 与 Bun 的差异（为何 Deno 常为单实例）

- **Deno**：顶层有**进程级 import map**（如 deno.json 的 `imports`），所有
  `import "preact"` 先走这份 map，再走 node_modules
  等，所以**全进程共用一个解析结果** → 单实例。
- **Bun**：更接近 Node 的「按请求方目录向上找」；没有进程级 import map
  时，**不同请求方 → 可能不同解析结果** → 容易双实例。

所以「同一份 preact 缓存」在 Deno 下容易成立，在 Bun 下不一定成立。

---

## 小结表

| 因素                        | 说明                                                                 |
| --------------------------- | -------------------------------------------------------------------- |
| **不同 importer 目录**      | Render 在 node_modules/…/render/…，路由在 basic/routes/，解析起点不同 |
| **嵌套依赖**                | Render 包内若有自己的 preact，会先被 render 链命中，与路由链解析到的不同 |
| **NODE_PATH 只影响一条链**  | 只对从 basic 出发的解析有效，对已在 render 包内解析到的 preact 无效  |
| **Bun 无进程级 import map** | 无法像 Deno 那样强制全进程共用一个 preact 解析结果                   |

（**已排除**：?v= cache-busting — 注释掉后现象相同，不是双实例原因。）

所以：**并不是「没用同一缓存」，而是「两条解析链各自解析
preact，得到了两个不同的模块实例」**。要变成单实例，必须让「render
适配器」和「路由模块」的 `import "preact"`
最终解析到**同一个物理模块**（同一文件、同一实例）。

---

## 为何「传 dweb 的 preact」给 render 仍可能无效？

若在 dweb 的 `render-hybrid.ts` 里 `import { createElement, renderToString } from "preact"` 并通过 `options.preactRuntime` 传给 @dreamer/render，有两层问题：

1. **适配器要正确使用**：render 的 preact 适配器必须从 `options.options.preactRuntime` 里读 `createElement`、`renderToString`（两个字段本身就是函数），而不是再读 `.createElement`/`.renderToString`，否则会一直用默认的 preact，传过去的无效。
2. **组件里用的仍是「路由链」的 preact**：即使用对了，**真正决定树内容的是路由组件**（_app、_layout、页面）。它们是在 `import(".../routes/_app.tsx")` 等**路由模块**里执行的；这些文件里的 JSX 用的是**该模块**解析到的 preact（从 `basic/routes/` 往上解析）。和 dweb 的 preact（从 `dweb/src/feature/` 往上解析）**不是同一条解析链**，因此**不一定是同一份**。  
   - 传过去的是 **dweb 的** createElement/renderToString，render 只拿它们来「挂」组件和做 renderToString。  
   - 但 App/Layout/Page **执行时**返回的 JSX，是用**路由模块**里的 preact 建的 VNode。  
   - 若路由链和 dweb 链解析到的 preact 不是同一实例，树里还是会混入「路由那份」的 VNode，renderToString 仍然不认 → 照样空字符串。

结论：**示例项目的 preact 和 dweb 框架的 preact 不一定相同**（解析起点不同：`basic/routes/` vs `dweb/src/feature/`）。传 dweb 的 preact 只能让「render 用的那份」和 dweb 一致；要让 SSR 真正单实例，需要**路由和 dweb（以及 render）最终都解析到同一份 preact**（例如 NODE_PATH + hoisted、或 tsconfig paths 把两条链指到同一 node_modules）。

---

## Bun / Next / Remix 等是怎么做的？为什么他们很少遇到？

Bun 和主流 React/Preact 框架能正常跑 SSR，是因为他们**天然只有一条解析链**或**用打包把服务端打成一份**，不会出现「框架一份、用户路由一份」的两条链。

| 场景 | 做法 | 为何单实例 |
|------|------|------------|
| **Bun 官方示例**（如 `bun create react-ssr`） | 单项目、单入口：服务代码（`dev.tsx`）和页面（`pages/*.tsx`）都在**同一项目根**下，依赖都在根目录一个 `node_modules`。服务里直接 `import` 页面或通过 **Bun.build** 先打包再跑。 | 全进程只有一个「解析起点」（项目根），所有 `import "react"` 都从同一 node_modules 解析 → 单实例。 |
| **Next.js / Remix** | **服务端也打包**：用 Webpack/Turbopack/Vite 把服务端代码（含框架 + 路由 + react）打成一个或若干 server bundle，React 被打进同一 bundle。 | 没有「未打包的路由文件」在运行时再被动态 `import`；所有代码在同一 bundle 里，只有一份 React。 |
| **dweb 当前方案** | 框架在 node_modules（或 ../../../src），**开发时**用动态 `import(file:///.../routes/_app.tsx)` 加载用户路由，不先打包服务端。 | 两条解析链：框架/render 一条、路由文件一条 → 容易双实例。 |

所以：**别人不是「解决了双实例」，而是架构上就没产生两条链**——要么单项目单 node_modules（Bun 示例），要么服务端也打包成 bundle（Next/Remix）。dweb 在 dev 下是「框架 + 动态加载用户路由」且不打包服务端，所以会碰到 Bun 下两条链解析出两份 preact 的情况；要规避只能要么统一解析（NODE_PATH + hoisted、tsconfig paths），要么在构建时对服务端也做打包（像 @dreamer/esbuild 的 server build 把 preact 打进 bundle）。

---

## Bun 下用 esbuild 包做服务端编译/打包行不行？

**可以。** Bun 能正常跑 npm 的 `esbuild` 包（底层是原生二进制），当前项目里已经在用：

- **@dreamer/esbuild** 的 `BuilderServer`、`BuilderClient`、`BuilderBundle` 都是 `import * as esbuild from "esbuild"` 后调 `esbuild.build()`。
- 生产构建时 `BuilderServer.build()` 在 Bun 下也是走 `buildWithEsbuild()`，把服务端打成一份 bundle（preact 打进同一 bundle → 单实例）。
- 若需要**开发时**也避免双实例，可以：
  - 用 **esbuild 包**（或 @dreamer/esbuild 的 `BuilderBundle` / `BuilderServer`）在内存里打包「当前请求用到的路由切片」（入口为 _app + _layout + 当前页），`write: false` 拿代码，再写入临时文件并 `import(临时 URL)` 运行；这样该 bundle 内只有一份 preact。
  - 或对 dev 也跑一次服务端构建（内存或临时目录），用构建产物代替直接 `import(file:///.../routes/xxx)`。

结论：Bun 环境下**直接使用 esbuild 包**做服务端编译/打包是可行的，且已有生产构建在用；若要解决 dev 下双实例，可以在此基础上加「dev 时对路由做内存/临时打包再加载」的路径。

---

## 生产（bun run start）也报挂载容器失败时

生产时**路由仍从磁盘动态加载**（`loadRouteModule` → `import(file:///.../routes/_app.tsx)`），没有打进 server 包。框架已把 preact、preact-render-to-string 等标为 server **external**，所以：

- **server 包**（dist/server.js）里不包含 preact，运行时会从当前环境解析 `"preact"`。
- **路由文件**（routes/_app.tsx）被动态 import 时，也会从自己的解析链解析 `"preact"`。

若示例的 **package.json 里没有直接依赖 preact**，则「server 包所在目录」和「routes 所在目录」向上找 node_modules 时可能找到不同路径（或一方找不到），仍会变成双实例、SSR 空字符串。

**做法**：在示例的 **package.json** 的 `dependencies` 里加上 `preact` 和 `preact-render-to-string`（版本与 dweb/deno.json 一致，如 10.28.3 / 6.2.0），在示例目录（或 monorepo 根）执行一次 **bun install**，再重新 **build** 和 **start**。这样 server 与路由都会从同一 node_modules 解析 preact，生产下可恢复单实例、挂载容器正常。
