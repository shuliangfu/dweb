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
  metadata: Record<string, unknown>;
  layout: boolean | undefined;
  prefetchRoutes?: string[];
  prefetchLoading?: boolean;
  prefetchMode?: "single" | "batch";
  layoutData?: Record<string, unknown>[]; // 布局的 load 数据
  [key: string]: unknown; // 允许动态属性（如 load 函数返回的数据）
}

/**
 * 预加载路由器类
 * 负责预加载路由数据，提高首屏加载性能
 */
class PrefetchRouters {
  private config: ClientConfig;
  private routes: string[] = [];
  private hasPrefetch = false;
  private loadElement: HTMLElement | null = null;
  private prefetchLoading = false;
  private prefetchMode: "single" | "batch" = "batch";

  constructor(config: ClientConfig) {
    this.config = config;
    this.routes = config.prefetchRoutes || [];
    this.prefetchLoading = config.prefetchLoading || false;
    this.prefetchMode = config.prefetchMode || "batch";
    this.hasPrefetch = this.routes && Array.isArray(this.routes) &&
      this.routes.length > 0;
  }

  /**
   * 创建预加载全屏加载状态元素
   */
  private createPrefetchLoadElement(): HTMLElement {
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

    loadElement.appendChild(spinner);
    return loadElement;
  }

  init() {
    if (this.hasPrefetch) {
      const showLoading = this.prefetchLoading === true;
      if (showLoading) {
        this.loadElement = this.createPrefetchLoadElement();
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
                // 注意：item.route 是路径名（如 /docs/xxx），不包含查询参数和哈希
                let normalizedRoute = item.route;
                if (basePath !== "/") {
                  const base = basePath.endsWith("/")
                    ? basePath.slice(0, -1)
                    : basePath;
                  if (
                    !normalizedRoute.startsWith(base) &&
                    normalizedRoute.startsWith("/")
                  ) {
                    normalizedRoute = base + normalizedRoute;
                  }
                }

                // 缓存页面数据（使用规范化后的路径作为 key，与 loadPageData 中的逻辑一致）
                // 注意：只使用路径名（pathname），不包含查询参数和哈希
                // 这样即使 navigateTo 时传入的路径包含查询参数和哈希，也能正确匹配缓存
                if (pageDataCache && typeof pageDataCache.set === "function") {
                  pageDataCache.set(normalizedRoute, item.pageData);
                }

                // 使用 __prefetchPageData 的逻辑来处理预加载
                // 但由于 pageData 已经缓存，__prefetchPageData 会直接返回
                // 所以我们需要手动执行预加载逻辑
                const prefetchPromise = (async () => {
                  try {
                    const pageData = item.pageData;

                    // 1. 预加载页面组件模块
                    if (pageData?.route && typeof pageData.route === "string") {
                      try {
                        // 在导入之前，将代码中的相对路径（如 ./chunk-xxx.js）替换为绝对路径
                        // 因为 Data URL 无法解析相对路径导入
                        let processedBody = item.body;
                        // 获取当前页面的 origin（协议 + 主机 + 端口）
                        const currentOrigin = globalThis.location.origin;
                        // 匹配 import ... from "./chunk-xxx.js"（只匹配 chunk 文件）
                        processedBody = processedBody.replace(
                          /from\s?["']\.\/chunk-([A-Z0-9]+\.js)["']|import\s?["']\.\/chunk-([A-Z0-9]+\.js)["']/gi,
                          (_match: string, fileName: string) => {
                            // 转换为绝对路径，使用当前页面的 origin
                            return `from "${currentOrigin}/__modules/chunk-${fileName}"`;
                          },
                        );

                        // 使用 Data URL 来执行组件代码（不会在 Network 面板显示）
                        const dataUrl =
                          `data:application/javascript;charset=utf-8,${
                            encodeURIComponent(processedBody)
                          }`;
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
                        if (
                          moduleCache && typeof moduleCache.set === "function"
                        ) {
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
                            // 因为 Data URL 无法解析相对路径导入
                            let processedCode = layoutCode;
                            // 获取当前页面的 origin（协议 + 主机 + 端口）
                            const currentOrigin = globalThis.location.origin;
                            processedCode = processedCode.replace(
                              // 查找 import 或 from 的相对路径导入
                              /from\s?["']\.\/chunk-([A-Z0-9]+\.js)["']|import\s?["']\.\/chunk-([A-Z0-9]+\.js)["']/gi,
                              (_match: string, fileName: string) => {
                                // 转换为绝对路径，使用当前页面的 origin
                                return `from "${currentOrigin}/__modules/chunk-${fileName}"`;
                              },
                            );

                            // 使用 Data URL 来执行布局组件代码（不会在 Network 面板显示）
                            const dataUrl =
                              `data:application/javascript;charset=utf-8,${
                                encodeURIComponent(processedCode)
                              }`;
                            const layoutModule = await import(dataUrl);
                            // 验证模块是否有效
                            if (
                              !layoutModule || typeof layoutModule !== "object"
                            ) {
                              throw new Error("布局模块导入返回无效值");
                            }

                            // 缓存布局模块，避免重复导入（使用原始路径作为 key，与 loadLayoutComponents 一致）
                            if (
                              moduleCache &&
                              typeof moduleCache.set === "function"
                            ) {
                              moduleCache.set(layoutPath, layoutModule);
                            }
                          } catch (_layoutError) {
                            // 布局导入失败时静默处理
                            console.warn(
                              "[Layout] 布局加载失败，跳过该布局:",
                              layoutPath,
                              _layoutError,
                            );
                          }
                        },
                      );
                      await Promise.all(layoutPromises);
                    }
                  } catch (_e) {
                    console.warn(
                      "[Batch Prefetch] 预取失败:",
                      _e,
                    );
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
 * 客户端渲染器类
 * 封装渲染相关逻辑，优化性能
 */
class ClientRenderer {
  private renderFunc: (element: unknown, container: HTMLElement) => void;
  private jsxFunc: (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => unknown;
  private hydrateFunc?: (element: unknown, container: HTMLElement) => void;
  private moduleCache: Map<string, unknown>;
  private container: HTMLElement | null = null;

  constructor(
    renderFunc: (element: unknown, container: HTMLElement) => void,
    jsxFunc: (
      type: unknown,
      props: Record<string, unknown> | null,
      ...children: unknown[]
    ) => unknown,
    moduleCache: Map<string, unknown>,
    hydrateFunc?: (element: unknown, container: HTMLElement) => void,
  ) {
    this.renderFunc = renderFunc;
    this.jsxFunc = jsxFunc;
    this.hydrateFunc = hydrateFunc;
    this.moduleCache = moduleCache;
    this.container = document.getElementById("root");
  }

  /**
   * 加载布局组件（优化：使用类属性缓存）
   */
  async loadLayoutComponents(pageData: ClientConfig): Promise<unknown[]> {
    const LayoutComponents: unknown[] = [];

    // 检查页面是否禁用了布局
    if (pageData.layout === false) {
      return LayoutComponents;
    }

    if (
      pageData.allLayoutPaths && Array.isArray(pageData.allLayoutPaths) &&
      pageData.allLayoutPaths.length > 0
    ) {
      // 加载所有布局组件（从最具体到最通用）
      for (const layoutPath of pageData.allLayoutPaths) {
        try {
          // 先检查模块缓存（直接访问类属性，更快）
          let layoutModule = this.moduleCache.get(layoutPath) as {
            default?: unknown;
            layout?: boolean;
          } | undefined;

          // 如果缓存中没有，则动态导入
          if (!layoutModule) {
            layoutModule = await import(layoutPath) as {
              default?: unknown;
              layout?: boolean;
            };
            // 缓存布局模块，避免重复导入
            this.moduleCache.set(layoutPath, layoutModule);
          }

          const LayoutComponent = layoutModule?.default;
          if (LayoutComponent && typeof LayoutComponent === "function") {
            LayoutComponents.push(LayoutComponent);

            // 检查是否设置了 layout = false（禁用继承）
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
      try {
        // 先检查模块缓存
        let layoutModule = this.moduleCache.get(pageData.layoutPath) as {
          default?: unknown;
        } | undefined;

        // 如果缓存中没有，则动态导入
        if (!layoutModule) {
          layoutModule = await import(pageData.layoutPath) as {
            default?: unknown;
          };
          // 缓存布局模块，避免重复导入
          this.moduleCache.set(pageData.layoutPath, layoutModule);
        }

        const LayoutComponent = layoutModule?.default;
        if (LayoutComponent && typeof LayoutComponent === "function") {
          LayoutComponents.push(LayoutComponent);
        }
      } catch (layoutError) {
        console.warn(
          "[Layout] 布局加载失败:",
          pageData.layoutPath,
          layoutError,
        );
      }
    }
    return LayoutComponents;
  }

  /**
   * 创建页面元素（支持异步组件）
   */
  private async createPageElement(
    PageComponent: unknown,
    props: Record<string, unknown>,
  ): Promise<unknown> {
    let pageElement: unknown;
    try {
      // 先尝试直接调用组件（支持异步组件）
      const componentResult =
        (PageComponent as (props: Record<string, unknown>) => unknown)(props);
      // 如果返回 Promise，等待它
      if (componentResult instanceof Promise) {
        pageElement = await componentResult;
      } else {
        pageElement = componentResult;
      }
    } catch (callError) {
      // 如果直接调用失败，尝试用 jsx 函数调用（同步组件）
      console.warn(
        "[createPageElement] 直接调用组件失败，尝试使用 jsx 函数:",
        callError,
      );
      pageElement = this.jsxFunc(PageComponent, props);
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
   * 嵌套布局组件（支持异步布局组件和布局继承）
   */
  private async nestLayoutComponents(
    LayoutComponents: unknown[],
    pageElement: unknown,
    layoutData?: Record<string, unknown>[],
  ): Promise<unknown> {
    if (LayoutComponents.length === 0) {
      return pageElement;
    }

    // 从最内层到最外层嵌套布局组件
    let currentElement = pageElement;
    for (let i = 0; i < LayoutComponents.length; i++) {
      const LayoutComponent = LayoutComponents[i];
      // 获取对应布局的 load 数据（如果有）
      const layoutLoadData = layoutData?.[i] || {};
      // 从 layoutLoadData 中排除 children 和 data，避免类型冲突和数据覆盖
      const { children: _, data: __, ...restLayoutProps } = layoutLoadData;
      try {
        // 先尝试直接调用布局组件（支持异步组件）
        // data: 布局的 load 数据（layoutLoadData）
        const layoutProps = {
          ...restLayoutProps, // 布局的 load 数据中的其他属性（如果有）
          data: layoutLoadData, // 布局的 load 数据（例如 menus）
          children: currentElement,
        };
        const layoutResult = (LayoutComponent as (
          props: {
            children: unknown;
            data: Record<string, unknown>;
            [key: string]: unknown;
          },
        ) => unknown)(layoutProps);
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
          const layoutProps = {
            ...restLayoutProps, // 布局的 load 数据中的其他属性（如果有）
            data: layoutLoadData, // 布局的 load 数据（例如 menus）
            children: currentElement,
          };
          const layoutResult = this.jsxFunc(LayoutComponent, layoutProps);
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
   * 创建最终元素（页面元素 + 布局嵌套）
   */
  async createFinalElement(
    PageComponent: unknown,
    LayoutComponents: unknown[],
    props: Record<string, unknown>,
    layoutData?: Record<string, unknown>[],
  ): Promise<unknown> {
    // 创建页面元素
    const pageElement = await this.createPageElement(PageComponent, props);

    // 嵌套布局组件，传递 layoutData
    let finalElement = await this.nestLayoutComponents(
      LayoutComponents,
      pageElement,
      layoutData,
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
   * 渲染元素到容器
   */
  async render(
    element: unknown,
    mode: "csr" | "hybrid" = "csr",
  ): Promise<boolean> {
    if (!this.container) {
      throw new Error("未找到容器");
    }

    // 使用 requestAnimationFrame 确保在下一帧渲染，优化性能
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // 根据渲染模式决定使用 render 还是 hydrate
    if (mode === "hybrid" && this.hydrateFunc) {
      try {
        this.container.innerHTML = "";
        this.hydrateFunc(element, this.container);
      } catch (hydrateError) {
        // hydration 失败，使用 render
        console.warn(
          "[ClientRenderer] hydration 失败，回退到 render:",
          hydrateError,
        );
        this.renderFunc(element, this.container);
      }
    } else {
      this.renderFunc(element, this.container);
    }

    // 等待一下，让 Preact 完成 DOM 更新
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // 检查渲染结果
    return this.container.children.length > 0 ||
      this.container.textContent.trim() !== "";
  }

  /**
   * 获取容器元素
   */
  getContainer(): HTMLElement | null {
    return this.container;
  }
}

/**
 * 客户端路由器类
 * 封装路由导航逻辑，优化性能
 */
class ClientRouter {
  private pageDataCache: Map<string, ClientConfig>;
  private moduleCache: Map<string, unknown>;
  private renderer: ClientRenderer;
  private basePath: string;
  private currentPageData: ClientConfig | null = null;

  constructor(
    pageDataCache: Map<string, ClientConfig>,
    moduleCache: Map<string, unknown>,
    renderer: ClientRenderer,
    basePath: string,
  ) {
    this.pageDataCache = pageDataCache;
    this.moduleCache = moduleCache;
    this.renderer = renderer;
    this.basePath = basePath;
  }

  /**
   * 提取并更新 i18n 数据（从 HTML 中提取）
   */
  private extractAndUpdateI18nData(html: string): void {
    try {
      const scriptTagRegex =
        /<script[^>]*>[\s\S]*?window\.__I18N_DATA__[\s\S]*?<\/script>/i;
      const i18nScriptMatch = html.match(scriptTagRegex);
      if (i18nScriptMatch) {
        const scriptContent = i18nScriptMatch[0];
        const dataRegex = /window\.__I18N_DATA__\s*=\s*(\{[\s\S]*?\});/;
        const dataMatch = scriptContent.match(dataRegex);
        if (dataMatch) {
          try {
            const i18nData = new Function("return " + dataMatch[1])() as {
              t?: (key: string, params?: Record<string, string>) => string;
            };

            if (i18nData && typeof i18nData === "object") {
              (globalThis as Record<string, unknown>).__I18N_DATA__ = i18nData;

              if (i18nData.t && typeof i18nData.t === "function") {
                (globalThis as Record<string, unknown>).$t = function (
                  key: string,
                  params?: Record<string, string>,
                ): string {
                  const i18n = (globalThis as Record<string, unknown>)
                    .__I18N_DATA__ as {
                      t?: (
                        key: string,
                        params?: Record<string, string>,
                      ) => string;
                    } | undefined;
                  if (!i18n?.t) {
                    return key;
                  }
                  return i18n.t.call(i18n, key, params);
                };
              }
            }
          } catch (e) {
            console.warn("[extractAndUpdateI18nData] i18n 数据解析失败:", e);
          }
        }
      }
    } catch (e) {
      console.warn("[extractAndUpdateI18nData] 提取 i18n 数据失败:", e);
    }

    // 确保 $t 函数始终可用
    // 支持任意类型参数（string、number、boolean 等），自动转换为字符串
    if (typeof (globalThis as Record<string, unknown>).$t !== "function") {
      (globalThis as Record<string, unknown>).$t = function (
        key: string,
        _params?: Record<string, any>,
      ): string {
        return key;
      };
    }
  }

  /**
   * 加载页面数据（优化：使用类属性缓存）
   */
  async loadPageData(pathname: string): Promise<ClientConfig | null> {
    try {
      // 规范化路径：只使用路径名（pathname），移除查询参数和哈希
      // 这样即使传入的路径包含查询参数和哈希，也能正确匹配缓存
      let normalizedPathname = pathname;
      try {
        // 尝试解析为 URL，提取 pathname
        const url = new URL(pathname, globalThis.location.origin);
        normalizedPathname = url.pathname;
      } catch {
        // 如果解析失败，尝试手动移除查询参数和哈希
        const queryIndex = normalizedPathname.indexOf("?");
        const hashIndex = normalizedPathname.indexOf("#");
        if (queryIndex !== -1 || hashIndex !== -1) {
          const endIndex = queryIndex !== -1 && hashIndex !== -1
            ? Math.min(queryIndex, hashIndex)
            : queryIndex !== -1
            ? queryIndex
            : hashIndex;
          normalizedPathname = normalizedPathname.substring(0, endIndex);
        }
      }

      // 处理 basePath：确保规范化后的路径包含 basePath（与 batch 模式缓存时使用的 key 一致）
      if (this.basePath !== "/") {
        const base = this.basePath.endsWith("/")
          ? this.basePath.slice(0, -1)
          : this.basePath;
        if (
          !normalizedPathname.startsWith(base) &&
          normalizedPathname.startsWith("/")
        ) {
          normalizedPathname = base + normalizedPathname;
        }
      }

      // 如果是当前页面，直接返回已有的数据
      if (
        normalizedPathname === globalThis.location.pathname &&
        this.currentPageData
      ) {
        return this.currentPageData;
      }

      // 检查缓存（直接访问类属性，更快）
      // 使用规范化后的路径名作为 key，与 batch 模式缓存时使用的 key 一致
      const cached = this.pageDataCache.get(normalizedPathname);
      if (cached) {
        return cached;
      }

      // 获取目标页面的 HTML（使用原始 pathname，可能包含查询参数和哈希）
      const response = await fetch(pathname, {
        headers: { "Accept": "text/html" },
      });
      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const html = await response.text();

      // 提取并更新 i18n 数据
      this.extractAndUpdateI18nData(html);

      // 解析 HTML 并查找 JSON script 标签
      const doc = new DOMParser().parseFromString(html, "text/html");
      const pageDataScript = doc.querySelector(
        'script[data-type="dweb-page-data"]',
      );

      if (!pageDataScript) {
        throw new Error("页面数据未找到");
      }

      // 解析 JSON
      let pageDataJson = pageDataScript.textContent || "{}";
      pageDataJson = pageDataJson.trim().replace(/;+$/, "");

      let pageData: ClientConfig;
      try {
        pageData = JSON.parse(pageDataJson) as ClientConfig;
      } catch (parseError: unknown) {
        console.error("[loadPageData] 解析页面数据 JSON 失败:", parseError);
        const errorMessage = parseError instanceof Error
          ? parseError.message
          : String(parseError);
        throw new Error(`解析页面数据 JSON 失败: ${errorMessage}`);
      }

      // 验证解析出的数据
      if (!pageData || typeof pageData !== "object") {
        throw new Error("页面数据格式无效");
      }

      // 存入缓存（使用规范化后的路径名作为 key，与 batch 模式缓存时使用的 key 一致）
      this.pageDataCache.set(normalizedPathname, pageData);

      return pageData;
    } catch (error: unknown) {
      // console.error("[loadPageData] 加载页面数据失败:", error);
      throw error;
    }
  }

  /**
   * 导航到指定路径（优化：使用类方法，减少全局变量访问）
   */
  async navigateTo(path: string, replace = false): Promise<void> {
    // 规范化路径
    let normalizedPath = path;
    if (this.basePath !== "/") {
      const base = this.basePath.endsWith("/")
        ? this.basePath.slice(0, -1)
        : this.basePath;
      if (!normalizedPath.startsWith(base) && normalizedPath.startsWith("/")) {
        normalizedPath = base + normalizedPath;
      }
    }

    try {
      // 加载页面数据（使用类方法，更快）
      const pageData = await this.loadPageData(normalizedPath);

      if (!pageData || typeof pageData !== "object") {
        throw new Error("页面数据格式无效");
      }

      if (!pageData.route || typeof pageData.route !== "string") {
        throw new Error("页面数据缺少 route 字段，无法加载组件");
      }

      // 加载组件（先检查模块缓存，直接访问类属性）
      let pageModule = this.moduleCache.get(pageData.route) as {
        default?: unknown;
        renderMode?: string;
      } | undefined;

      // 验证缓存的模块是否有效
      if (
        pageModule &&
        (!pageModule.default || typeof pageModule.default !== "function")
      ) {
        console.warn(
          "[navigateTo] 缓存的模块无效，重新导入:",
          pageData.route,
        );
        this.moduleCache.delete(pageData.route);
        pageModule = undefined;
      }

      // 如果缓存中没有或缓存无效，则动态导入
      if (!pageModule) {
        try {
          // 确保 route 是完整的 HTTP URL
          let routeUrl = pageData.route;
          if (
            typeof routeUrl === "string" && routeUrl.startsWith("/") &&
            !routeUrl.startsWith("http://") && !routeUrl.startsWith("https://")
          ) {
            routeUrl = `${globalThis.location.origin}${routeUrl}`;
          }
          // 清理 URL 中的空格
          if (typeof routeUrl === "string") {
            routeUrl = routeUrl.replace(/\s+/g, "");
          }
          pageModule = await import(routeUrl as string) as {
            default?: unknown;
            renderMode?: string;
          };
          if (!pageModule || typeof pageModule !== "object") {
            throw new Error("模块导入返回无效值");
          }
          if (!pageModule.default || typeof pageModule.default !== "function") {
            throw new Error("模块未导出默认组件或组件不是函数");
          }
          // 缓存模块（直接访问类属性，更快）
          // 使用原始 route 作为缓存键
          this.moduleCache.set(pageData.route, pageModule);
        } catch (importError: unknown) {
          console.error(
            "[navigateTo] ❌ 组件导入失败:",
            pageData.route,
            importError,
          );
          const errorMessage = importError instanceof Error
            ? importError.message
            : String(importError);
          throw new Error(`组件导入失败: ${errorMessage}`);
        }
      }

      const PageComponent = pageModule.default;

      // 加载所有布局组件（使用渲染器的方法）
      const LayoutComponents = await this.renderer.loadLayoutComponents(
        pageData,
      );

      // 构建 pageProps
      const excludeKeys = [
        "route",
        "renderMode",
        "layoutPath",
        "allLayoutPaths",
        "props",
      ];
      const loadData: Record<string, unknown> = {};
      for (const key in pageData) {
        if (!excludeKeys.includes(key)) {
          loadData[key] = pageData[key];
        }
      }

      const pageProps: Record<string, unknown> = {
        params: (pageData.props as Record<string, unknown>)?.params || {},
        query: (pageData.props as Record<string, unknown>)?.query || {},
        data: loadData,
        ...(pageData.props || {}),
      };

      if (!pageProps.data) {
        pageProps.data = loadData;
      }

      // 确保 routePath 和 url 存在（与服务端 props 保持一致）
      // 如果 props 中没有 routePath，使用当前导航的路径
      if (!pageProps.routePath) {
        pageProps.routePath = normalizedPath;
      }
      // 如果 props 中有 url 字符串，转换为 URL 对象（JSON 序列化后 url 对象会变成字符串）
      if (pageProps.url && typeof pageProps.url === "string") {
        try {
          pageProps.url = new URL(pageProps.url);
        } catch {
          // 如果转换失败，使用当前 URL
          pageProps.url = new URL(globalThis.location.href);
        }
      } else if (!pageProps.url) {
        // 如果没有 url，使用当前 URL
        pageProps.url = new URL(globalThis.location.href);
      }

      const store = (globalThis as Record<string, unknown>).__STORE__;
      if (store) {
        pageProps.store = store;
      }

      // 获取布局的 load 数据（如果有）
      const layoutData = pageData?.layoutData as
        | Record<string, unknown>[]
        | undefined;

      // 创建最终元素（使用渲染器的方法）
      const finalElement = await this.renderer.createFinalElement(
        PageComponent,
        LayoutComponents,
        pageProps,
        layoutData,
      );

      // 检查目标页面的渲染模式
      const targetMode =
        (pageModule.renderMode || pageData.renderMode || "csr") as
          | "csr"
          | "hybrid";

      // 获取容器元素
      const container = this.renderer.getContainer();
      if (!container) {
        throw new Error("未找到容器");
      }

      // container.innerHTML = "";

      // 渲染（使用渲染器的方法）
      let hasContent = await this.renderer.render(finalElement, targetMode);

      // 如果渲染成功，立即更新历史记录
      if (hasContent) {
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

        // 触发自定义事件
        try {
          globalThis.dispatchEvent(
            new CustomEvent("routechange", {
              detail: { path: normalizedPath },
            }),
          );
        } catch (e) {
          console.warn("[navigateTo] 触发 routechange 事件失败:", e);
        }
      }

      // 如果容器为空，尝试重新渲染
      if (!hasContent) {
        const modules = (globalThis as Record<string, unknown>)
          .__PREACT_MODULES__ as { render?: unknown } | undefined;
        if (modules?.render) {
          const renderRetry = modules.render as (
            element: unknown,
            container: HTMLElement,
          ) => void;

          // 重新构建 pageProps，确保包含所有必要的属性
          const pagePropsRetry: Record<string, unknown> = {
            params: (pageData.props as Record<string, unknown>)?.params || {},
            query: (pageData.props as Record<string, unknown>)?.query || {},
            data: loadData,
            ...(pageData.props || {}),
          };

          if (!pagePropsRetry.data) {
            pagePropsRetry.data = loadData;
          }

          // 确保 routePath 和 url 存在
          if (!pagePropsRetry.routePath) {
            pagePropsRetry.routePath = normalizedPath;
          }
          if (pagePropsRetry.url && typeof pagePropsRetry.url === "string") {
            try {
              pagePropsRetry.url = new URL(pagePropsRetry.url);
            } catch {
              pagePropsRetry.url = new URL(globalThis.location.href);
            }
          } else if (!pagePropsRetry.url) {
            pagePropsRetry.url = new URL(globalThis.location.href);
          }

          if (store) {
            pagePropsRetry.store = store;
          }

          // 获取布局的 load 数据（如果有）
          const layoutDataRetry = pageData?.layoutData as Record<
            string,
            unknown
          >[] | undefined;

          const finalElementRetry = await this.renderer.createFinalElement(
            PageComponent,
            LayoutComponents,
            pagePropsRetry,
            layoutDataRetry,
          );

          if (!finalElementRetry) {
            throw new Error("创建最终元素失败（返回 null）");
          }

          await new Promise((resolve) => requestAnimationFrame(resolve));
          renderRetry(finalElementRetry, container);

          // 等待一下，让 Preact 完成 DOM 更新
          await new Promise((resolve) => requestAnimationFrame(resolve));

          if (
            container.children.length > 0 || container.textContent.trim() !== ""
          ) {
            hasContent = true;
            if (!replace) {
              globalThis.history.pushState(
                { path: normalizedPath },
                "",
                normalizedPath,
              );
            }
          }
        }
      }

      // 验证渲染结果
      if (!hasContent) {
        throw new Error("渲染后容器为空");
      }

      // 更新 SEO meta 标签
      const updateMetaTags = (globalThis as Record<string, unknown>)
        .updateMetaTagsFromPageData as
          | ((pageData: ClientConfig) => void)
          | undefined;
      if (typeof updateMetaTags === "function") {
        updateMetaTags(pageData);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      // console.error("[navigateTo] 导航失败:", errorMsg, error);

      // 错误处理
      if (
        errorMsg.includes("404") || errorMsg.includes("Not Found") ||
        errorMsg.includes("fetch") || errorMsg.includes("请求失败")
      ) {
        try {
          globalThis.location.href = normalizedPath;
        } catch (e) {
          console.warn("[navigateTo] 页面跳转失败:", e);
        }
      } else if (!errorMsg.includes("布局组件渲染失败")) {
        try {
          globalThis.location.href = normalizedPath;
        } catch (e) {
          console.warn("[navigateTo] 页面跳转失败:", e);
        }
      }
    }
  }

  /**
   * 预取页面数据（优化：使用类方法）
   */
  async prefetchPageData(pathname: string): Promise<void> {
    try {
      // 规范化路径：只使用路径名（pathname），移除查询参数和哈希
      // 与 loadPageData 中的逻辑一致
      let normalizedPathname = pathname;
      try {
        const url = new URL(pathname, globalThis.location.origin);
        normalizedPathname = url.pathname;
      } catch {
        const queryIndex = normalizedPathname.indexOf("?");
        const hashIndex = normalizedPathname.indexOf("#");
        if (queryIndex !== -1 || hashIndex !== -1) {
          const endIndex = queryIndex !== -1 && hashIndex !== -1
            ? Math.min(queryIndex, hashIndex)
            : queryIndex !== -1
            ? queryIndex
            : hashIndex;
          normalizedPathname = normalizedPathname.substring(0, endIndex);
        }
      }

      // 处理 basePath：确保规范化后的路径包含 basePath（与 batch 模式缓存时使用的 key 一致）
      if (this.basePath !== "/") {
        const base = this.basePath.endsWith("/")
          ? this.basePath.slice(0, -1)
          : this.basePath;
        if (
          !normalizedPathname.startsWith(base) &&
          normalizedPathname.startsWith("/")
        ) {
          normalizedPathname = base + normalizedPathname;
        }
      }

      // 如果已经在缓存中，不需要预取
      if (this.pageDataCache.has(normalizedPathname)) {
        return;
      }

      // 如果是当前页面，不需要预取
      if (
        normalizedPathname === globalThis.location.pathname &&
        this.currentPageData
      ) {
        return;
      }

      // 加载页面数据（loadPageData 内部会再次规范化，但这里先检查缓存可以避免不必要的请求）
      const pageData = await this.loadPageData(pathname);

      // 预加载页面组件模块
      if (pageData?.route && typeof pageData.route === "string") {
        try {
          // 确保 route 是完整的 HTTP URL
          let routeUrl = pageData.route;
          if (
            routeUrl.startsWith("/") && !routeUrl.startsWith("http://") &&
            !routeUrl.startsWith("https://")
          ) {
            routeUrl = `${globalThis.location.origin}${routeUrl}`;
          }
          // 清理 URL 中的空格
          routeUrl = routeUrl.replace(/\s+/g, "");
          const module = await import(routeUrl);
          this.moduleCache.set(pageData.route, module);
        } catch (_importError) {
          // 组件导入失败时静默处理
        }
      }

      // 预加载布局组件模块
      if (pageData?.allLayoutPaths && Array.isArray(pageData.allLayoutPaths)) {
        const layoutPromises = pageData.allLayoutPaths.map(
          async (layoutPath: string) => {
            try {
              const layoutModule = await import(layoutPath);
              this.moduleCache.set(layoutPath, layoutModule);
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
        try {
          const layoutModule = await import(pageData.layoutPath);
          this.moduleCache.set(pageData.layoutPath, layoutModule);
        } catch (_layoutError) {
          // 布局导入失败时静默处理
        }
      }
    } catch (_e) {
      // 预取失败时静默处理
    }
  }

  /**
   * 设置当前页面数据
   */
  setCurrentPageData(pageData: ClientConfig): void {
    this.currentPageData = pageData;
  }
}

/**
 * 浏览器客户端主类
 * 封装所有客户端渲染和路由逻辑，优化性能和封装性
 */
class BrowserClient {
  private config: ClientConfig;
  private pageDataCache: Map<string, ClientConfig>;
  private moduleCache: Map<string, unknown>;
  private renderer: ClientRenderer | null = null;
  private router: ClientRouter | null = null;
  private prefetchRouters: PrefetchRouters;
  private initialized = false;

  constructor(config: ClientConfig) {
    this.config = config;
    this.pageDataCache = new Map<string, ClientConfig>();
    this.moduleCache = new Map<string, unknown>();
    this.prefetchRouters = new PrefetchRouters(config);

    // 暴露缓存到全局，供 PrefetchRouters 类使用（保持向后兼容）
    (globalThis as Record<string, unknown>).__pageDataCache =
      this.pageDataCache;
    (globalThis as Record<string, unknown>).__moduleCache = this.moduleCache;
  }

  /**
   * 链接工具函数：检查链接是否应该被拦截/预取
   */
  private isValidInternalLink(link: HTMLAnchorElement): string | null {
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
   */
  private initLinkInterceptor(): void {
    if (
      (globalThis as Record<string, unknown>)
        .__CSR_LINK_INTERCEPTOR_INITIALIZED__
    ) return;
    (globalThis as Record<string, unknown>)
      .__CSR_LINK_INTERCEPTOR_INITIALIZED__ = true;

    let navigateToFunc: ((path: string, replace?: boolean) => void) | null =
      null;

    /**
     * 处理链接点击事件
     */
    const clickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target?.closest?.("a");

      if (!link || !(link instanceof HTMLAnchorElement)) return;

      const fullPath = this.isValidInternalLink(link);
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
          } else {
            // 如果等待超时，回退到整页跳转
            console.warn(
              "[LinkInterceptor] 导航函数未准备好，回退到整页跳转:",
              fullPath,
            );
            globalThis.location.href = fullPath;
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
    (globalThis as Record<string, unknown>).__setCSRNavigateFunction =
      function (
        fn: (path: string, replace?: boolean) => void,
      ) {
        navigateToFunc = fn;
      };
  }

  /**
   * 设置更新 SEO meta 标签的函数
   */
  private setupUpdateMetaTagsFunction(): void {
    (globalThis as Record<string, unknown>).updateMetaTagsFromPageData =
      function updateMetaTagsFromPageData(
        pageData: { metadata?: Record<string, unknown> },
      ): void {
        const metadata = pageData?.metadata ||
          (pageData && typeof pageData === "object"
            ? pageData as Record<string, unknown>
            : null);
        if (!metadata || typeof metadata !== "object") return;

        const metadataObj = metadata as Record<string, unknown>;

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
        if (metadataObj.title && typeof metadataObj.title === "string") {
          document.title = metadataObj.title;
          updateOrCreateMeta("property", "og:title", metadataObj.title);
          updateOrCreateMeta("name", "twitter:title", metadataObj.title);
        }

        // 更新 description
        if (
          metadataObj.description && typeof metadataObj.description === "string"
        ) {
          updateOrCreateMeta("name", "description", metadataObj.description);
          updateOrCreateMeta(
            "property",
            "og:description",
            metadataObj.description,
          );
          updateOrCreateMeta(
            "name",
            "twitter:description",
            metadataObj.description,
          );
        }

        // 更新 keywords
        if (metadataObj.keywords && typeof metadataObj.keywords === "string") {
          updateOrCreateMeta("name", "keywords", metadataObj.keywords);
        }

        // 更新 robots
        if (metadataObj.robots !== undefined) {
          if (metadataObj.robots === false) {
            updateOrCreateMeta("name", "robots", "noindex, nofollow");
          } else if (
            typeof metadataObj.robots === "object" &&
            metadataObj.robots !== null
          ) {
            const robotsObj = metadataObj.robots as Record<string, unknown>;
            const directives: string[] = [];
            if (robotsObj.index === false) directives.push("noindex");
            if (robotsObj.follow === false) directives.push("nofollow");
            if (directives.length > 0) {
              updateOrCreateMeta("name", "robots", directives.join(", "));
            }
          }
        }

        // 更新 og:image
        if (metadataObj.image && typeof metadataObj.image === "string") {
          updateOrCreateMeta("property", "og:image", metadataObj.image);
        }

        // 更新 og:url
        if (metadataObj.url && typeof metadataObj.url === "string") {
          updateOrCreateMeta("property", "og:url", metadataObj.url);
        }

        // 更新 og:type
        if (metadataObj.type && typeof metadataObj.type === "string") {
          updateOrCreateMeta("property", "og:type", metadataObj.type);
        }
      };
  }

  /**
   * 初始化客户端系统
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    // 初始化链接拦截器（CSR/Hybrid 模式需要）
    if (
      this.config.renderMode === "csr" || this.config.renderMode === "hybrid"
    ) {
      this.initLinkInterceptor();
    }

    // 设置页面数据
    (globalThis as Record<string, unknown>).__PAGE_DATA__ = {
      route: this.config.route,
      renderMode: this.config.renderMode,
      props: this.config.props,
      layoutPath: this.config.layoutPath,
      allLayoutPaths: this.config.allLayoutPaths,
      basePath: this.config.basePath,
      metadata: this.config.metadata,
      layout: this.config.layout,
      layoutData: this.config.layoutData, // 布局的 load 数据
    };

    // 设置更新 meta 标签的函数
    this.setupUpdateMetaTagsFunction();

    // 初始化预加载
    this.prefetchRouters.init();

    // 初始化客户端渲染（链接拦截器会在导航函数准备好后自动初始化）
    await this.render();

    // 执行预加载
    this.prefetchRouters.prefetch();
  }

  /**
   * 初始化客户端渲染
   */
  async render(): Promise<void> {
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

      const mode = this.config.renderMode;
      const shouldHydrate = this.config.shouldHydrate;

      // 如果是 SSR 模式且未启用 hydration，完全不执行任何操作
      if (mode === "ssr" && !shouldHydrate) {
        return;
      }

      // 获取 Preact 模块（优先使用预加载的，否则动态导入）
      let hydrate: (element: unknown, container: HTMLElement) => void;
      let render: (element: unknown, container: HTMLElement) => void;
      let jsx: (
        type: unknown,
        props: Record<string, unknown> | null,
        ...children: unknown[]
      ) => unknown;

      // 如果 Preact 模块正在预加载，等待它完成（最多等待 3 秒）
      let modules = (globalThis as Record<string, unknown>)
        .__PREACT_MODULES__ as {
          hydrate?: unknown;
          render?: unknown;
          jsx?: unknown;
        } | undefined;
      if (!modules) {
        let waitCount = 0;
        const maxWait = 30; // 最多等待 30 次（约 3 秒）
        while (!modules && waitCount < maxWait) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          waitCount++;
          modules = (globalThis as Record<string, unknown>)
            .__PREACT_MODULES__ as {
              hydrate?: unknown;
              render?: unknown;
              jsx?: unknown;
            } | undefined;
        }
      }
      if (modules) {
        // 使用预加载的 Preact 模块（避免重复导入）
        hydrate = modules.hydrate as (
          element: unknown,
          container: HTMLElement,
        ) => void;
        render = modules.render as (
          element: unknown,
          container: HTMLElement,
        ) => void;
        jsx = modules.jsx as (
          type: unknown,
          props: Record<string, unknown> | null,
          ...children: unknown[]
        ) => unknown;
      } else {
        // 如果预加载超时，动态导入 Preact 模块
        const [preactModule, jsxRuntimeModule] = await Promise.all([
          import("preact"),
          import("preact/jsx-runtime"),
        ]);
        hydrate = preactModule.hydrate as (
          element: unknown,
          container: HTMLElement,
        ) => void;
        render = preactModule.render as (
          element: unknown,
          container: HTMLElement,
        ) => void;
        jsx = jsxRuntimeModule.jsx as (
          type: unknown,
          props: Record<string, unknown> | null,
          ...children: unknown[]
        ) => unknown;
      }

      // 查找容器元素（优先使用 #root，如果没有则使用 body）
      const container = document.getElementById("root");
      if (!container) {
        return;
      }

      // 检查容器是否有服务端渲染的内容
      const hasServerContent = container.children.length > 0 ||
        container.textContent.trim() !== "";

      // 加载页面组件
      // 确保 route 是完整的 HTTP URL（如果是相对路径，需要转换为完整 URL）
      let routeUrl = this.config.route;
      if (
        routeUrl.startsWith("/") && !routeUrl.startsWith("http://") &&
        !routeUrl.startsWith("https://")
      ) {
        // 相对路径（如 /__modules/...），需要转换为完整的 HTTP URL
        routeUrl = `${globalThis.location.origin}${routeUrl}`;
      }
      // 清理 URL 中的空格（防止 URL 中有空格导致导入失败）
      routeUrl = routeUrl.replace(/\s+/g, "");

      let module: { default: unknown; renderMode?: string; hydrate?: boolean };
      try {
        module = await import(routeUrl) as {
          default: unknown;
          renderMode?: string;
          hydrate?: boolean;
        };
      } catch (importError: unknown) {
        console.error(
          "[BrowserClient.render] 页面组件导入失败:",
          routeUrl,
          importError,
        );
        const errorMessage = importError instanceof Error
          ? importError.message
          : String(importError);
        throw new Error("页面组件导入失败: " + errorMessage);
      }

      const PageComponent = module.default;

      if (!PageComponent || typeof PageComponent !== "function") {
        throw new Error("页面组件未导出默认组件或组件不是函数");
      }

      const actualMode = module.renderMode || mode;
      const actualShouldHydrate = module.hydrate === true || shouldHydrate;

      // 创建渲染器（如果还没有创建）
      if (!this.renderer) {
        this.renderer = new ClientRenderer(
          render,
          jsx,
          this.moduleCache,
          hydrate,
        );
      }

      // 获取页面 props
      const currentPageData = (globalThis as Record<string, unknown>)
        .__PAGE_DATA__ as ClientConfig | undefined;
      const pageProps: Record<string, unknown> = {
        ...(currentPageData?.props || {}),
      };

      // 添加 Store 到 props
      const store = (globalThis as Record<string, unknown>).__STORE__;
      if (store) {
        pageProps.store = store;
      }

      // 加载所有布局组件（使用渲染器的方法，性能更好）
      const LayoutComponents = currentPageData
        ? await this.renderer.loadLayoutComponents(currentPageData)
        : [];

      // 获取布局的 load 数据（如果有）
      const layoutData = currentPageData?.layoutData as Record<
        string,
        unknown
      >[] | undefined;

      // 创建最终元素（使用渲染器的方法，性能更好）
      const finalElement = await this.renderer.createFinalElement(
        PageComponent,
        LayoutComponents,
        pageProps,
        layoutData,
      );

      if (actualMode === "csr") {
        // 客户端渲染：完全在客户端渲染
        if (hasServerContent) {
          // 容器有服务端内容，可能是 hybrid 模式，尝试 hydrate
          try {
            hydrate(finalElement, container);
          } catch (hydrateError) {
            // hydration 失败，使用 render（使用渲染器的方法，性能更好）
            console.warn(
              "[BrowserClient.render] hydration 失败，回退到 render:",
              hydrateError,
            );
            await this.renderer.render(finalElement, "csr");
          }
        } else {
          // 容器为空，纯 CSR 模式，直接 render（使用渲染器的方法，性能更好）
          await this.renderer.render(finalElement, "csr");
        }

        // 更新 SEO meta 标签（初始加载时，CSR 模式）
        const updateMetaTags = (globalThis as Record<string, unknown>)
          .updateMetaTagsFromPageData as
            | ((pageData: ClientConfig) => void)
            | undefined;
        if (typeof updateMetaTags === "function" && currentPageData) {
          updateMetaTags(currentPageData);
        }

        // CSR 模式：初始化客户端路由导航（SPA 无刷新切换）
        this.initNavigation(render, jsx);
      } else if (actualMode === "hybrid" || actualShouldHydrate) {
        // Hybrid 模式或明确指定 hydrate=true：在客户端激活
        if (hasServerContent) {
          // 容器有服务端内容，尝试 hydration
          try {
            hydrate(finalElement, container);
          } catch (hydrateError) {
            // 如果 hydration 失败，回退到 render（使用渲染器的方法，性能更好）
            console.warn(
              "[BrowserClient.render] hydration 失败，回退到 render:",
              hydrateError,
            );
            await this.renderer.render(finalElement, "hybrid");
          }
        } else {
          // 如果容器为空，说明服务端没有渲染内容，直接客户端渲染（使用渲染器的方法，性能更好）
          await this.renderer.render(finalElement, "hybrid");
        }

        // 更新 SEO meta 标签（初始加载时，Hybrid 模式）
        const updateMetaTags = (globalThis as Record<string, unknown>)
          .updateMetaTagsFromPageData as
            | ((pageData: ClientConfig) => void)
            | undefined;
        if (typeof updateMetaTags === "function" && currentPageData) {
          updateMetaTags(currentPageData);
        }

        // Hybrid 模式：初始化客户端路由导航（SPA 无刷新切换）
        this.initNavigation(render, jsx);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[BrowserClient.render] 客户端渲染失败:", errorMsg, error);
      throw error;
    }
  }

  /**
   * 初始化客户端路由导航
   */
  initNavigation(
    render: (element: unknown, container: HTMLElement) => void,
    jsx: (
      type: unknown,
      props: Record<string, unknown> | null,
      ...children: unknown[]
    ) => unknown,
  ): void {
    if ((globalThis as Record<string, unknown>).__CSR_ROUTER_INITIALIZED__) {
      return;
    }
    (globalThis as Record<string, unknown>).__CSR_ROUTER_INITIALIZED__ = true;

    // 验证传入的 render 和 jsx 函数
    if (typeof render !== "function" || typeof jsx !== "function") {
      throw new Error("render 或 jsx 函数无效");
    }

    // 确保全局 Preact 模块已设置（如果还没有设置，使用传入的参数设置）
    let modules = (globalThis as Record<string, unknown>).__PREACT_MODULES__ as
      | { render?: unknown; jsx?: unknown; hydrate?: unknown }
      | undefined;
    if (!modules) {
      // 如果全局模块未设置，使用传入的参数设置它
      modules = { render, jsx };
      (globalThis as Record<string, unknown>).__PREACT_MODULES__ = modules;
    }

    const renderFunc = (modules.render || render) as (
      element: unknown,
      container: HTMLElement,
    ) => void;
    const jsxFunc = (modules.jsx || jsx) as (
      type: unknown,
      props: Record<string, unknown> | null,
      ...children: unknown[]
    ) => unknown;
    const hydrateFunc = modules.hydrate as
      | ((element: unknown, container: HTMLElement) => void)
      | undefined;

    // 创建渲染器（如果还没有创建）
    if (!this.renderer) {
      this.renderer = new ClientRenderer(
        renderFunc,
        jsxFunc,
        this.moduleCache,
        hydrateFunc,
      );
    }

    // 创建路由器实例（优化：使用类结构）
    const basePath = this.config.basePath || "/";
    this.router = new ClientRouter(
      this.pageDataCache,
      this.moduleCache,
      this.renderer,
      basePath,
    );

    // 设置当前页面数据
    const currentPageData = (globalThis as Record<string, unknown>)
      .__PAGE_DATA__ as ClientConfig | undefined;
    if (currentPageData) {
      this.router.setCurrentPageData(currentPageData);
    }

    // 暴露导航函数给链接拦截器（使用类方法，性能更好）
    const setNavigateFunction = (globalThis as Record<string, unknown>)
      .__setCSRNavigateFunction as
        | ((fn: (path: string, replace?: boolean) => void) => void)
        | undefined;
    if (typeof setNavigateFunction === "function") {
      setNavigateFunction((path: string, replace?: boolean) =>
        this.router!.navigateTo(path, replace)
      );
    }

    // 暴露预取函数给链接拦截器（使用类方法，性能更好）
    (globalThis as Record<string, unknown>).__prefetchPageData = (
      pathname: string,
    ) => this.router!.prefetchPageData(pathname);
  }
}

/**
 * 初始化客户端系统（向后兼容函数）
 * 暴露到全局，供内联脚本调用
 */
function initClient(config: ClientConfig): void {
  const client = new BrowserClient(config);
  client.init().catch((error) => {
    console.error("[initClient] 初始化失败:", error);
  });
}

// 暴露到全局，供内联脚本调用
if (typeof globalThis !== "undefined") {
  (globalThis as Record<string, unknown>).initClient = initClient;
  // 为了向后兼容，也暴露 initLinkInterceptor（内部会通过 BrowserClient 调用）
  (globalThis as Record<string, unknown>).initLinkInterceptor = function () {
    // 这个函数现在由 BrowserClient 内部调用，这里保留只是为了向后兼容
    // 实际功能已经在 BrowserClient.init() 中通过 this.initLinkInterceptor() 调用
  };
}
