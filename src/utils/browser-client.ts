/// <reference lib="dom" />
/**
 * 客户端脚本
 * 在浏览器中运行的客户端渲染和路由代码
 */

interface ClientConfig {
  route: string;
  renderMode: "ssr" | "csr" | "hybrid";
  props: Record<string, unknown>;
  shouldHydrate: boolean;
  layoutPath: string | null;
  allLayoutPaths: string[] | null;
  basePath: string;
  metadata: any;
  layout: boolean | undefined;
  prefetchRoutes?: string[];
  prefetchLoading?: boolean;
  prefetchMode?: "single" | "batch";
}

class PrefetchRouters {
  private config: any;
  private routes: string[] = [];
  private hasPrefetch = false;
  private loadElement: HTMLElement | null = null;
  private prefetchLoading = false;
  private prefetchMode: "single" | "batch" = "batch";

  constructor(config: any) {
    this.config = config;
    this.routes = config.prefetchRoutes || [];
    this.prefetchLoading = config.prefetchLoading || false;
    this.prefetchMode = config.prefetchMode || "batch";
    this.hasPrefetch = this.routes && Array.isArray(this.routes) &&
      this.routes.length > 0;
  }

  init() {
    if (this.hasPrefetch) {
      const showLoading = this.prefetchLoading === true;
      if (showLoading) {
        this.loadElement = createPrefetchLoadElement();
        document.body.appendChild(this.loadElement);
      }
    }
  }

  prefetch() {
    // 预加载配置的路由（如果配置了）
    if (!this.hasPrefetch) {
      return;
    }

    if (this.prefetchMode === "single") {
      // 逐个请求模式：延迟预加载，避免影响首屏加载
      setTimeout(() => {
        const prefetchFn = (globalThis as any).__prefetchPageData;
        if (typeof prefetchFn === "function") {
          const basePath = this.config.basePath || "/";
          const routes = this.routes; // 已经检查过不为空

          // 并发预加载所有路由（使用 Promise.allSettled 确保所有请求都能完成）
          const prefetchPromises = routes.map((route: string) => {
            // 处理 basePath
            let fullRoute = route;
            if (basePath !== "/" && !route.startsWith(basePath)) {
              const base = basePath.endsWith("/")
                ? basePath.slice(0, -1)
                : basePath;
              fullRoute = base + (route.startsWith("/") ? route : "/" + route);
            }
            // 异步预加载，不阻塞
            return prefetchFn(fullRoute).catch(() => {
              // 预加载失败时静默处理
            });
          });

          // 等待所有预加载完成（不阻塞，后台执行）
          Promise.allSettled(prefetchPromises).then(() => {
            // 预加载完成后移除加载状态
            if (this.loadElement && this.loadElement.parentNode) {
              this.loadElement.parentNode.removeChild(this.loadElement);
            }
          }).catch(() => {
            // 即使出错也要移除加载状态
            if (this.loadElement && this.loadElement.parentNode) {
              this.loadElement.parentNode.removeChild(this.loadElement);
            }
          });
        }
      }, 1000); // 1秒后开始预加载
    } else if (this.prefetchMode === "batch") {
      // 批量请求模式：发送一次请求，服务端打包返回所有路由数据
      setTimeout(async () => {
        try {
          const basePath = this.config.basePath || "/";

          // 构建批量预加载请求 URL
          const batchUrl = basePath === "/"
            ? "/__prefetch/batch"
            : `${basePath}/__prefetch/batch`;

          // 发送批量请求（GET 请求）
          const response = await fetch(batchUrl, {
            method: "GET",
          });

          if (!response.ok) {
            throw new Error(`批量预加载请求失败: ${response.status}`);
          }

          // 解析返回的打包数据（路由、组件代码和页面数据的数组）
          const batchData = await response.json() as Array<{
            route: string;
            body: string;
            pageData: Record<string, unknown>;
            layouts?: Record<string, string>; // 布局组件代码映射（key: 布局路径, value: 布局代码）
          }>;

          // 处理返回的数据，缓存页面数据并执行组件代码（参考 single 模式）
          if (batchData && Array.isArray(batchData)) {
            const prefetchPromises: Promise<void>[] = [];
            const pageDataCache = (globalThis as any).__pageDataCache;
            const basePath = this.config.basePath || "/";

            for (const item of batchData) {
              if (item && item.route && item.body && item.pageData) {
                // 规范化路径（与 navigateTo 中的逻辑一致）
                let normalizedRoute = item.route;
                if (basePath !== "/") {
                  const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
                  if (!normalizedRoute.startsWith(base) && normalizedRoute.startsWith("/")) {
                    normalizedRoute = base + normalizedRoute;
                  }
                }

                // 缓存页面数据（使用规范化后的路径作为 key，与 loadPageData 中的逻辑一致）
                if (pageDataCache && typeof pageDataCache.set === "function") {
                  pageDataCache.set(normalizedRoute, item.pageData);
                }

                // 使用 __prefetchPageData 的逻辑来处理预加载
                // 但由于 pageData 已经缓存，__prefetchPageData 会直接返回
                // 所以我们需要手动执行预加载逻辑
                const prefetchPromise = (async () => {
                  try {
                    const pageData = item.pageData;

                    // 1. 预加载页面组件模块（使用 Data URL，避免 Blob URL 和 HTTP 请求）
                    if (pageData?.route && typeof pageData.route === "string") {
                      try {
                        // 使用 Data URL 来执行组件代码（不会在 Network 面板显示）
                        const dataUrl = `data:application/javascript;charset=utf-8,${encodeURIComponent(item.body)}`;
                        const module = await import(dataUrl);
                        
                        // 验证模块是否有效
                        if (!module || typeof module !== "object") {
                          throw new Error("模块导入返回无效值");
                        }
                        if (!module.default) {
                          throw new Error("模块未导出默认组件");
                        }
                        
                        // 将模块缓存到实际的 HTTP URL（这样 navigateTo 时可以直接使用）
                        const moduleCache = (globalThis as any).__moduleCache;
                        if (moduleCache && typeof moduleCache.set === "function") {
                          moduleCache.set(pageData.route, module);
                        }
                      } catch (_importError) {
                        // 组件导入失败时静默处理
                      }
                    }

                    // 2. 预加载布局组件模块（使用服务端返回的布局代码）
                    const moduleCache = (globalThis as any).__moduleCache;
                    if (item.layouts && typeof item.layouts === "object") {
                      // 并行预加载所有布局组件
                      const layoutPromises = Object.entries(item.layouts).map(
                        async ([layoutPath, layoutCode]: [string, string]) => {
                          try {
                            // 使用 Data URL 来执行布局组件代码（不会在 Network 面板显示）
                            const dataUrl = `data:application/javascript;charset=utf-8,${encodeURIComponent(layoutCode)}`;
                            const layoutModule = await import(dataUrl);
                            
                            // 验证模块是否有效
                            if (!layoutModule || typeof layoutModule !== "object") {
                              throw new Error("布局模块导入返回无效值");
                            }
                            
                            // 缓存布局模块，避免重复导入（使用原始路径作为 key，与 loadLayoutComponents 一致）
                            if (moduleCache && typeof moduleCache.set === "function") {
                              moduleCache.set(layoutPath, layoutModule);
                            }
                          } catch (_layoutError) {
                            // 布局导入失败时静默处理
                          }
                        },
                      );
                      await Promise.all(layoutPromises);
                    }
                  } catch (_e) {
                    // 预取失败时静默处理（不影响正常导航）
                  }
                })();

                prefetchPromises.push(prefetchPromise);
              }
            }

            // 等待所有预加载完成（类似 single 模式中的 Promise.allSettled）
            await Promise.allSettled(prefetchPromises);
          }

          // 预加载完成后移除加载状态
          if (this.loadElement && this.loadElement.parentNode) {
            this.loadElement.parentNode.removeChild(this.loadElement);
          }
        } catch (_error) {
          // 批量预加载失败时静默处理，移除加载状态
          if (this.loadElement && this.loadElement.parentNode) {
            this.loadElement.parentNode.removeChild(this.loadElement);
          }
        }
      }, 1000); // 1秒后开始预加载
    }
  }
}

/**
 * 创建预加载全屏加载状态元素
 */
function createPrefetchLoadElement(): HTMLElement {
  const loadElement = document.createElement("div");
  loadElement.id = "__dweb_prefetch_load__";
  loadElement.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    backdrop-filter: blur(4px);
  `;

  const spinner = document.createElement("div");
  spinner.style.cssText = `
    width: 48px;
    height: 48px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  `;

  // 添加旋转动画
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  loadElement.appendChild(spinner);
  return loadElement;
}

/**
 * 链接工具函数：检查链接是否应该被拦截/预取
 */
function isValidInternalLink(link: HTMLAnchorElement): string | null {
  const href = link.getAttribute("href");

  // 排除特殊链接
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:") ||
    link.hasAttribute("download") ||
    (link.target && link.target !== "_self")
  ) {
    return null;
  }

  // 解析 URL 并检查是否同源
  try {
    const url = new URL(href, globalThis.location.href);
    if (url.origin !== globalThis.location.origin) {
      return null; // 外链
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return null; // URL 解析失败
  }
}

/**
 * 初始化链接拦截器（CSR/Hybrid 模式）
 * 这个函数会被编译为内联脚本立即执行
 */
function initLinkInterceptor(): void {
  if ((globalThis as any).__CSR_LINK_INTERCEPTOR_INITIALIZED__) return;
  (globalThis as any).__CSR_LINK_INTERCEPTOR_INITIALIZED__ = true;

  let navigateToFunc: ((path: string, replace?: boolean) => void) | null = null;

  /**
   * 处理链接点击事件
   */
  const clickHandler = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const link = target?.closest?.("a");

    if (!link || !(link instanceof HTMLAnchorElement)) return;

    const fullPath = isValidInternalLink(link);
    if (!fullPath) return; // 不是有效的站内链接

    // 阻止默认行为并停止事件传播
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    // 执行导航
    if (navigateToFunc) {
      navigateToFunc(fullPath);
    } else {
      // 等待导航函数准备好（最多等待 5 秒）
      let retryCount = 0;
      const maxRetries = 50;
      const retryInterval = 100;

      const checkAndNavigate = () => {
        if (navigateToFunc) {
          navigateToFunc(fullPath);
        } else if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkAndNavigate, retryInterval);
        }
      };

      checkAndNavigate();
    }
  };

  /**
   * 处理浏览器前进/后退
   */
  const popstateHandler = (e: PopStateEvent) => {
    if (navigateToFunc) {
      navigateToFunc(
        (e.state?.path as string) || globalThis.location.pathname,
        true,
      );
    }
  };

  // 注册事件监听器
  globalThis.addEventListener("click", clickHandler as EventListener, {
    capture: true,
    passive: false,
  });

  globalThis.addEventListener("popstate", popstateHandler);

  // 暴露设置导航函数的接口
  (globalThis as any).__setCSRNavigateFunction = function (
    fn: (path: string, replace?: boolean) => void,
  ) {
    navigateToFunc = fn;
  };
}

// 暴露到全局，供内联脚本调用
if (typeof globalThis !== "undefined") {
  (globalThis as any).initLinkInterceptor = initLinkInterceptor;
}

/**
 * 辅助函数：加载布局组件
 */
async function loadLayoutComponents(pageData: any): Promise<any[]> {
  const LayoutComponents: any[] = [];

  // 检查页面是否禁用了布局
  if (pageData.layout === false) {
    // 如果页面禁用了布局，直接返回空数组
    return LayoutComponents;
  }

  if (
    pageData.allLayoutPaths && Array.isArray(pageData.allLayoutPaths) &&
    pageData.allLayoutPaths.length > 0
  ) {
    // 加载所有布局组件（从最具体到最通用）
    // 如果某个布局设置了 layout = false，则停止继承
    const moduleCache = (globalThis as any).__moduleCache;
    for (const layoutPath of pageData.allLayoutPaths) {
      try {
        // 先检查模块缓存
        let layoutModule: any;
        if (moduleCache && typeof moduleCache.get === "function") {
          layoutModule = moduleCache.get(layoutPath);
        }

        // 如果缓存中没有，则动态导入
        if (!layoutModule) {
          layoutModule = await import(layoutPath);
          // 缓存布局模块，避免重复导入
          if (moduleCache && typeof moduleCache.set === "function") {
            moduleCache.set(layoutPath, layoutModule);
          }
        }

        const LayoutComponent = layoutModule?.default;
        if (LayoutComponent && typeof LayoutComponent === "function") {
          LayoutComponents.push(LayoutComponent);

          // 检查是否设置了 layout = false（禁用继承）
          // 如果设置了 layout = false，则停止继承，不再加载后续的布局
          if (layoutModule.layout === false) {
            break;
          }
        }
      } catch (layoutError) {
        console.warn(
          "[Layout] 布局加载失败，跳过该布局:",
          layoutPath,
          layoutError,
        );
      }
    }
  } else if (
    pageData.layoutPath && pageData.layoutPath !== "null" &&
    typeof pageData.layoutPath === "string"
  ) {
    // 向后兼容：如果只有单个布局路径
    const moduleCache = (globalThis as any).__moduleCache;
    try {
      // 先检查模块缓存
      let layoutModule: any;
      if (moduleCache && typeof moduleCache.get === "function") {
        layoutModule = moduleCache.get(pageData.layoutPath);
      }

      // 如果缓存中没有，则动态导入
      if (!layoutModule) {
        layoutModule = await import(pageData.layoutPath);
        // 缓存布局模块，避免重复导入
        if (moduleCache && typeof moduleCache.set === "function") {
          moduleCache.set(pageData.layoutPath, layoutModule);
        }
      }

      const LayoutComponent = layoutModule?.default;
      if (LayoutComponent && typeof LayoutComponent === "function") {
        LayoutComponents.push(LayoutComponent);
      }
    } catch (layoutError) {
      console.warn("[Layout] 布局加载失败:", pageData.layoutPath, layoutError);
    }
  }
  return LayoutComponents;
}

/**
 * 辅助函数：创建页面元素（支持异步组件）
 */
async function createPageElement(
  PageComponent: any,
  props: any,
  jsxFunc: any,
): Promise<any> {
  let pageElement: any;
  try {
    // 先尝试直接调用组件（支持异步组件）
    const componentResult = PageComponent(props);
    // 如果返回 Promise，等待它
    if (componentResult instanceof Promise) {
      pageElement = await componentResult;
    } else {
      // 同步组件返回 JSX，但可能需要用 jsx 包装
      // 如果已经是有效的 Preact 元素，直接使用；否则用 jsx 包装
      pageElement = componentResult;
    }
  } catch (callError) {
    // 如果直接调用失败，尝试用 jsx 函数调用（同步组件）
    console.warn(
      "[createPageElement] 直接调用组件失败，尝试使用 jsx 函数:",
      callError,
    );
    pageElement = jsxFunc(PageComponent, props);
    if (pageElement instanceof Promise) {
      pageElement = await pageElement;
    }
  }
  if (!pageElement) {
    throw new Error("页面元素创建失败（返回 null）");
  }
  return pageElement;
}

/**
 * 辅助函数：嵌套布局组件（支持异步布局组件和布局继承）
 */
async function nestLayoutComponents(
  LayoutComponents: any[],
  pageElement: any,
  jsxFunc: any,
): Promise<any> {
  if (LayoutComponents.length === 0) {
    return pageElement;
  }

  // 从最内层到最外层嵌套布局组件
  let currentElement = pageElement;
  for (const LayoutComponent of LayoutComponents) {
    try {
      // 先尝试直接调用布局组件（支持异步组件）
      const layoutResult = LayoutComponent({ children: currentElement });
      // 如果布局组件返回 Promise，等待它
      if (layoutResult instanceof Promise) {
        currentElement = await layoutResult;
      } else {
        currentElement = layoutResult;
      }
    } catch (layoutError) {
      // 如果直接调用失败，尝试用 jsx 函数调用（同步组件）
      console.warn(
        "[nestLayoutComponents] 直接调用布局组件失败，尝试使用 jsx 函数:",
        layoutError,
      );
      try {
        const layoutResult = jsxFunc(LayoutComponent, {
          children: currentElement,
        });
        if (layoutResult instanceof Promise) {
          currentElement = await layoutResult;
        } else {
          currentElement = layoutResult;
        }
      } catch (jsxError) {
        // 如果都失败，跳过该布局，继续使用当前元素
        console.error(
          "[nestLayoutComponents] 布局组件渲染失败，跳过该布局:",
          jsxError,
        );
      }
    }
  }
  return currentElement;
}

/**
 * 辅助函数：创建最终元素（页面元素 + 布局嵌套）
 */
async function createFinalElement(
  PageComponent: any,
  LayoutComponents: any[],
  props: any,
  jsxFunc: any,
): Promise<any> {
  // 创建页面元素
  const pageElement = await createPageElement(PageComponent, props, jsxFunc);

  // 嵌套布局组件
  let finalElement = await nestLayoutComponents(
    LayoutComponents,
    pageElement,
    jsxFunc,
  );

  // 如果最终元素为空，使用页面元素作为后备
  if (!finalElement) {
    finalElement = pageElement;
  }

  // 如果页面元素也为空，才抛出错误
  if (!finalElement) {
    throw new Error("最终元素创建失败（返回 null）");
  }

  return finalElement;
}

/**
 * CSR 客户端路由导航初始化函数
 * 不使用 preact-router，使用自定义的路由导航逻辑
 */
async function initClientSideNavigation(
  _render: any,
  _jsx: any,
): Promise<void> {
  if ((globalThis as any).__CSR_ROUTER_INITIALIZED__) {
    return;
  }
  (globalThis as any).__CSR_ROUTER_INITIALIZED__ = true;

  // 确保使用全局的 Preact 模块（与初始渲染使用相同的实例）
  // 等待全局模块加载完成
  let modules = (globalThis as any).__PREACT_MODULES__;
  if (!modules) {
    let waitCount = 0;
    while (!modules && waitCount < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      waitCount++;
      modules = (globalThis as any).__PREACT_MODULES__;
    }
  }

  // 必须使用全局模块，确保与初始渲染使用相同的 Preact 实例
  if (!modules) {
    throw new Error("Preact 模块未加载");
  }

  const { render: renderFunc, jsx: jsxFunc } = modules;

  if (typeof renderFunc !== "function" || typeof jsxFunc !== "function") {
    throw new Error("render 或 jsx 函数无效");
  }

  // 更新 SEO meta 标签（客户端导航时使用）
  // 注意：这个函数在 navigateTo 中直接调用 updateMetaTagsFromPageData，所以这里不需要单独定义

  // 页面数据缓存（避免重复请求相同页面）
  const pageDataCache = new Map<string, any>();

  // 模块缓存（避免重复导入相同模块）
  const moduleCache = new Map<string, any>();

  // 暴露到全局，供 PrefetchRouters 类使用
  (globalThis as any).__pageDataCache = pageDataCache;
  (globalThis as any).__moduleCache = moduleCache;

  // 提取并更新 i18n 数据（从 HTML 中提取 window.__I18N_DATA__）
  function extractAndUpdateI18nData(html: string): void {
    try {
      // 查找包含 __I18N_DATA__ 的 script 标签（非模块脚本，通常在 head 中）
      const scriptTagRegex =
        /<script[^>]*>[\s\S]*?window\.__I18N_DATA__[\s\S]*?<\/script>/i;
      const i18nScriptMatch = html.match(scriptTagRegex);
      if (i18nScriptMatch) {
        const scriptContent = i18nScriptMatch[0];

        // 提取 window.__I18N_DATA__ 对象
        const dataRegex = /window\.__I18N_DATA__\s*=\s*(\{[\s\S]*?\});/;
        const dataMatch = scriptContent.match(dataRegex);
        if (dataMatch) {
          try {
            // 使用 Function 解析对象（避免 eval）
            const i18nData = new Function("return " + dataMatch[1])();

            // 更新全局 i18n 数据
            if (i18nData && typeof i18nData === "object") {
              (globalThis as any).__I18N_DATA__ = i18nData;

              // 更新全局翻译函数（确保 this 绑定正确）
              if (i18nData.t && typeof i18nData.t === "function") {
                (globalThis as any).$t = function (
                  key: string,
                  params?: Record<string, string>,
                ): string {
                  if (
                    !(globalThis as any).__I18N_DATA__ ||
                    !(globalThis as any).__I18N_DATA__.t
                  ) {
                    return key;
                  }
                  return (globalThis as any).__I18N_DATA__.t.call(
                    (globalThis as any).__I18N_DATA__,
                    key,
                    params,
                  );
                };
              }
            }
          } catch (e) {
            // 解析失败，静默处理（可能 i18n 数据格式不正确）
            console.warn("[extractAndUpdateI18nData] i18n 数据解析失败:", e);
          }
        }
      }
    } catch (e) {
      // 提取失败，静默处理（可能没有 i18n 数据）
      console.warn("[extractAndUpdateI18nData] 提取 i18n 数据失败:", e);
    }

    // 确保 $t 函数始终可用（即使没有 i18n 数据）
    if (typeof (globalThis as any).$t !== "function") {
      (globalThis as any).$t = function (
        key: string,
        _params?: Record<string, string>,
      ): string {
        return key;
      };
    }
  }

  // 加载页面数据（从 JSON script 标签读取）
  async function loadPageData(pathname: string): Promise<any> {
    try {
      // 如果是当前页面，直接返回已有的数据
      if (
        pathname === globalThis.location.pathname &&
        (globalThis as any).__PAGE_DATA__
      ) {
        return (globalThis as any).__PAGE_DATA__;
      }

      // 检查缓存
      if (pageDataCache.has(pathname)) {
        return pageDataCache.get(pathname);
      }

      // 获取目标页面的 HTML
      const response = await fetch(pathname, {
        headers: { "Accept": "text/html" },
      });
      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

			const html = await response.text();
			
      // 提取并更新 i18n 数据（在解析页面数据之前）
      extractAndUpdateI18nData(html);

      // 解析 HTML 并查找 JSON script 标签
      const doc = new DOMParser().parseFromString(html, "text/html");

      // 查找 data-type="dweb-page-data" 的 JSON script 标签
      const pageDataScript = doc.querySelector(
        'script[data-type="dweb-page-data"]',
      );

      if (!pageDataScript) {
        throw new Error("页面数据未找到");
      }

      // 使用新的 JSON script 标签方式（推荐）
      // 注意：JSON 后面可能有分号，需要去掉
      let pageDataJson = pageDataScript.textContent || "{}";
      // 去掉末尾的分号和空白字符
      pageDataJson = pageDataJson.trim().replace(/;+$/, "");

      let pageData: any;
      try {
        pageData = JSON.parse(pageDataJson);
      } catch (parseError: any) {
        console.error("[loadPageData] 解析页面数据 JSON 失败:", parseError);
        throw new Error(`解析页面数据 JSON 失败: ${parseError.message}`);
      }

      // 验证解析出的数据
      if (!pageData || typeof pageData !== "object") {
        throw new Error("页面数据格式无效");
      }

      // 存入缓存
      pageDataCache.set(pathname, pageData);

      return pageData;
    } catch (error: any) {
      console.error("[loadPageData] 加载页面数据失败:", error);
      throw error;
    }
  }

  // 加载并渲染路由
  async function navigateTo(path: string, replace = false): Promise<void> {
    // 获取 basePath（多应用模式使用）
    const basePath = (globalThis as any).__PAGE_DATA__?.basePath || "/";

    // 如果 basePath 不是根路径，确保路径以 basePath 开头
    let normalizedPath = path;
    if (basePath !== "/") {
      const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
      // 如果路径不是以 basePath 开头，且不是绝对路径（以 / 开头但不是 basePath），则加上 basePath
      if (!normalizedPath.startsWith(base) && normalizedPath.startsWith("/")) {
        normalizedPath = base + normalizedPath;
      }
    }

    try {
      // 加载页面数据
      const pageData = await loadPageData(normalizedPath);

      // 验证页面数据
      if (!pageData || typeof pageData !== "object") {
        throw new Error("页面数据格式无效");
      }

      // 检查 route 字段是否存在
      if (!pageData.route || typeof pageData.route !== "string") {
        throw new Error("页面数据缺少 route 字段，无法加载组件");
      }

      // 加载组件（先检查模块缓存）
      let pageModule: any;
      const moduleCache = (globalThis as any).__moduleCache;
      if (moduleCache && typeof moduleCache.get === "function") {
        pageModule = moduleCache.get(pageData.route);
        // 验证缓存的模块是否有效
        if (pageModule && (!pageModule.default || typeof pageModule.default !== "function")) {
          // 缓存的模块无效，清除缓存并重新导入
          console.warn(
            "[navigateTo] 缓存的模块无效，重新导入:",
            pageData.route,
          );
          moduleCache.delete(pageData.route);
          pageModule = null;
        }
      }

      // 如果缓存中没有或缓存无效，则动态导入
      if (!pageModule) {
        try {
          pageModule = await import(pageData.route);
          // 验证导入的模块是否有效
          if (!pageModule || typeof pageModule !== "object") {
            throw new Error("模块导入返回无效值");
          }
          if (!pageModule.default || typeof pageModule.default !== "function") {
            throw new Error("模块未导出默认组件或组件不是函数");
          }
          // 缓存模块，避免重复导入
          if (moduleCache && typeof moduleCache.set === "function") {
            moduleCache.set(pageData.route, pageModule);
          }
        } catch (importError: any) {
          console.error(
            "[navigateTo] 组件导入失败:",
            pageData.route,
            importError,
          );
          throw new Error(`组件导入失败: ${importError.message}`);
        }
      }

      const PageComponent = pageModule.default;

      // 加载所有布局组件（支持布局继承）
      const LayoutComponents = await loadLayoutComponents(pageData);

      // 获取页面 props 并添加 Store
      // pageData 的结构：{ route, renderMode, layoutPath, allLayoutPaths, props, ...loadData }
      // 其中 loadData 是 load 函数返回的数据（如 jsrPackageUrl），应该放在 props.data 中
      // props 中可能包含 params, query 等字段
      const excludeKeys = ["route", "renderMode", "layoutPath", "allLayoutPaths", "props"];
      const loadData: Record<string, unknown> = {};
      for (const key in pageData) {
        if (!excludeKeys.includes(key)) {
          loadData[key] = pageData[key];
        }
      }

      // 构建 pageProps，参考服务端的结构：{ params, query, data, ... }
      const pageProps = {
        params: (pageData.props as any)?.params || {},
        query: (pageData.props as any)?.query || {},
        data: loadData, // load 函数返回的数据（如 jsrPackageUrl）
        ...(pageData.props || {}), // 保留其他 props 字段（如 lang, metadata 等）
      };
      // 确保 data 字段存在（即使 loadData 为空）
      if (!pageProps.data) {
        pageProps.data = loadData;
      }
      if (typeof globalThis !== "undefined" && (globalThis as any).__STORE__) {
        pageProps.store = (globalThis as any).__STORE__;
      }

      // 创建最终元素（页面元素 + 布局嵌套）
      const finalElement = await createFinalElement(
        PageComponent,
        LayoutComponents,
        pageProps,
        jsxFunc,
      );

      // 渲染（与初始渲染使用完全相同的方式）
      const container = document.getElementById("root");
      if (!container) throw new Error("未找到容器");

      // 检查目标页面的渲染模式
      const targetMode = pageModule.renderMode || pageData.renderMode || "csr";

      // Preact 的 render 函数会自动处理内容替换，不需要先卸载
      // 直接渲染新内容，Preact 会进行差异更新，避免闪动
      try {
        // 使用 requestAnimationFrame 确保在下一帧渲染，优化性能
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // 根据目标页面的渲染模式决定使用 render 还是 hydrate
        if (targetMode === "hybrid") {
          // Hybrid 模式：尝试 hydration，如果失败则使用 render
          try {
            const { hydrate } = (globalThis as any).__PREACT_MODULES__ || {};
            if (hydrate && typeof hydrate === "function") {
              hydrate(finalElement, container);
            } else {
              renderFunc(finalElement, container);
            }
          } catch (hydrateError) {
            // hydration 失败，使用 render
            console.warn(
              "[navigateTo] hydration 失败，回退到 render:",
              hydrateError,
            );
            renderFunc(finalElement, container);
          }
        } else {
          // CSR 模式：直接使用 render
          // Preact 的 render 会自动处理内容替换，无需先卸载
          renderFunc(finalElement, container);
        }
      } catch (renderError) {
        console.error("[navigateTo] render 失败:", renderError);
        throw renderError;
      }

      // 等待一下，让 Preact 完成 DOM 更新
      // 使用 requestAnimationFrame 确保 DOM 更新完成
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // 检查渲染结果
      let hasContent = container.children.length > 0 ||
        container.textContent.trim() !== "";

      // 如果渲染成功，立即更新历史记录（在验证之前更新，确保 URL 变化）
      if (hasContent) {
        // 更新历史记录（在渲染成功后立即更新，确保 URL 变化）
        // 使用 normalizedPath 而不是原始 path，确保 URL 正确
        if (replace) {
          globalThis.history.replaceState(
            { path: normalizedPath },
            "",
            normalizedPath,
          );
        } else {
          globalThis.history.pushState(
            { path: normalizedPath },
            "",
            normalizedPath,
          );
        }

        // 触发自定义事件，通知 Navbar 等组件路径已变化
        try {
          globalThis.dispatchEvent(
            new CustomEvent("routechange", {
              detail: { path: normalizedPath },
            }),
          );
          // 注意：不要手动触发 popstate 事件，这会导致循环
          // popstate 事件应该只在浏览器前进/后退时由浏览器自动触发
        } catch (e) {
          // 静默处理事件触发错误
          console.warn("[navigateTo] 触发 routechange 事件失败:", e);
        }
      }

      // 如果容器为空，尝试重新渲染
      if (!hasContent) {
        // 重新从全局模块获取（确保使用最新的）
        const { render: renderRetry, jsx: jsxRetry } =
          (globalThis as any).__PREACT_MODULES__;

        // 获取页面 props 并添加 Store
        const pagePropsRetry = { ...(pageData.props || {}) };
        if (
          typeof globalThis !== "undefined" && (globalThis as any).__STORE__
        ) {
          pagePropsRetry.store = (globalThis as any).__STORE__;
        }

        // 重新创建最终元素（使用辅助函数）
        const finalElementRetry = await createFinalElement(
          PageComponent,
          LayoutComponents,
          pagePropsRetry,
          jsxRetry,
        );

        // 直接重新渲染，Preact 会自动处理内容替换
        // 使用 requestAnimationFrame 确保在下一帧渲染
        await new Promise((resolve) => requestAnimationFrame(resolve));
        renderRetry(finalElementRetry, container);

        // 再次检查
        if (
          container.children.length > 0 || container.textContent.trim() !== ""
        ) {
          hasContent = true;
          // 如果重新渲染成功，更新历史记录
          if (!replace) {
            // 只有在非 replace 模式下才更新（replace 模式已经在上面更新过了）
            globalThis.history.pushState(
              { path: normalizedPath },
              "",
              normalizedPath,
            );
          }
        }
      }

      // 验证渲染结果
      if (!hasContent) {
        throw new Error("渲染后容器为空");
      }

      // 更新 SEO meta 标签（如果页面数据包含 metadata）
      if (
        typeof (globalThis as any).updateMetaTagsFromPageData === "function"
      ) {
        (globalThis as any).updateMetaTagsFromPageData(pageData);
      }
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[navigateTo] 导航失败:", errorMsg, error);

      // 如果是 404 或网络错误，回退到页面刷新
      if (
        errorMsg.includes("404") || errorMsg.includes("Not Found") ||
        errorMsg.includes("fetch") || errorMsg.includes("请求失败")
      ) {
        try {
          globalThis.location.href = normalizedPath;
        } catch (e) {
          // 如果无法跳转，静默失败
          console.warn("[navigateTo] 页面跳转失败:", e);
        }
      } else {
        // 其他错误（如组件加载失败、渲染失败等），先尝试在控制台显示错误
        // 只有在严重错误时才回退到页面刷新
        // 对于布局相关的错误，不应该回退到页面刷新，因为布局继承是新增功能
        if (errorMsg.includes("布局组件渲染失败")) {
          // 布局渲染失败不应该导致页面刷新，因为我们已经跳过了失败的布局
          // 这种情况不应该发生，但如果发生了，至少页面已经渲染了
        } else {
          // 其他严重错误才回退到页面刷新
          try {
            globalThis.location.href = normalizedPath;
          } catch (e) {
            // 如果无法跳转，静默失败
            console.warn("[navigateTo] 页面跳转失败:", e);
          }
        }
      }
    }
  }

  // 暴露导航函数给链接拦截器
  if (typeof (globalThis as any).__setCSRNavigateFunction === "function") {
    (globalThis as any).__setCSRNavigateFunction(navigateTo);
  }

  // 暴露预取函数给链接拦截器（用于鼠标悬停预取）
  (globalThis as any).__prefetchPageData = async function (
    pathname: string,
  ): Promise<void> {
    try {
      // 如果已经在缓存中，不需要预取
      if (pageDataCache.has(pathname)) {
        return;
      }

      // 如果是当前页面，不需要预取
      if (
        pathname === globalThis.location.pathname &&
        (globalThis as any).__PAGE_DATA__
      ) {
        return;
      }

      // 1. 加载页面数据（获取 route 和布局信息）
      const pageData = await loadPageData(pathname);

      // 2. 预加载页面组件模块
      if (pageData?.route && typeof pageData.route === "string") {
        try {
          await import(pageData.route);
        } catch (_importError) {
          // 组件导入失败时静默处理
        }
      }

      // 3. 预加载布局组件模块（如果有）
      const moduleCache = (globalThis as any).__moduleCache;
      if (pageData?.allLayoutPaths && Array.isArray(pageData.allLayoutPaths)) {
        // 并行预加载所有布局组件
        const layoutPromises = pageData.allLayoutPaths.map(
          async (layoutPath: string) => {
            try {
              const layoutModule = await import(layoutPath);
              // 缓存布局模块，避免重复导入
              if (moduleCache && typeof moduleCache.set === "function") {
                moduleCache.set(layoutPath, layoutModule);
              }
            } catch (_layoutError) {
              // 布局导入失败时静默处理
            }
          },
        );
        await Promise.all(layoutPromises);
      } else if (
        pageData?.layoutPath && typeof pageData.layoutPath === "string" &&
        pageData.layoutPath !== "null"
      ) {
        // 向后兼容：单个布局路径
        try {
          const layoutModule = await import(pageData.layoutPath);
          // 缓存布局模块，避免重复导入
          if (moduleCache && typeof moduleCache.set === "function") {
            moduleCache.set(pageData.layoutPath, layoutModule);
          }
        } catch (_layoutError) {
          // 布局导入失败时静默处理
        }
      }
    } catch (_e) {
      // 预取失败时静默处理（不影响正常导航）
    }
  };
}

/**
 * 更新 SEO meta 标签的通用函数（全局函数，供客户端路由使用）
 */
function setupUpdateMetaTagsFunction(): void {
  (globalThis as any).updateMetaTagsFromPageData =
    function updateMetaTagsFromPageData(pageData: any): void {
      const metadata = pageData?.metadata ||
        (pageData && typeof pageData === "object" ? pageData : null);
      if (!metadata || typeof metadata !== "object") return;

      const escapeHtml = (text: string): string => {
        const map: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        };
        return String(text).replace(/[&<>"']/g, (m) => map[m]);
      };

      const updateOrCreateMeta = (
        attr: string,
        value: string,
        content: string,
      ): void => {
        let meta = document.querySelector(
          `meta[${attr}="${value}"]`,
        ) as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement("meta");
          meta.setAttribute(attr, value);
          document.head.appendChild(meta);
        }
        meta.setAttribute("content", escapeHtml(content));
      };

      // 更新 title
      if (metadata.title) {
        document.title = metadata.title;
        updateOrCreateMeta("property", "og:title", metadata.title);
        updateOrCreateMeta("name", "twitter:title", metadata.title);
      }

      // 更新 description
      if (metadata.description) {
        updateOrCreateMeta("name", "description", metadata.description);
        updateOrCreateMeta("property", "og:description", metadata.description);
        updateOrCreateMeta("name", "twitter:description", metadata.description);
      }

      // 更新 keywords
      if (metadata.keywords) {
        const keywordsStr = Array.isArray(metadata.keywords)
          ? metadata.keywords.join(", ")
          : metadata.keywords;
        updateOrCreateMeta("name", "keywords", keywordsStr);
      }

      // 更新 author
      if (metadata.author) {
        updateOrCreateMeta("name", "author", metadata.author);
      }

      // 更新 Open Graph image
      if (metadata.image) {
        updateOrCreateMeta("property", "og:image", metadata.image);
        updateOrCreateMeta("name", "twitter:image", metadata.image);
      }

      // 更新 canonical URL
      if (metadata.url) {
        let canonical = document.querySelector(
          'link[rel="canonical"]',
        ) as HTMLLinkElement;
        if (!canonical) {
          canonical = document.createElement("link");
          canonical.setAttribute("rel", "canonical");
          document.head.appendChild(canonical);
        }
        canonical.setAttribute("href", metadata.url);
      }

      // 更新 robots
      if (metadata.robots !== undefined) {
        if (metadata.robots === false) {
          updateOrCreateMeta("name", "robots", "noindex, nofollow");
        } else if (typeof metadata.robots === "object") {
          const directives: string[] = [];
          if (metadata.robots.index !== false) directives.push("index");
          else directives.push("noindex");
          if (metadata.robots.follow !== false) directives.push("follow");
          else directives.push("nofollow");
          if (metadata.robots.noarchive) directives.push("noarchive");
          if (metadata.robots.nosnippet) directives.push("nosnippet");
          if (metadata.robots.noimageindex) directives.push("noimageindex");
          updateOrCreateMeta("name", "robots", directives.join(", "));
        }
      }
    };
}

/**
 * 初始化 i18n 函数
 */
function initI18nFunction(): void {
  // 确保 i18n 函数在页面加载时可用
  // i18n 插件的脚本在 </head> 之前注入，所以这里应该已经存在 globalThis.__I18N_DATA__
  // 优先使用 globalThis.__I18N_DATA__ 来初始化 globalThis.$t
  if (
    (globalThis as any).__I18N_DATA__ && (globalThis as any).__I18N_DATA__.t &&
    typeof (globalThis as any).__I18N_DATA__.t === "function"
  ) {
    // 使用 i18n 插件的翻译函数（确保 this 绑定正确）
    (globalThis as any).$t = function (
      key: string,
      params?: Record<string, string>,
    ): string {
      if (
        !(globalThis as any).__I18N_DATA__ ||
        !(globalThis as any).__I18N_DATA__.t
      ) {
        return key;
      }
      return (globalThis as any).__I18N_DATA__.t.call(
        (globalThis as any).__I18N_DATA__,
        key,
        params,
      );
    };
  } else if (typeof (globalThis as any).$t !== "function") {
    // 如果 i18n 插件未启用或脚本未注入，使用默认函数
    (globalThis as any).$t = function (
      key: string,
      _params?: Record<string, string>,
    ): string {
      return key;
    };
  }
}

/**
 * 初始化客户端渲染
 */
async function initClientRender(config: ClientConfig): Promise<void> {
  try {
    // 等待 DOM 加载完成
    if (document.readyState === "loading") {
      await new Promise<void>((resolve) => {
        if (document.readyState === "complete") {
          resolve();
        } else {
          document.addEventListener("DOMContentLoaded", () => resolve());
        }
      });
    }

    const mode = config.renderMode;
    const shouldHydrate = config.shouldHydrate;

    // 如果是 SSR 模式且未启用 hydration，完全不执行任何操作
    if (mode === "ssr" && !shouldHydrate) {
      return;
    }

    // 获取 Preact 模块（优先使用预加载的，否则动态导入）
    let hydrate: any, render: any, jsx: any;

    // 如果 Preact 模块正在预加载，等待它完成（最多等待 3 秒）
    let modules = (globalThis as any).__PREACT_MODULES__;
    if (!modules) {
      let waitCount = 0;
      const maxWait = 30; // 最多等待 30 次（约 3 秒）
      while (!modules && waitCount < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        waitCount++;
        // 在循环内部重新检查，因为 __PREACT_MODULES__ 可能在等待期间被设置
        modules = (globalThis as any).__PREACT_MODULES__;
      }
    }
    if (modules) {
      // 使用预加载的 Preact 模块（避免重复导入）
      ({ hydrate, render, jsx } = modules);
    } else {
      // 如果预加载超时，动态导入 Preact 模块
      const [preactModule, jsxRuntimeModule] = await Promise.all([
        import("preact"),
        import("preact/jsx-runtime"),
      ]);
      hydrate = preactModule.hydrate;
      render = preactModule.render;
      jsx = jsxRuntimeModule.jsx;
    }

    // 查找容器元素（优先使用 #root，如果没有则使用 body）
    const container = document.getElementById("root");
    if (!container) {
      return;
    }

    // 检查容器是否有服务端渲染的内容
    const hasServerContent = container.children.length > 0 ||
      container.textContent.trim() !== "";

    // 动态导入页面组件（使用 HTTP URL）
    // 注意：在 CSR 模式下，先获取组件再清空容器，避免空白
    let module: any;
    try {
      module = await import(config.route);
    } catch (importError: any) {
      console.error(
        "[initClientRender] 页面组件导入失败:",
        config.route,
        importError,
      );
      throw new Error("页面组件导入失败: " + importError.message);
    }

    const PageComponent = module.default;

    if (!PageComponent || typeof PageComponent !== "function") {
      throw new Error("页面组件未导出默认组件或组件不是函数");
    }

    const actualMode = module.renderMode || mode;
    const actualShouldHydrate = module.hydrate === true || shouldHydrate;

    // 获取页面 props（从 __PAGE_DATA__ 中获取，避免直接插入 JSON）
    const pageProps = { ...((globalThis as any).__PAGE_DATA__?.props || {}) };

    // 添加 Store 到 props（如果 Store 插件已启用）
    if (typeof globalThis !== "undefined" && (globalThis as any).__STORE__) {
      pageProps.store = (globalThis as any).__STORE__;
    }

    // 加载所有布局组件（支持布局继承）
    const LayoutComponents = await loadLayoutComponents(
      (globalThis as any).__PAGE_DATA__,
    );

    // 创建最终元素（页面元素 + 布局嵌套）
    const finalElement = await createFinalElement(
      PageComponent,
      LayoutComponents,
      pageProps,
      jsx,
    );

    if (actualMode === "csr") {
      // 客户端渲染：完全在客户端渲染
      // 注意：如果容器有服务端渲染的内容，说明可能是 hybrid 模式被误判为 CSR
      // 或者服务端在 CSR 模式下也渲染了内容
      // 为了避免空白，我们检查容器内容：
      // - 如果容器有内容，说明可能是 hybrid，应该使用 hydrate 而不是 render
      // - 如果容器为空，说明是纯 CSR，直接 render
      if (hasServerContent) {
        // 容器有服务端内容，可能是 hybrid 模式，尝试 hydrate
        try {
          hydrate(finalElement, container);
        } catch (hydrateError) {
          // hydration 失败，使用 render（会清空容器）
          console.warn(
            "[initClientRender] hydration 失败，回退到 render:",
            hydrateError,
          );
          render(finalElement, container);
        }
      } else {
        // 容器为空，纯 CSR 模式，直接 render
        try {
          render(finalElement, container);
        } catch (renderError) {
          console.error("[initClientRender] render 失败:", renderError);
          throw renderError;
        }
      }

      // 更新 SEO meta 标签（初始加载时，CSR 模式）
      if (
        typeof (globalThis as any).updateMetaTagsFromPageData === "function"
      ) {
        (globalThis as any).updateMetaTagsFromPageData(
          (globalThis as any).__PAGE_DATA__,
        );
      }

      // CSR 模式：初始化客户端路由导航（SPA 无刷新切换）
      // 注意：在 CSR 模式下，初始渲染已经完成，preact-router 会重新渲染容器
      // 所以我们需要在 RouteComponent 中直接使用已加载的组件，而不是重新加载
      if (typeof initClientSideNavigation === "function") {
        // 将已加载的组件信息传递给路由导航，避免重复加载
        (globalThis as any).__CSR_INITIAL_PAGE_COMPONENT__ = PageComponent;
        (globalThis as any).__CSR_INITIAL_LAYOUT_COMPONENTS__ =
          LayoutComponents;
        await initClientSideNavigation(render, jsx);
      }
    } else if (actualMode === "hybrid" || actualShouldHydrate) {
      // Hybrid 模式或明确指定 hydrate=true：在客户端激活
      // 注意：hydrate 需要服务端和客户端的 HTML 结构完全匹配
      // 注意：组件和布局都已经加载完成，finalElement 已经创建，可以安全地进行 hydration
      // 检查容器是否有内容（服务端渲染的内容）
      if (hasServerContent) {
        // 容器有服务端内容，尝试 hydration
        // 由于组件和布局都已经准备好，hydration 应该能成功
        try {
          // 使用 hydrate 激活服务端渲染的内容
          hydrate(finalElement, container);
        } catch (hydrateError) {
          // 如果 hydration 失败，回退到 render（会清空容器，但此时组件已准备好）
          // 这样可以确保页面有内容，而不是空白
          console.warn(
            "[initClientRender] hydration 失败，回退到 render:",
            hydrateError,
          );
          render(finalElement, container);
        }
      } else {
        // 如果容器为空，说明服务端没有渲染内容，直接客户端渲染
        render(finalElement, container);
      }

      // 更新 SEO meta 标签（初始加载时，Hybrid 模式）
      // 即使服务端已经渲染了 meta 标签，客户端也需要更新以确保一致性
      if (
        typeof (globalThis as any).updateMetaTagsFromPageData === "function"
      ) {
        (globalThis as any).updateMetaTagsFromPageData(
          (globalThis as any).__PAGE_DATA__,
        );
      }

      // Hybrid 模式：初始化客户端路由导航（SPA 无刷新切换）
      if (typeof initClientSideNavigation === "function") {
        await initClientSideNavigation(render, jsx);
      }
    }
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[initClientRender] 客户端渲染失败:", errorMsg, error);

    // 在页面上显示错误信息（开发环境）
    const container = document.getElementById("root");
    if (container) {
      container.innerHTML = `
        <div style="padding: 20px; background: #fee; border: 2px solid #f00; margin: 20px;">
          <h2 style="color: #c00;">客户端渲染失败</h2>
          <p><strong>错误:</strong> ${error.message}</p>
          <pre style="background: #fff; padding: 10px; overflow: auto;">${
        error.stack || "无堆栈信息"
      }</pre>
        </div>
      `;
    }
  }
}

/**
 * 初始化客户端系统
 * 暴露到全局，供内联脚本调用
 */
function initClient(config: ClientConfig): void {
  // 初始化链接拦截器（CSR/Hybrid 模式需要）
  if (config.renderMode === "csr" || config.renderMode === "hybrid") {
    initLinkInterceptor();
  }

  // 初始化 i18n 函数
  initI18nFunction();

  // 设置页面数据
  (globalThis as any).__PAGE_DATA__ = {
    route: config.route,
    renderMode: config.renderMode,
    props: config.props,
    layoutPath: config.layoutPath,
    allLayoutPaths: config.allLayoutPaths,
    basePath: config.basePath,
    metadata: config.metadata,
    layout: config.layout,
  };

  // 设置更新 meta 标签的函数
  setupUpdateMetaTagsFunction();

  // 初始化预加载
  const prefetchRouters = new PrefetchRouters(config);
  prefetchRouters.init();

  // 初始化客户端渲染（链接拦截器会在导航函数准备好后自动初始化）
  initClientRender(config);

  // 执行预加载
  prefetchRouters.prefetch();
}

// 暴露到全局，供内联脚本调用
if (typeof globalThis !== "undefined") {
  (globalThis as any).initClient = initClient;
}
