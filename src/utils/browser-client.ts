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
}

/**
 * 初始化链接拦截器（CSR/Hybrid 模式）
 * 这个函数会被编译为内联脚本立即执行
 */
function initLinkInterceptor(): void {
  if ((globalThis as any).__CSR_LINK_INTERCEPTOR_INITIALIZED__) return;
  (globalThis as any).__CSR_LINK_INTERCEPTOR_INITIALIZED__ = true;

  let navigateToFunc: ((path: string, replace?: boolean) => void) | null = null;

  const clickHandler = (event: MouseEvent) => {
    // 1. 获取链接对象
    const target = event.target as HTMLElement;
    const link = target?.closest?.("a");

    // 如果不是 A 链接，不处理
    if (!link || !(link instanceof HTMLAnchorElement)) return;

    // 2. 排除不需要拦截的特殊 A 链接（新窗口、下载、外链等）
    const href = link.getAttribute("href");
    if (
      !href || href.startsWith("#") || href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      link.hasAttribute("download") ||
      (link.target && link.target !== "_self")
    ) {
      return; // 这些情况交给浏览器默认处理
    }

    // 3. 检查是否是站内链接
    try {
      const url = new URL(href, globalThis.location.href);
      if (url.origin !== globalThis.location.origin) return; // 外链不拦截

      // --- 确认是站内跳转，立即彻底拦截 ---
      // 必须同时调用这三个方法，确保完全阻止默认行为和事件传播
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const fullPath = url.pathname + url.search + url.hash;

      // 4. 执行跳转逻辑
      if (navigateToFunc) {
        // 导航函数已准备好，直接调用
        navigateToFunc(fullPath);
      } else {
        // 导航函数还没准备好，需要等待
        // 注意：已经调用了 preventDefault()，所以必须等待导航函数准备好
        // 不能回退到 location.href，否则会失去 SPA 优势
        let retryCount = 0;
        const maxRetries = 50; // 最多等待 5 秒（50 * 100ms）
        const retryInterval = 100; // 每 100ms 检查一次

        const checkAndNavigate = () => {
          // 直接访问闭包中的 navigateToFunc（它会自动获取最新值）
          if (navigateToFunc) {
            // 导航函数已准备好，执行导航
            navigateToFunc(fullPath);
          } else if (retryCount < maxRetries) {
            // 还没准备好，继续等待
            retryCount++;
            setTimeout(checkAndNavigate, retryInterval);
          } else {
            // 等待超时（5秒），作为最后的后备方案，使用页面刷新
            // 注意：这种情况应该很少发生，因为导航函数通常在页面加载后很快就会被设置
          }
        };

        // 立即开始检查（不延迟第一次检查）
        checkAndNavigate();
      }
    } catch (e) {
      console.error("[Link Interceptor] 链接拦截错误:", e);
    }
  };

  // 只在 window 挂载一个监听器即可，使用捕获模式确保最早拦截
  globalThis.addEventListener("click", clickHandler as EventListener, {
    capture: true,
    passive: false,
  });

  // 处理前进/后退
  globalThis.addEventListener("popstate", (e: PopStateEvent) => {
    if (navigateToFunc) {
      navigateToFunc(
        (e.state?.path as string) || globalThis.location.pathname,
        true,
      );
    }
  });

  // 暴露设置导航函数的接口（供 initClientSideNavigation 调用）
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
    for (const layoutPath of pageData.allLayoutPaths) {
      try {
        const layoutModule = await import(layoutPath);
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
        console.warn("[Layout] 布局加载失败，跳过该布局:", layoutPath, layoutError);
      }
    }
  } else if (
    pageData.layoutPath && pageData.layoutPath !== "null" &&
    typeof pageData.layoutPath === "string"
  ) {
    // 向后兼容：如果只有单个布局路径
    try {
      const layoutModule = await import(pageData.layoutPath);
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
    console.warn("[createPageElement] 直接调用组件失败，尝试使用 jsx 函数:", callError);
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
      console.warn("[nestLayoutComponents] 直接调用布局组件失败，尝试使用 jsx 函数:", layoutError);
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
        console.error("[nestLayoutComponents] 布局组件渲染失败，跳过该布局:", jsxError);
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
      const pageDataScript = doc.querySelector('script[data-type="dweb-page-data"]');

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

      // 加载组件
      let pageModule: any;
      try {
        pageModule = await import(pageData.route);
      } catch (importError: any) {
        console.error("[navigateTo] 组件导入失败:", pageData.route, importError);
        throw new Error(`组件导入失败: ${importError.message}`);
      }

      const PageComponent = pageModule.default;
      if (!PageComponent) {
        throw new Error("页面组件未导出默认组件");
      }
      if (typeof PageComponent !== "function") {
        throw new Error("页面组件不是函数");
      }

      // 加载所有布局组件（支持布局继承）
      const LayoutComponents = await loadLayoutComponents(pageData);

      // 获取页面 props 并添加 Store
      const pageProps = { ...(pageData.props || {}) };
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
            console.warn("[navigateTo] hydration 失败，回退到 render:", hydrateError);
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
      console.error("[initClientRender] 页面组件导入失败:", config.route, importError);
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
          console.warn("[initClientRender] hydration 失败，回退到 render:", hydrateError);
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
          console.warn("[initClientRender] hydration 失败，回退到 render:", hydrateError);
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

  // 初始化客户端渲染（链接拦截器会在导航函数准备好后自动初始化）
  initClientRender(config);
}

// 暴露到全局，供内联脚本调用
if (typeof globalThis !== "undefined") {
  (globalThis as any).initClient = initClient;
}
