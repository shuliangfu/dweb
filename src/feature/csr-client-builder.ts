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

import { BuilderClient, type BuildPlugin } from "@dreamer/esbuild";
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
import {
  extractComponentPathFromRouteFile,
  normalizePathForCompare,
  pathForLog,
  resolveRouterRoutesDirPath,
  subpathFromRoutesDirMarker,
} from "../utils/path.ts";
import {
  getRouteClientManifest,
  type RouteComponentInfo,
} from "./csr-client-route-manifest.ts";
import { createStripLoadPlugin } from "./strip-load-plugin.ts";

/**
 * 为客户端 bundle 注册 esbuild 插件：在路由目录下剔除 `load` 导出（strip-load），避免打进浏览器 chunk。
 * 各引擎行为一致；View `.tsx` 由运行时与 `deno.json` 的 JSX 配置处理。
 *
 * @param _engine - 渲染引擎（保留参数便于将来按引擎扩展插件）
 * @param routesDirPath - 路由目录绝对路径（与 `router.routesDir` 解析结果一致）
 * @returns 供 `BuilderClient` / `Builder` 的 `plugins` 数组
 */
export function createDwebClientBundlePlugins(
  _engine: "react" | "preact" | "view",
  routesDirPath: string,
): BuildPlugin[] {
  const routesAbs = resolve(routesDirPath);
  return [createStripLoadPlugin(routesAbs)];
}

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
  /**
   * 开发态：各页面路由对应的 chunk URL（与 ROUTE_LOADERS 的 key 一致）。
   * 改共享组件时与 `chunkUrl` 一并下发，供客户端按当前路由强制 `import` 而无需整页刷新。
   */
  routeChunkUrls?: Record<string, string>;
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
 * 变更文件是否位于「routes 的父目录（通常为 src）」下、且不在 routes 目录内。
 * 例如 `src/config/main.ts`、共享组件等：无单一 `chunkUrl`，但会随构建下发 `routeChunkUrls`，由客户端按当前路由 `import` 刷新；
 * 与 `_client.tsx` 一样不应打「无法推导 componentPath」的 WARN。
 *
 * @param routesDirPath 路由目录绝对路径（与 scanRouteComponents 一致）
 * @param filePath 变更文件的绝对或相对路径
 */
function isNonRouteSrcUnderAppSrc(
  routesDirPath: string,
  filePath: string,
): boolean {
  const routesAbs = normalizePathForCompare(resolve(routesDirPath));
  const srcRootAbs = normalizePathForCompare(resolve(routesAbs, ".."));
  const fileAbs = normalizePathForCompare(resolve(filePath));
  const underSrc = fileAbs === srcRootAbs ||
    fileAbs.startsWith(srcRootAbs + "/");
  const underRoutes = fileAbs === routesAbs ||
    fileAbs.startsWith(routesAbs + "/");
  return underSrc && !underRoutes;
}

/**
 * 为开发态 HMR 构建「路由 component 标识 → 当前产物 chunk 的 URL」映射。
 * 改 `src/components` 等共享模块时无单一 `chunkUrl`，客户端用 `match.route.component` 查表即可只刷新当前路由。
 *
 * @param routeComponents `scanRouteComponents` 结果
 * @param outputFileNames 本次构建内存产物中的文件名列表（含 basename 与相对路径键）
 */
function buildRouteChunkUrlMap(
  routeComponents: readonly { componentPath: string }[],
  outputFileNames: string[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of routeComponents) {
    const chunkFileName = getChunkFileNameForComponent(
      c.componentPath,
      outputFileNames,
    );
    if (chunkFileName) map[c.componentPath] = `/${chunkFileName}`;
  }
  return map;
}

/**
 * 根据 componentPath 从输出文件名列表中匹配对应 chunk。
 * esbuild 命名规则：about.tsx -> about-XXX.js；多段如 admin/index 可能为 admin-index-XXX.js 或 admin/index-XXX.js；
 * 根 index 可能为 routes-XXX.js。优先按完整路径匹配，避免 admin/index 误匹配到根 index 的 chunk。
 */
export function getChunkFileNameForComponent(
  componentPath: string,
  outputFileNames: string[],
): string | null {
  const segment = componentPath.split("/").pop() || componentPath;
  let jsOnly = outputFileNames.filter((n) =>
    n.endsWith(".js") && n !== CLIENT_OUTPUT_MAIN_FILENAME
  );

  // 多段路径（如 desktop/basic/button、desktop/index）：优先匹配含完整路径的 chunk，避免与首段同名 chunk 混淆
  if (componentPath.includes("/")) {
    const segments = componentPath.split("/");
    const firstSegment = segments[0];
    const pathAsDash = componentPath.replace(/\//g, "-");
    const pathAsUnderscore = componentPath.replace(/\//g, "_");
    const pathAsSlash = componentPath;
    const pathVariants = [pathAsDash, pathAsUnderscore, pathAsSlash];
    // 优先尝试 key 中含完整路径的 chunk（如 desktop-basic-button-XXX.js），再考虑首段
    jsOnly = [...jsOnly].sort((a, b) => {
      const aHasFull = pathVariants.some((pv) => a.includes(pv)) ? 0 : 1;
      const bHasFull = pathVariants.some((pv) => b.includes(pv)) ? 0 : 1;
      if (aHasFull !== bHasFull) return aHasFull - bHasFull;
      const aHasPath = firstSegment && a.includes(firstSegment) ? 0 : 1;
      const bHasPath = firstSegment && b.includes(firstSegment) ? 0 : 1;
      return aHasPath - bHasPath;
    });
    for (const name of jsOnly) {
      const base = name.slice(0, -3).replace(/\.js$/, "");
      const baseNoHash = base.replace(/-[A-Za-z0-9]{6,10}$/, "");
      const baseLastPart = base.includes("/") ? base.split("/").pop()! : base;
      const baseLastNoHash = baseLastPart.replace(/-[A-Za-z0-9]{6,10}$/, "");
      const baseEndsWithPath = baseNoHash === pathAsSlash ||
        baseNoHash.endsWith("/" + pathAsSlash) ||
        baseNoHash.endsWith(pathAsSlash) ||
        baseNoHash.endsWith("/" + pathAsDash) ||
        baseNoHash.endsWith(pathAsDash) ||
        baseNoHash.endsWith(pathAsUnderscore);
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
      // 仅两段路径（如 desktop/index）且 chunk 为首段名时，允许匹配，避免 desktop/index 误用 desktop-basic-button
      if (
        segments.length === 2 &&
        (baseNoHash === firstSegment || base.startsWith(firstSegment + "-"))
      ) {
        return name;
      }
    }
    /**
     * esbuild 对深层路由有时只产出「末段」文件名（如 workspace/projects/create.tsx → create-XXX.js），
     * 上文按完整 pathVariants 匹配会失败，导致 routeChunkUrls 缺项、HMR 退回裸 import() 被浏览器缓存。
     * 若按末段匹配的候选 chunk 唯一，则采纳该文件。
     */
    const lastSeg = segments[segments.length - 1] || "";
    if (lastSeg) {
      const lastSegCandidates = jsOnly.filter((name) => {
        const base = name.slice(0, -3).replace(/\.js$/, "");
        const baseNoHash = base.replace(/-[A-Za-z0-9]{6,10}$/, "");
        const baseLastPart = base.includes("/") ? base.split("/").pop()! : base;
        const baseLastNoHash = baseLastPart.replace(/-[A-Za-z0-9]{6,10}$/, "");
        return (
          baseNoHash === lastSeg ||
          baseLastNoHash === lastSeg ||
          base.startsWith(lastSeg + "-") ||
          baseLastPart.startsWith(lastSeg + "-")
        );
      });
      if (lastSegCandidates.length === 1) return lastSegCandidates[0];
    }
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

/** View 引擎按 renderMode 的适配路径：csr 用 view-csr；hybrid/ssr/ssg 用 view-hybrid（现仅从中取 buildViewTree，激活路径为 view 的 mount/insert） */
const VIEW_ADAPTER_BY_MODE: Record<ClientDepRenderMode, string> = {
  csr: "@dreamer/render/client/view-csr",
  hybrid: "@dreamer/render/client/view-hybrid",
  ssr: "@dreamer/render/client/view-hybrid",
  ssg: "@dreamer/render/client/view-hybrid",
};

/** 渲染模式：csr 仅客户端渲染；hybrid/ssr/ssg 均需客户端 hydrate，故 view 用 hybrid 入口 */
type ClientDepRenderMode = "csr" | "hybrid" | "ssr" | "ssg";

/**
 * 生成 ROUTE_LOADERS 的 key 与 `import(\`./routes/...\`)` 相对段。
 * 必须以 `fullPath` + `routesDirPath` 用 {@link extractComponentPathFromRouteFile} 收束，
 * 不得单独信任 `componentPath`（Windows 上曾被写成整段 `D:/...`）。
 * 已提取串若仍带盘符或起始于 `/`（整段绝对路径作 key）则丢弃，并用
 * {@link subpathFromRoutesDirMarker} 作最后手段；**禁止**在兜底处把 `D:/...` 写进源码。
 */
function looksLikeAbsoluteRouteKey(s: string): boolean {
  const n = s.replace(/\\/g, "/").trim();
  if (!n) return true;
  if (n.startsWith("/")) return true;
  if (/^[A-Za-z]:\//.test(n) || n.startsWith("\\\\") || n.startsWith("//")) {
    return true;
  }
  return false;
}

function routeLoaderKeyForClientDep(
  routesDirPath: string,
  c: RouteComponentInfo,
): string {
  const fromFull = extractComponentPathFromRouteFile(
    routesDirPath,
    c.fullPath,
  );
  if (fromFull && !looksLikeAbsoluteRouteKey(fromFull)) {
    return fromFull;
  }
  const cp = c.componentPath.replace(/\\/g, "/");
  if (cp && !looksLikeAbsoluteRouteKey(cp)) {
    return cp;
  }
  {
    const fromMarker = subpathFromRoutesDirMarker(c.fullPath);
    if (fromMarker && !looksLikeAbsoluteRouteKey(fromMarker)) {
      return fromMarker;
    }
  }
  {
    const fromMarkerCp = subpathFromRoutesDirMarker(c.componentPath);
    if (fromMarkerCp && !looksLikeAbsoluteRouteKey(fromMarkerCp)) {
      return fromMarkerCp;
    }
  }
  return "index";
}

/**
 * 生成 client.dep.tsx 内容（路由加载器、缓存、HMR CSS、loadLayouts、loadPageModule、renderNotFound、renderError、setupHydrationRouterAndHmr 等）
 * 此文件每次构建/启动都会重新生成；client.tsx 仅不存在时生成，便于用户修改入口逻辑。
 *
 * 注意：客户端 loadLayouts 仅加载 _layout，不加载 _app。_app 是服务端文档根（输出 html/body），容器 #app 在其内部，
 * 故 hydrate/CSR 只需 Layout(Page)，否则会将 App 渲染进容器导致嵌套 html/body 或 hydrate 不匹配。
 *
 * View 引擎按 renderMode 区分：csr 用 @dreamer/render/client/view-csr（仅 **buildViewTree**；
 * 首屏与路由由 **mount/insert** 接管，不调用 **renderCSR**）；hybrid/ssr/ssg 用
 * @dreamer/render/client/view-hybrid（同样仅 **buildViewTree**）。
 * 客户端根挂载与 @dreamer/view 一致：`mount(() => () => …, container)`（返回函数子，由运行时 `insert` 建 effect）。
 * SSR/SSG 在语义上仍为「带服务端 HTML 的激活」，但 View 引擎实现上与 hybrid 同属 mount/insert 路径，不是 csr。
 *
 * @param engine 渲染引擎（用于 hydrate/renderCSR 导入及 setupHydrationRouterAndHmr）
 * @param components 路由组件列表
 * @param routesDirPath 与 {@link getRouteClientManifest} 中一致的 routes 绝对路径
 * @param hasLayout 是否存在 _layout 文件
 * @param hmrCssEntries 开发态 HMR CSS 配置
 * @param renderMode 渲染模式（view 时用于选择 view/csr 或 view/hybrid）
 * @param routeLayoutKeys 可选，路由路径 -> 布局 key 链（支持嵌套布局）；有则生成 loadLayouts(pathname)
 * @returns client.dep.tsx 的完整源码
 */
export function generateClientDepContent(
  engine: "react" | "preact" | "view",
  components: RouteComponentInfo[],
  routesDirPath: string,
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
  /** view + csr：从 view-csr 仅取 buildViewTree；view + hybrid|ssr|ssg：从 view-hybrid 取 buildViewTree；激活与路由均由主包 `mount` + 函数子，不导入 renderCSR */
  const viewAdapterPath = isViewEngine
    ? VIEW_ADAPTER_BY_MODE[renderMode]
    : adapterImport;
  /**
   * View 客户端：仅从主包 `@dreamer/view` 导入 `createSignal`、`mount`、`Signal`（不再使用已移除的
   * `@dreamer/view/hybrid`、`@dreamer/view/csr` 等子路径，避免 esbuild 解析失败）。
   */
  const renderAdapterImport = isViewEngine
    ? `import { buildViewTree } from "${viewAdapterPath}";
import { createSignal, mount, type Signal } from "@dreamer/view";`
    : `import { hydrate, renderCSR } from "${adapterImport}";`;
  /** API 路由（api/ 下）仅服务端使用，不加入 ROUTE_LOADERS，避免客户端 bundle 解析 .ts 或错误引用 */
  const pageComponents = components.filter(
    (c) => !routeLoaderKeyForClientDep(routesDirPath, c).startsWith("api/"),
  );
  const routeExt = ".tsx";
  const routeLoaders = pageComponents
    .map((c) => {
      const k = routeLoaderKeyForClientDep(routesDirPath, c);
      const spec = `./routes/${k}${routeExt}`;
      return `  ${JSON.stringify(k)}: () => import(${JSON.stringify(spec)}),`;
    })
    .join("\n");

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

  /** View：只更新 reactive root 的 viewState；非 view：卸载旧渲染树后重新 renderCSR。 */
  const hmrRenderSnippet = isViewEngine
    ? `setViewState({ page: PageComponent, routeComponent: match.route.component, props: _hmrPageProps, layouts: _hmrLayouts, skipLayouts }, { force: true });
    _viewEnsureReactiveRoot(containerId);`
    : `const _container = typeof document !== "undefined" ? document.querySelector("#" + containerId) : null;
    if (_container && typeof _container.replaceChildren === "function") _container.replaceChildren();
    const csrResult = await renderCSR({
      engine,
      component: PageComponent,
      container: "#" + containerId,
      props: _hmrPageProps,
      layouts: skipLayouts ? undefined : _hmrLayouts,
      skipLayouts,
      debug: !!(_win.__DWEB_DEBUG__),
    });
    RENDER_STATE.lastUnmount = csrResult?.unmount ?? null;`;
  const hmrBeforeRenderSnippet = isViewEngine
    ? `/* View HMR keeps the reactive root mounted so updates do not flash or lose current DOM state. */`
    : `unmountPrevious();`;

  // 将服务端注入的 layoutData 合并到各 layout 的 props，使 hydrate 时 Layout 能收到 data
  const mergeLayoutDataSnippet =
    `const _layoutData = (hydrationData.layoutData && Array.isArray(hydrationData.layoutData)) ? hydrationData.layoutData : [];
      const _layouts: LayoutComponent[] = layouts.map((l, i) => ({ component: l.component, props: (_layoutData[i] ?? l.props ?? {}) as Record<string, unknown> }));`;
  /** View Hybrid：首屏 setViewState + _viewEnsureReactiveRoot（mount/insert/buildViewTree）；非 View 走 render 的 hydrate()。 */
  const hybridInitBlock = isViewEngine
    ? `${mergeLayoutDataSnippet}
      setViewState({ page: PageComponent, routeComponent: componentPath, props: hydrationData.page || { params: hydrationData.params || {}, query: hydrationData.query || {} }, layouts: skipLayouts ? [] : _layouts, skipLayouts });
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
  /**
   * 与 loadPageModule **并行**拉取 `/_dweb_data`，避免「先等路由 chunk、再等 __data」串行加倍延迟，
   * 使 `<title>` / meta 与正文尽可能同时就绪（原先 metadata 往往晚 ~一整段网络 RTT）。
   */
  const parallelLoadPageAndNavDataSnippet =
    `const _pathname = (typeof _win.location !== "undefined" && _win.location.pathname) ? _win.location.pathname : "/";
      const _search = (typeof _win.location !== "undefined" && _win.location.search) ? _win.location.search : "";
      const _pathAndSearch = _pathname + _search;
      const _samePageHashOnly = (typeof (g as DwebGlobal).__DWEB_LAST_PATHNAME__ === "string" && (g as DwebGlobal).__DWEB_LAST_PATHNAME__ === _pathAndSearch);
      const _reservedOrInvalid = !_pathname || _pathname === "${DWEB_DATA_PATH}" || _pathname.indexOf("/_") === 0 || _pathname.indexOf("//") !== -1 || _samePageHashOnly;
      type _NavProps = { params?: Record<string, string>; query?: Record<string, string>; layoutData?: unknown[]; data?: unknown; metadata?: Record<string, unknown>; metadataTagsHtml?: string; metadataTitleHtml?: string };
      const [module, _navProps] = await Promise.all([
        loadPageModule(match.route.component) as Promise<Record<string, unknown>>,
        (async (): Promise<_NavProps> => {
          if (_reservedOrInvalid) {
            return { params: match.params || {}, query: match.query || {} };
          }
          const _dataUrl = "${DWEB_DATA_PATH}?path=" + encodeURIComponent(_pathname) + (_search ? "&" + _search.slice(1) : "");
          const _dataRes = await fetch(_dataUrl);
          return (_dataRes && _dataRes.ok)
            ? (await _dataRes.json()) as _NavProps
            : { params: match.params || {}, query: match.query || {} };
        })(),
      ]);
      (g as DwebGlobal).__DWEB_LAST_PATHNAME__ = _pathAndSearch;`;
  /** 在已有 `_navProps` 时写入 document.head（由 applyRouteMetadataHeadSnippet 使用） */
  const applyRouteMetadataHeadSnippet =
    `const _routeMetaHtml = (_navProps && typeof _navProps.metadataTagsHtml === "string") ? _navProps.metadataTagsHtml : "";
      const _routeTitleHtml = (_navProps && typeof _navProps.metadataTitleHtml === "string") ? _navProps.metadataTitleHtml : "";
      /** 旧版 __data 仅返回合并后的 metadataTagsHtml（内含 title 标签）：无 metadataTitleHtml 字段且字符串含 title */
      const _legacyMetaCombined = typeof _navProps.metadataTitleHtml === "undefined" && _routeMetaHtml.indexOf("<title") !== -1;
      const _routeMetaObj = _navProps && typeof _navProps.metadata === "object" && _navProps.metadata !== null ? _navProps.metadata : null;
      if (typeof document !== "undefined") {
        const _head = document.head;
        /** ① 移除上一轮由 generateMetaTags 写入、带 data-dweb-route-meta 的节点 */
        _head.querySelectorAll("[data-dweb-route-meta]").forEach((el) => { el.remove(); });
        /**
         * ② 兼容「未打标」或解析差异导致 ① 未选中：摘掉 head 内全部路由级 SEO 占位，
         * 否则 template 注入会在每次 SPA 切换再追加一整份 title/og/twitter，DevTools 里多套标签堆叠。
         * 不与 charset/viewport/icon 冲突；仅限与 mergeMetadata/generateMetaTags 常见字段对齐的 meta。
         */
        _head.querySelectorAll("title").forEach((el) => { el.remove(); });
        _head.querySelectorAll(
          'meta[name="description"], meta[name="keywords"], meta[name="author"], meta[property^="og:"], meta[name^="twitter:"]',
        ).forEach((el) => { el.remove(); });
        const _vpAnchor = _head.querySelector('meta[name="viewport"]') ||
          _head.querySelector("meta[charset]");
        if (_legacyMetaCombined && _routeMetaHtml.length > 0) {
          const _tplLegacy = document.createElement("template");
          _tplLegacy.innerHTML = _routeMetaHtml.trim();
          const _legacyFrag = Array.from(_tplLegacy.content.childNodes);
          if (_vpAnchor != null && typeof _vpAnchor.after === "function") {
            _vpAnchor.after(..._legacyFrag);
          } else {
            document.head.append(..._legacyFrag);
          }
        } else if (_routeMetaHtml.length > 0 || _routeTitleHtml.length > 0) {
          /** 新版：meta 块与 title 分两串插入，title 紧跟 meta 最后一个节点之后（不把 title 夹在 meta 中间） */
          let _insertTail: ChildNode | null = _vpAnchor;
          if (_routeMetaHtml.length > 0) {
            const _tplM = document.createElement("template");
            _tplM.innerHTML = _routeMetaHtml.trim();
            const _nodesM = Array.from(_tplM.content.childNodes);
            if (_insertTail != null && typeof _insertTail.after === "function") {
              _insertTail.after(..._nodesM);
              _insertTail = _nodesM[_nodesM.length - 1];
            } else {
              document.head.append(..._nodesM);
              _insertTail = document.head.lastChild;
            }
          }
          if (_routeTitleHtml.length > 0) {
            const _tplT = document.createElement("template");
            _tplT.innerHTML = _routeTitleHtml.trim();
            const _nodesT = Array.from(_tplT.content.childNodes);
            if (_insertTail != null && typeof _insertTail.after === "function") {
              _insertTail.after(..._nodesT);
            } else {
              document.head.append(..._nodesT);
            }
          }
        } else if (_routeMetaObj != null) {
          const _metaTitle = _routeMetaObj["title"];
          const _metaDesc = _routeMetaObj["description"];
          const _anchorFb = _head.querySelector('meta[name="viewport"]') ||
            _head.querySelector("meta[charset]");
          if (typeof _metaTitle === "string" && _metaTitle.length > 0) {
            document.title = _metaTitle;
          }
          if (typeof _metaDesc === "string") {
            let _desEl = document.querySelector('meta[name="description"]');
            if (!_desEl) {
              _desEl = document.createElement("meta");
              _desEl.setAttribute("name", "description");
              if (_anchorFb != null && typeof _anchorFb.after === "function") {
                _anchorFb.after(_desEl);
              } else {
                document.head.appendChild(_desEl);
              }
            }
            _desEl.setAttribute("content", _metaDesc);
          }
        }
      }`;
  // 客户端导航：将 __data 返回的 layoutData 合并到 layouts，使点击链接切换页面时 layout 也能收到 data；页面只收 params/query/data
  // 嵌套布局时按当前 match 加载 layoutListNav，避免回到首页等仍用初始路由的 layouts 导致侧栏残留
  const onRouteChangeMergeLayoutSnippet = useNestedLayouts
    ? `const layoutListNav = await loadLayouts(match);
      const _navLayoutData = (_navProps && Array.isArray(_navProps.layoutData)) ? _navProps.layoutData : [];
      const _layoutsNav: LayoutComponent[] = _navLayoutData.length ? layoutListNav.map((l, i) => ({ component: l.component, props: (_navLayoutData[i] ?? l.props ?? {}) as Record<string, unknown> })) : layoutListNav;
      const _pageProps = _navProps ? { params: _navProps.params || {}, query: _navProps.query || {}, data: _navProps.data } : { params: match.params || {}, query: match.query || {} };`
    : `const _navLayoutData = (_navProps && Array.isArray(_navProps.layoutData)) ? _navProps.layoutData : [];
      const _layoutsNav = _navLayoutData.length ? layouts.map((l, i) => ({ component: l.component, props: _navLayoutData[i] ?? l.props ?? {} })) : layouts;
      const _pageProps = _navProps ? { params: _navProps.params || {}, query: _navProps.query || {}, data: _navProps.data } : { params: match.params || {}, query: match.query || {} };`;
  /**
   * View / React/Preact：由外层先并行完成 loadPageModule + __data 并写入 head（见 parallelLoadPageAndNavDataSnippet），
   * 此处仅合并 layout、unmount、渲染正文。旧内容直至 unmount 前仍可见。
   */
  const onRouteChangeRenderSnippet = isViewEngine
    ? `if (_win.__DWEB_DEBUG__) console.log("[dweb:view] onRouteChange", { component: match.route.component, hasPage: !!PageComponent });
      ${onRouteChangeMergeLayoutSnippet}
      /**
       * 须先与当前 viewState 比较再决定是否 unmount：若已 unmount 而 setViewState 因语义相同被跳过，
       * 会再走 _viewEnsureReactiveRoot 用旧状态重建整树 → 页面 onMount 风暴（如路由重复 notify）。
       */
      const _nextViewRoot: _ViewStateRoot = { page: PageComponent, routeComponent: match.route.component, props: _pageProps, layouts: skipLayouts ? [] : _layoutsNav, skipLayouts };
      if (_isSameViewStateRoot(getViewState(), _nextViewRoot)) {
        (g as DwebGlobal).__DWEB_ON_READY__?.();
        return;
      }
      unmountPrevious();
      setViewState(_nextViewRoot);
      _viewEnsureReactiveRoot(containerId);
      (g as DwebGlobal).__DWEB_ON_READY__?.();`
    : `${onRouteChangeMergeLayoutSnippet}
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

  /**
   * CSR `renderCurrentRoute`：首屏有服务端注入的 `__DATA__` 时用其 `page`/`layoutData`，用后即清空，避免
   * 客户端 `onRouteChange` 误用；若已清空（如首屏后再次调用 `renderCurrentRoute`，i18n `onChange` 等），则
   * 与 `onRouteChange` 相同请求 `/__data`，以恢复各层 `layout` 的 `load()` 数据（含 Session）。
   */
  const csrRenderCurrentRouteDataSnippet =
    `const __d = (g as DwebGlobal).__DATA__;
      const __use = __d != null && (match.route?.path ?? "") === (__d.route ?? "");
      type _CsrRcrDataProps = { params?: Record<string, string>; query?: Record<string, string>; layoutData?: unknown[]; data?: unknown };
      let _layoutData: unknown[] = [];
      let _props: Record<string, unknown>;
      if (__use) {
        _layoutData = __d && Array.isArray(__d.layoutData) ? __d.layoutData : [];
        _props = (() => { (g as DwebGlobal).__DATA__ = undefined; return __d?.page ?? { params: match.params, query: match.query }; })() as Record<string, unknown>;
      } else {
        const _search = (typeof _win.location !== "undefined" && _win.location?.search) ? _win.location.search : "";
        let _rcrNav: _CsrRcrDataProps = {};
        try {
          const _dataUrl = "/__data?path=" + encodeURIComponent(pathname) + (_search ? "&" + _search.slice(1) : "");
          const _dataRes = await fetch(_dataUrl);
          if (_dataRes && _dataRes.ok) {
            _rcrNav = (await _dataRes.json()) as _CsrRcrDataProps;
          }
        } catch {
          /* 与 onRouteChange：__data 失败则无 layoutData */
        }
        _layoutData = Array.isArray(_rcrNav.layoutData) ? _rcrNav.layoutData : [];
        _props = { params: _rcrNav.params || (match.params || {}), query: _rcrNav.query || (match.query || {}), data: _rcrNav.data } as Record<string, unknown>;
      }
      const _layoutsCsr: LayoutComponent[] = skipLayouts ? [] : (_layoutData.length
        ? layoutList.map((l, i) => ({ component: l.component, props: (_layoutData[i] ?? l.props ?? {}) as Record<string, unknown> }))
        : layoutList);`;
  const setLastPathSnippet =
    `(g as DwebGlobal).__DWEB_LAST_PATHNAME__ = (typeof _win.location !== "undefined" && _win.location.pathname ? _win.location.pathname : "/") + (typeof _win.location !== "undefined" && _win.location.search ? _win.location.search : "");`;
  const renderCurrentRouteSnippet = isViewEngine
    ? `${setLastPathSnippet}
      ${csrRenderCurrentRouteDataSnippet}
      const _rcrNext: _ViewStateRoot = { page: PageComponent, routeComponent: match.route.component, props: _props, layouts: skipLayouts ? [] : _layoutsCsr, skipLayouts };
      if (_isSameViewStateRoot(getViewState(), _rcrNext)) {
        if (!_viewReactiveRoot) {
          _viewEnsureReactiveRoot(containerId);
          _win.__DWEB_ON_READY__?.();
        }
        return;
      }
      setViewState(_rcrNext);
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
      }`
    : `if (RENDER_STATE.lastUnmount) { RENDER_STATE.lastUnmount(); RENDER_STATE.lastUnmount = null; }
      const _container = typeof document !== "undefined" ? document.querySelector("#" + containerId) : null;
      if (_container && typeof _container.replaceChildren === "function") _container.replaceChildren();
      ${setLastPathSnippet}
      ${csrRenderCurrentRouteDataSnippet}
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

  /** initApp 内 layouts 加载后至 setupHydration 前：View Hybrid 预合并 layoutData，消除 viewState 初始 layouts=[] 与 hydrate 的 layouts.length 抖动 */
  const initAppLayoutsAndHydrateBody = isViewEngine
    ? `  const layouts = await ${loadLayoutsCallInit};
  if (isHybridMode) {
    try {
      const __dPre = g.__DATA__;
      if (__dPre) {
        const _ldPre = Array.isArray(__dPre.layoutData) ? __dPre.layoutData : [];
        const _mergedPre: LayoutComponent[] = _ldPre.length
          ? layouts.map((l, i) => ({ component: l.component, props: (_ldPre[i] ?? l.props ?? {}) as Record<string, unknown> }))
          : layouts;
        const _vs0 = getViewState();
        setViewState({
          page: _vs0.page,
          routeComponent: _vs0.routeComponent,
          props: _vs0.props,
          layouts: _mergedPre,
          skipLayouts: _vs0.skipLayouts,
        });
      }
    } catch {
      /* Hybrid View：预合并 SSR layoutData 失败不阻塞 hydrate */
    }
  }
  const isHydratedRef = { current: false };
  await setupHydrationRouterAndHmr({ g, router, containerId, engine, layouts, isHydratedRef, isHybridMode });`
    : `  const layouts = await ${loadLayoutsCallInit};
  const isHydratedRef = { current: false };
  await setupHydrationRouterAndHmr({ g, router, containerId, engine, layouts, isHydratedRef, isHybridMode });`;

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
    /** 当前文档 URL 的 pathname（去尾斜杠），与 location.pathname 比较；动态路由时与 route 模式不同 */
    pathname?: string;
    page?: Record<string, unknown>;
    params?: Record<string, string>;
    query?: Record<string, string>;
    component?: string;
    /** 各层 layout 的 props 数组（SSR/hydration 时由服务端注入） */
    layoutData?: unknown[];
  };
  __DWEB_MODE__?: "csr" | "hybrid" | "ssr" | "ssg";
  /** 是否为开发模式（服务端注入，用于区分 dev/prod 行为，如 CSS 强制刷新仅 dev 执行） */
  __DWEB_DEV__?: boolean;
  __HMR_REFRESH__?: (options?: {
    chunkUrl?: string;
    routeChunkUrls?: Record<string, string>;
  }) => void;
  /** CSR 模式下页面渲染完成时调用，用于淡出 loading 遮罩 */
  __DWEB_ON_READY__?: () => void;
  /** 开发模式 HMR 调试日志开关（控制台设置 globalThis.__DWEB_HMR_DEBUG__ = true 可查看详细日志） */
  __DWEB_HMR_DEBUG__?: boolean;
  /** 详细调试日志开关（由 render.debug 注入；为 true 时 View 与部分 render 路径更啰嗦） */
  __DWEB_DEBUG__?: boolean;
  /**
   * 客户端路由调试（与 config.router.debug 对应，由 HTML 内联脚本注入）
   * 为 true 时 @dreamer/router/client 的 createRouter debug 会输出点击拦截等日志，独立于 __DWEB_DEBUG__
   */
  __DWEB_ROUTER_DEBUG__?: boolean;
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
/** View 引擎：createSignal 返回 Signal；显式标注类型避免部分检查器将返回值误判为可迭代元组（TS2488）。 */
/**
 * routeComponent：路由扫描时的组件路径（与 match.route.component / hydrationData.component 同源）。
 * Hybrid 首屏 hydrate 的 Page 与后续 loadPageModule 可能是不同函数引用，比较「是否同页」须用路径而非 page 引用。
 */
type _ViewStateRoot = { page: unknown; routeComponent: string; props: Record<string, unknown>; layouts: LayoutComponent[]; skipLayouts: boolean };
/** Hybrid 首屏脚本执行时已有内联 __DATA__，先写入 routeComponent，避免与首屏 setViewState 比较时误判为 routeComponent 维度（日志里 why 一直是 routeComponent） */
const _viewStateBootRoute = ((): string => {
  try {
    const _g = globalThis as unknown as DwebGlobal;
    const _c = _g.__DATA__?.component;
    return typeof _c === "string" && _c.length > 0 ? _c : "";
  } catch {
    return "";
  }
})();
const viewState: Signal<_ViewStateRoot> = createSignal<_ViewStateRoot>({ page: null as unknown, routeComponent: _viewStateBootRoute, props: {} as Record<string, unknown>, layouts: [] as LayoutComponent[], skipLayouts: false });
function getViewState(): _ViewStateRoot {
  return viewState.value;
}
/**
 * 深度稳定序列化：对象键按字典序排序后再 stringify，避免「同一语义、键序不同」导致 canonical 不一致。
 */
function _stableJsonForViewState(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    let out = "[";
    for (let i = 0; i < value.length; i++) {
      if (i > 0) out += ",";
      out += _stableJsonForViewState(value[i]);
    }
    return out + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  let out = "{";
  for (let i = 0; i < keys.length; i++) {
    if (i > 0) out += ",";
    const k = keys[i]!;
    out += JSON.stringify(k) + ":" + _stableJsonForViewState(obj[k]);
  }
  return out + "}";
}
/**
 * 将路由页 props 规范为稳定 JSON：避免「缺省 data / data 为 undefined」与「data: {}」在 JSON.stringify 下不一致，
 * 导致误判为状态变化、setViewState 触发整树重挂与 onMount 重复请求（如 i18n.onChange → renderCurrentRoute）。
 */
function _canonicalPagePropsForViewState(p: Record<string, unknown>): string {
  const src = p ?? ({} as Record<string, unknown>);
  const rawParams = src["params"];
  const rawQuery = src["query"];
  const rawData = src["data"];
  const params = rawParams != null && typeof rawParams === "object" && !Array.isArray(rawParams)
    ? rawParams
    : {};
  const query = rawQuery != null && typeof rawQuery === "object" && !Array.isArray(rawQuery)
    ? rawQuery
    : {};
  const data = rawData === undefined || rawData === null ? {} : rawData;
  try {
    return _stableJsonForViewState({ params, query, data });
  } catch {
    return "__dweb:canonicalPagePropsError__";
  }
}
/**
 * 布局 load 注入 props 的稳定比较：缺省字段与 null 统一，减少无意义的全树重挂。
 */
function _canonicalLayoutPropsForViewState(p: Record<string, unknown> | undefined): string {
  const src = p ?? {};
  try {
    return _stableJsonForViewState({
      pathname: src["pathname"] ?? null,
      themeMode: src["themeMode"] ?? null,
      uiLocale: src["uiLocale"] ?? null,
      user: src["user"] ?? null,
    });
  } catch {
    return "__dweb:canonicalLayoutPropsError__";
  }
}
/** 与 loadPageModule 的 normalize 规则一致，用于比较 routeComponent，避免路径写法差异导致误判换页 */
function _routeKeyForViewState(componentPath: string): string {
  if (componentPath == null || String(componentPath).trim() === "") return "";
  return normalizeComponentPathForLookup(String(componentPath));
}
/**
 * 判断两次 View 根状态是否语义相同，避免仅「新对象引用」触发 notify 导致整树卸载重挂。
 * 注意：不比较 layout/page 的 **函数引用**——Hybrid 下首屏与 loadPageModule 可能各有一份模块实例，引用不同但语义同页。
 * 须比较 page 是否已加载：initApp 预合并 layouts 后 page 常为 null，若仅比 props/layouts 会与 hydrate 误判为相同而跳过 setViewState，buildViewTree 收到 null 时运行时报 invalid component（JS 中 typeof null 为 object）。勿在本注释内使用反引号，否则打断 csr-client-builder 外层模板字符串。
 */
function _isSameViewStateRoot(a: _ViewStateRoot, b: _ViewStateRoot): boolean {
  if (_routeKeyForViewState(a.routeComponent) !== _routeKeyForViewState(b.routeComponent) || a.skipLayouts !== b.skipLayouts) return false;
  if ((a.page == null) !== (b.page == null)) return false;
  if (a.layouts.length !== b.layouts.length) return false;
  for (let i = 0; i < a.layouts.length; i++) {
    if (
      _canonicalLayoutPropsForViewState(a.layouts[i].props) !==
        _canonicalLayoutPropsForViewState(b.layouts[i].props)
    ) {
      return false;
    }
  }
  return _canonicalPagePropsForViewState(a.props) === _canonicalPagePropsForViewState(b.props);
}
/**
 * @param opts.force - HMR 等同路由换新 chunk 时必须写入新 page/layout 引用，即使 canonical 状态与上次相同
 */
function setViewState(next: _ViewStateRoot, opts?: { force?: boolean }): void {
  const prev = viewState.value;
  if (!opts?.force && _isSameViewStateRoot(prev, next)) {
    return;
  }
  viewState.value = next;
}
let _viewReactiveRoot: { unmount: () => void } | null = null;

/** 仅渲染「当前页」的包装组件：返回 getter，getter 内读 getViewState() 并 buildViewTree(page, props)，不包含 layouts。页面内 state（Signal 的 .value）只在本 getter 的 effect 中被读，故仅本层重跑、仅本层 data-view-dynamic 更新。 */
function _viewPageContent(props: { getViewState: () => { page: unknown; routeComponent: string; props: Record<string, unknown>; layouts: LayoutComponent[]; skipLayouts: boolean } }) {
  return () => {
    const s = props.getViewState();
    if (_win.__DWEB_DEBUG__) console.log("[dweb:view] PageContent getter", { hasPage: !!s.page });
    if (s.page == null && _win.__DWEB_DEBUG__) console.warn("[dweb:view] PageContent getter: s.page is null");
    return buildViewTree(s.page, s.props, [], true);
  };
}

/** View 引擎：无 reactive root 时创建。根 effect 读 getViewState() 并直接返回「布局 + _viewPageContent」树，不再包一层 _viewStateRoot getter，故整棵树仅 _viewPageContent 一个 getter，只产生一层 data-view-dynamic。路由变时根 effect 重跑，页面内 state 变时仅 _viewPageContent 的 getter 重跑。 */
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
    /** 与 @dreamer/view 的 mount(fn, container) 对齐：fn 返回 getter，等价于旧 insert(host, () => …) */
    const host = el as HTMLElement;
    const dispose = mount(() => {
      return () => {
        const s = getViewState();
        if (_win.__DWEB_DEBUG__) console.log("[dweb:view] root effect", { hasPage: !!s.page, layoutsLen: s.layouts?.length ?? 0, skipLayouts: s.skipLayouts });
        return buildViewTree(_viewPageContent, { getViewState }, s.layouts, s.skipLayouts);
      };
    }, host);
    _viewReactiveRoot = { unmount: dispose };
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
  const { g, router, containerId,${
    isViewEngine ? "" : " engine,"
  } layouts, isHydratedRef, isHybridMode } = opts;
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
    // 使用 globalThis，避免 deno lint no-window / no-window-prefix
    if (typeof globalThis.addEventListener === "function") {
      globalThis.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
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
    const currentPath = (typeof _win.location !== "undefined" && _win.location?.pathname) ? _win.location.pathname.replace(/\\/$/, "") || "/" : "/";
    const dataPath = ((g.__DATA__?.pathname ?? g.__DATA__?.route) ?? "").replace(/\\/$/, "") || "/";
    if (dataPath === currentPath) {
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
  }
  g.__HMR_REFRESH__ = (hmrOpts) => {
    const chunkUrl = hmrOpts?.chunkUrl;
    const routeChunkUrls = hmrOpts?.routeChunkUrls;
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
      // 无精确 chunkUrl 时（如改了 src/components）：用本次构建下发的「路由 → chunk」表拉取当前页 chunk，避免整页刷新
      const mapped = routeChunkUrls && typeof routeChunkUrls === "object" && comp
        ? routeChunkUrls[comp]
        : undefined;
      if (typeof mapped === "string" && mapped.length > 0) {
        const path = mapped.startsWith("/") ? mapped : "/" + mapped;
        const busted = path + (path.includes("?") ? "&" : "?") + "t=" + Date.now();
        if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
          console.log("[dweb:hmr] routeChunkUrls", { comp, busted });
        }
        return import(/* @vite-ignore */ busted);
      }
      // 无法定位新 chunk 时仍尝试复用路由 loader，避免一次辅助文件更新直接触发整页刷新。
      return loadPageModule(match.route.component);
    };
    const scrollX = typeof _win.scrollX === "number" ? _win.scrollX : 0;
    const scrollY = typeof _win.scrollY === "number" ? _win.scrollY : 0;
    // 仅记录路由 chunk 注入的旧 CSS；全局样式节点由 HMR_CSS_ENTRIES 原地刷新，不能提前删除。
    const oldCssEls = typeof _win.document !== "undefined"
      ? Array.from(_win.document.querySelectorAll("[data-dweb-route-css]"))
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
          type _HmrNavProps = { params?: Record<string, string>; query?: Record<string, string>; layoutData?: unknown[]; data?: unknown };
          let _hmrNavProps: _HmrNavProps = { params: match.params || {}, query: match.query || {} };
          try {
            const _hmrPathname = (typeof _win.location !== "undefined" && _win.location.pathname) ? _win.location.pathname : "/";
            const _hmrSearch = (typeof _win.location !== "undefined" && _win.location.search) ? _win.location.search : "";
            if (_hmrPathname && _hmrPathname !== "${DWEB_DATA_PATH}" && _hmrPathname.indexOf("/_") !== 0 && _hmrPathname.indexOf("//") === -1) {
              const _hmrDataUrl = "${DWEB_DATA_PATH}?path=" + encodeURIComponent(_hmrPathname) + (_hmrSearch ? "&" + _hmrSearch.slice(1) : "");
              const _hmrDataRes = await fetch(_hmrDataUrl);
              if (_hmrDataRes && _hmrDataRes.ok) {
                _hmrNavProps = (await _hmrDataRes.json()) as _HmrNavProps;
              }
            }
          } catch {
            /* HMR data refresh failed: keep current route params/query instead of forcing a full reload. */
          }
          const _hmrLayoutData = (_hmrNavProps && Array.isArray(_hmrNavProps.layoutData)) ? _hmrNavProps.layoutData : [];
          const _hmrLayouts: LayoutComponent[] = skipLayouts ? [] : (_hmrLayoutData.length
            ? layoutList.map((l, i) => ({ component: l.component, props: (_hmrLayoutData[i] ?? l.props ?? {}) as Record<string, unknown> }))
            : layoutList);
          const _hmrPageProps = _hmrNavProps
            ? { params: _hmrNavProps.params || (match.params || {}), query: _hmrNavProps.query || (match.query || {}), data: _hmrNavProps.data }
            : { params: match.params || {}, query: match.query || {} };
          if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
            console.log(${
    JSON.stringify($tr("client.hmrRenderCsrBefore"))
  }, { componentPath: match.route.component });
          }
          // 新模块与 load() 数据已就绪后再切换渲染树，避免缺数据或空容器造成闪动。
          ${hmrBeforeRenderSnippet}
          oldCssEls.forEach((el) => { el.remove(); });
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
            HMR_CSS_ENTRIES.forEach((entry) => {
              const el = _win.document.getElementById(entry.styleId);
              if (!el) return;
              // link 元素：先并行加载新样式，load 后再替换旧节点，避免直接改 href 导致短暂无样式闪动。
              if (el.tagName === "LINK") {
                const oldLink = el as HTMLLinkElement;
                const nextHref = entry.url + "?t=" + Date.now();
                const nextLink = oldLink.cloneNode(false) as HTMLLinkElement;
                nextLink.removeAttribute("id");
                nextLink.href = nextHref;
                nextLink.onload = () => {
                  oldLink.remove();
                  nextLink.id = entry.styleId;
                };
                nextLink.onerror = () => {
                  nextLink.remove();
                };
                oldLink.after(nextLink);
              } else {
                fetch(entry.url + "?t=" + Date.now())
                  .then((r) => r.ok ? r.text() : Promise.reject(new Error(${
    JSON.stringify($tr("client.hmrCssFetchFailedPrefix"))
  } + r.statusText)))
                  .then((css) => { el.textContent = css; })
                  .catch(() => {});
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
      ${parallelLoadPageAndNavDataSnippet}
      if (!module) { unmountPrevious(); renderNotFound(containerId); return; }
      const PageComponent = module.default ?? module.Page;
      if (!PageComponent) { unmountPrevious(); renderNotFound(containerId); return; }
      const skipLayouts = module.inheritLayout === false;
      ${applyRouteMetadataHeadSnippet}
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
    // render.debug → __DWEB_DEBUG__；config.router.debug → __DWEB_ROUTER_DEBUG__（仅客户端路由日志）
    debug: !!(_win.__DWEB_DEBUG__) || !!(_win.__DWEB_ROUTER_DEBUG__),
    // SSR/SSG 仅做当前页 hydrate、不做客户端路由，链接点击走浏览器默认整页跳转
    interceptLinks: _win.__DWEB_MODE__ !== "ssr" && _win.__DWEB_MODE__ !== "ssg",
  });
  // 在首次 await 前注册链接点击拦截器（CSR/Hybrid）；SSR/SSG 时 interceptLinks 为 false，不拦截
  router.start();
${initAppLayoutsAndHydrateBody}

  /**
   * 合并同帧/突发多次 renderCurrentRoute（如 i18n、插件连续触发）：只执行最后一次，并在 await 后丢弃已过期的执行，避免 View 整树反复重挂。
   */
  let _dwebRcrCoalesceToken = 0;
  async function renderCurrentRouteImpl(): Promise<void> {
    const myToken = _dwebRcrCoalesceToken;
    const pathname = (typeof _win.location !== "undefined" && _win.location?.pathname) ? _win.location.pathname : "/";
    const match = router.match(pathname);
    if (!match) {
      if (RENDER_STATE.lastUnmount) { RENDER_STATE.lastUnmount(); RENDER_STATE.lastUnmount = null; }
      renderNotFound(containerId);
      return;
    }
    try {
      const module = await loadPageModule(match.route.component) as Record<string, unknown>;
      if (myToken !== _dwebRcrCoalesceToken) return;
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
      if (myToken !== _dwebRcrCoalesceToken) return;
      ${renderCurrentRouteSnippet}
    } catch (error) {
      if (myToken !== _dwebRcrCoalesceToken) return;
      console.error(${
    JSON.stringify($tr("client.pageLoadError"))
  } + ":", error);
      if (RENDER_STATE.lastUnmount) { RENDER_STATE.lastUnmount(); RENDER_STATE.lastUnmount = null; }
      renderError(containerId, error);
    }
  }

  async function renderCurrentRoute(): Promise<void> {
    const t = ++_dwebRcrCoalesceToken;
    await Promise.resolve();
    if (t !== _dwebRcrCoalesceToken) {
      return;
    }
    await renderCurrentRouteImpl();
  }

  // CSR 模式：router.start() 不会用当前 URL 触发 onRouteChange，首屏需主动渲染当前路由
  if (!isHybridMode) await renderCurrentRoute();
${
    isViewEngine
      ? `  // View + Hybrid：若首屏未创建 _viewReactiveRoot（例如未注入 __DATA__ 未走 hybrid 首屏块），则补一次 renderCurrentRoute；React/Preact 不生成此符号，故仅 View 模板输出本行
  else if (!_viewReactiveRoot) await renderCurrentRoute();
`
      : ""
  }  return { renderCurrentRoute, router };
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
  const routesDirPath = resolveRouterRoutesDirPath(
    cwd(),
    routerConfig.routesDir || "./src/routes",
  );
  const srcDir = join(routesDirPath, "..");
  const tempClientEntryPath = join(srcDir, CLIENT_ENTRY_FILENAME);

  const renderConfig = (config.render || {}) as {
    engine?: "react" | "preact" | "view";
    mode?: "csr" | "hybrid" | "ssr" | "ssg";
  };
  const engine = renderConfig.engine || "preact";
  const renderMode = (renderConfig.mode ?? "hybrid") as ClientDepRenderMode;

  const { components, hasLayout, routeLayoutKeys } =
    await getRouteClientManifest(
      container,
      routesDirPath,
      engine,
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
    routesDirPath,
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
  const routesDirPath = resolveRouterRoutesDirPath(
    cwd(),
    routerConfig.routesDir || "./src/routes",
  );
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

  const { components, hasLayout, routeLayoutKeys } =
    await getRouteClientManifest(
      container,
      routesDirPath,
      engine,
    );
  logger.debug($tr("log.routesScanned", { count: String(components.length) }));

  const hmrCssEntries = getHmrCssEntries(container);
  const clientDepPath = join(resolve(srcDir), CLIENT_DEP_FILENAME);

  // Windows：写入前确保父目录存在，避免 NotFound (os error 3)
  await ensureDir(dirname(clientDepPath));

  // 每次构建都刷新 _client.dep.tsx
  const clientDepCode = generateClientDepContent(
    engine,
    components,
    routesDirPath,
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
 * @param routesDirPath 路由目录绝对路径（用于 strip-load 插件，客户端 bundle 剔除 load 及依赖）
 * @param debug 是否启用 esbuild 调试日志
 * @param logger 日志实例
 * @param lang 语言
 * @returns 构建结果（含 outputContents）
 */
async function doDevBuild(
  entryPath: string,
  outputDir: string,
  engine: "react" | "preact" | "view",
  routesDirPath: string,
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
    plugins: createDwebClientBundlePlugins(engine, routesDirPath),
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

  const routesDirPath = resolveRouterRoutesDirPath(
    cwd(),
    routerConfig.routesDir || "./src/routes",
  );
  const srcDir = join(routesDirPath, "..");

  const tempClientEntryPath = join(srcDir, CLIENT_ENTRY_FILENAME);

  logger.debug($tr("log.clientScriptBuilding", {
    path: pathForLog(tempClientEntryPath),
  }));

  try {
    // 获取运行模式（提前计算，用于决定是否写入 client.dep.tsx 避免 HMR 循环）
    const serverConfig = (config.server || {}) as { mode?: "dev" | "prod" };
    // 仅 RUNTIME_ENV=dev 走 dev 压缩策略；build/start 走 prod（esbuild mode）
    const mode = (serverConfig.mode ??
      (getEnv("RUNTIME_ENV") === "dev" ? "dev" : "prod")) as
        | "dev"
        | "prod";
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

    // 优先复用已初始化 Router 的扫描结果；无 Router 时回退到文件系统扫描。
    const { components, hasLayout, routeLayoutKeys } =
      await getRouteClientManifest(
        container,
        routesDirPath,
        engine,
      );
    logger.debug($tr("log.routesScanned", {
      count: String(components.length),
    }));

    const hmrCssEntries = getHmrCssEntries(container);
    const clientDepPath = join(srcDir, CLIENT_DEP_FILENAME);

    // client.dep.tsx 每次构建/启动都重新生成（路由、HMR CSS、loadLayouts、setupHydrationRouterAndHmr 等）
    // 开发态且本次由 client 入口文件变更触发时跳过写入，避免 watch 循环
    const clientDepCode = generateClientDepContent(
      engine,
      components,
      routesDirPath,
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
        plugins: createDwebClientBundlePlugins(engine, routesDirPath),
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
      const memOutputDir = getDreamerClientCacheDir();
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
            routesDirPath,
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
          routesDirPath,
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
        // client.dep.tsx / client.tsx 为客户端入口，非路由组件；HMR 仍下发 routeChunkUrls，由客户端按当前路由 import
        const isClientEntry = changedBasename === CLIENT_DEP_FILENAME ||
          changedBasename === CLIENT_ENTRY_FILENAME;
        /** 配置、公共模块等：在 src 下但不在 routes 下，无单一 chunkUrl；不打 WARN，靠 routeChunkUrls 刷新当前路由 */
        const isWholeClientBundlePath = isClientEntry ||
          isNonRouteSrcUnderAppSrc(routesDirPath, changedPathAbs);
        const componentPath = isWholeClientBundlePath
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
        } else if (!isWholeClientBundlePath) {
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
      const outputNamesForHmr = Array.from(outputFilesDev.keys());
      const routeChunkUrlsDev = buildRouteChunkUrlMap(
        components,
        outputNamesForHmr,
      );
      result = {
        code: mainCodeDev,
        buildTime: Date.now(),
        outputDir: undefined,
        outputFiles: outputFilesDev,
        chunkContentIndex,
        chunkBaseIndex,
        chunkUrl: chunkUrlDev,
        routeChunkUrls: routeChunkUrlsDev,
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
