/**
 * CSR 客户端脚本构建器
 *
 * 职责：
 * - 构建客户端入口文件（_client.tsx -> _client.js）
 * - 提供客户端脚本服务（/_client.js 路由）
 * - 支持开发模式热更新
 *
 * 工作流程：
 * 1. 扫描路由目录，获取所有路由组件
 * 2. 生成带有静态导入的临时入口文件
 * 3. 使用 esbuild 编译为浏览器可执行的 JS
 * 4. 注册中间件服务编译后的脚本
 *
 * 注意：
 * - 不再依赖动态 import()，所有路由组件在构建时静态导入
 * - 这样 esbuild 可以正确打包所有依赖
 */

import { BuilderClient } from "@dreamer/esbuild";
import { createRouter } from "@dreamer/router";
import type { ServiceContainer } from "@dreamer/service";
import {
  basename,
  cwd,
  dirname,
  ensureDir,
  exists,
  getEnv,
  join,
  readdir,
  readTextFile,
  relative,
  resolve,
  writeTextFile,
} from "../core/runtime-adapter.ts";

import type { AppConfig } from "../types/app.ts";
import {
  getDreamerClientCacheDir,
  getInferredBuildOutputDirs,
} from "../utils/build-dirs.ts";
import {
  CLIENT_ENTRY_FILENAME,
  CLIENT_OUTPUT_MAIN_FILENAME,
  DWEB_DATA_PATH,
} from "../utils/constants.ts";
import { $tr } from "../utils/i18n.ts";
import { getLogger } from "../utils/logger.ts";
import { normalizePathForCompare, pathForLog } from "../utils/path.ts";

/**
 * 客户端脚本构建结果
 */
export interface ClientBuildResult {
  /** 编译后的 JavaScript 代码（单文件模式）或主入口内容（代码分割模式） */
  code: string;
  /** 源映射（可选） */
  sourceMap?: string;
  /** 构建时间戳 */
  buildTime: number;
  /** 输出目录（代码分割模式，仅 prod/ dev 代码分割） */
  outputDir?: string;
  /** 所有输出文件（代码分割模式） */
  outputFiles?: Map<string, string>;
  /** basename -> content 索引，用于 findChunkContent O(1) 查找（避免线性遍历） */
  chunkContentIndex?: Map<string, string>;
  /** base（如 routes、index）-> content 索引，用于 HMR 回退 O(1) 查找 */
  chunkBaseIndex?: Map<string, string>;
  /** 本次变更对应路由的 chunk 的 URL（HMR 无感刷新用，如 /_client/index-XXX.js） */
  chunkUrl?: string;
}

/**
 * 构建客户端脚本时的可选参数
 * 用于 HMR 无感刷新等场景
 */
export interface BuildClientScriptOptions {
  /** 变更的文件路径（用于计算 chunkUrl 以支持无感刷新） */
  changedPath?: string;
}

/** 缓存的客户端脚本 */
let cachedClientScript: ClientBuildResult | null = null;

/** 开发模式增量构建：缓存的 BuilderClient 实例，用于 context + rebuild 加速 HMR */
let cachedDevBuilder: BuilderClient | null = null;

/**
 * 从变更文件路径推导路由 componentPath（如 .../routes/index.tsx -> index）
 * 会统一将路径规范化为绝对路径再比较，避免相对路径与绝对路径不一致导致匹配失败。
 * 特别处理 routesDirPath 中可能存在的 ./（如 basic/./src/routes）与 filePath 不含 ./ 的不一致。
 */
function getComponentPathFromFilePath(
  routesDirPath: string,
  filePath: string,
): string | null {
  const normalizedRoutes = normalizePathForCompare(routesDirPath);
  const normalizedFile = normalizePathForCompare(filePath);
  if (!normalizedFile.includes(normalizedRoutes)) {
    return null;
  }
  const relative = normalizedFile.slice(
    normalizedFile.indexOf(normalizedRoutes) + normalizedRoutes.length,
  ).replace(/^\//, "").replace(/\.(tsx?|jsx?)$/, "");
  return relative || null;
}

/**
 * 根据 componentPath 从输出文件名列表中匹配对应 chunk。
 * esbuild 命名规则：about.tsx -> about-XXX.js；多段如 admin/index 可能为 admin-index-XXX.js 或 admin/index-XXX.js；
 * 根 index 可能为 routes-XXX.js。优先按完整路径匹配，避免 admin/index 误匹配到根 index 的 chunk。
 */
function getChunkFileNameForComponent(
  componentPath: string,
  outputFileNames: string[],
): string | null {
  const segment = componentPath.split("/").pop() || componentPath;
  let jsOnly = outputFileNames.filter((n) =>
    n.endsWith(".js") && n !== CLIENT_OUTPUT_MAIN_FILENAME
  );

  // 多段路径（如 admin/index）：优先匹配含完整路径的 chunk，避免与根 index 混淆
  if (componentPath.includes("/")) {
    const firstSegment = componentPath.split("/")[0];
    const pathAsDash = componentPath.replace(/\//g, "-");
    const pathAsUnderscore = componentPath.replace(/\//g, "_");
    const pathAsSlash = componentPath;
    const pathVariants = [pathAsDash, pathAsUnderscore, pathAsSlash];
    // 优先尝试 key 中含路径段的 chunk（如 routes/admin/index-XXX.js、admin-index-XXX.js），提高命中率
    jsOnly = [...jsOnly].sort((a, b) => {
      const aHasPath = firstSegment && a.includes(firstSegment) ? 0 : 1;
      const bHasPath = firstSegment && b.includes(firstSegment) ? 0 : 1;
      return aHasPath - bHasPath;
    });
    for (const name of jsOnly) {
      const base = name.slice(0, -3).replace(/\.js$/, "");
      const baseNoHash = base.replace(/-[A-Za-z0-9]{6,10}$/, "");
      const baseLastPart = base.includes("/") ? base.split("/").pop()! : base;
      const baseLastNoHash = baseLastPart.replace(/-[A-Za-z0-9]{6,10}$/, "");
      // 支持 key 为 routes/admin/index-XXX.js 等形式（baseNoHash 含路径）
      const baseEndsWithPath = baseNoHash === pathAsSlash ||
        baseNoHash.endsWith("/" + pathAsSlash) ||
        baseNoHash.endsWith(pathAsSlash) ||
        baseNoHash.endsWith("/" + pathAsDash) ||
        baseNoHash.endsWith(pathAsDash) ||
        baseNoHash.endsWith(pathAsUnderscore);
      // esbuild 对 bgb-x-admin/index 可能只产出 bgb-x-admin-XXX.js（首段作 base），需单独匹配
      if (baseNoHash === firstSegment || base.startsWith(firstSegment + "-")) {
        return name;
      }
      for (const pv of pathVariants) {
        if (
          baseNoHash === pv ||
          baseLastNoHash === pv ||
          baseEndsWithPath ||
          base.startsWith(pv + "-") ||
          baseLastPart.startsWith(pv + "-")
        ) {
          return name;
        }
      }
      if (pathVariants.some((pv) => base === pv || baseLastPart === pv)) {
        return name;
      }
    }
    // 多段路径未命中时不再用 segment 匹配，避免误用根 index 的 chunk
    return null;
  }

  for (const name of jsOnly) {
    const base = name.slice(0, -3);
    if (base.startsWith(segment + "-") || base === segment) {
      return name;
    }
  }
  // 根 index 路由：esbuild 可能把 routes/index.tsx 打成 routes-XXX.js；仅当 componentPath 为单段 "index" 时匹配
  if (segment === "index" && !componentPath.includes("/")) {
    const routesChunk = jsOnly.find((n) => {
      const base = n.slice(0, -3);
      return base.startsWith("routes-");
    });
    if (routesChunk) return routesChunk;
  }
  return null;
}

/**
 * 检查路径是否是客户端 chunk 文件
 *
 * esbuild 生成的 chunk 文件格式：
 * - chunk-XXXXXXXX.js（共享代码块）
 * - about-XXXXXXXX.js（按路由分割的页面）
 * - _layout-XXXXXXXX.js（布局组件）
 * - routes/index-XXXXXXXX.js（多段路径，Windows/Unix 兼容）
 *
 * @param pathname URL 路径
 * @returns 是否是 chunk 文件
 */
/** 判断 pathname 是否为客户端 chunk 文件（供 csr-client-middleware 使用） */
export function isClientChunkFile(pathname: string): boolean {
  if (!pathname.startsWith("/")) return false;
  // 支持 .js 与 .js.map（source map）
  const isJs = pathname.endsWith(".js");
  const isMap = pathname.endsWith(".js.map");
  if (!isJs && !isMap) return false;

  // 排除主入口
  if (pathname === "/_client.js" || pathname === "/_client.js.map") {
    return false;
  }

  // 匹配 esbuild chunk：
  // - 带 hash：/name-hash.js 或 /path/name-hash.js（hash 6–10 位，含小写，与 getChunkBaseName 一致）
  // - 无 hash：/name.js 或 /path/name.js（开发模式 chunkNames: "[name]" 时）
  // 多段路径兼容：esbuild 对 import("./routes/index.tsx") 可能生成 routes/index-XXX.js
  const chunkWithHash = /^\/[\w\[\]_\-\/]+-[a-zA-Z0-9]{6,10}\.(?:js|js\.map)$/;
  const chunkNoHash = /^\/[\w\[\]_\-\/]+\.(?:js|js\.map)$/;
  return chunkWithHash.test(pathname) || chunkNoHash.test(pathname);
}

/**
 * 路由组件信息
 */
interface RouteComponentInfo {
  /** 组件路径（相对于 routes 目录，如 "index" 或 "user/[id]"） */
  componentPath: string;
  /** 完整文件路径 */
  fullPath: string;
  /** 导入变量名 */
  importName: string;
}

/** 路由扫描最大深度，防止过深目录导致栈溢出 */
const MAX_ROUTE_SCAN_DEPTH = 10;

/**
 * 使用 @dreamer/router 扫描路由目录并生成「路由路径 -> 布局 key 链」映射（支持嵌套 _layout）
 * @param routesDirPath 路由目录绝对路径
 * @returns hasLayout 是否存在任意布局；routeLayoutKeys 每个路由路径对应的 _layout key 数组（从外到内）
 */
async function getRouteLayoutKeys(routesDirPath: string): Promise<{
  hasLayout: boolean;
  routeLayoutKeys: Record<string, string[]>;
}> {
  const router = createRouter({ routesDir: routesDirPath });
  await router.scan();
  const routeLayoutKeys: Record<string, string[]> = {};
  for (const r of router.getRoutes()) {
    routeLayoutKeys[r.path] = router.getLayoutKeysForPath(r.path);
  }
  const hasLayout = Object.values(routeLayoutKeys).some((arr) =>
    arr.length > 0
  );
  return { hasLayout, routeLayoutKeys };
}

/**
 * 扫描路由目录，获取所有路由组件
 *
 * 使用迭代（队列）替代递归，避免路由多时递归过深；并限制最大扫描深度。
 *
 * @param routesDir 路由目录绝对路径
 * @param basePath 相对路径前缀（用于层级路径）
 * @param engine 渲染引擎（用于类型，当前仅支持 .tsx/.jsx）
 * @returns 路由组件列表
 */
async function scanRouteComponents(
  routesDir: string,
  basePath = "",
  _engine: "react" | "preact" | "view" = "preact",
): Promise<RouteComponentInfo[]> {
  const components: RouteComponentInfo[] = [];
  const extRe = /\.(tsx?|jsx?)$/;

  /** 待处理队列：(目录路径, 相对路径前缀, 当前深度) */
  const queue: Array<{ dir: string; base: string; depth: number }> = [
    { dir: routesDir, base: basePath, depth: 0 },
  ];

  while (queue.length > 0) {
    const { dir, base, depth } = queue.shift()!;
    if (depth >= MAX_ROUTE_SCAN_DEPTH) continue;

    try {
      const entries = await readdir(dir);

      for (const entry of entries) {
        const entryPath = join(dir, entry.name);

        if (entry.isDirectory) {
          queue.push({
            dir: entryPath,
            base: base ? `${base}/${entry.name}` : entry.name,
            depth: depth + 1,
          });
        } else if (entry.isFile && extRe.test(entry.name)) {
          const fileName = entry.name.replace(extRe, "");
          if (fileName.startsWith("_")) continue;

          const componentPath = base ? `${base}/${fileName}` : fileName;
          const importName = "Route_" +
            componentPath
              .replace(/\//g, "_")
              .replace(/-/g, "_")
              .replace(/\[/g, "$")
              .replace(/\]/g, "$");

          components.push({
            componentPath,
            fullPath: entryPath,
            importName,
          });
        }
      }
    } catch {
      // 目录不存在或读取失败，跳过
    }
  }

  return components;
}

/**
 * 从容器中读取 Tailwind / UnoCSS 等插件的配置，计算开发态 HMR CSS URL 与 style 元素 id
 * 供生成 client 时写入代码，HMR 无感刷新后按该 URL 拉取最新 CSS 并替换对应 style 内容
 *
 * @param container 服务容器（含 tailwindConfig / unocssConfig 等）
 * @returns { url, styleId } 列表
 */
function getHmrCssEntries(container: ServiceContainer): Array<{
  url: string;
  styleId: string;
}> {
  const entries: Array<{ url: string; styleId: string }> = [];
  type CssConfig = { assetsPath?: string; cssEntry?: string };
  const norm = (assetsPath: string): string =>
    assetsPath.startsWith("/")
      ? assetsPath.replace(/\/$/, "")
      : "/" + (assetsPath || "assets").replace(/\/$/, "");
  if (container.has("tailwindConfig")) {
    const c = container.get<CssConfig>("tailwindConfig");
    const base = c?.cssEntry ? basename(c.cssEntry, ".css") : "tailwind";
    entries.push({
      url: norm(c?.assetsPath ?? "/assets") + "/" + base + ".css",
      styleId: "tailwindcss-injected",
    });
  }
  if (container.has("unocssConfig")) {
    const c = container.get<CssConfig>("unocssConfig");
    const base = c?.cssEntry ? basename(c.cssEntry, ".css") : "unocss";
    entries.push({
      url: norm(c?.assetsPath ?? "/assets") + "/" + base + ".css",
      styleId: "unocss-injected",
    });
  }
  return entries;
}

/** _client.dep.tsx 文件名（与 _client.tsx 同目录，每次启动重新生成，供 _client.tsx 导入） */
const CLIENT_DEP_FILENAME = "_client.dep.tsx";

/** 客户端主入口输出文件名（单文件模式），统一从 constants 导出便于引用 */
export { CLIENT_OUTPUT_MAIN_FILENAME } from "../utils/constants.ts";

/** 渲染引擎对应的 @dreamer/render 客户端适配路径（与 generateStaticClientEntry 一致） */
const ENGINE_RENDER_ADAPTER: Record<string, string> = {
  preact: "@dreamer/render/client/preact",
  react: "@dreamer/render/client/react",
  view: "@dreamer/render/client/view",
};

/** View 引擎按 renderMode 的适配路径：csr 用 view-csr（仅 CSR），hybrid/ssr/ssg 用 view-hybrid（含 hydrate） */
const VIEW_ADAPTER_BY_MODE: Record<ClientDepRenderMode, string> = {
  csr: "@dreamer/render/client/view-csr",
  hybrid: "@dreamer/render/client/view-hybrid",
  ssr: "@dreamer/render/client/view-hybrid",
  ssg: "@dreamer/render/client/view-hybrid",
};

/** 渲染模式：csr 仅客户端渲染；hybrid/ssr/ssg 均需客户端 hydrate，故 view 用 hybrid 入口 */
type ClientDepRenderMode = "csr" | "hybrid" | "ssr" | "ssg";

/**
 * 生成 client.dep.tsx 内容（路由加载器、缓存、HMR CSS、loadLayouts、loadPageModule、renderNotFound、renderError、setupHydrationRouterAndHmr 等）
 * 此文件每次构建/启动都会重新生成；client.tsx 仅不存在时生成，便于用户修改入口逻辑。
 *
 * 注意：客户端 loadLayouts 仅加载 _layout，不加载 _app。_app 是服务端文档根（输出 html/body），容器 #app 在其内部，
 * 故 hydrate/CSR 只需 Layout(Page)，否则会将 App 渲染进容器导致嵌套 html/body 或 hydrate 不匹配。
 *
 * View 引擎按 renderMode 区分：csr 用 @dreamer/render/client/view-csr（仅 createReactiveRoot/buildViewTree/renderCSR，bundle 更小）；
 * hybrid/ssr/ssg 用 @dreamer/render/client/view（主包完整适配器，含 hydrate、createReactiveRootHydrate）。
 * SSR/SSG 的客户端激活与 hybrid 一致，均为 hydrate，不是 csr。
 *
 * @param engine 渲染引擎（用于 hydrate/renderCSR 导入及 setupHydrationRouterAndHmr）
 * @param components 路由组件列表
 * @param hasLayout 是否存在 _layout 文件
 * @param hmrCssEntries 开发态 HMR CSS 配置
 * @param renderMode 渲染模式（view 时用于选择 view/csr 或 view/hybrid）
 * @param routeLayoutKeys 可选，路由路径 -> 布局 key 链（支持嵌套布局）；有则生成 loadLayouts(pathname)
 * @returns client.dep.tsx 的完整源码
 */
function generateClientDepContent(
  engine: "react" | "preact" | "view",
  components: RouteComponentInfo[],
  hasLayout: boolean,
  hmrCssEntries: Array<{ url: string; styleId: string }>,
  renderMode: ClientDepRenderMode = "hybrid",
  routeLayoutKeys?: Record<string, string[]>,
): string {
  const useNestedLayouts = Boolean(
    routeLayoutKeys && Object.keys(routeLayoutKeys).length > 0,
  );
  const adapterImport = ENGINE_RENDER_ADAPTER[engine] ??
    "@dreamer/render/client/preact";
  const isViewEngine = engine === "view";
  /** view + csr：用 view-csr 适配器（仅 createReactiveRoot/buildViewTree/renderCSR）；view + hybrid|ssr|ssg：用 view-hybrid（含 hydrate/createReactiveRootHydrate） */
  const viewAdapterPath = isViewEngine
    ? VIEW_ADAPTER_BY_MODE[renderMode]
    : adapterImport;
  const viewImport = isViewEngine && renderMode === "csr"
    ? 'import { createSignal, mount } from "@dreamer/view/csr";'
    : isViewEngine
    ? 'import { createSignal, mount } from "@dreamer/view/hybrid";'
    : "";
  const renderAdapterImport = isViewEngine
    ? (renderMode === "csr"
      ? `import { createSignal, mount } from "@dreamer/view/csr";
import { renderCSR, buildViewTree } from "${viewAdapterPath}";`
      : `${viewImport}
import {
  buildViewTree,
  createReactiveRoot,
  createReactiveRootHydrate,
  hydrate,
} from "${viewAdapterPath}";`)
    : `import { hydrate, renderCSR } from "${adapterImport}";`;
  /** API 路由（api/ 下）仅服务端使用，不加入 ROUTE_LOADERS，避免客户端 bundle 解析 .ts 或错误引用 */
  const pageComponents = components.filter(
    (c) => !c.componentPath.replace(/\\/g, "/").startsWith("api/"),
  );
  const routeExt = ".tsx";
  const routeLoaders = pageComponents.map(
    (c) =>
      `  "${c.componentPath}": () => import("./routes/${c.componentPath}${routeExt}"),`,
  ).join("\n");

  const layoutExt = ".tsx";
  const routeLayoutKeysJson = useNestedLayouts && routeLayoutKeys
    ? JSON.stringify(routeLayoutKeys)
    : "{}";
  /** 嵌套布局时 loadLayouts 接收 match，由调用方传入 router.match(pathname) 或当前 match */
  const loadLayoutsArgInit = useNestedLayouts
    ? 'router.match((typeof _win.location !== "undefined" && _win.location?.pathname) ? _win.location.pathname : "/")'
    : "";
  const loadLayoutsCallInit = useNestedLayouts
    ? `loadLayouts(${loadLayoutsArgInit})`
    : "loadLayouts()";
  const loadLayoutsCallRender = useNestedLayouts
    ? "loadLayouts(match)"
    : "loadLayouts()";
  const layoutCode = useNestedLayouts
    ? `
/** 路由路径 -> 该路径下从外到内的 _layout key 链（嵌套布局） */
const ROUTE_LAYOUT_KEYS: Record<string, string[]> = ${routeLayoutKeysJson};

export async function loadLayouts(match: { route: { path?: string } } | null): Promise<LayoutComponent[]> {
  if (!match) return [];
  const pathKey = match.route?.path ?? "";
  const keys = ROUTE_LAYOUT_KEYS[pathKey] ?? ROUTE_LAYOUT_KEYS["/"] ?? [];
  const result: LayoutComponent[] = [];
  let inheritBreakIndex = -1;
  for (let i = 0; i < keys.length; i++) {
    try {
      const mod = await import("./routes/" + keys[i] + "${layoutExt}");
      const C = mod?.default ?? mod?.Layout;
      if (C && (typeof C === "function" || typeof C === "object")) result.push({ component: C, props: {} });
      if ((mod as Record<string, unknown>)?.inheritLayout === false) inheritBreakIndex = i;
    } catch (e) {
      console.warn(${
      JSON.stringify($tr("client.layoutLoadFailed"))
    }, keys[i], e);
    }
  }
  return inheritBreakIndex >= 0 ? result.slice(inheritBreakIndex) : result;
}

export function clearLayoutCache(): void { /* no-op for nested */ }`
    : hasLayout
    ? `
let cachedLayouts: LayoutComponent[] | null = null;

export async function loadLayouts(_pathname?: string): Promise<LayoutComponent[]> {
  if (cachedLayouts) return cachedLayouts;
  try {
    const LayoutModule = await import("./routes/_layout${layoutExt}");
    const LayoutComponent = LayoutModule?.default ?? LayoutModule?.Layout;
    if (LayoutComponent && (typeof LayoutComponent === "function" || typeof LayoutComponent === "object")) {
      cachedLayouts = [{ component: LayoutComponent, props: {} }];
      return cachedLayouts;
    }
    console.warn(${JSON.stringify($tr("client.layoutDefaultExport"))});
  } catch (error) {
    console.warn(${JSON.stringify($tr("client.layoutLoadFailed"))}, error);
  }
  cachedLayouts = [];
  return cachedLayouts;
}

/** HMR 无感刷新时清空布局缓存 */
export function clearLayoutCache(): void {
  cachedLayouts = null;
}`
    : `
let cachedLayouts: LayoutComponent[] | null = null;

export async function loadLayouts(_pathname?: string): Promise<LayoutComponent[]> {
  return [];
}

export function clearLayoutCache(): void {
  cachedLayouts = null;
}`;

  /** View：setViewState + ensureReactiveRoot（模板已在 snippet 前调过 unmountPrevious）；非 view：清空容器 + renderCSR */
  const hmrRenderSnippet = isViewEngine
    ? `setViewState({ page: PageComponent, props: { params: match.params, query: match.query }, layouts: layoutList, skipLayouts });
    _viewEnsureReactiveRoot(containerId);`
    : `const _container = typeof document !== "undefined" ? document.querySelector("#" + containerId) : null;
    if (_container && typeof _container.replaceChildren === "function") _container.replaceChildren();
    const csrResult = await renderCSR({
      engine,
      component: PageComponent,
      container: "#" + containerId,
      props: { params: match.params, query: match.query },
      layouts: skipLayouts ? undefined : layoutList,
      skipLayouts,
      debug: !!(_win.__DWEB_DEBUG__),
    });
    RENDER_STATE.lastUnmount = csrResult?.unmount ?? null;`;

  // 将服务端注入的 layoutData 合并到各 layout 的 props，使 hydrate 时 Layout 能收到 data
  const mergeLayoutDataSnippet = `const _layoutData = (hydrationData.layoutData && Array.isArray(hydrationData.layoutData)) ? hydrationData.layoutData : [];
      const _layouts = layouts.map((l, i) => ({ component: l.component, props: _layoutData[i] ?? l.props ?? {} }));`;
  /** View Hybrid：首屏只 setViewState + createReactiveRootHydrate，一次水合同一根后续 patch；非 View 走 render 的 hydrate。 */
  const hybridInitBlock = isViewEngine
    ? `${mergeLayoutDataSnippet}
      setViewState({ page: PageComponent, props: hydrationData.page || { params: hydrationData.params || {}, query: hydrationData.query || {} }, layouts: skipLayouts ? [] : _layouts, skipLayouts });
      _viewEnsureReactiveRoot(containerId);
      isHydratedRef.current = true;`
    : `${mergeLayoutDataSnippet}
      const hydResult = await hydrate({
        engine,
        component: PageComponent,
        container: \`#\${containerId}\`,
        props: hydrationData.page || {
          params: hydrationData.params || {},
          query: hydrationData.query || {},
        },
        layouts: skipLayouts ? undefined : _layouts,
        skipLayouts,
        debug: !!(_win.__DWEB_DEBUG__),
      });
      RENDER_STATE.lastUnmount = hydResult?.unmount ?? null;
      isHydratedRef.current = true;`;

  // __data 仅在 onRouteChange 内请求。同页锚点虽不触发 router 的 navigate，但浏览器改 hash 可能触发 popstate，仍会进 onRouteChange，
  // 故用 pathname+search 判断：与上次相同则视为「同页仅 hash」，不请求 __data。保留 pathname 保留字(/_*、/__data 等)也不请求。
  const fetchRouteDataSnippet =
    `var _pathname = (typeof _win.location !== "undefined" && _win.location.pathname) ? _win.location.pathname : "/";
      var _search = (typeof _win.location !== "undefined" && _win.location.search) ? _win.location.search : "";
      var _pathAndSearch = _pathname + _search;
      var _samePageHashOnly = (typeof (g as DwebGlobal).__DWEB_LAST_PATHNAME__ === "string" && (g as DwebGlobal).__DWEB_LAST_PATHNAME__ === _pathAndSearch);
      var _reservedOrInvalid = !_pathname || _pathname === "${DWEB_DATA_PATH}" || _pathname.indexOf("/_") === 0 || _pathname.indexOf("//") !== -1 || _samePageHashOnly;
      var _navProps;
      if (!_reservedOrInvalid) {
        var _dataUrl = "${DWEB_DATA_PATH}?path=" + encodeURIComponent(_pathname) + (_search ? "&" + _search.slice(1) : "");
        var _dataRes = await fetch(_dataUrl);
        _navProps = (_dataRes && _dataRes.ok) ? await _dataRes.json() : { params: match.params || {}, query: match.query || {} };
      } else {
        _navProps = { params: match.params || {}, query: match.query || {} };
      }
      (g as DwebGlobal).__DWEB_LAST_PATHNAME__ = _pathAndSearch;`;
  // 客户端导航：将 __data 返回的 layoutData 合并到 layouts，使点击链接切换页面时 layout 也能收到 data；页面只收 params/query/data
  const onRouteChangeMergeLayoutSnippet = `var _navLayoutData = (_navProps && Array.isArray(_navProps.layoutData)) ? _navProps.layoutData : [];
      var _layoutsNav = _navLayoutData.length ? layouts.map(function(l, i){ return { component: l.component, props: _navLayoutData[i] ?? l.props ?? {} }; }) : layouts;
      var _pageProps = _navProps ? { params: _navProps.params || {}, query: _navProps.query || {}, data: _navProps.data } : { params: match.params || {}, query: match.query || {} };`;
  /**
   * View / React/Preact 统一：先拉取 __data（旧内容仍可见），
   * 再 unmount/清空。View 在路由切换时始终先卸载再挂载，避免按索引 patch 导致上一页 DOM 残留在当前页。
   */
  const onRouteChangeRenderSnippet = isViewEngine
    ? `if (_win.__DWEB_DEBUG__) console.log("[dweb:view] onRouteChange", { component: match.route.component, hasPage: !!PageComponent });
      ${fetchRouteDataSnippet}
      ${onRouteChangeMergeLayoutSnippet}
      unmountPrevious();
      setViewState({ page: PageComponent, props: _pageProps, layouts: _layoutsNav, skipLayouts });
      _viewEnsureReactiveRoot(containerId);
      (g as DwebGlobal).__DWEB_ON_READY__?.();`
    : `${fetchRouteDataSnippet}
      ${onRouteChangeMergeLayoutSnippet}
      unmountPrevious();
      const _container = typeof document !== "undefined" ? document.querySelector("#" + containerId) : null;
      if (_container && typeof _container.replaceChildren === "function") _container.replaceChildren();
      const csrResult = await renderCSR({
        engine,
        component: PageComponent,
        container: "#" + containerId,
        props: _pageProps,
        layouts: skipLayouts ? undefined : _layoutsNav,
        skipLayouts,
        debug: !!(_win.__DWEB_DEBUG__),
      });
      RENDER_STATE.lastUnmount = csrResult?.unmount ?? null;
      (g as DwebGlobal).__DWEB_ON_READY__?.();`;

  // CSR 首屏：若服务端注入了 __DATA__（当前路由的 load 结果），则使用其 page 与 layoutData，用后清空避免客户端导航误用
  const csrInitialPropsSnippet = `var __d = (g as DwebGlobal).__DATA__;
      var __use = __d != null && (match.route?.path ?? "") === (__d.route ?? "");
      var _layoutData = (__use && __d && Array.isArray(__d.layoutData)) ? __d.layoutData : [];
      var _props = __use ? (function(){ (g as DwebGlobal).__DATA__ = undefined; return __d?.page ?? { params: match.params, query: match.query }; })() : { params: match.params, query: match.query };`;
  const csrMergeLayoutDataSnippet = `var _layoutsCsr = (__use && _layoutData.length) ? layoutList.map(function(l, i){ return { component: l.component, props: _layoutData[i] ?? l.props ?? {} }; }) : layoutList;`;
  const setLastPathSnippet =
    `(g as DwebGlobal).__DWEB_LAST_PATHNAME__ = (typeof _win.location !== "undefined" && _win.location.pathname ? _win.location.pathname : "/") + (typeof _win.location !== "undefined" && _win.location.search ? _win.location.search : "");`;
  const renderCurrentRouteSnippet = isViewEngine
    ? `if (_win.__DWEB_DEBUG__) console.log("[dweb:view] renderCurrentRoute", { component: match.route.component, hasPage: !!PageComponent, layoutsCount: layoutList?.length ?? 0 });
      ${setLastPathSnippet}
      ${csrInitialPropsSnippet}
      ${csrMergeLayoutDataSnippet}
      setViewState({ page: PageComponent, props: _props, layouts: _layoutsCsr, skipLayouts });
      if (!_viewReactiveRoot && RENDER_STATE.lastUnmount) { RENDER_STATE.lastUnmount(); RENDER_STATE.lastUnmount = null; }
      if (!_viewReactiveRoot) {
        _viewEnsureReactiveRoot(containerId);
        _win.__DWEB_ON_READY__?.();
      } else {
        if (typeof queueMicrotask === "function") {
          queueMicrotask(() => { _viewEnsureReactiveRoot(containerId); _win.__DWEB_ON_READY__?.(); });
        } else {
          _viewEnsureReactiveRoot(containerId);
          _win.__DWEB_ON_READY__?.();
        }
      }
      if (_win.__DWEB_DEBUG__) console.log("[dweb:view] renderCurrentRoute done");`
    : `if (RENDER_STATE.lastUnmount) { RENDER_STATE.lastUnmount(); RENDER_STATE.lastUnmount = null; }
      const _container = typeof document !== "undefined" ? document.querySelector("#" + containerId) : null;
      if (_container && typeof _container.replaceChildren === "function") _container.replaceChildren();
      ${setLastPathSnippet}
      ${csrInitialPropsSnippet}
      ${csrMergeLayoutDataSnippet}
      const csrResult = await renderCSR({
        engine,
        component: PageComponent,
        container: "#" + containerId,
        props: _props,
        layouts: skipLayouts ? undefined : _layoutsCsr,
        skipLayouts,
        debug: !!(_win.__DWEB_DEBUG__),
      });
      RENDER_STATE.lastUnmount = csrResult?.unmount ?? null;
      (g as DwebGlobal).__DWEB_ON_READY__?.();`;

  return `/// <reference lib="dom" />
/**
 * 客户端依赖（由 @dreamer/dweb 自动生成，每次构建/启动会重新生成）
 * 供 client.tsx 导入：initApp、DwebApp、路由类型、DwebGlobal 等；initApp 返回 app（含 renderCurrentRoute、router）供在 .then 中直接使用，可做路由拦截。
 */

import { createRouter } from "@dreamer/router/client";
${renderAdapterImport}

/** 客户端路由类型（与 @dreamer/router ClientRoute 一致） */
export type RouteType = "static" | "dynamic" | "wildcard" | "optional";

/** 服务端注入的全局变量类型 */
export interface DwebGlobal {
  __DWEB_ROUTES__?: Array<{ path: string; component: string; type?: RouteType }>;
  __DWEB_ENGINE__?: "react" | "preact" | "view";
  __DWEB_CONTAINER_ID__?: string;
  __DATA__?: {
    route?: string;
    page?: Record<string, unknown>;
    params?: Record<string, string>;
    query?: Record<string, string>;
    component?: string;
  };
  __DWEB_MODE__?: "csr" | "hybrid" | "ssr" | "ssg";
  /** 是否为开发模式（服务端注入，用于区分 dev/prod 行为，如 CSS 强制刷新仅 dev 执行） */
  __DWEB_DEV__?: boolean;
  __HMR_REFRESH__?: (options?: { chunkUrl?: string }) => void;
  /** CSR 模式下页面渲染完成时调用，用于淡出 loading 遮罩 */
  __DWEB_ON_READY__?: () => void;
  /** 开发模式 HMR 调试日志开关（控制台设置 globalThis.__DWEB_HMR_DEBUG__ = true 可查看详细日志） */
  __DWEB_HMR_DEBUG__?: boolean;
  /** 详细调试日志开关（传 true 时 render 与 router 输出详细调试信息，开发模式默认 true） */
  __DWEB_DEBUG__?: boolean;
  /** 上次的 pathname+search（不含 hash），同页仅 hash 变化时不请求 __data */
  __DWEB_LAST_PATHNAME__?: string;
}

/** 浏览器全局对象（兼容 Deno 无 DOM 类型，使用 globalThis 替代 window） */
const _win = globalThis as unknown as Window & typeof globalThis & DwebGlobal;

// 路由组件加载器映射（动态导入，按需加载）
export const ROUTE_LOADERS: Record<string, () => Promise<unknown>> = {
${routeLoaders}
};

// 已加载的模块缓存（避免重复加载）
export const MODULE_CACHE: Record<string, unknown> = {};

// 开发态 HMR CSS 配置，无感刷新后按 url 拉取最新 CSS 并写入对应 styleId
export const HMR_CSS_ENTRIES: Array<{ url: string; styleId: string }> = ${
    JSON.stringify(hmrCssEntries)
  };

export interface LayoutComponent {
  component: unknown;
  props?: Record<string, unknown>;
}

${layoutCode}

/**
 * 规范化组件路径用于 ROUTE_LOADERS 查找（Windows 兼容）
 * 统一反斜杠为正斜杠、去除 ./ 前缀、去除扩展名，与 scanRouteComponents 生成的 key 一致
 */
function normalizeComponentPathForLookup(componentPath: string): string {
  return componentPath
    .replace(/\\\\+/g, "/") // Windows 反斜杠（含连续多个）-> 正斜杠
    .replace(/^\\.\\//, "") // 去除 ./ 前缀（如 ./src/routes/index）
    .replace(/\\.(tsx?|jsx?)$/, "")
    .trim();
}

/**
 * 尝试从多种路径格式中匹配 ROUTE_LOADERS 的 key（Windows 路径兼容）
 * 服务端 hydrationData.component 可能与客户端 ROUTE_LOADERS 的 key 格式不一致
 */
function findLoaderForPath(cleanPath: string): (() => Promise<unknown>) | undefined {
  let loader = ROUTE_LOADERS[cleanPath];
  if (loader) return loader;
  // Windows 下路径大小写可能不一致，尝试不区分大小写匹配
  const key = Object.keys(ROUTE_LOADERS).find(
    (k) => k.toLowerCase() === cleanPath.toLowerCase(),
  );
  if (key) return ROUTE_LOADERS[key];
  // 兼容带 routes/ 前缀的路径（服务端与客户端路径格式差异）
  if (cleanPath.startsWith("routes/")) {
    loader = ROUTE_LOADERS[cleanPath.slice(7)];
    if (loader) return loader;
  }
  // 兼容带 src/routes/ 前缀的路径（Windows 下路径格式可能不同）
  if (cleanPath.startsWith("src/routes/")) {
    loader = ROUTE_LOADERS[cleanPath.slice(11)];
    if (loader) return loader;
  }
  // 兼容完整 Windows 路径（如 D:/project/src/routes/index 或 C:\\...\\src\\routes\\index）
  // 查找 "routes/" 或 "/routes/" 后的相对路径（cleanPath 已归一化，无需再 replace 反斜杠）
  const routesIdx = cleanPath.toLowerCase().indexOf("/routes/");
  if (routesIdx >= 0) {
    const afterRoutes = cleanPath.slice(routesIdx + 8);
    loader = ROUTE_LOADERS[afterRoutes];
    if (loader) return loader;
    const keyAfter = Object.keys(ROUTE_LOADERS).find(
      (k) => k.toLowerCase() === afterRoutes.toLowerCase(),
    );
    if (keyAfter) return ROUTE_LOADERS[keyAfter];
  }
  // 提取最后一段作为 fallback（如 "src/routes/index" -> "index"，仅当单段路由时）
  const lastSegment = cleanPath.split("/").pop() || cleanPath;
  loader = ROUTE_LOADERS[lastSegment];
  if (loader) return loader;
  const keyByLast = Object.keys(ROUTE_LOADERS).find(
    (k) => k.toLowerCase() === lastSegment.toLowerCase(),
  );
  return keyByLast ? ROUTE_LOADERS[keyByLast] : undefined;
}

/**
 * 动态加载页面模块
 * @param componentPath 组件路径标识（如 "about" 或 "user/[id]"）
 */
export async function loadPageModule(componentPath: string): Promise<unknown> {
  if (componentPath == null || String(componentPath).trim() === "") {
    return null;
  }
  const cleanPath = normalizeComponentPathForLookup(componentPath);
  if (MODULE_CACHE[cleanPath]) return MODULE_CACHE[cleanPath];
  const loader = findLoaderForPath(cleanPath);
  if (!loader) {
    if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
      console.warn(${
    JSON.stringify(
      "[dweb] loadPageModule: no loader for path (Windows path mismatch?)",
    )
  }, { componentPath, cleanPath, availableKeys: Object.keys(ROUTE_LOADERS) });
    }
    return null;
  }
  const module = await loader();
  MODULE_CACHE[cleanPath] = module;
  return module;
}

/** 渲染 404 页面 */
export function renderNotFound(containerId: string): void {
  const container = _win.document?.getElementById(containerId);
  if (container) {
    container.innerHTML = \`
      <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:system-ui,sans-serif;">
        <h1 style="font-size:72px;margin:0;color:#e5e5e5;">404</h1>
        <p style="color:#666;margin-top:16px;">${$tr("client.pageNotFound")}</p>
        <a href="/" style="color:#3b82f6;text-decoration:none;margin-top:24px;">${
    $tr("client.backToHome")
  }</a>
      </div>
    \`;
  }
}

/** 将字符串转义为安全 HTML 文本，防止 XSS */
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 渲染错误页面（error.message 经 escapeHtml 转义，防止 XSS） */
export function renderError(containerId: string, error: unknown): void {
  const container = _win.document?.getElementById(containerId);
  if (container) {
    const message = error instanceof Error ? error.message : String(error);
    container.innerHTML = \`
      <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:system-ui,sans-serif;">
        <h1 style="font-size:48px;margin:0;color:#ef4444;">${
    $tr("client.errorOccurred")
  }</h1>
        <p style="color:#666;margin-top:16px;">\${escapeHtml(message)}</p>
        <button type="button" onclick="location.reload()" style="margin-top:24px;padding:8px 24px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;">
          ${$tr("client.reload")}
        </button>
      </div>
    \`;
  }
}

/** 路由匹配结果（与 @dreamer/router 一致） */
export type ClientRouteMatch = { route: { component: string; path?: string }; params: Record<string, string>; query: Record<string, string> } | null;

/** 路由守卫（前置/后置），返回 false 阻止导航，返回 string 重定向到该路径 */
export type ClientRouteGuard = (to: ClientRouteMatch, from: ClientRouteMatch | null) => boolean | string | Promise<boolean | string> | void | Promise<void>;

/** 路由器实例（由 createRouter 返回），含 start、match、getCurrentRoute、onRouteChange、beforeRoute、afterRoute、navigate，用于路由拦截等 */
export interface ClientRouterLike {
  start(): void;
  match(pathname: string): ClientRouteMatch;
  /** 获取当前路由匹配结果（@dreamer/router 的 ClientRouter 提供此方法） */
  getCurrentRoute?(): ClientRouteMatch;
  onRouteChange(cb: (match: ClientRouteMatch) => void | Promise<void>): void;
  beforeRoute(guard: ClientRouteGuard): () => void;
  afterRoute(guard: ClientRouteGuard): () => void;
  navigate(path: string, options?: { replace?: boolean; state?: unknown }): Promise<void>;
}

/**
 * 执行 Hybrid hydration（若需要）、启动路由器、注册 HMR 无感刷新回调。
 * 供 client.tsx 的 initApp 调用，保持 client.tsx 简洁。
 */
/** 共享的渲染状态：存储上次卸载函数，HMR/路由切换前需先调用以清理 Preact/React/Solid 内部状态，避免 __H 等 hooks 冲突 */
export const RENDER_STATE: { lastUnmount: (() => void) | null } = { lastUnmount: null };
${
    isViewEngine
      ? `
/** View 引擎：用 createSignal 存当前页/布局/props；CSR 用 mount(selector, fn) 与 view 示例一致，fn 内读 getViewState() 实现响应式 patch；Hybrid/SSR/SSG 用 createReactiveRootHydrate。 */
const [getViewState, setViewState] = createSignal({ page: null as unknown, props: {} as Record<string, unknown>, layouts: [] as LayoutComponent[], skipLayouts: false });
let _viewReactiveRoot: { unmount: () => void } | null = null;

/** View 引擎：无 reactive root 时创建。CSR 用 mount(selector, () => buildViewTree(getViewState()...)) 与 view 示例一致；Hybrid/SSR/SSG 且容器有服务端 HTML 时用 createReactiveRootHydrate。 */
function _viewEnsureReactiveRoot(containerId: string): void {
  const el = typeof document !== "undefined" ? document.querySelector("#" + containerId) : null;
  if (!el) {
    if (_win.__DWEB_DEBUG__) console.warn("[dweb:view] _viewEnsureReactiveRoot: container not found", containerId);
    return;
  }
  if (!_viewReactiveRoot) {
    const mode = _win.__DWEB_MODE__;
    const isHydrateMode = mode === "hybrid" || mode === "ssr" || mode === "ssg";
    // CSR 时服务端已在 #app 内渲染 Layout(Loading)；mount() 会 appendChild，先清空避免两屏。Hybrid/SSR/SSG 同需清空再挂载。
    if (_win.__DWEB_DEBUG__) console.log("[dweb:view] _viewEnsureReactiveRoot: clearing #" + containerId + (isHydrateMode ? " (mount mode)" : " (csr, replace loading shell)"));
    if (typeof (el as HTMLElement).replaceChildren === "function") (el as HTMLElement).replaceChildren(); else (el as HTMLElement).innerHTML = "";
    _viewReactiveRoot = mount("#" + containerId, () => {
      const s = getViewState();
      if (_win.__DWEB_DEBUG__) console.log("[dweb:view] mount fn", { hasPage: !!s.page, layoutsLen: s.layouts?.length ?? 0, skipLayouts: s.skipLayouts });
      if (s.page == null && _win.__DWEB_DEBUG__) console.warn("[dweb:view] mount: s.page is null");
      return buildViewTree(s.page, s.props, s.layouts, s.skipLayouts);
    }, { noopIfNotFound: true });
    if (_win.__DWEB_DEBUG__) console.log("[dweb:view] _viewEnsureReactiveRoot: done, container childCount=" + (el as HTMLElement).childNodes.length);
    RENDER_STATE.lastUnmount = () => {
      _viewReactiveRoot?.unmount();
      _viewReactiveRoot = null;
    };
  }
}
`
      : ""
  }

export async function setupHydrationRouterAndHmr(opts: {
  g: DwebGlobal;
  router: ClientRouterLike;
  containerId: string;
  engine: "react" | "preact" | "view";
  layouts: LayoutComponent[];
  isHydratedRef: { current: boolean };
  isHybridMode: boolean;
}): Promise<void> {
  const { g, router, containerId, engine, layouts, isHydratedRef, isHybridMode } = opts;
  // 等待 #containerId 已挂载到 DOM（Preact/React/View 等脚本可能早于 body 解析执行，导致 hydrate 时找不到 #app）
  await new Promise<void>((resolve) => {
    const sel = "#" + containerId;
    if (typeof document !== "undefined" && document.querySelector(sel)) {
      resolve();
      return;
    }
    if (typeof document !== "undefined" && document.readyState === "complete") {
      resolve();
      return;
    }
    if (typeof window !== "undefined") {
      window.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    } else {
      resolve();
    }
  });
  const unmountPrevious = (): void => {
    if (RENDER_STATE.lastUnmount) {
      RENDER_STATE.lastUnmount();
      RENDER_STATE.lastUnmount = null;
    }
  };
  // 先启动路由器，确保链接点击拦截器尽早注册（避免 hydrate 失败时链接无法响应）
  router.start();
  if (isHybridMode && !isHydratedRef.current) {
    try {
      const hydrationData = g.__DATA__!;
      const componentPath = hydrationData.component || "";
      const module = await loadPageModule(componentPath) as Record<string, unknown>;
      const PageComponent = module?.default ?? module?.Page;
      if (!PageComponent) {
        const msg = ${
    JSON.stringify($tr("client.hydrationFailed"))
  } + (componentPath ? \`: component "\${componentPath}" not found\` : "");
        console.error(msg);
        renderError(containerId, new Error(msg));
        return;
      }
      const skipLayouts = module?.inheritLayout === false;
      ${hybridInitBlock}
    } catch (error) {
      console.error(${
    JSON.stringify($tr("client.hydrationFailed"))
  } + ":", error);
      renderError(containerId, error);
    }
  }
  g.__HMR_REFRESH__ = (hmrOpts) => {
    const chunkUrl = hmrOpts?.chunkUrl;
    if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
      console.log(${JSON.stringify($tr("client.hmrDebugEnabled"))});
    }
    for (const key of Object.keys(MODULE_CACHE)) delete MODULE_CACHE[key];
    clearLayoutCache();
    const pathname = (typeof _win.location !== "undefined" && _win.location?.pathname) ? _win.location.pathname : "/";
    const match = router.match(pathname);
    if (!match) {
      if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
        console.log(${JSON.stringify($tr("client.hmrNoMatchRenderNotFound"))});
      }
      unmountPrevious(); renderNotFound(containerId); return;
    }
    // 有 chunkUrl 且匹配当前路由时，用 import(chunkUrl + "?t=" + ts) 强制拉取新 chunk（绕过浏览器模块缓存）
    // 否则 loadPageModule 返回缓存，拿不到新代码。多段路由如 admin/index 的 chunk 可能为 admin-index-XXX.js，需按完整路径匹配
    const comp = match.route.component;
    const compLastSegment = comp.split("/").pop() || comp;
    const compBase = compLastSegment.replace(/\\.(tsx?|jsx?)$/, "");
    const compPathAsBase = comp.replace(/\\//g, "-");
    const chunkUrlStr = typeof chunkUrl === "string" ? chunkUrl : "";
    const chunkFileName = chunkUrlStr ? (chunkUrlStr.split("/").pop() || "") : "";
    const chunkPathNoExt = chunkUrlStr.replace(/\\/[^/]+$/, "");
    const chunkBaseFromUrl = chunkFileName ? chunkFileName.replace(/-[A-Za-z0-9]{6,10}\\.js(\\\.map)?$/i, "").replace(/\\.js.*$/, "") : null;
    const chunkFullBase = (chunkPathNoExt && chunkBaseFromUrl) ? (chunkPathNoExt + "/" + chunkBaseFromUrl) : chunkBaseFromUrl;
    const useChunkUrl = chunkUrl && (chunkBaseFromUrl || chunkFullBase) &&
      (compBase === chunkBaseFromUrl || compLastSegment === chunkBaseFromUrl ||
        comp === chunkBaseFromUrl || compPathAsBase === chunkBaseFromUrl ||
        (chunkBaseFromUrl && comp.startsWith(chunkBaseFromUrl + "/")) ||
        (chunkFullBase && (chunkFullBase.endsWith("/" + comp) || chunkFullBase === comp || chunkFullBase.endsWith(compPathAsBase))) ||
        (compBase === "index" && !comp.includes("/") && chunkBaseFromUrl === "routes"));
    if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
      console.log(${JSON.stringify($tr("client.hmrChunkUrlMatch"))}, {
        chunkUrl,
        chunkBaseFromUrl,
        comp,
        compBase,
        compLastSegment,
        useChunkUrl,
      });
    }
    const loadModule = () => {
      if (useChunkUrl) {
        const path = chunkUrl!.startsWith("/") ? chunkUrl! : "/" + chunkUrl!;
        const busted = path + (path.includes("?") ? "&" : "?") + "t=" + Date.now();
        if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
          console.log(${
    JSON.stringify($tr("client.hmrForceFetchWithChunkUrl"))
  }, busted);
        }
        return import(/* @vite-ignore */ busted);
      }
      // 无 chunkUrl 或未匹配时 loadPageModule 会命中浏览器模块缓存，无法拿到新代码；整页刷新以加载最新
      if (typeof _win.location !== "undefined" && _win.location.reload) {
        _win.location.reload();
        return new Promise(function() {});
      }
      return loadPageModule(match.route.component);
    };
    const scrollX = typeof _win.scrollX === "number" ? _win.scrollX : 0;
    const scrollY = typeof _win.scrollY === "number" ? _win.scrollY : 0;
    // 先记录待移除的旧 CSS 元素（加载前快照，避免误删新 chunk 注入的样式）
    const oldCssEls = typeof _win.document !== "undefined"
      ? Array.from(_win.document.querySelectorAll("[data-dweb-route-css],[data-dweb-css-id]"))
      : [];
    // 先加载新模块（旧内容保持可见），加载完成后再 unmount + 移除旧 CSS + render，避免长时间空白导致闪动
    loadModule()
      .then((mod) => {
        if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
          console.log(${
    JSON.stringify($tr("client.hmrLoadModuleComplete"))
  }, { hasDefault: !!(mod as Record<string, unknown>)?.default, componentPath: match.route.component });
        }
        const modObj = mod as Record<string, unknown>;
        if (!modObj) { renderNotFound(containerId); return; }
        const PageComponent = modObj.default ?? modObj.Page;
        if (!PageComponent) { renderNotFound(containerId); return; }
        const skipLayouts = modObj.inheritLayout === false;
        return ${loadLayoutsCallRender}.then(async (layoutList) => {
          if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
            console.log(${
    JSON.stringify($tr("client.hmrRenderCsrBefore"))
  }, { componentPath: match.route.component });
          }
          // 新模块已就绪，在 render 前一刻执行 unmount + 移除旧 CSS，最小化空白时间，消除闪动
          unmountPrevious();
          oldCssEls.forEach(function(el) { el.remove(); });
          ${hmrRenderSnippet}
          if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
            console.log(${JSON.stringify($tr("client.hmrRenderCsrComplete"))});
          }
          if (typeof _win.scrollTo === "function") {
            const sx = scrollX;
            const sy = scrollY;
            if (typeof _win.requestAnimationFrame === "function") {
              _win.requestAnimationFrame(() => {
                _win.scrollTo(sx, sy);
              });
            } else {
              _win.scrollTo(sx, sy);
            }
          }
          if (typeof _win.document !== "undefined") {
            HMR_CSS_ENTRIES.forEach(function(entry) {
              const el = _win.document.getElementById(entry.styleId);
              if (!el) return;
              // link 元素：通过更新 href 加时间戳刷新缓存；style 元素：fetch 后写入 textContent
              if (el.tagName === "LINK") {
                (el as HTMLLinkElement).href = entry.url + "?t=" + Date.now();
              } else {
                fetch(entry.url + "?t=" + Date.now())
                  .then(function(r) { return r.ok ? r.text() : Promise.reject(new Error(${
    JSON.stringify($tr("client.hmrCssFetchFailedPrefix"))
  } + r.statusText)); })
                  .then(function(css) { el.textContent = css; })
                  .catch(function() {});
              }
            });
          }
        });
      })
      .catch((err) => {
        if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
          console.error(${
    JSON.stringify($tr("client.hmrLoadModuleRenderFailed"))
  }, err);
        }
        console.warn(${
    JSON.stringify($tr("client.hmrFallback"))
  } + ":", err?.message || err);
        if (typeof _win.location !== "undefined") {
          _win.location.reload();
        }
      });
  };

  // onRouteChange 注册时 router 会立即用当前路由触发一次。CSR 下若执行会导致先渲染一次（_navProps 可能无 data），再 renderCurrentRoute 用 __DATA__ 又渲染一次，出现双渲染；Hybrid 下该次会与 hydrate 冲突。故首轮均跳过，由 renderCurrentRoute（CSR）或 hydrate（Hybrid）负责首屏。
  let skipNextRouteChange = true;
  router.onRouteChange(async (match) => {
    if (!match) { unmountPrevious(); renderNotFound(containerId); return; }
    if (skipNextRouteChange) {
      skipNextRouteChange = false;
      return;
    }
    if (isHybridMode && !isHydratedRef.current) { isHydratedRef.current = true; return; }
    try {
      const module = await loadPageModule(match.route.component) as Record<string, unknown>;
      if (!module) { unmountPrevious(); renderNotFound(containerId); return; }
      const PageComponent = module.default ?? module.Page;
      if (!PageComponent) { unmountPrevious(); renderNotFound(containerId); return; }
      const skipLayouts = module.inheritLayout === false;
      ${onRouteChangeRenderSnippet}
    } catch (error) {
      console.error(${
    JSON.stringify($tr("client.pageLoadError"))
  } + ":", error);
      unmountPrevious();
      renderError(containerId, error);
    }
  });
}

/** 客户端应用实例，含 renderCurrentRoute 与 router（可在此注册 beforeRoute/afterRoute 做路由拦截） */
export interface DwebApp {
  renderCurrentRoute(): Promise<void>;
  router: ClientRouterLike;
}

/**
 * 初始化客户端应用（从 globalThis 读配置、loadLayouts、createRouter、hydration、HMR、onRouteChange）。
 * 返回的 app 含 renderCurrentRoute，可在 .then((app) => { ... }) 中直接使用，如 i18n.onChange(() => app.renderCurrentRoute())。
 */
export async function initApp(): Promise<DwebApp> {
  const g = globalThis as unknown as DwebGlobal;
  const routes = g.__DWEB_ROUTES__ || [];
  const engine = g.__DWEB_ENGINE__ || "${engine}";
  const containerId = g.__DWEB_CONTAINER_ID__ || "app";
  const isHybridMode = (g.__DWEB_MODE__ === "hybrid" || g.__DWEB_MODE__ === "ssr" || g.__DWEB_MODE__ === "ssg") && !!g.__DATA__;
  const router = createRouter({
    routes,
    engine,
    debug: !!(_win.__DWEB_DEBUG__),
    // SSR/SSG 仅做当前页 hydrate、不做客户端路由，链接点击走浏览器默认整页跳转
    interceptLinks: _win.__DWEB_MODE__ !== "ssr" && _win.__DWEB_MODE__ !== "ssg",
  });
  // 在首次 await 前注册链接点击拦截器（CSR/Hybrid）；SSR/SSG 时 interceptLinks 为 false，不拦截
  router.start();
  const layouts = await ${loadLayoutsCallInit};
  const isHydratedRef = { current: false };
  await setupHydrationRouterAndHmr({ g, router, containerId, engine, layouts, isHydratedRef, isHybridMode });

  async function renderCurrentRoute(): Promise<void> {
    const pathname = (typeof _win.location !== "undefined" && _win.location?.pathname) ? _win.location.pathname : "/";
    const match = router.match(pathname);
    if (!match) {
      if (RENDER_STATE.lastUnmount) { RENDER_STATE.lastUnmount(); RENDER_STATE.lastUnmount = null; }
      renderNotFound(containerId);
      return;
    }
    try {
      const module = await loadPageModule(match.route.component) as Record<string, unknown>;
      if (!module) {
        if (RENDER_STATE.lastUnmount) { RENDER_STATE.lastUnmount(); RENDER_STATE.lastUnmount = null; }
        renderNotFound(containerId);
        return;
      }
      const PageComponent = module.default ?? module.Page;
      if (!PageComponent) {
        if (RENDER_STATE.lastUnmount) { RENDER_STATE.lastUnmount(); RENDER_STATE.lastUnmount = null; }
        renderNotFound(containerId);
        return;
      }
      const skipLayouts = module.inheritLayout === false;
      const layoutList = await ${loadLayoutsCallRender};
      ${renderCurrentRouteSnippet}
    } catch (error) {
      console.error(${
    JSON.stringify($tr("client.pageLoadError"))
  } + ":", error);
      if (RENDER_STATE.lastUnmount) { RENDER_STATE.lastUnmount(); RENDER_STATE.lastUnmount = null; }
      renderError(containerId, error);
    }
  }

  // CSR 模式：router.start() 不会用当前 URL 触发 onRouteChange，首屏需主动渲染当前路由
  if (!isHybridMode) await renderCurrentRoute();
  // View + Hybrid：若 hydrate 后仍未创建 reactive root（例如服务端未注入 __DATA__ 导致未走 hydrate 分支），则首屏也执行一次 renderCurrentRoute，确保首次刷新即调用 createReactiveRoot
  else if (engine === "view" && !_viewReactiveRoot) await renderCurrentRoute();
  return { renderCurrentRoute, router };
}
`;
}

/**
 * 生成 client.tsx 入口代码（瘦身版：从 client.dep.tsx 导入，仅含 bootstrap 逻辑）
 * client.tsx 仅当不存在时生成，便于用户修改入口；client.dep.tsx 每次构建会重新生成。
 *
 * @param engine 渲染引擎
 * @param components 路由组件列表（未使用，路由列表在 client.dep 中）
 * @param hasLayout 是否存在布局文件（未使用）
 * @param _hmrCssEntries 未使用（已在 client.dep 中）
 */
function generateStaticClientEntry(
  _engine: "react" | "preact" | "view",
  _components: RouteComponentInfo[],
  _hasLayout: boolean,
  _hmrCssEntries: Array<{ url: string; styleId: string }>,
): string {
  return `/**
 * 客户端入口文件（由 @dreamer/dweb 自动生成，仅当不存在时生成，可手动编辑）
 * 从 _client.dep.tsx 导入 initApp；在 .then((app) => { ... }) 中可直接使用 app。
 * - i18n：i18n.onChange(() => app.renderCurrentRoute())
 * - 路由拦截：app.router.beforeRoute((to, from) => { ... })、app.router.afterRoute((to, from) => { ... })
 */

import { initApp } from "./${CLIENT_DEP_FILENAME}";

initApp()
  .then((app) => {
    // 获取当前路由（两种方式任选其一）
    const pathname = globalThis.location?.pathname || "/";
    const currentRoute = app.router.getCurrentRoute?.() ??
      app.router.match(pathname);
    if (currentRoute) {
      console.log(
        ${JSON.stringify($tr("client.routeCurrent"))},
        currentRoute.route.component,
        currentRoute.params,
      );
    }

    // 路由前置守卫（拦截）：在导航前执行，返回 false 阻止导航，返回 string 重定向到该路径
    app.router.beforeRoute((_to, _from) => {
      // 示例：需要登录的页面重定向到登录
      // if (to?.route.meta?.requiresAuth && !isLoggedIn()) return "/login";
      // 示例：阻止访问某路径
      // if (to?.route.component === "admin") return false;
      return true; // allow
    });

    // 路由后置守卫：导航完成后执行（可做埋点、日志等）
    app.router.afterRoute((to, _from) => {
      if (to) {
        console.log(${
    JSON.stringify($tr("client.routeSwitched"))
  }, to.route.component, to.params, to.query);
      }
    });
  })
  .catch(console.error);
`;
}

/**
 * 仅生成并写入客户端入口文件 client.tsx（不执行 esbuild）
 *
 * 用于开发模式：即使已有预构建的 dist/client/client.js，
 * 也保证 src/client.tsx 存在，便于查看和 HMR 无感刷新。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns 写入的 client.tsx 路径
 */
export async function ensureClientEntryFile(
  container: ServiceContainer,
  config: AppConfig,
): Promise<string> {
  const logger = getLogger(container);

  const routerConfig = (config.router || {}) as { routesDir?: string };
  const routesDirRaw = routerConfig.routesDir || "./src/routes";
  const routesDir = routesDirRaw.replace(/^\.\/?/, "") || routesDirRaw;
  const routesDirPath = join(cwd(), routesDir);
  const srcDir = join(routesDirPath, "..");
  const tempClientEntryPath = join(srcDir, CLIENT_ENTRY_FILENAME);

  const renderConfig = (config.render || {}) as {
    engine?: "react" | "preact" | "view";
    mode?: "csr" | "hybrid" | "ssr" | "ssg";
  };
  const engine = renderConfig.engine || "preact";
  const renderMode = (renderConfig.mode ?? "hybrid") as ClientDepRenderMode;

  const components = await scanRouteComponents(routesDirPath, "", engine);
  const { hasLayout, routeLayoutKeys } = await getRouteLayoutKeys(
    routesDirPath,
  );

  if (await exists(tempClientEntryPath)) {
    logger.debug(
      $tr("log.clientEntryExists", {
        path: pathForLog(tempClientEntryPath),
      }),
    );
    return tempClientEntryPath;
  }

  const hmrCssEntries = getHmrCssEntries(container);
  const clientDepPath = join(srcDir, CLIENT_DEP_FILENAME);
  const clientDepCode = generateClientDepContent(
    engine,
    components,
    hasLayout,
    hmrCssEntries,
    renderMode,
    routeLayoutKeys,
  );
  await writeTextFile(clientDepPath, clientDepCode);
  logger.debug($tr("log.clientDepGenerated", {
    path: pathForLog(clientDepPath),
  }));

  const clientEntryCode = generateStaticClientEntry(
    engine,
    components,
    hasLayout,
    hmrCssEntries,
  );
  await writeTextFile(tempClientEntryPath, clientEntryCode);
  logger.debug($tr("log.clientEntryGenerated", {
    path: pathForLog(tempClientEntryPath),
  }));
  return tempClientEntryPath;
}

/**
 * 准备客户端构建入口（生成 _client.dep.tsx、_client.tsx）
 *
 * 供 runBuildWithBuilder 在调用 Builder.build() 前执行，
 * 仅负责入口文件生成，不执行编译。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns 客户端构建配置（entry、output、engine、bundle），供 Builder 使用
 */
export async function prepareClientBuildEntry(
  container: ServiceContainer,
  config: AppConfig,
): Promise<{
  entry: string;
  output: string;
  engine: "react" | "preact" | "view";
  bundle: {
    minify?: boolean;
    sourcemap?: boolean;
    splitting?: boolean;
    format?: "esm";
    external?: string[];
    alias?: Record<string, string>;
  };
}> {
  const logger = getLogger(container);
  const routerConfig = (config.router || {}) as { routesDir?: string };
  const routesDirRaw = routerConfig.routesDir || "./src/routes";
  const routesDir = routesDirRaw.replace(/^\.\/?/, "") || routesDirRaw;
  const routesDirPath = join(cwd(), routesDir);
  const srcDir = join(routesDirPath, "../");
  const tempClientEntryPath = join(srcDir, CLIENT_ENTRY_FILENAME);

  const renderConfig = (config.render || {}) as {
    engine?: "react" | "preact" | "view";
    mode?: "csr" | "hybrid" | "ssr" | "ssg";
  };
  const engine = (renderConfig.engine || "preact") as
    | "react"
    | "preact"
    | "view";
  const renderMode = (renderConfig.mode ?? "hybrid") as ClientDepRenderMode;

  const components = await scanRouteComponents(routesDirPath, "", engine);
  logger.debug($tr("log.routesScanned", { count: String(components.length) }));

  const { hasLayout, routeLayoutKeys } = await getRouteLayoutKeys(
    routesDirPath,
  );
  const hmrCssEntries = getHmrCssEntries(container);
  const clientDepPath = join(resolve(srcDir), CLIENT_DEP_FILENAME);

  // Windows：写入前确保父目录存在，避免 NotFound (os error 3)
  await ensureDir(dirname(clientDepPath));

  // 每次构建都刷新 _client.dep.tsx
  const clientDepCode = generateClientDepContent(
    engine,
    components,
    hasLayout,
    hmrCssEntries,
    renderMode,
    routeLayoutKeys,
  );
  await writeTextFile(clientDepPath, clientDepCode);
  logger.debug(
    $tr("log.clientDepRefreshed", { path: pathForLog(clientDepPath) }),
  );

  // _client.tsx 不存在时生成（确保父目录存在）
  if (!(await exists(tempClientEntryPath))) {
    await ensureDir(dirname(tempClientEntryPath));
    const clientEntryCode = generateStaticClientEntry(
      engine,
      components,
      hasLayout,
      hmrCssEntries,
    );
    await writeTextFile(tempClientEntryPath, clientEntryCode);
    logger.debug($tr("log.clientEntryGenerating", {
      path: pathForLog(tempClientEntryPath),
    }));
  }

  const buildConfig = (config.build || {}) as {
    client?: {
      output?: string;
      bundle?: {
        splitting?: boolean;
        minify?: boolean;
        sourcemap?: boolean;
        external?: string[];
        alias?: Record<string, string>;
      };
    };
  };
  const userClientConfig = buildConfig.client || {};
  const userBundleConfig = userClientConfig.bundle || {};
  const clientOutputDirRaw = userClientConfig.output ??
    getInferredBuildOutputDirs().client;
  const finalOutputDir = join(cwd(), clientOutputDirRaw);

  const runtimeExternalBlocklist = engine === "preact"
    ? ["preact", "preact/hooks", "preact/jsx-runtime"]
    : engine === "view"
    ? ["@dreamer/view", "@dreamer/view/jsx-runtime"]
    : ["react", "react-dom", "react/jsx-runtime", "react-dom/client"];
  const userExternal = Array.isArray(userBundleConfig.external)
    ? userBundleConfig.external
    : [];
  const externalList = userExternal.filter(
    (ext) =>
      !runtimeExternalBlocklist.some((b) =>
        ext === b || ext.startsWith(`${b}/`)
      ),
  );

  const bundleAlias = userBundleConfig.alias;

  return {
    entry: tempClientEntryPath,
    output: finalOutputDir,
    engine,
    bundle: {
      minify: userBundleConfig.minify ?? true,
      sourcemap: userBundleConfig.sourcemap ?? false,
      splitting: userBundleConfig.splitting ?? true,
      format: "esm",
      external: externalList.length > 0 ? externalList : undefined,
      alias: bundleAlias,
    },
  };
}

/**
 * 当 build.client.debug 为 true 时，包装 logger 使 esbuild 的 debug 日志同时打到 console，
 * 不依赖应用 logger 的 level 配置，便于排查 resolver/构建问题。
 *
 * @param debug 是否启用构建调试
 * @param logger 应用 logger
 * @returns 原 logger 或带 console 输出的包装 logger
 */
function wrapLoggerForBuildDebug(
  debug: boolean,
  logger?: {
    debug: (msg: string, data?: unknown) => void;
    info: (msg: string, data?: unknown) => void;
  },
): typeof logger {
  if (!debug || !logger) return logger;
  return {
    ...logger,
    debug: (msg: string, data?: unknown) => {
      // 只打一次：用 logger.debug，避免与 logger 自带的 [DEBUG] 重复（不再额外 console.log）
      logger.debug(msg, data);
    },
  };
}

/**
 * 开发模式构建：创建 context + rebuild，缓存 builder 供后续增量 rebuild
 *
 * @param entryPath 入口文件路径（_client.tsx）
 * @param outputDir 输出目录（用于 esbuild 路径解析，write: false 时不写盘）
 * @param engine 渲染引擎
 * @param debug 是否启用 esbuild 调试日志
 * @param logger 日志实例，传入后 esbuild 的 debug/info 等均通过此 logger 输出；build.client.debug 为 true 时会同时打到 console
 * @returns 构建结果（含 outputContents）
 */
async function doDevBuild(
  entryPath: string,
  outputDir: string,
  engine: "react" | "preact" | "view",
  debug?: boolean,
  logger?: {
    debug: (msg: string, data?: unknown) => void;
    info: (msg: string, data?: unknown) => void;
  },
  lang?: "en-US" | "zh-CN",
): Promise<{
  outputContents?: Array<{ path: string; text: string; contents?: Uint8Array }>;
}> {
  const buildLogger = wrapLoggerForBuildDebug(debug ?? false, logger);

  const builder = new BuilderClient({
    entry: entryPath,
    output: outputDir,
    engine,
    debug,
    logger: buildLogger,
    bundle: {
      minify: false,
      sourcemap: true,
      splitting: true,
      format: "esm",
      chunkNames: "[name]-[hash]",
    },
    lang,
  });
  await builder.createContext("dev", { write: false });
  cachedDevBuilder = builder;
  return builder.rebuild();
}

/**
 * 构建客户端入口脚本（支持代码分割）
 *
 * 使用 BuilderClient 进行构建，启用代码分割：
 * - 入口文件 → client.js
 * - 共享依赖（preact/react）→ chunk-xxx.js
 * - 按需加载页面组件
 *
 * 开发模式传入 options.changedPath 时，会返回 chunkUrl 供 HMR 无感刷新使用。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @param options 可选（如 changedPath 用于计算 chunkUrl）
 * @returns 构建结果
 */
export async function buildClientScript(
  container: ServiceContainer,
  config: AppConfig,
  options?: BuildClientScriptOptions,
): Promise<ClientBuildResult> {
  const logger = getLogger(container);

  // 获取客户端入口文件路径
  const routerConfig = (config.router || {}) as { routesDir?: string };

  const routesDirRaw = routerConfig.routesDir || "./src/routes";
  const routesDir = routesDirRaw.replace(/^\.\/?/, "") || routesDirRaw;
  const routesDirPath = join(cwd(), routesDir);
  const srcDir = join(routesDirPath, "..");

  const tempClientEntryPath = join(srcDir, CLIENT_ENTRY_FILENAME);

  logger.debug($tr("log.clientScriptBuilding", {
    path: pathForLog(tempClientEntryPath),
  }));

  try {
    // 获取运行模式（提前计算，用于决定是否写入 client.dep.tsx 避免 HMR 循环）
    const serverConfig = (config.server || {}) as { mode?: "dev" | "prod" };
    const envMode = getEnv("DENO_ENV") || getEnv("BUN_ENV") ||
      getEnv("NODE_ENV") || "dev";
    const mode = serverConfig.mode || envMode as "dev" | "prod";
    const isProd = mode === "prod";

    // 若本次构建由 client.dep.tsx / client.tsx 变更触发，开发模式下不再写回该文件，避免：写文件 -> watch 触发 -> 再构建 -> 再写 -> 循环导致疯狂请求
    const changedBasenameForWrite = options?.changedPath
      ? basename(resolve(options.changedPath))
      : "";
    const skipWritingClientDep = !isProd &&
      (changedBasenameForWrite === CLIENT_DEP_FILENAME ||
        changedBasenameForWrite === CLIENT_ENTRY_FILENAME);

    // 获取渲染引擎与模式（view 时按 mode 选 view/csr 或 view/hybrid）
    const renderConfig = (config.render || {}) as {
      engine?: "react" | "preact" | "view";
      mode?: "csr" | "hybrid" | "ssr" | "ssg";
    };
    const engine = renderConfig.engine || "preact";
    const renderMode = (renderConfig.mode ?? "hybrid") as ClientDepRenderMode;

    // 构建调试：仅使用 config.build.client.debug / config.build.server.debug 传递至 esbuild
    const buildConfig = config.build as {
      client?: { debug?: boolean };
      server?: { debug?: boolean };
      debug?: boolean;
    } | undefined;
    const buildDebug = buildConfig?.client?.debug ??
      buildConfig?.server?.debug ??
      buildConfig?.debug ??
      false;

    // 扫描路由目录，获取所有路由组件（.tsx/.jsx）
    const components = await scanRouteComponents(routesDirPath, "", engine);
    logger.debug($tr("log.routesScanned", {
      count: String(components.length),
    }));

    // 布局链（支持嵌套 _layout，见 generateClientDepContent 注释）
    const { hasLayout, routeLayoutKeys } = await getRouteLayoutKeys(
      routesDirPath,
    );

    const hmrCssEntries = getHmrCssEntries(container);
    const clientDepPath = join(srcDir, CLIENT_DEP_FILENAME);

    // client.dep.tsx 每次构建/启动都重新生成（路由、HMR CSS、loadLayouts、setupHydrationRouterAndHmr 等）
    // 开发态且本次由 client 入口文件变更触发时跳过写入，避免 watch 循环
    const clientDepCode = generateClientDepContent(
      engine,
      components,
      hasLayout,
      hmrCssEntries,
      renderMode,
      routeLayoutKeys,
    );
    if (!skipWritingClientDep) {
      await writeTextFile(clientDepPath, clientDepCode);
      logger.debug($tr("log.clientDepRefreshed", {
        path: pathForLog(clientDepPath),
      }));
    } else {
      logger.debug(
        $tr("log.hmrSkipClientDep", { filename: CLIENT_DEP_FILENAME }),
      );
    }

    // 仅当 client.tsx 不存在时生成并写入，存在则直接使用（便于用户修改入口逻辑）
    // 开发态且本次由 client 入口变更触发时也跳过写入
    if (!skipWritingClientDep && !(await exists(tempClientEntryPath))) {
      const clientEntryCode = generateStaticClientEntry(
        engine,
        components,
        hasLayout,
        hmrCssEntries,
      );
      await writeTextFile(tempClientEntryPath, clientEntryCode);
      logger.debug($tr("log.clientEntryGenerating", {
        path: pathForLog(tempClientEntryPath),
      }));
    }

    let result: ClientBuildResult;

    if (isProd) {
      // ========================================
      // 生产模式：使用 BuilderClient，支持代码分割
      // ========================================
      const buildConfig = (config.build || {}) as {
        client?: {
          output?: string;
          bundle?: {
            splitting?: boolean;
            minify?: boolean;
            sourcemap?: boolean;
            external?: string[];
            alias?: Record<string, string>;
          };
        };
      };
      const userClientConfig = buildConfig.client || {};
      const userBundleConfig = userClientConfig.bundle || {};

      // 使用用户配置或推断值：未配置时按当前入口推断应用目录（如 dist/backend/client）
      const clientOutputDirRaw = userClientConfig.output ??
        getInferredBuildOutputDirs().client;
      const finalOutputDir = join(cwd(), clientOutputDirRaw);
      const shouldMinify = userBundleConfig.minify ?? true;
      const shouldSourcemap = userBundleConfig.sourcemap ?? false;
      const shouldSplit = userBundleConfig.splitting ?? true;

      // 确保输出目录存在
      await ensureDir(finalOutputDir);

      // 过滤掉用户 external 中的 preact/react，防止误配置导致多实例水合错误
      const userExternal = Array.isArray(userBundleConfig.external)
        ? userBundleConfig.external
        : [];
      const runtimeExternalBlocklist = engine === "preact"
        ? ["preact", "preact/hooks", "preact/jsx-runtime"]
        : engine === "view"
        ? ["@dreamer/view", "@dreamer/view/jsx-runtime"]
        : ["react", "react-dom", "react/jsx-runtime", "react-dom/client"];
      const externalList = userExternal.filter(
        (ext) =>
          !runtimeExternalBlocklist.some((b) =>
            ext === b || ext.startsWith(`${b}/`)
          ),
      );

      const prodBundleAlias = userBundleConfig.alias;

      const buildLogger = wrapLoggerForBuildDebug(buildDebug, logger);

      const builder = new BuilderClient({
        entry: tempClientEntryPath,
        output: finalOutputDir,
        engine,
        debug: buildDebug,
        logger: buildLogger,
        bundle: {
          minify: shouldMinify,
          sourcemap: shouldSourcemap,
          splitting: shouldSplit,
          format: "esm",
          external: externalList.length > 0 ? externalList : undefined,
          alias: prodBundleAlias,
        },
        lang: config.language === "zh-CN" || config.language === "en-US"
          ? config.language
          : undefined,
      });

      await builder.build(mode);

      const outputFiles = new Map<string, string>();
      await loadOutputFiles(finalOutputDir, finalOutputDir, outputFiles);

      // 获取主入口文件内容（入口 _client.tsx → 输出 _client.js）
      const mainCode = outputFiles.get(CLIENT_OUTPUT_MAIN_FILENAME) || "";

      // 统计构建结果并输出文件列表
      let totalSize = 0;
      const fileList: string[] = [];
      for (const [fileName, content] of outputFiles) {
        totalSize += content.length;
        const sizeKB = (content.length / 1024).toFixed(1);
        fileList.push(`  - ${fileName} (${sizeKB} KB)`);
      }

      // 输出构建信息
      logger.info(
        $tr("log.clientBuildOutput", { count: String(outputFiles.size) }),
      );
      for (const file of fileList) {
        logger.info(file);
      }
      logger.info($tr("log.clientBuildTotalSize", {
        size: (totalSize / 1024).toFixed(1),
      }));

      const { chunkContentIndex, chunkBaseIndex } = buildChunkIndices(
        outputFiles,
      );
      result = {
        code: mainCode,
        buildTime: Date.now(),
        outputDir: finalOutputDir,
        outputFiles,
        chunkContentIndex,
        chunkBaseIndex,
      };
    } else {
      // ========================================
      // 开发模式：纯内存构建，使用 ~/.dreamer/{projectHash}/{appDir}/client-out 缓存，避免在项目内创建临时目录
      // ========================================
      const memOutputDir = await getDreamerClientCacheDir();
      await ensureDir(memOutputDir);

      let buildResultDev;
      if (cachedDevBuilder) {
        // 复用已有 context，增量 rebuild（复用文件缓存、AST，加快 HMR）
        try {
          buildResultDev = await cachedDevBuilder.rebuild();
        } catch (err) {
          logger.warn($tr("log.hmrIncrementalRebuildFailed") + ":", err);
          await cachedDevBuilder.dispose();
          cachedDevBuilder = null;
          buildResultDev = await doDevBuild(
            tempClientEntryPath,
            memOutputDir,
            engine,
            buildDebug,
            logger,
            config.language === "zh-CN" || config.language === "en-US"
              ? config.language
              : undefined,
          );
        }
      } else {
        buildResultDev = await doDevBuild(
          tempClientEntryPath,
          memOutputDir,
          engine,
          buildDebug,
          logger,
          config.language === "zh-CN" || config.language === "en-US"
            ? config.language
            : undefined,
        );
      }

      const outputFilesDev = new Map<string, string>();
      if (buildResultDev.outputContents) {
        const memOutNorm = memOutputDir.replace(/\\/g, "/");
        // 调试：输出 esbuild 原始 outputContents（path + 大小），便于对比 Windows/Mac 差异
        // 使用 console.log 直接输出，不受 logger.level 限制，仅由 build.client.debug 控制
        if (buildDebug) {
          const rawList = buildResultDev.outputContents
            .filter((f) => f.path.endsWith(".js") && !f.path.includes(".map"))
            .map((f) =>
              `${basename(f.path)}:${(f.text.length / 1024).toFixed(1)}KB`
            )
            .join(", ");
          console.log(
            "[DEBUG] [dweb] esbuild outputContents (path basename: size):",
            rawList,
          );
        }
        for (const file of buildResultDev.outputContents) {
          const name = basename(file.path);
          const existing = outputFilesDev.get(name);
          // 冲突检测：若 basename 已存在且内容不同，优先保留内容更大的 chunk（preact 等实现通常远大于 __publicField）
          if (existing !== undefined && existing !== file.text) {
            if (buildDebug) {
              logger.debug(
                `[dweb] chunk basename collision: ${name}, existing ${existing.length}B vs new ${file.text.length}B, keeping larger`,
              );
            }
            if (file.text.length > existing.length) {
              outputFilesDev.set(name, file.text);
            }
            // 否则保留 existing，不覆盖
          } else {
            outputFilesDev.set(name, file.text);
          }
          // 多段路径兼容（dev）：浏览器请求 routes/index-XXX.js，esbuild path 含 outdir 前缀
          const pathNorm = file.path.replace(/\\/g, "/");
          const relPath = pathNorm.startsWith(memOutNorm)
            ? pathNorm.slice(memOutNorm.length).replace(/^\/+/, "")
            : relative(memOutputDir, file.path).replace(/\\/g, "/");
          if (relPath && relPath !== name && !relPath.startsWith("..")) {
            const existingRel = outputFilesDev.get(relPath);
            if (
              existingRel === undefined ||
              existingRel === file.text ||
              file.text.length > (existingRel?.length ?? 0)
            ) {
              outputFilesDev.set(relPath, file.text);
            }
          }
        }
      }

      const mainCodeDev = outputFilesDev.get(CLIENT_OUTPUT_MAIN_FILENAME) || "";
      logger.debug(
        $tr("log.clientBuildCompleteMemory", {
          mainSize: (mainCodeDev.length / 1024).toFixed(1),
          count: String(outputFilesDev.size),
        }),
      );
      // 调试：输出 chunk 列表及每个 chunk 的 content 大小，便于在 Windows 上对比依赖请求是否缺失
      // preact/react 等运行时通常 >10KB，__publicField 等辅助代码通常 <1KB，若 chunk-XXX 显示过小则可能内容错误
      if (buildDebug) {
        const chunkNames = [
          ...new Set(
            Array.from(outputFilesDev.keys()).filter(
              (k) => k.endsWith(".js") && k !== CLIENT_OUTPUT_MAIN_FILENAME,
            ),
          ),
        ].sort();
        logger.debug("[dweb] dev chunks:", chunkNames.join(", "));
        const chunkSizes = chunkNames
          .map((k) => {
            const len = outputFilesDev.get(k)?.length ?? 0;
            const runtimeHint = k.startsWith("chunk-") && len < 2000
              ? " (⚠️可能为__publicField而非运行时)"
              : "";
            return `${k}:${(len / 1024).toFixed(1)}KB${runtimeHint}`;
          })
          .join(", ");
        logger.debug("[dweb] dev chunk sizes:", chunkSizes);
      }

      let chunkUrlDev: string | undefined;
      if (options?.changedPath) {
        const changedPathAbs = resolve(options.changedPath);
        const changedBasename = basename(changedPathAbs);
        // client.dep.tsx / client.tsx 为客户端入口，非路由组件，无法推导 componentPath，整页刷新即可，不打 WARN
        const isClientEntry = changedBasename === CLIENT_DEP_FILENAME ||
          changedBasename === CLIENT_ENTRY_FILENAME;
        const componentPath = isClientEntry
          ? null
          : getComponentPathFromFilePath(routesDirPath, changedPathAbs);
        if (componentPath) {
          const outputNames = Array.from(outputFilesDev.keys());
          const chunkFileName = getChunkFileNameForComponent(
            componentPath,
            outputNames,
          );
          if (chunkFileName) {
            // 必须与 ROUTE_LOADERS 的解析路径一致：_client.js 在 /_client.js，import("./routes-xxx.js") 解析为 /routes-xxx.js
            // 若用 /_client/routes-xxx.js，则 chunk 内 import("./chunk-xxx.js") 会解析为 /_client/chunk-xxx.js，与正常的 /chunk-xxx.js 不同，导致双实例
            chunkUrlDev = `/${chunkFileName}`;
          } else {
            logger.warn(
              $tr("log.hmrChunkNotFound", {
                path: componentPath,
                files: outputNames.join(", "),
              }),
            );
          }
        } else if (!isClientEntry) {
          logger.warn(
            $tr("log.hmrComponentPathNotFound", {
              changedPath: options.changedPath ?? "",
              routesDirPath,
            }),
          );
        }
      }

      const { chunkContentIndex, chunkBaseIndex } = buildChunkIndices(
        outputFilesDev,
      );
      result = {
        code: mainCodeDev,
        buildTime: Date.now(),
        outputDir: undefined,
        outputFiles: outputFilesDev,
        chunkContentIndex,
        chunkBaseIndex,
        chunkUrl: chunkUrlDev,
      };
    }

    // 缓存结果
    cachedClientScript = result;

    logger.debug($tr("log.clientScriptBuildComplete"));
    return result;
  } catch (error) {
    logger.error($tr("log.clientBuildFailed") + ":", error);

    // 返回一个错误提示脚本（运行时通过 escapeHtml 转义 errorMessage，防止 XSS）
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorScript = `
      (function() {
        function escapeHtml(s) {
          return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
        }
        var errorMessage = ${JSON.stringify(errorMessage)};
        console.error(${
      JSON.stringify($tr("log.clientBuildFailed"))
    } + ":", errorMessage);
        var container = document.getElementById("app");
        if (container) {
          container.innerHTML = '<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:system-ui,sans-serif;"><h1 style="font-size:48px;margin:0;color:#ef4444;">${
      $tr("client.buildError")
    }</h1><pre style="color:#666;margin-top:16px;max-width:80%;overflow:auto;background:#f5f5f5;padding:16px;border-radius:8px;">' + escapeHtml(errorMessage) + '</pre></div>';
        }
      })();
    `;

    return {
      code: errorScript,
      buildTime: Date.now(),
    };
  }
}

/**
 * 从 fileName 提取 chunk 基础名（用于 HMR 回退匹配）
 * 例如：index-ABC123.js -> index，chunk-XYZ789.js -> chunk
 */
function getChunkBaseName(fileName: string): string | null {
  const m = fileName.match(/^(.+)-[A-Za-z0-9]{6,10}\.(?:js|js\.map)$/);
  if (m) return m[1];
  const noExt = fileName.replace(/\.(js|js\.map)$/, "");
  return noExt || null;
}

/**
 * 从 outputFiles 建立 basename 和 base 索引，供 findChunkContent O(1) 查找
 *
 * 注意：chunkBaseIndex 仅当某 base 只有一个 chunk 时有效（如 routes-XXX、_layout-XXX）。
 * 多个 chunk-*.js 共享 base "chunk"，不能相互替代，故不写入 chunkBaseIndex。
 *
 * @param outputFiles 输出文件映射
 * @returns chunkContentIndex（basename->content）、chunkBaseIndex（base->content，仅单 chunk 的 base）
 */
function buildChunkIndices(
  outputFiles: Map<string, string>,
): {
  chunkContentIndex: Map<string, string>;
  chunkBaseIndex: Map<string, string>;
} {
  const chunkContentIndex = new Map<string, string>();
  const chunkBaseIndex = new Map<string, string>();
  const baseCounts = new Map<string, number>();
  for (const [key, content] of outputFiles) {
    const name = basename(key);
    const existing = chunkContentIndex.get(name);
    // 冲突时优先保留内容更大的 chunk（与 outputFilesDev 构建逻辑一致）
    if (
      existing === undefined ||
      content.length > existing.length
    ) {
      chunkContentIndex.set(name, content);
    }
    const base = getChunkBaseName(name);
    if (base) {
      baseCounts.set(base, (baseCounts.get(base) ?? 0) + 1);
    }
  }
  // 仅当 base 对应唯一 chunk 时写入 chunkBaseIndex（HMR 回退用）
  for (const [key, content] of outputFiles) {
    const name = basename(key);
    const base = getChunkBaseName(name);
    if (base && baseCounts.get(base) === 1) {
      chunkBaseIndex.set(base, content);
    }
  }
  return { chunkContentIndex, chunkBaseIndex };
}

/**
 * 从 outputFiles 中查找 chunk 内容（兼容多种 key 格式）
 *
 * 优先使用 chunkContentIndex/chunkBaseIndex 实现 O(1) 查找，未命中再回退到线性遍历。
 * 开发模式 HMR：旧主包请求 index-ABC123.js，重建后只有 index-XYZ789.js，
 * 按基础名回退：用同基础名的最新 chunk 内容，实现无感刷新。
 *
 * @param outputFiles 输出文件映射
 * @param fileName 请求的文件名（如 chunk-UUJCPQSG.js）
 * @param chunkContentIndex basename -> content 索引（可选，构建时建立）
 * @param chunkBaseIndex base -> content 索引（可选，用于 HMR 回退）
 * @returns 文件内容，未找到返回 undefined
 */
/** 从 outputFiles 查找 chunk 内容（供 csr-client-middleware 使用） */
export function findChunkContent(
  outputFiles: Map<string, string> | undefined,
  fileName: string,
  chunkContentIndex?: Map<string, string>,
  chunkBaseIndex?: Map<string, string>,
): string | undefined {
  if (!outputFiles) return undefined;
  // 1. 优先查 basename 索引（O(1)）
  const fromContentIndex = chunkContentIndex?.get(fileName);
  if (fromContentIndex !== undefined) return fromContentIndex;
  // 1b. 多段路径兼容（如 routes/index-XXX.js）：chunkContentIndex 以 basename 为 key
  const fileNameBase = basename(fileName);
  if (fileNameBase !== fileName) {
    const fromBasenameIndex = chunkContentIndex?.get(fileNameBase);
    if (fromBasenameIndex !== undefined) return fromBasenameIndex;
  }
  // 2. 直接按 key 查找
  const direct = outputFiles.get(fileName);
  if (direct) return direct;
  // 3. 优先查 base 索引（HMR 回退，O(1)）
  const base = getChunkBaseName(fileName);
  if (base) {
    const fromBaseIndex = chunkBaseIndex?.get(base);
    if (fromBaseIndex !== undefined) return fromBaseIndex;
  }
  // 4. 回退：遍历查找（兼容 path/subdir/chunk-xxx.js 等格式，含多段路径）
  const matchName = fileName.includes("/") ? fileNameBase : fileName;
  for (const [key, content] of outputFiles) {
    if (basename(key) === matchName) return content;
  }
  // 5. Windows 兼容：按 basename 大小写不敏感匹配（esbuild 路径可能不同）
  for (const [key, content] of outputFiles) {
    if (basename(key).toLowerCase() === matchName.toLowerCase()) return content;
  }
  // 注意：base 为 "chunk" 时存在多个 chunk-*.js，不可用 base 回退，否则会返回错误 chunk
  return undefined;
}

/**
 * 递归加载输出目录中的所有 JS 文件到内存
 *
 * @param baseDir 基础目录
 * @param currentDir 当前目录
 * @param files 文件映射（key 使用 basename 便于与请求路径匹配）
 */
async function loadOutputFiles(
  baseDir: string,
  currentDir: string,
  files: Map<string, string>,
): Promise<void> {
  try {
    const entries = await readdir(currentDir);
    for (const entry of entries) {
      const entryPath = join(currentDir, entry.name);

      if (entry.isDirectory) {
        // 递归处理子目录
        await loadOutputFiles(baseDir, entryPath, files);
      } else if (entry.name.endsWith(".js") || entry.name.endsWith(".js.map")) {
        // 读取 JS 文件和 source map
        const content = await readTextFile(entryPath);
        // 使用 basename 作为 key，与请求路径 /chunk-xxx.js 的 fileName 一致
        files.set(entry.name, content);
      }
    }
  } catch {
    // 目录可能不存在
  }
}

/**
 * 获取缓存的客户端脚本
 *
 * @returns 缓存的构建结果，如果没有缓存则返回 null
 */
export function getCachedClientScript(): ClientBuildResult | null {
  return cachedClientScript;
}

/**
 * 清除客户端脚本缓存
 *
 * @param options 可选，disposeBuilder: true 时同时释放增量构建的 context（应用关闭时调用以防内存泄漏）
 */
export async function clearClientScriptCache(options?: {
  disposeBuilder?: boolean;
}): Promise<void> {
  cachedClientScript = null;
  if (options?.disposeBuilder && cachedDevBuilder) {
    await cachedDevBuilder.dispose();
    cachedDevBuilder = null;
  }
}

/** 客户端脚本中间件已拆至 csr-client-middleware.ts，此处保留导出以保持向后兼容 */
export { createClientScriptMiddleware } from "./csr-client-middleware.ts";
