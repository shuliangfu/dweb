/**
 * CSR client.dep.tsx 内容生成
 *
 * 从 csr-client-builder 拆出：ROUTE_LOADERS / hydrate / HMR 等客户端依赖源码模板。
 * generateClientDepContent 保持与拆分前逻辑一致，不改生成内容。
 */

import { DWEB_DATA_PATH } from "../utils/constants.ts";
import { $tr } from "../utils/i18n.ts";
import {
  extractComponentPathFromRouteFile,
  subpathFromRoutesDirMarker,
} from "../utils/path.ts";
import type { RouteComponentInfo } from "./csr-client-route-manifest.ts";

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
export type ClientDepRenderMode = "csr" | "hybrid" | "ssr" | "ssg";

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
 * 客户端根挂载与 @dreamer/view 一致：默认 `mount(() => () => …, container)`；
 * 当 `__DWEB_MISMATCH_MODE__` 为 `continue`|`assert` 时首屏改走 `hydrate(..., { mismatchMode })`。
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
import { createSignal, hydrate, mount, type Signal } from "@dreamer/view";`
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
   * 两阶段导航（deferred）：先只 await 路由 chunk，首帧即渲染 shell（params/query），
   * __data 与 chunk 并行发起但不阻塞首帧；到达后 patch document.head 并二次渲染。
   */
  const deferredNavLoadModuleSnippet = `const _navSeq = ++_DWEB_NAV_DATA_SEQ;
      const _pathname = (typeof _win.location !== "undefined" && _win.location.pathname) ? _win.location.pathname : "/";
      const _search = (typeof _win.location !== "undefined" && _win.location.search) ? _win.location.search : "";
      const _pathAndSearch = _pathname + _search;
      const _samePageHashOnly = (typeof (g as DwebGlobal).__DWEB_LAST_PATHNAME__ === "string" && (g as DwebGlobal).__DWEB_LAST_PATHNAME__ === _pathAndSearch);
      const _reservedOrInvalid = !_pathname || _pathname === "${DWEB_DATA_PATH}" || _pathname.indexOf("/_") === 0 || _pathname.indexOf("//") !== -1 || _samePageHashOnly;
      type _NavProps = { params?: Record<string, string>; query?: Record<string, string>; layoutData?: unknown[]; data?: unknown; metadata?: Record<string, unknown>; metadataTagsHtml?: string; metadataTitleHtml?: string };
      let _navProps: _NavProps = { params: match.params || {}, query: match.query || {} };
      /** 与 loadPageModule 并行发起 __data，但不阻塞阶段 1 渲染 */
      let _navDataPromise: Promise<_NavProps> | null = null;
      if (!_reservedOrInvalid) {
        const _dataUrl = "${DWEB_DATA_PATH}?path=" + encodeURIComponent(_pathname) + (_search ? "&" + _search.slice(1) : "");
        _navDataPromise = fetch(_dataUrl).then(async (_dataRes): Promise<_NavProps> => {
          return (_dataRes && _dataRes.ok)
            ? (await _dataRes.json()) as _NavProps
            : { params: match.params || {}, query: match.query || {} };
        });
      }
      const module = await loadPageModule(match.route.component) as Promise<Record<string, unknown>>;
      if (_navSeq !== _DWEB_NAV_DATA_SEQ) return;
      (g as DwebGlobal).__DWEB_LAST_PATHNAME__ = _pathAndSearch;`;
  /** 阶段 2：await 已在阶段 1 发起的 __data Promise，结果写入 _fullNavProps */
  const deferredNavFetchDataSnippet =
    `const _fullNavProps: _NavProps = _navDataPromise != null
            ? await _navDataPromise
            : { params: match.params || {}, query: match.query || {} };`;
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
   * View / React/Preact：由 _renderNavPage 调用；合并 layout、unmount、渲染正文。
   * 首帧可在无 __data 时先渲染 shell，__data 到达后同函数二次执行以 patch 数据与 head。
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
  /** View 整页水合错位策略（由 render.hydration.mismatchMode 注入；仅 continue|assert 走 hydrate） */
  __DWEB_MISMATCH_MODE__?: "continue" | "assert" | "remount";
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
/** 客户端导航 __data 请求代数：快速连点时丢弃过期 __data 响应，避免旧页数据覆盖新页 */
let _DWEB_NAV_DATA_SEQ = 0;
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
 * Hybrid/CSR 下各层 layout 的 load() 返回值由服务端与 /__data 打成「props.data = load 返回值」（见 load-data-middleware），
 * 故须同时读取顶层与 data 内嵌字段，否则 uiLocale 等永远在 canonical 里为 null，renderCurrentRoute 会与 hydrate 快照误判为相同而短路。
 * 勿在本注释内使用反引号，否则会打断外层模板字符串。
 */
function _canonicalLayoutPropsForViewState(p: Record<string, unknown> | undefined): string {
  const src = p ?? {};
  const rawNested = src["data"];
  const nested =
    rawNested != null && typeof rawNested === "object" && !Array.isArray(rawNested)
      ? (rawNested as Record<string, unknown>)
      : {};
  try {
    return _stableJsonForViewState({
      pathname: src["pathname"] ?? nested["pathname"] ?? null,
      themeMode: src["themeMode"] ?? nested["themeMode"] ?? null,
      uiLocale: src["uiLocale"] ?? nested["uiLocale"] ?? null,
      user: src["user"] ?? nested["user"] ?? null,
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
    const mismatchMode = _win.__DWEB_MISMATCH_MODE__;
    const reuseDom = isHydrateMode && (mismatchMode === "continue" || mismatchMode === "assert");
    const host = el as HTMLElement;
    const rootFn = () => {
      return () => {
        const s = getViewState();
        if (_win.__DWEB_DEBUG__) console.log("[dweb:view] root effect", { hasPage: !!s.page, layoutsLen: s.layouts?.length ?? 0, skipLayouts: s.skipLayouts });
        return buildViewTree(_viewPageContent, { getViewState }, s.layouts, s.skipLayouts);
      };
    };
    let dispose: () => void;
    if (reuseDom) {
      // continue|assert：复用 SSR DOM；未设/remount 仍清空再 mount（默认最安全）
      if (_win.__DWEB_DEBUG__) console.log("[dweb:view] _viewEnsureReactiveRoot: hydrate #" + containerId, mismatchMode);
      dispose = hydrate(rootFn, host, { mismatchMode });
    } else {
      // CSR 时 #app 内已有 Loading；Hybrid/SSR/SSG 默认亦清空再挂，避免双屏
      if (_win.__DWEB_DEBUG__) console.log("[dweb:view] _viewEnsureReactiveRoot: clearing #" + containerId + (isHydrateMode ? " (mount mode)" : " (csr, replace loading shell)"));
      if (typeof host.replaceChildren === "function") host.replaceChildren(); else host.innerHTML = "";
      dispose = mount(rootFn, host);
    }
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
      ${deferredNavLoadModuleSnippet}
      if (!module) { unmountPrevious(); renderNotFound(containerId); return; }
      const PageComponent = module.default ?? module.Page;
      if (!PageComponent) { unmountPrevious(); renderNotFound(containerId); return; }
      const skipLayouts = module.inheritLayout === false;
      /**
       * 两阶段导航渲染：首帧只带 params/query（不阻塞等 __data）；__data 返回后 patch head 并二次渲染。
       * @param _props 当前导航 props（含 __data 的 data/layoutData/metadata）
       * @param _withHead 是否在渲染前写入 document.head（首帧跳过，避免无 SEO 数据时清掉 title）
       */
      const _renderNavPage = async (_props: _NavProps, _withHead: boolean): Promise<void> => {
        _navProps = _props;
        if (_withHead) {
      ${applyRouteMetadataHeadSnippet}
        }
      ${onRouteChangeRenderSnippet}
      };
      if (_reservedOrInvalid) {
        await _renderNavPage(_navProps, false);
        return;
      }
      /** 阶段 1：路由 chunk 就绪即切换页面，router.navigate 不再等待 __data */
      await _renderNavPage(_navProps, false);
      /** 阶段 2：后台拉 __data；快速连点时用 nav seq 丢弃过期响应 */
      const _navSeqCapture = _navSeq;
      void (async (): Promise<void> => {
        try {
      ${deferredNavFetchDataSnippet}
          if (_navSeqCapture !== _DWEB_NAV_DATA_SEQ) return;
          await _renderNavPage(_fullNavProps, true);
        } catch (_navDataErr) {
          if (_navSeqCapture !== _DWEB_NAV_DATA_SEQ) return;
          if (_win.__DWEB_DEBUG__) console.warn("[dweb] deferred __data fetch failed:", _navDataErr);
        }
      })();
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
