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
import type { ServiceContainer } from "@dreamer/service";
import {
  basename,
  cwd,
  ensureDir,
  exists,
  getEnv,
  join,
  readdir,
  readTextFile,
  resolve,
  writeTextFile,
} from "../core/runtime-adapter.ts";
import type { AppConfig } from "../types/app.ts";
import {
  getDreamerClientCacheDir,
  getInferredBuildOutputDirs,
} from "../utils/build-dirs.ts";
import { $t } from "../utils/i18n.ts";
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
 * esbuild 命名规则：about.tsx -> about-XXX.js；index.tsx 常与同目录一起打出 -> routes-XXX.js。
 */
function getChunkFileNameForComponent(
  componentPath: string,
  outputFileNames: string[],
): string | null {
  const segment = componentPath.split("/").pop() || componentPath;
  const jsOnly = outputFileNames.filter((n) =>
    n.endsWith(".js") && n !== CLIENT_OUTPUT_MAIN_FILENAME
  );

  for (const name of jsOnly) {
    const base = name.slice(0, -3);
    if (base.startsWith(segment + "-") || base === segment) {
      return name;
    }
  }
  // index 路由：esbuild 可能把 routes/index.tsx 打成 routes-XXX.js 而非 index-XXX.js
  if (segment === "index") {
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
 * - routes-XXXXXXXX.js（路由组件）
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
  // - 带 hash：/name-hash.js（hash 长度 6–10 位，生产/旧开发模式）
  // - 无 hash：/name.js（开发模式 chunkNames: "[name]" 时，用于 HMR 无感更新）
  const chunkWithHash = /^\/[\w\[\]_-]+-[A-Z0-9]{6,10}\.(?:js|js\.map)$/;
  const chunkNoHash = /^\/[\w\[\]_-]+\.(?:js|js\.map)$/;
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
  _engine: "react" | "preact" = "preact",
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

/** _client.tsx 文件名（客户端入口，仅当不存在时生成，可手动编辑） */
const CLIENT_ENTRY_FILENAME = "_client.tsx";

/** 构建产物的主入口文件名（与入口 _client.tsx 对应，esbuild 输出 _client.js） */
/** 客户端主入口输出文件名（单文件模式） */
export const CLIENT_OUTPUT_MAIN_FILENAME = "_client.js";

/** 渲染引擎对应的 @dreamer/render 客户端适配路径（与 generateStaticClientEntry 一致） */
const ENGINE_RENDER_ADAPTER: Record<string, string> = {
  preact: "@dreamer/render/client/preact",
  react: "@dreamer/render/client/react",
};

/**
 * 生成 client.dep.tsx 内容（路由加载器、缓存、HMR CSS、loadLayouts、loadPageModule、renderNotFound、renderError、setupHydrationRouterAndHmr 等）
 * 此文件每次构建/启动都会重新生成；client.tsx 仅不存在时生成，便于用户修改入口逻辑。
 *
 * @param engine 渲染引擎（用于 hydrate/renderCSR 导入及 setupHydrationRouterAndHmr）
 * @param components 路由组件列表
 * @param hasLayout 是否存在布局文件
 * @param hmrCssEntries 开发态 HMR CSS 配置
 * @returns client.dep.tsx 的完整源码
 */
function generateClientDepContent(
  engine: "react" | "preact",
  components: RouteComponentInfo[],
  hasLayout: boolean,
  hmrCssEntries: Array<{ url: string; styleId: string }>,
): string {
  const adapterImport = ENGINE_RENDER_ADAPTER[engine] ??
    "@dreamer/render/client/preact";
  const routeExt = ".tsx";
  const routeLoaders = components.map(
    (c) =>
      `  "${c.componentPath}": () => import("./routes/${c.componentPath}${routeExt}"),`,
  ).join("\n");

  const layoutExt = ".tsx";
  const layoutCode = hasLayout
    ? `
let cachedLayouts: LayoutComponent[] | null = null;

export async function loadLayouts(): Promise<LayoutComponent[]> {
  if (cachedLayouts) return cachedLayouts;
  try {
    const LayoutModule = await import("./routes/_layout${layoutExt}");
    if (LayoutModule.default) {
      cachedLayouts = [{ component: LayoutModule.default, props: {} }];
      return cachedLayouts;
    }
    console.warn(${JSON.stringify($t("client.layoutDefaultExport"))});
  } catch (error) {
    console.warn(${JSON.stringify($t("client.layoutLoadFailed"))}, error);
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

export async function loadLayouts(): Promise<LayoutComponent[]> {
  return [];
}

export function clearLayoutCache(): void {
  cachedLayouts = null;
}`;

  return `/// <reference lib="dom" />
/**
 * 客户端依赖（由 @dreamer/dweb 自动生成，每次构建/启动会重新生成）
 * 供 client.tsx 导入：initApp、DwebApp、路由类型、DwebGlobal 等；initApp 返回 app（含 renderCurrentRoute、router）供在 .then 中直接使用，可做路由拦截。
 */

import { createRouter } from "@dreamer/router/client";
import { hydrate, renderCSR } from "${adapterImport}";

/** 客户端路由类型（与 @dreamer/router ClientRoute 一致） */
export type RouteType = "static" | "dynamic" | "wildcard" | "optional";

/** 服务端注入的全局变量类型 */
export interface DwebGlobal {
  __DWEB_ROUTES__?: Array<{ path: string; component: string; type?: RouteType }>;
  __DWEB_ENGINE__?: "react" | "preact";
  __DWEB_CONTAINER_ID__?: string;
  __DATA__?: {
    page?: Record<string, unknown>;
    params?: Record<string, string>;
    query?: Record<string, string>;
    component?: string;
  };
  __DWEB_MODE__?: "csr" | "hybrid";
  /** 是否为开发模式（服务端注入，用于区分 dev/prod 行为，如 CSS 强制刷新仅 dev 执行） */
  __DWEB_DEV__?: boolean;
  __DWEB_HMR_REFRESH__?: (options?: { chunkUrl?: string }) => void;
  /** CSR 模式下页面渲染完成时调用，用于淡出 loading 遮罩 */
  __DWEB_ON_READY__?: () => void;
  /** 开发模式 HMR 调试日志开关（控制台设置 globalThis.__DWEB_HMR_DEBUG__ = true 可查看详细日志） */
  __DWEB_HMR_DEBUG__?: boolean;
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
 * 统一反斜杠为正斜杠、去除扩展名，确保与 scanRouteComponents 生成的 key 一致
 */
function normalizeComponentPathForLookup(componentPath: string): string {
  return componentPath
    .replace(/\\\\/g, "/")
    .replace(/\.(tsx?|jsx?)$/, "")
    .trim();
}

/**
 * 动态加载页面模块
 * @param componentPath 组件路径标识（如 "about" 或 "user/[id]"）
 */
export async function loadPageModule(componentPath: string): Promise<unknown> {
  const cleanPath = normalizeComponentPathForLookup(componentPath);
  if (MODULE_CACHE[cleanPath]) return MODULE_CACHE[cleanPath];
  let loader = ROUTE_LOADERS[cleanPath];
  // Windows 下路径大小写可能不一致，尝试不区分大小写匹配
  if (!loader && cleanPath.indexOf("/") < 0) {
    const key = Object.keys(ROUTE_LOADERS).find(
      (k) => k.toLowerCase() === cleanPath.toLowerCase(),
    );
    if (key) loader = ROUTE_LOADERS[key];
  }
  // 兼容带 routes/ 前缀的路径（服务端与客户端路径格式差异）
  if (!loader && cleanPath.startsWith("routes/")) {
    const withoutPrefix = cleanPath.slice(7);
    loader = ROUTE_LOADERS[withoutPrefix];
  }
  if (!loader) return null;
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
        <p style="color:#666;margin-top:16px;">${$t("client.pageNotFound")}</p>
        <a href="/" style="color:#3b82f6;text-decoration:none;margin-top:24px;">${
    $t("client.backToHome")
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
    $t("client.errorOccurred")
  }</h1>
        <p style="color:#666;margin-top:16px;">\${escapeHtml(message)}</p>
        <button type="button" onclick="location.reload()" style="margin-top:24px;padding:8px 24px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;">
          ${$t("client.reload")}
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
/** 共享的渲染状态：存储上次卸载函数，HMR/路由切换前需先调用以清理 Preact/React 内部状态，避免 __H 等 hooks 冲突 */
export const RENDER_STATE: { lastUnmount: (() => void) | null } = { lastUnmount: null };

export async function setupHydrationRouterAndHmr(opts: {
  g: DwebGlobal;
  router: ClientRouterLike;
  containerId: string;
  engine: "react" | "preact";
  layouts: LayoutComponent[];
  isHydratedRef: { current: boolean };
  isHybridMode: boolean;
}): Promise<void> {
  const { g, router, containerId, engine, layouts, isHydratedRef, isHybridMode } = opts;
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
        const msg = ${JSON.stringify($t("client.hydrationFailed"))} + (componentPath ? \`: component "\${componentPath}" not found\` : "");
        console.error(msg);
        renderError(containerId, new Error(msg));
        return;
      }
      const skipLayouts = module?.inheritLayout === false;
      const hydResult = hydrate({
        engine,
        component: PageComponent,
        container: \`#\${containerId}\`,
        props: hydrationData.page || {
          params: hydrationData.params || {},
          query: hydrationData.query || {},
        },
        layouts: skipLayouts ? undefined : layouts,
        skipLayouts,
      });
      RENDER_STATE.lastUnmount = hydResult?.unmount ?? null;
      isHydratedRef.current = true;
    } catch (error) {
      console.error(${
    JSON.stringify($t("client.hydrationFailed"))
  } + ":", error);
      renderError(containerId, error);
    }
  }
  g.__DWEB_HMR_REFRESH__ = (hmrOpts) => {
    const chunkUrl = hmrOpts?.chunkUrl;
    if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
      console.log(${JSON.stringify($t("client.hmrDebugEnabled"))});
    }
    for (const key of Object.keys(MODULE_CACHE)) delete MODULE_CACHE[key];
    clearLayoutCache();
    const pathname = (typeof _win.location !== "undefined" && _win.location?.pathname) ? _win.location.pathname : "/";
    const match = router.match(pathname);
    if (!match) {
      if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
        console.log(${JSON.stringify($t("client.hmrNoMatchRenderNotFound"))});
      }
      unmountPrevious(); renderNotFound(containerId); return;
    }
    // 有 chunkUrl 且匹配当前路由时，用 import(chunkUrl + "?t=" + ts) 强制拉取新 chunk（绕过浏览器模块缓存）
    // 否则 loadPageModule 会返回缓存，不会发起网络请求，拿不到新代码
    const comp = match.route.component;
    const compLastSegment = comp.split("/").pop() || comp;
    // 从 /_client/index-XYZ789.js 提取 "index"（文件名中 -hash 前的部分）
    const chunkBaseFromUrl = typeof chunkUrl === "string"
      ? (chunkUrl.match(/([^/-]+)-[A-Za-z0-9]{6,10}\\.js(?:\\.map)?$/)?.[1] ??
        ((chunkUrl.split("/").pop() || "").replace(/-[A-Za-z0-9]{6,10}\\.js.*$/, "") || null))
      : null;
    const compBase = compLastSegment.replace(/\\.(tsx?|jsx?)$/, "");
    // index 路由的 chunk 可能为 routes-XXX.js，需特殊匹配
    const useChunkUrl = chunkUrl && chunkBaseFromUrl &&
      (compBase === chunkBaseFromUrl || compLastSegment === chunkBaseFromUrl ||
        comp === chunkBaseFromUrl ||
        (compBase === "index" && chunkBaseFromUrl === "routes"));
    if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
      console.log(${JSON.stringify($t("client.hmrChunkUrlMatch"))}, {
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
          console.log(${JSON.stringify($t("client.hmrForceFetchWithChunkUrl"))}, busted);
        }
        return import(/* @vite-ignore */ busted);
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
          console.log(${JSON.stringify($t("client.hmrLoadModuleComplete"))}, { hasDefault: !!(mod as Record<string, unknown>)?.default, componentPath: match.route.component });
        }
        const modObj = mod as Record<string, unknown>;
        if (!modObj) { renderNotFound(containerId); return; }
        const PageComponent = modObj.default ?? modObj.Page;
        if (!PageComponent) { renderNotFound(containerId); return; }
        const skipLayouts = modObj.inheritLayout === false;
        return loadLayouts().then((layoutList) => {
          if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
            console.log(${JSON.stringify($t("client.hmrRenderCsrBefore"))}, { componentPath: match.route.component });
          }
          // 新模块已就绪，在 render 前一刻执行 unmount + 移除旧 CSS，最小化空白时间，消除闪动
          unmountPrevious();
          oldCssEls.forEach(function(el) { el.remove(); });
          const csrResult = renderCSR({
            engine,
            component: PageComponent,
            container: "#" + containerId,
            props: { params: match.params, query: match.query },
            layouts: skipLayouts ? undefined : layoutList,
            skipLayouts,
          });
          RENDER_STATE.lastUnmount = csrResult?.unmount ?? null;
          if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
            console.log(${JSON.stringify($t("client.hmrRenderCsrComplete"))});
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
                el.href = entry.url + "?t=" + Date.now();
              } else {
                fetch(entry.url + "?t=" + Date.now())
                  .then(function(r) { return r.ok ? r.text() : Promise.reject(new Error("[dweb] HMR CSS fetch failed: " + r.statusText)); })
                  .then(function(css) { el.textContent = css; })
                  .catch(function() {});
              }
            });
          }
        });
      })
      .catch((err) => {
        if (typeof _win.__DWEB_HMR_DEBUG__ !== "undefined" && _win.__DWEB_HMR_DEBUG__) {
          console.error(${JSON.stringify($t("client.hmrLoadModuleRenderFailed"))}, err);
        }
        console.warn(${
    JSON.stringify($t("client.hmrFallback"))
  } + ":", err?.message || err);
        if (typeof _win.location !== "undefined") {
          _win.location.reload();
        }
      });
  };

  // Hybrid 下 onRouteChange 注册时会同步用当前路由调用一次；此时已 hydrate 过该路由，不能再 renderCSR，否则会触发 React "early update before hydrate" 报错
  let skipNextRouteChange = isHybridMode;
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
      unmountPrevious();
      const csrResult = renderCSR({
        engine,
        component: PageComponent,
        container: "#" + containerId,
        props: { params: match.params, query: match.query },
        layouts: skipLayouts ? undefined : layouts,
        skipLayouts,
      });
      RENDER_STATE.lastUnmount = csrResult?.unmount ?? null;
      (g as DwebGlobal).__DWEB_ON_READY__?.();
    } catch (error) {
      console.error(${JSON.stringify($t("client.pageLoadError"))} + ":", error);
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
  const isHybridMode = g.__DWEB_MODE__ === "hybrid" && !!g.__DATA__;
  const layouts = await loadLayouts();
  const router = createRouter({ routes, engine });
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
      const layoutList = await loadLayouts();
      if (RENDER_STATE.lastUnmount) { RENDER_STATE.lastUnmount(); RENDER_STATE.lastUnmount = null; }
      const csrResult = renderCSR({
        engine,
        component: PageComponent,
        container: "#" + containerId,
        props: { params: match.params, query: match.query },
        layouts: skipLayouts ? undefined : layoutList,
        skipLayouts,
      });
      RENDER_STATE.lastUnmount = csrResult?.unmount ?? null;
    } catch (error) {
      console.error(${JSON.stringify($t("client.pageLoadError"))} + ":", error);
      if (RENDER_STATE.lastUnmount) { RENDER_STATE.lastUnmount(); RENDER_STATE.lastUnmount = null; }
      renderError(containerId, error);
    }
  }

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
  _engine: "react" | "preact",
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
        ${JSON.stringify($t("client.routeCurrent"))},
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
    JSON.stringify($t("client.routeSwitched"))
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
  const routesDir = routerConfig.routesDir || "./src/routes";
  const routesDirPath = join(cwd(), routesDir);
  const srcDir = routesDirPath.replace(/\/routes\/?$/, "");
  const tempClientEntryPath = join(srcDir, CLIENT_ENTRY_FILENAME);

  const renderConfig = (config.render || {}) as {
    engine?: "react" | "preact";
  };
  const engine = renderConfig.engine || "preact";

  const components = await scanRouteComponents(routesDirPath, "", engine);
  const layoutPathTsx = join(routesDirPath, "_layout.tsx");
  const hasLayout = await exists(layoutPathTsx);

  if (await exists(tempClientEntryPath)) {
    logger.debug(
      $t("log.clientEntryExists", {
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
  );
  await writeTextFile(clientDepPath, clientDepCode);
  logger.debug($t("log.clientDepGenerated", {
    path: pathForLog(clientDepPath),
  }));

  const clientEntryCode = generateStaticClientEntry(
    engine,
    components,
    hasLayout,
    hmrCssEntries,
  );
  await writeTextFile(tempClientEntryPath, clientEntryCode);
  logger.debug($t("log.clientEntryGenerated", {
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
  engine: "react" | "preact";
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
  const routesDir = routerConfig.routesDir || "./src/routes";
  const routesDirPath = join(cwd(), routesDir);
  const srcDir = routesDirPath.replace(/\/routes\/?$/, "");
  const tempClientEntryPath = join(srcDir, CLIENT_ENTRY_FILENAME);

  const renderConfig = (config.render || {}) as { engine?: "react" | "preact" };
  const engine = (renderConfig.engine || "preact") as "react" | "preact";

  const components = await scanRouteComponents(routesDirPath, "", engine);
  logger.debug($t("log.routesScanned", { count: String(components.length) }));

  const layoutPathTsx = join(routesDirPath, "_layout.tsx");
  const hasLayout = await exists(layoutPathTsx);
  const hmrCssEntries = getHmrCssEntries(container);
  const clientDepPath = join(srcDir, CLIENT_DEP_FILENAME);

  // 每次构建都刷新 _client.dep.tsx
  const clientDepCode = generateClientDepContent(
    engine,
    components,
    hasLayout,
    hmrCssEntries,
  );
  await writeTextFile(clientDepPath, clientDepCode);
  logger.debug(
    $t("log.clientDepRefreshed", { path: pathForLog(clientDepPath) }),
  );

  // _client.tsx 不存在时生成
  if (!(await exists(tempClientEntryPath))) {
    const clientEntryCode = generateStaticClientEntry(
      engine,
      components,
      hasLayout,
      hmrCssEntries,
    );
    await writeTextFile(tempClientEntryPath, clientEntryCode);
    logger.debug($t("log.clientEntryGenerating", {
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
      alias: userBundleConfig.alias,
    },
  };
}

/**
 * 开发模式构建：创建 context + rebuild，缓存 builder 供后续增量 rebuild
 *
 * @param entryPath 入口文件路径（_client.tsx）
 * @param outputDir 输出目录（用于 esbuild 路径解析，write: false 时不写盘）
 * @param engine 渲染引擎
 * @returns 构建结果（含 outputContents）
 */
async function doDevBuild(
  entryPath: string,
  outputDir: string,
  engine: "react" | "preact",
): Promise<{
  outputContents?: Array<{ path: string; text: string; contents?: Uint8Array }>;
}> {
  const builder = new BuilderClient({
    entry: entryPath,
    output: outputDir,
    engine,
    bundle: {
      minify: false,
      sourcemap: true,
      splitting: true,
      format: "esm",
      chunkNames: "[name]-[hash]",
    },
    t: (key: string, params?: Record<string, string | number | boolean>) => {
      const r = $t(key, params);
      return (r != null && r !== key) ? r : undefined;
    },
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

  const routesDir = routerConfig.routesDir || "./src/routes";
  const routesDirPath = join(cwd(), routesDir);
  const srcDir = routesDirPath.replace(/\/routes\/?$/, "");

  // 生成临时入口文件路径
  const tempClientEntryPath = join(srcDir, CLIENT_ENTRY_FILENAME);

  logger.debug($t("log.clientScriptBuilding", {
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

    // 获取渲染引擎配置
    const renderConfig = (config.render || {}) as {
      engine?: "react" | "preact";
    };
    const engine = renderConfig.engine || "preact";

    // 扫描路由目录，获取所有路由组件（.tsx/.jsx）
    const components = await scanRouteComponents(routesDirPath, "", engine);
    logger.debug($t("log.routesScanned", {
      count: String(components.length),
    }));

    // 检查是否存在布局文件
    const layoutPathTsx = join(routesDirPath, "_layout.tsx");
    const hasLayout = await exists(layoutPathTsx);

    const hmrCssEntries = getHmrCssEntries(container);
    const clientDepPath = join(srcDir, CLIENT_DEP_FILENAME);

    // client.dep.tsx 每次构建/启动都重新生成（路由、HMR CSS、loadLayouts、setupHydrationRouterAndHmr 等）
    // 开发态且本次由 client 入口文件变更触发时跳过写入，避免 watch 循环
    const clientDepCode = generateClientDepContent(
      engine,
      components,
      hasLayout,
      hmrCssEntries,
    );
    if (!skipWritingClientDep) {
      await writeTextFile(clientDepPath, clientDepCode);
      logger.debug($t("log.clientDepRefreshed", {
        path: pathForLog(clientDepPath),
      }));
    } else {
      logger.debug(
        $t("log.hmrSkipClientDep", { filename: CLIENT_DEP_FILENAME }),
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
      logger.debug($t("log.clientEntryGenerating", {
        path: pathForLog(tempClientEntryPath),
      }));
    } else if (!skipWritingClientDep) {
      logger.debug($t("log.clientEntryExistsSkip", {
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
        : ["react", "react-dom", "react/jsx-runtime", "react-dom/client"];
      const externalList = userExternal.filter(
        (ext) =>
          !runtimeExternalBlocklist.some((b) =>
            ext === b || ext.startsWith(`${b}/`)
          ),
      );

      const builder = new BuilderClient({
        entry: tempClientEntryPath,
        output: finalOutputDir,
        engine: engine as "react" | "preact",
        bundle: {
          minify: shouldMinify,
          sourcemap: shouldSourcemap,
          splitting: shouldSplit,
          format: "esm",
          external: externalList.length > 0 ? externalList : undefined,
          alias: userBundleConfig.alias,
        },
        t: (
          key: string,
          params?: Record<string, string | number | boolean>,
        ) => {
          const r = $t(key, params);
          return (r != null && r !== key) ? r : undefined;
        },
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
        $t("log.clientBuildOutput", { count: String(outputFiles.size) }),
      );
      for (const file of fileList) {
        logger.info(file);
      }
      logger.info($t("log.clientBuildTotalSize", {
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
          logger.warn($t("log.hmrIncrementalRebuildFailed") + ":", err);
          await cachedDevBuilder.dispose();
          cachedDevBuilder = null;
          buildResultDev = await doDevBuild(
            tempClientEntryPath,
            memOutputDir,
            engine,
          );
        }
      } else {
        buildResultDev = await doDevBuild(
          tempClientEntryPath,
          memOutputDir,
          engine,
        );
      }

      const outputFilesDev = new Map<string, string>();
      if (buildResultDev.outputContents) {
        for (const file of buildResultDev.outputContents) {
          const name = basename(file.path);
          outputFilesDev.set(name, file.text);
        }
      }

      const mainCodeDev = outputFilesDev.get(CLIENT_OUTPUT_MAIN_FILENAME) || "";
      logger.debug(
        $t("log.clientBuildCompleteMemory", {
          mainSize: (mainCodeDev.length / 1024).toFixed(1),
          count: String(outputFilesDev.size),
        }),
      );

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
              $t("log.hmrChunkNotFound", {
                path: componentPath,
                files: outputNames.join(", "),
              }),
            );
          }
        } else if (!isClientEntry) {
          logger.warn(
            $t("log.hmrComponentPathNotFound", {
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

    logger.debug($t("log.clientScriptBuildComplete"));
    return result;
  } catch (error) {
    logger.error($t("log.clientBuildFailed") + ":", error);

    // 返回一个错误提示脚本（运行时通过 escapeHtml 转义 errorMessage，防止 XSS）
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorScript = `
      (function() {
        function escapeHtml(s) {
          return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
        }
        var errorMessage = ${JSON.stringify(errorMessage)};
        console.error(${
      JSON.stringify($t("log.clientBuildFailed"))
    } + ":", errorMessage);
        var container = document.getElementById("app");
        if (container) {
          container.innerHTML = '<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:system-ui,sans-serif;"><h1 style="font-size:48px;margin:0;color:#ef4444;">${
      $t("client.buildError")
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
 * @param outputFiles 输出文件映射
 * @returns chunkContentIndex（basename->content）、chunkBaseIndex（base->content）
 */
function buildChunkIndices(
  outputFiles: Map<string, string>,
): {
  chunkContentIndex: Map<string, string>;
  chunkBaseIndex: Map<string, string>;
} {
  const chunkContentIndex = new Map<string, string>();
  const chunkBaseIndex = new Map<string, string>();
  for (const [key, content] of outputFiles) {
    const name = basename(key);
    chunkContentIndex.set(name, content);
    const base = getChunkBaseName(name);
    if (base) chunkBaseIndex.set(base, content);
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
  // 2. 直接按 key 查找
  const direct = outputFiles.get(fileName);
  if (direct) return direct;
  // 3. 优先查 base 索引（HMR 回退，O(1)）
  const base = getChunkBaseName(fileName);
  if (base) {
    const fromBaseIndex = chunkBaseIndex?.get(base);
    if (fromBaseIndex !== undefined) return fromBaseIndex;
  }
  // 4. 回退：遍历查找（兼容 path/subdir/chunk-xxx.js 等格式）
  for (const [key, content] of outputFiles) {
    if (basename(key) === fileName) return content;
  }
  // 5. 回退：HMR 遍历（请求旧 hash 时用同 base 的最新 chunk）
  if (base) {
    const prefix = base + "-";
    for (const [key, content] of outputFiles) {
      const name = basename(key);
      if (
        name.startsWith(prefix) &&
        (name.endsWith(".js") || name.endsWith(".js.map"))
      ) {
        return content;
      }
    }
  }
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
