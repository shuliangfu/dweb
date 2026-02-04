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
  exists,
  getEnv,
  join,
  mkdir,
  readdir,
  readTextFile,
  relative,
  resolve,
  writeTextFile,
} from "../core/runtime-adapter.ts";
import type { AppConfig } from "../types/app.ts";
import { getInferredBuildOutputDirs } from "../utils/build-dirs.ts";
import { getLogger } from "../utils/logger.ts";

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
  /** 本次变更对应路由的 chunk 的 URL（HMR 无感刷新用，如 /_client/index-XXX.js） */
  chunkUrl?: string;
}

/** 构建客户端脚本时的可选参数（如 HMR 传入的变更路径） */
export interface BuildClientScriptOptions {
  /** 变更的文件路径（用于计算 chunkUrl 以支持无感刷新） */
  changedPath?: string;
}

/** 缓存的客户端脚本 */
let cachedClientScript: ClientBuildResult | null = null;

/**
 * 用于 DEBUG 日志的路径：从项目根（cwd）起算的相对路径，避免输出过长绝对路径
 */
function pathForLog(absOrRelPath: string): string {
  const root = cwd();
  const resolved = resolve(absOrRelPath).replace(/\\/g, "/");
  const rootNorm = resolve(root).replace(/\\/g, "/");
  if (resolved === rootNorm || resolved.startsWith(rootNorm + "/")) {
    return relative(root, resolved) || ".";
  }
  return absOrRelPath;
}

/**
 * 规范化路径：统一斜杠并折叠 /./ 与 /../，便于字符串比较
 */
function normalizePathForCompare(p: string): string {
  const s = resolve(p).replace(/\\/g, "/");
  return s.replace(/\/\.\//g, "/").replace(/\/+$/g, "");
}

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
function isClientChunkFile(pathname: string): boolean {
  if (!pathname.startsWith("/")) return false;
  // 支持 .js 与 .js.map（source map）
  const isJs = pathname.endsWith(".js");
  const isMap = pathname.endsWith(".js.map");
  if (!isJs && !isMap) return false;

  // 排除主入口
  if (pathname === "/_client.js" || pathname === "/_client.js.map") {
    return false;
  }

  // 匹配 esbuild chunk：/name-hash.js 或 /name-hash.js.map
  const chunkPattern = /^\/[\w\[\]_-]+-[A-Z0-9]{8}\.(?:js|js\.map)$/;
  return chunkPattern.test(pathname);
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

/**
 * 扫描路由目录，获取所有路由组件
 *
 * @param routesDir 路由目录绝对路径
 * @param basePath 相对路径前缀（用于递归）
 * @param engine 渲染引擎（用于类型，当前仅支持 .tsx/.jsx）
 * @returns 路由组件列表
 */
async function scanRouteComponents(
  routesDir: string,
  basePath = "",
  engine: "react" | "preact" = "preact",
): Promise<RouteComponentInfo[]> {
  const components: RouteComponentInfo[] = [];
  const extRe = /\.(tsx?|jsx?)$/;

  try {
    const entries = await readdir(routesDir);

    for (const entry of entries) {
      const entryPath = join(routesDir, entry.name);

      if (entry.isDirectory) {
        const subComponents = await scanRouteComponents(
          entryPath,
          basePath ? `${basePath}/${entry.name}` : entry.name,
          engine,
        );
        components.push(...subComponents);
      } else if (entry.isFile && extRe.test(entry.name)) {
        const fileName = entry.name.replace(extRe, "");
        if (fileName.startsWith("_")) {
          continue;
        }

        const componentPath = basePath ? `${basePath}/${fileName}` : fileName;
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
    // 目录不存在或读取失败，返回空数组
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
    console.warn("布局组件必须使用 default 导出，例如: export default function Layout() {}");
  } catch (error) {
    console.warn("布局加载失败:", error);
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

/** 浏览器全局对象（兼容 Deno 无 DOM 类型，使用 globalThis 替代 window） */
const _win = globalThis as unknown as Window & typeof globalThis;

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
  __DWEB_HMR_REFRESH__?: (options?: { chunkUrl?: string }) => void;
  /** CSR 模式下页面渲染完成时调用，用于淡出 loading 遮罩 */
  __DWEB_ON_READY__?: () => void;
}

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
 * 动态加载页面模块
 * @param componentPath 组件路径标识（如 "about" 或 "user/[id]"）
 */
export async function loadPageModule(componentPath: string): Promise<unknown> {
  const cleanPath = componentPath.replace(/\\.(tsx?|jsx?)$/, "");
  if (MODULE_CACHE[cleanPath]) return MODULE_CACHE[cleanPath];
  const loader = ROUTE_LOADERS[cleanPath];
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
        <p style="color:#666;margin-top:16px;">页面未找到</p>
        <a href="/" style="color:#3b82f6;text-decoration:none;margin-top:24px;">返回首页</a>
      </div>
    \`;
  }
}

/** 渲染错误页面 */
export function renderError(containerId: string, error: unknown): void {
  const container = _win.document?.getElementById(containerId);
  if (container) {
    const message = error instanceof Error ? error.message : String(error);
    container.innerHTML = \`
      <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:system-ui,sans-serif;">
        <h1 style="font-size:48px;margin:0;color:#ef4444;">出错了</h1>
        <p style="color:#666;margin-top:16px;">\${message}</p>
        <button type="button" onclick="location.reload()" style="margin-top:24px;padding:8px 24px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;">
          重新加载
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
  // 先启动路由器，确保链接点击拦截器尽早注册（避免 hydrate 失败时链接无法响应）
  router.start();
  if (isHybridMode && !isHydratedRef.current) {
    try {
      const hydrationData = g.__DATA__!;
      const componentPath = hydrationData.component || "";
      const module = await loadPageModule(componentPath) as Record<string, unknown>;
      if (module) {
        const PageComponent = module.default ?? module.Page;
        if (PageComponent) {
          const skipLayouts = module.inheritLayout === false;
          hydrate({
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
          isHydratedRef.current = true;
        }
      }
    } catch (error) {
      console.error("[dweb] Hydration 失败，回退到 CSR:", error);
    }
  }
  g.__DWEB_HMR_REFRESH__ = (hmrOpts) => {
    for (const key of Object.keys(MODULE_CACHE)) delete MODULE_CACHE[key];
    clearLayoutCache();
    const pathname = (typeof _win.location !== "undefined" && _win.location?.pathname) ? _win.location.pathname : "/";
    const match = router.match(pathname);
    if (!match) { renderNotFound(containerId); return; }
    const chunkUrl = hmrOpts?.chunkUrl;
    const loadModule = (typeof chunkUrl === "string")
      ? () => import(/* @vite-ignore */ chunkUrl)
      : () => loadPageModule(match.route.component);
    const scrollX = typeof _win.scrollX === "number" ? _win.scrollX : 0;
    const scrollY = typeof _win.scrollY === "number" ? _win.scrollY : 0;
    loadModule()
      .then((mod) => {
        const modObj = mod as Record<string, unknown>;
        if (!modObj) { renderNotFound(containerId); return; }
        const PageComponent = modObj.default ?? modObj.Page;
        if (!PageComponent) { renderNotFound(containerId); return; }
        const skipLayouts = modObj.inheritLayout === false;
        return loadLayouts().then((layoutList) => {
          renderCSR({
            engine,
            component: PageComponent,
            container: "#" + containerId,
            props: { params: match.params, query: match.query },
            layouts: skipLayouts ? undefined : layoutList,
            skipLayouts,
          });
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
              fetch(entry.url + "?t=" + Date.now())
                .then(function(r) { return r.ok ? r.text() : Promise.reject(new Error(r.statusText)); })
                .then(function(css) {
                  const el = _win.document.getElementById(entry.styleId);
                  if (el) el.textContent = css;
                })
                .catch(function() {});
            });
          }
        });
      })
      .catch((err) => {
        console.warn("[dweb] HMR 无感刷新失败，回退整页重载:", err?.message || err);
        if (typeof _win.location !== "undefined") {
          _win.location.reload();
        }
      });
  };

  // Hybrid 下 onRouteChange 注册时会同步用当前路由调用一次；此时已 hydrate 过该路由，不能再 renderCSR，否则会触发 React "early update before hydrate" 报错
  let skipNextRouteChange = isHybridMode;
  router.onRouteChange(async (match) => {
    if (!match) { renderNotFound(containerId); return; }
    if (skipNextRouteChange) {
      skipNextRouteChange = false;
      return;
    }
    if (isHybridMode && !isHydratedRef.current) { isHydratedRef.current = true; return; }
    try {
      const module = await loadPageModule(match.route.component) as Record<string, unknown>;
      if (!module) { renderNotFound(containerId); return; }
      const PageComponent = module.default ?? module.Page;
      if (!PageComponent) { renderNotFound(containerId); return; }
      const skipLayouts = module.inheritLayout === false;
      renderCSR({
        engine,
        component: PageComponent,
        container: "#" + containerId,
        props: { params: match.params, query: match.query },
        layouts: skipLayouts ? undefined : layouts,
        skipLayouts,
      });
      (g as DwebGlobal).__DWEB_ON_READY__?.();
    } catch (error) {
      console.error("页面加载错误:", error);
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
    if (!match) { renderNotFound(containerId); return; }
    try {
      const module = await loadPageModule(match.route.component) as Record<string, unknown>;
      if (!module) { renderNotFound(containerId); return; }
      const PageComponent = module.default ?? module.Page;
      if (!PageComponent) { renderNotFound(containerId); return; }
      const skipLayouts = module.inheritLayout === false;
      const layoutList = await loadLayouts();
      renderCSR({
        engine,
        component: PageComponent,
        container: "#" + containerId,
        props: { params: match.params, query: match.query },
        layouts: skipLayouts ? undefined : layoutList,
        skipLayouts,
      });
    } catch (error) {
      console.error("页面加载错误:", error);
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
        "当前路由:",
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
      return true; // 放行
    });

    // 路由后置守卫：导航完成后执行（可做埋点、日志等）
    app.router.afterRoute((to, _from) => {
      if (to) {
        console.log("路由已切换:", to.route.component, to.params, to.query);
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
      `客户端入口已存在，跳过创建: ${pathForLog(tempClientEntryPath)}`,
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
  logger.debug(`已生成客户端依赖: ${pathForLog(clientDepPath)}`);

  const clientEntryCode = generateStaticClientEntry(
    engine,
    components,
    hasLayout,
    hmrCssEntries,
  );
  await writeTextFile(tempClientEntryPath, clientEntryCode);
  logger.debug(`已生成客户端入口: ${pathForLog(tempClientEntryPath)}`);
  return tempClientEntryPath;
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

  logger.debug(`构建客户端脚本: ${pathForLog(tempClientEntryPath)}`);

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
    logger.debug(`扫描到 ${components.length} 个路由组件`);

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
      logger.debug(`已刷新客户端依赖: ${pathForLog(clientDepPath)}`);
    } else {
      logger.debug(
        `[HMR] 由 client 入口变更触发，跳过写入 ${CLIENT_DEP_FILENAME} 避免循环`,
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
      logger.debug(`生成客户端入口: ${pathForLog(tempClientEntryPath)}`);
    } else if (!skipWritingClientDep) {
      logger.debug(
        `客户端入口已存在，跳过生成: ${pathForLog(tempClientEntryPath)}`,
      );
    }

    // 根据渲染引擎配置 JSX
    const jsxConfig: {
      jsx?: "automatic" | "transform";
      jsxImportSource?: string;
    } = {};
    if (engine === "preact") {
      jsxConfig.jsx = "automatic";
      jsxConfig.jsxImportSource = "preact";
    } else if (engine === "react") {
      jsxConfig.jsx = "automatic";
      jsxConfig.jsxImportSource = "react";
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
      await mkdir(finalOutputDir, { recursive: true });

      const externalList = Array.isArray(userBundleConfig.external)
        ? userBundleConfig.external
        : [];
      // 使用 BuilderClient 进行构建（支持代码分割）
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
      });

      await builder.build(mode);

      // 读取所有输出文件到内存缓存
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
      logger.info(`客户端构建输出 (${outputFiles.size} 个文件):`);
      for (const file of fileList) {
        logger.info(file);
      }
      logger.info(`总大小: ${(totalSize / 1024).toFixed(1)} KB`);

      result = {
        code: mainCode,
        buildTime: Date.now(),
        outputDir: finalOutputDir,
        outputFiles,
      };
    } else {
      // ========================================
      // 开发模式：纯内存构建，不写 dist/
      // BuilderClient write: false 时产出在 outputContents，代码分割的 chunk 也在内存中
      // ========================================
      const memOutputDir = join(cwd(), ".dweb-client-out");
      const builderDev = new BuilderClient({
        entry: tempClientEntryPath,
        output: memOutputDir,
        engine: engine as "react" | "preact",
        bundle: {
          minify: false,
          sourcemap: true,
          splitting: true,
          format: "esm",
        },
      });

      const buildResultDev = await builderDev.build({
        mode: "dev",
        write: false,
      });

      const outputFilesDev = new Map<string, string>();
      if (buildResultDev.outputContents) {
        for (const file of buildResultDev.outputContents) {
          const name = basename(file.path);
          outputFilesDev.set(name, file.text);
        }
      }

      const mainCodeDev = outputFilesDev.get(CLIENT_OUTPUT_MAIN_FILENAME) || "";
      logger.debug(
        `客户端构建完成（内存）: 代码分割, 主入口 ${
          (mainCodeDev.length / 1024).toFixed(1)
        } KB, ${outputFilesDev.size} 个文件`,
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
            chunkUrlDev = `/_client/${chunkFileName}`;
          } else {
            logger.warn(
              `[HMR] 未找到 componentPath="${componentPath}" 对应的 chunk，输出文件: ${
                outputNames.join(", ")
              }`,
            );
          }
        } else if (!isClientEntry) {
          logger.warn(
            `[HMR] 无法从变更路径推导 componentPath，changedPath=${options.changedPath}，routesDirPath=${routesDirPath}`,
          );
        }
      }

      result = {
        code: mainCodeDev,
        buildTime: Date.now(),
        outputDir: undefined,
        outputFiles: outputFilesDev,
        chunkUrl: chunkUrlDev,
      };
    }

    // 缓存结果
    cachedClientScript = result;

    logger.debug("客户端脚本构建完成");
    return result;
  } catch (error) {
    logger.error("客户端脚本构建失败:", error);

    // 返回一个错误提示脚本
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorScript = `
      console.error("客户端脚本构建失败:", ${JSON.stringify(errorMessage)});
      document.getElementById("app").innerHTML = \`
        <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:system-ui,sans-serif;">
          <h1 style="font-size:48px;margin:0;color:#ef4444;">构建错误</h1>
          <pre style="color:#666;margin-top:16px;max-width:80%;overflow:auto;background:#f5f5f5;padding:16px;border-radius:8px;">\${${
      JSON.stringify(errorMessage)
    }}</pre>
        </div>
      \`;
    `;

    return {
      code: errorScript,
      buildTime: Date.now(),
    };
  }
}

/**
 * 递归加载输出目录中的所有 JS 文件到内存
 *
 * @param baseDir 基础目录
 * @param currentDir 当前目录
 * @param files 文件映射
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
        // 计算相对路径作为 key
        const relativePath = entryPath.replace(baseDir + "/", "");
        files.set(relativePath, content);
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
 * 在应用关闭时调用以防止内存泄漏
 */
export function clearClientScriptCache(): void {
  cachedClientScript = null;
}

/**
 * 创建客户端脚本服务中间件
 *
 * 支持代码分割：
 * - /_client.js → 主入口文件
 * - /_client/chunk-xxx.js → 分割的 chunk 文件
 * - /_client/*.js.map → source map 文件
 *
 * 生产模式：
 * - 直接从预构建目录（dist/client/）提供静态文件
 * - 不进行动态构建
 *
 * 开发模式：
 * - 动态构建客户端脚本
 * - 支持热更新
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns 中间件函数
 */
export function createClientScriptMiddleware(
  container: ServiceContainer,
  config: AppConfig,
): (ctx: any, next: () => Promise<void>) => Promise<void> {
  const logger = getLogger(container);

  // 获取运行模式
  const serverConfig = (config.server || {}) as { mode?: "dev" | "prod" };
  const envMode = getEnv("DENO_ENV") || getEnv("BUN_ENV") ||
    getEnv("NODE_ENV") || "dev";
  const mode = serverConfig.mode || envMode as "dev" | "prod";
  const isProd = mode === "prod";

  // 获取预构建目录（生产模式使用）；未配置时按当前入口推断应用目录（如 dist/backend/client）
  const buildConfig = (config.build || {}) as {
    client?: {
      output?: string;
    };
  };
  const clientOutputDir = buildConfig.client?.output ??
    getInferredBuildOutputDirs().client;
  const clientOutputPath = join(cwd(), clientOutputDir);

  return async (ctx: any, next: () => Promise<void>): Promise<void> => {
    const pathname = ctx.url?.pathname || ctx.path || "";

    // 处理主入口及 source map：/_client.js、/_client.js.map
    if (pathname === "/_client.js" || pathname === "/_client.js.map") {
      try {
        const isMap = pathname === "/_client.js.map";
        // 开发模式：不允许读 dist，只从内存构建结果提供
        if (!isProd) {
          let script = getCachedClientScript();
          if (!script) {
            logger.debug("首次构建客户端脚本...");
            script = await buildClientScript(container, config);
          }
          if (isMap) {
            const mapContent = script?.outputFiles?.get("_client.js.map");
            if (mapContent) {
              ctx.response = new Response(mapContent, {
                status: 200,
                headers: {
                  "Content-Type": "application/json; charset=utf-8",
                  "Cache-Control": "no-cache",
                },
              });
            } else {
              ctx.response = new Response("{}", {
                status: 200,
                headers: {
                  "Content-Type": "application/json; charset=utf-8",
                  "Cache-Control": "no-cache",
                },
              });
            }
            return;
          }
          if (!script?.code) {
            logger.error("客户端脚本缓存为空或 code 为空", {
              hasScript: !!script,
              hasCode: !!script?.code,
            });
            ctx.response = new Response(
              `console.error("客户端脚本未就绪，请刷新重试");`,
              {
                status: 500,
                headers: {
                  "Content-Type": "application/javascript; charset=utf-8",
                },
              },
            );
            return;
          }
          ctx.response = new Response(script.code, {
            status: 200,
            headers: {
              "Content-Type": "application/javascript; charset=utf-8",
              "Cache-Control": "no-cache",
            },
          });
          return;
        }

        // 生产模式：只从预构建目录提供
        const mainFile = isMap
          ? `${CLIENT_OUTPUT_MAIN_FILENAME}.map`
          : CLIENT_OUTPUT_MAIN_FILENAME;
        const clientJsPath = join(clientOutputPath, mainFile);
        if (await exists(clientJsPath)) {
          const content = await readTextFile(clientJsPath);
          ctx.response = new Response(content, {
            status: 200,
            headers: {
              "Content-Type": isMap
                ? "application/json; charset=utf-8"
                : "application/javascript; charset=utf-8",
              "Cache-Control": "public, max-age=31536000",
            },
          });
          return;
        }
        if (isMap) {
          ctx.response = new Response("{}", {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-cache",
            },
          });
          return;
        }
        logger.error("预构建的客户端脚本不存在:", clientJsPath);
        ctx.response = new Response(
          `console.error("预构建的客户端脚本不存在，请先运行 build 命令");`,
          {
            status: 500,
            headers: {
              "Content-Type": "application/javascript; charset=utf-8",
            },
          },
        );
        return;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const errStack = error instanceof Error ? error.stack : "";
        logger.error("提供客户端脚本失败:", undefined, error);
        console.error("[_client.js] 提供失败:", errMsg, errStack);
        ctx.response = new Response(
          `console.error("加载客户端脚本失败:", ${JSON.stringify(errMsg)});`,
          {
            status: 500,
            headers: {
              "Content-Type": "application/javascript; charset=utf-8",
            },
          },
        );
        return;
      }
    }

    // 处理分割的 chunk 文件请求
    // 支持两种路径格式：/_client/*.js 或 /*.js（esbuild 默认）
    if (pathname.startsWith("/_client/") || isClientChunkFile(pathname)) {
      const fileName = pathname.startsWith("/_client/")
        ? pathname.replace("/_client/", "")
        : pathname.replace("/", "");
      const isSourceMap = fileName.endsWith(".map");

      // 开发模式：不允许读 dist，只从内存构建结果提供
      if (!isProd) {
        const script = getCachedClientScript();
        const content = script?.outputFiles?.get(fileName);
        if (content) {
          ctx.response = new Response(content, {
            status: 200,
            headers: {
              "Content-Type": isSourceMap
                ? "application/json; charset=utf-8"
                : "application/javascript; charset=utf-8",
              "Cache-Control": "no-cache",
            },
          });
          return;
        }
        if (pathname.startsWith("/_client/")) {
          ctx.response = new Response("Not Found", { status: 404 });
          return;
        }
        await next();
        return;
      }

      // 生产模式：只从预构建目录提供
      const filePath = join(clientOutputPath, fileName);
      if (await exists(filePath)) {
        const content = await readTextFile(filePath);
        ctx.response = new Response(content, {
          status: 200,
          headers: {
            "Content-Type": isSourceMap
              ? "application/json; charset=utf-8"
              : "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=31536000",
          },
        });
        return;
      }

      if (pathname.startsWith("/_client/")) {
        ctx.response = new Response("Not Found", { status: 404 });
        return;
      }
    }

    await next();
  };
}
