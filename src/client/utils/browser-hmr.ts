/**
 * HMR 客户端脚本
 * 在浏览器中运行的 HMR 代码
 */

interface HMRConfig {
  hmrPort: number;
}

/**
 * HMR 客户端类
 * 负责处理热模块替换（Hot Module Replacement）
 */
class HMRClient {
  private ws: WebSocket;
  private config: HMRConfig;
  private rootElement: HTMLElement | null = null;
  private preactModules: {
    render?: (element: unknown, container: HTMLElement) => void;
    jsx?: (
      type: unknown,
      props: Record<string, unknown> | null,
      ...children: unknown[]
    ) => unknown;
  } | null = null;

  constructor(config: HMRConfig) {
    this.config = config;
    this.ws = new WebSocket(`ws://localhost:${config.hmrPort}`);
    this.init();
  }

  /**
   * 初始化 HMR 客户端
   */
  private init(): void {
    // 缓存根元素（性能优化：避免重复查询 DOM）
    this.rootElement = document.getElementById("root");

    // 缓存 Preact 模块（性能优化：避免重复访问 globalThis）
    this.preactModules = (globalThis as Record<string, unknown>)
      .__PREACT_MODULES__ as {
        render?: (element: unknown, container: HTMLElement) => void;
        jsx?: (
          type: unknown,
          props: Record<string, unknown> | null,
          ...children: unknown[]
        ) => unknown;
      } | undefined || null;

    // 设置 WebSocket 事件处理器
    this.ws.onmessage = (event: MessageEvent) => this.handleHMRMessage(event);
    this.ws.onopen = () => {
      // console.log('✅ HMR WebSocket 连接已建立');
    };
    this.ws.onerror = () => {
      // 静默处理错误
    };
    this.ws.onclose = () => {
      // console.log('❌ HMR WebSocket 连接已关闭');
    };
  }

  /**
   * 从文件路径推断对应的路由路径
   * @param filePath 文件路径（如 routes/about.tsx 或 routes/index.tsx）
   * @returns 路由路径（如 /about 或 /），如果是布局文件或应用文件返回 null（表示应该更新）
   */
  private inferRouteFromFilePath(filePath: string): string | null {
    // 移除路径前缀（如 routes/ 或 app/routes/）
    // 支持多应用模式：app1/routes/about.tsx -> about.tsx
    let normalizedPath = filePath.replace(/^.*\/routes\//, "");

    // 如果路径中不包含 routes/，可能是绝对路径或其他格式，尝试直接使用文件名
    if (normalizedPath === filePath) {
      // 尝试从路径中提取文件名（最后一个 / 之后的部分）
      const lastSlashIndex = filePath.lastIndexOf("/");
      if (lastSlashIndex >= 0) {
        normalizedPath = filePath.substring(lastSlashIndex + 1);
      } else {
        normalizedPath = filePath;
      }
    }

    // 如果是布局文件或应用文件，返回 null（表示应该更新，因为它们是共享的）
    if (normalizedPath.includes("_layout") || normalizedPath.includes("_app")) {
      return null;
    }
    // 共享组件：components/ 目录视为全局共享，应更新当前页面
    if (
      filePath.includes("/components/") || filePath.startsWith("components/")
    ) {
      return null;
    }

    // 如果是 API 路由，不应该更新页面组件
    if (normalizedPath.startsWith("api/") || filePath.includes("/api/")) {
      return "";
    }

    // 移除文件扩展名
    normalizedPath = normalizedPath.replace(/\.(tsx?|jsx?)$/, "");

    // 如果是 index，转换为根路径
    if (normalizedPath === "index" || normalizedPath === "") {
      return "/";
    }

    // 转换为路由路径（添加前导斜杠）
    return `/${normalizedPath}`;
  }

  /**
   * 检查文件是否应该更新当前页面
   * @param filePath 文件路径
   * @returns true 如果应该更新，false 如果不应该更新
   */
  private shouldUpdateCurrentPage(filePath: string): boolean {
    // 获取当前路由路径
    const currentRoute = globalThis.location.pathname;

    // 推断文件对应的路由路径
    const fileRoute = this.inferRouteFromFilePath(filePath);

    // 如果返回 null，说明是布局文件或应用文件，应该更新（因为它们是共享的）
    if (fileRoute === null) {
      return true;
    }

    // 如果返回空字符串，说明是 API 路由或其他不应该更新页面的文件
    if (fileRoute === "") {
      return false;
    }

    // 检查路由是否匹配
    // 精确匹配或当前路由以文件路由开头（支持嵌套路由）
    return currentRoute === fileRoute ||
      currentRoute.startsWith(fileRoute + "/");
  }

  /**
   * 重新加载 CSS 文件
   */
  private reloadStylesheet(filePath: string): void {
    // 使用 querySelectorAll 一次性获取所有样式表链接（性能优化）
    const links = document.querySelectorAll<HTMLLinkElement>(
      'link[rel="stylesheet"]',
    );
    const timestamp = Date.now(); // 缓存时间戳（性能优化）

    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (href && (href.includes(filePath))) {
        // 添加时间戳强制重新加载
        const baseUrl = href.split("?")[0];
        link.setAttribute("href", `${baseUrl}?t=${timestamp}`);
      }
    });
  }

  /**
   * 加载布局组件
   */
  private async loadLayoutComponent(
    layoutPath: string | null,
  ): Promise<unknown> {
    if (!layoutPath) {
      return null;
    }

    try {
      const separator = layoutPath.includes("?") ? "&" : "?";
      const timestamp = Date.now();
      const layoutModule = await import(
        `${layoutPath}${separator}t=${timestamp}`
      );
      return layoutModule.default;
    } catch {
      return null;
    }
  }

  /**
   * 创建页面元素（包含布局，支持异步组件）
   */
  private async createPageElement(
    PageComponent: unknown,
    LayoutComponent: unknown,
    props: Record<string, unknown>,
    jsx: (
      type: unknown,
      props: Record<string, unknown> | null,
      ...children: unknown[]
    ) => unknown,
  ): Promise<unknown> {
    // jsx 函数由调用方传入，不需要验证

    // 创建页面元素（支持异步组件）
    let pageElement: unknown;
    try {
      // 先尝试直接调用组件（支持异步组件）
      if (typeof PageComponent !== "function") {
        throw new Error("页面组件不是函数");
      }
      const componentResult = (PageComponent as (
        props: Record<string, unknown>,
      ) => unknown | Promise<unknown>)(props);

      // 如果返回 Promise，等待它
      if (componentResult instanceof Promise) {
        pageElement = await componentResult;
      } else {
        pageElement = componentResult;
      }

      if (!pageElement) {
        throw new Error("页面组件返回了空值");
      }
    } catch (callError: unknown) {
      // 如果直接调用失败，尝试用 jsx 函数调用（同步组件）
      try {
        const elementResult = jsx(PageComponent, props);
        if (elementResult instanceof Promise) {
          pageElement = await elementResult;
        } else {
          pageElement = elementResult;
        }
        if (!pageElement) {
          throw new Error("页面组件返回了空值");
        }
      } catch {
        const errorMessage = callError instanceof Error
          ? callError.message
          : String(callError);
        throw new Error(`创建页面元素失败: ${errorMessage}`);
      }
    }

    // 如果有布局，用布局包裹页面元素（支持异步布局组件）
    if (LayoutComponent) {
      try {
        if (typeof LayoutComponent !== "function") {
          throw new Error("布局组件不是函数");
        }
        // 获取布局的 load 数据（如果有）
        const pageData = (globalThis as Record<string, unknown>)
          .__PAGE_DATA__ as
            | { layoutData?: Record<string, unknown>[] }
            | undefined;
        const layoutData = pageData?.layoutData?.[0] || {};

        // 先尝试直接调用布局组件（支持异步组件）
        // 传递布局的 load 数据作为 data 属性
        const layoutResult = (LayoutComponent as (props: {
          children: unknown;
          data?: Record<string, unknown>;
        }) => unknown | Promise<unknown>)({
          children: pageElement,
          data: layoutData,
        });

        let finalElement: unknown;
        if (layoutResult instanceof Promise) {
          finalElement = await layoutResult;
        } else {
          finalElement = layoutResult;
        }

        if (!finalElement) {
          throw new Error("布局组件返回了空值");
        }
        return finalElement;
      } catch {
        // 如果直接调用失败，尝试用 jsx 函数调用（同步组件）
        try {
          // 获取布局的 load 数据（如果有）
          const pageData = (globalThis as Record<string, unknown>)
            .__PAGE_DATA__ as
              | { layoutData?: Record<string, unknown>[] }
              | undefined;
          const layoutData = pageData?.layoutData?.[0] || {};

          const layoutResult = jsx(LayoutComponent, {
            children: pageElement,
            data: layoutData,
          });
          let finalElement: unknown;
          if (layoutResult instanceof Promise) {
            finalElement = await layoutResult;
          } else {
            finalElement = layoutResult;
          }
          if (!finalElement) {
            throw new Error("布局组件返回了空值");
          }
          return finalElement;
        } catch {
          // 如果都失败，使用原始页面元素
          return pageElement;
        }
      }
    }

    return pageElement;
  }

  /**
   * 验证并渲染组件
   */
  private renderComponent(
    root: HTMLElement,
    finalElement: unknown,
    render: (element: unknown, container: HTMLElement) => void,
  ): void {
    // render 函数由调用方传入，不需要验证

    // 直接使用 Preact 的 render 函数更新内容
    // Preact 会自动 diff 并更新 DOM，不需要手动清空容器
    // 这样可以避免闪动，实现平滑的热更新
    render(finalElement, root);

    // 验证渲染结果（不抛出错误，只记录警告）
    setTimeout(() => {
      this.validateRender(root);
    }, 50);
  }

  /**
   * 验证渲染结果
   */
  private validateRender(root: HTMLElement): void {
    const hasChildren = root.children.length > 0;
    const hasText = root.textContent?.trim() !== "";

    if (!hasChildren && !hasText) {
      // 只记录警告，不抛出错误（避免导致页面刷新）
      console.warn("[HMR] 渲染后容器为空，但继续运行");
    }
  }

  /**
   * 获取 Preact 模块（动态获取，支持延迟加载）
   */
  private getPreactModules(): {
    render: (element: unknown, container: HTMLElement) => void;
    jsx: (
      type: unknown,
      props: Record<string, unknown> | null,
      ...children: unknown[]
    ) => unknown;
  } {
    // 优先使用缓存的模块
    if (this.preactModules?.render && this.preactModules?.jsx) {
      return {
        render: this.preactModules.render,
        jsx: this.preactModules.jsx,
      };
    }

    // 动态从 globalThis 获取（支持延迟加载）
    const modules = (globalThis as Record<string, unknown>)
      .__PREACT_MODULES__ as {
        render?: (element: unknown, container: HTMLElement) => void;
        jsx?: (
          type: unknown,
          props: Record<string, unknown> | null,
          ...children: unknown[]
        ) => unknown;
      } | undefined;

    if (!modules || !modules.render || !modules.jsx) {
      throw new Error("Preact 模块未预加载");
    }

    // 更新缓存
    this.preactModules = modules;

    return {
      render: modules.render,
      jsx: modules.jsx,
    };
  }

  /**
   * 更新组件（通过 GET 请求获取编译后的模块）
   */
  private async updateComponent(
    moduleUrl: string,
    filePath: string,
  ): Promise<void> {
    // 动态获取 Preact 模块（支持延迟加载）
    const { render, jsx } = this.getPreactModules();

    // 获取根容器（使用缓存的元素）
    const root = this.rootElement;
    if (!root) {
      throw new Error("未找到 #root 容器");
    }

    // 判断更新的是布局文件还是页面文件
    const isLayoutFile = filePath.includes("_layout") ||
      filePath.includes("_app");
    // 共享组件（components 目录）
    const isSharedComponent = filePath.includes("/components/") ||
      filePath.startsWith("components/");

    try {
      // 获取页面数据
      const pageData = (globalThis as Record<string, unknown>).__PAGE_DATA__ as
        | {
          props?: Record<string, unknown>;
          layoutPath?: string;
          allLayoutPaths?: string[];
          route?: string;
          [key: string]: unknown; // 允许其他属性（如 load 函数返回的数据）
        }
        | undefined;

      // 参考客户端渲染的处理方式，从 pageData 中提取 load 数据
      // 排除一些系统键，其余的都是 load 函数返回的数据
      const excludeKeys = [
        "route",
        "renderMode",
        "layoutPath",
        "allLayoutPaths",
        "props",
        "shouldHydrate",
        "basePath",
        "metadata",
        "layout",
        "prefetchRoutes",
        "prefetchLoading",
        "prefetchMode",
        "layoutData",
      ];
      const loadData: Record<string, unknown> = {};
      if (pageData) {
        for (const key in pageData) {
          if (!excludeKeys.includes(key)) {
            loadData[key] = pageData[key];
          }
        }
      }

      // 构建 props，确保包含 data（load 函数返回的数据）
      const props: Record<string, unknown> = {
        params: (pageData?.props as Record<string, unknown>)?.params || {},
        query: (pageData?.props as Record<string, unknown>)?.query || {},
        data: loadData,
        ...(pageData?.props || {}),
      };

      // 确保 data 存在（如果 props 中没有，使用 loadData）
      if (
        !props.data ||
        Object.keys(props.data as Record<string, unknown>).length === 0
      ) {
        props.data = loadData;
      }

      // 确保 routePath 和 url 存在（与服务端 props 保持一致）
      if (!props.routePath) {
        props.routePath = globalThis.location.pathname;
      }
      if (!props.url) {
        props.url = new URL(globalThis.location.href);
      } else if (typeof props.url === "string") {
        // 如果 url 是字符串，转换为 URL 对象
        try {
          props.url = new URL(props.url);
        } catch {
          props.url = new URL(globalThis.location.href);
        }
      }

      if (isLayoutFile) {
        // 更新的是布局文件：清除布局组件缓存，重新加载布局组件
        const layoutPath = pageData?.layoutPath ?? null;
        const allLayoutPaths = pageData?.allLayoutPaths ?? [];

        // 清除布局组件的缓存
        const moduleCache = (globalThis as Record<string, unknown>)
          .__moduleCache as Map<string, unknown> | undefined;
        if (moduleCache) {
          // 清除所有布局路径的缓存
          if (allLayoutPaths.length > 0) {
            allLayoutPaths.forEach((path) => {
              moduleCache.delete(path);
            });
          } else if (layoutPath) {
            moduleCache.delete(layoutPath);
          }
        }

        // 重新加载布局组件（使用新的模块 URL，带时间戳避免缓存）
        const separator = moduleUrl.includes("?") ? "&" : "?";
        const timestamp = Date.now();
        const moduleUrlWithTimestamp = `${moduleUrl}${separator}t=${timestamp}`;
        const layoutModule = await import(moduleUrlWithTimestamp);
        const LayoutComponent = layoutModule.default;

        if (!LayoutComponent || typeof LayoutComponent !== "function") {
          throw new Error("布局组件未导出默认组件或组件不是函数");
        }

        // 获取当前页面组件（从缓存或重新加载）
        let PageComponent: unknown;
        const currentRoute = pageData?.route || globalThis.location.pathname;

        // 尝试从缓存获取页面组件
        if (moduleCache && currentRoute) {
          const cachedModule = moduleCache.get(currentRoute);
          if (
            cachedModule && typeof cachedModule === "object" &&
            "default" in cachedModule
          ) {
            PageComponent = (cachedModule as { default: unknown }).default;
          }
        }

        // 如果缓存中没有，重新加载页面组件
        if (!PageComponent || typeof PageComponent !== "function") {
          // 重新加载当前页面组件
          const pageModuleUrl =
            typeof currentRoute === "string" && currentRoute.startsWith("http")
              ? currentRoute
              : `${globalThis.location.origin}${currentRoute}`;
          const pageSeparator = pageModuleUrl.includes("?") ? "&" : "?";
          const pageTimestamp = Date.now();
          const pageModuleUrlWithTimestamp =
            `${pageModuleUrl}${pageSeparator}t=${pageTimestamp}`;
          const pageModule = await import(pageModuleUrlWithTimestamp);
          PageComponent = pageModule.default;
        }

        if (!PageComponent || typeof PageComponent !== "function") {
          throw new Error("页面组件未找到或不是函数");
        }

        // 创建页面元素（包含更新的布局，支持异步组件）
        const finalElement = await this.createPageElement(
          PageComponent,
          LayoutComponent,
          props,
          jsx,
        );

        // 渲染组件
        this.renderComponent(root, finalElement, render);
      } else if (isSharedComponent) {
        // 共享组件：先破缓存加载该组件，再重新加载当前页面组件并渲染
        const compSeparator = moduleUrl.includes("?") ? "&" : "?";
        const compTimestamp = Date.now();
        const compUrlWithTimestamp =
          `${moduleUrl}${compSeparator}t=${compTimestamp}`;
        try {
          await import(compUrlWithTimestamp);
        } catch {
          // 忽略组件导入错误，继续页面级更新
        }

        // 清理模块缓存，避免第二次更新仍命中旧模块
        const moduleCache = (globalThis as Record<string, unknown>)
          .__moduleCache as Map<string, unknown> | undefined;

        console.log(moduleCache);

        if (moduleCache) {
          moduleCache.delete(filePath);
          if (pageData?.route && typeof pageData.route === "string") {
            moduleCache.delete(pageData.route);
          }
        }

        const currentRoute = pageData?.route || globalThis.location.pathname;
        const pageModuleUrl =
          typeof currentRoute === "string" && currentRoute.startsWith("http")
            ? currentRoute
            : `${globalThis.location.origin}${currentRoute}`;

        const pageSeparator = pageModuleUrl.includes("?") ? "&" : "?";
        const pageTimestamp = Date.now();
        const pageUrlWithTimestamp =
          `${pageModuleUrl}${pageSeparator}t=${pageTimestamp}`;

        const pageModule = await import(pageUrlWithTimestamp);
        const PageComponent = pageModule.default;
        if (!PageComponent || typeof PageComponent !== "function") {
          throw new Error("页面组件未导出默认组件或组件不是函数");
        }

        const layoutPath = pageData?.layoutPath ?? null;
        const LayoutComponent = await this.loadLayoutComponent(layoutPath);
        const finalElement = await this.createPageElement(
          PageComponent,
          LayoutComponent,
          props,
          jsx,
        );
        this.renderComponent(root, finalElement, render);
      } else {
        // 更新的是页面文件：正常处理
        // 通过 GET 请求获取编译后的模块
        // 添加时间戳避免缓存
        const separator = moduleUrl.includes("?") ? "&" : "?";
        const timestamp = Date.now();
        const moduleUrlWithTimestamp = `${moduleUrl}${separator}t=${timestamp}`;

        // 直接导入模块（服务器会编译并返回）
        const module = await import(moduleUrlWithTimestamp);

        // 获取页面组件
        const PageComponent = module.default;
        if (!PageComponent || typeof PageComponent !== "function") {
          throw new Error("组件未导出默认组件或组件不是函数");
        }

        // 获取布局路径并加载布局组件（保持原有布局）
        const layoutPath = pageData?.layoutPath ?? null;
        const LayoutComponent = await this.loadLayoutComponent(layoutPath);

        // 创建页面元素（包含布局，支持异步组件）
        const finalElement = await this.createPageElement(
          PageComponent,
          LayoutComponent,
          props,
          jsx,
        );

        // 渲染组件
        this.renderComponent(root, finalElement, render);
      }
    } catch (error) {
      // 记录错误但不立即回退，尝试继续运行
      console.error("[HMR] 更新组件失败:", error);
      // 只有在关键错误时才回退到重新加载组件
      if (error instanceof Error && error.message.includes("未找到")) {
        await this.reloadComponent();
      }
    }
  }

  /**
   * 重新加载组件（通过重新获取页面内容，降级方案）
   */
  private async reloadComponent(): Promise<void> {
    try {
      // 获取当前页面的 HTML
      const response = await fetch(globalThis.location.href, {
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      });
      const html = await response.text();

      // 解析 HTML
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(html, "text/html");

      // 获取新的 body 内容
      const newBody = newDoc.body;
      const currentBody = document.body;

      // 获取新的 script 标签（从新解析的 HTML）
      const newScripts = Array.from(newBody.querySelectorAll("script"));

      // 清空当前 body 内容
      currentBody.innerHTML = "";

      // 添加新的 body 内容（排除 script 标签，稍后单独处理）
      const bodyContent = newBody.cloneNode(true) as HTMLElement;
      const bodyScripts = Array.from(bodyContent.querySelectorAll("script"));
      bodyScripts.forEach((script) => script.remove());
      currentBody.innerHTML = bodyContent.innerHTML;

      // 重新执行新的脚本（排除 HMR 脚本，避免重复连接）
      const timestamp = Date.now();
      const hmrPortString = String(this.config.hmrPort);

      newScripts.forEach((script) => {
        const scriptContent = script.textContent || "";
        const scriptSrc = script.getAttribute("src") || "";

        // 检查是否是 HMR 脚本（包含 WebSocket 连接代码）
        const isHMRScript =
          (scriptContent.includes("ws://") || scriptSrc.includes("ws://")) &&
          scriptContent.includes(hmrPortString);

        // 检查是否是 JSON script 标签（data-type="dweb-page-data"）
        const isJsonScript =
          script.getAttribute("data-type") === "dweb-page-data";

        // 跳过 HMR 脚本和 JSON script 标签
        if (isHMRScript || isJsonScript) {
          return;
        }

        const newScript = document.createElement("script");

        // 复制所有属性
        Array.from(script.attributes).forEach((attr) => {
          if (attr.name !== "src") {
            newScript.setAttribute(attr.name, attr.value);
          }
        });

        if (scriptSrc) {
          newScript.src = `${scriptSrc}${
            scriptSrc.includes("?") ? "&" : "?"
          }t=${timestamp}`;
        } else if (scriptContent) {
          newScript.textContent = scriptContent;
        }

        // 安全地添加脚本到 body
        try {
          document.body.appendChild(newScript);
        } catch (error) {
          console.warn("[HMR] 添加脚本失败:", error);
        }
      });
    } catch (error) {
      console.error("[HMR] 重新加载组件失败:", error);
      // 失败时回退到完全重载
      globalThis.location.reload();
    }
  }

  /**
   * 处理 HMR 更新消息
   */
  private async handleUpdateMessage(data: {
    type?: string;
    action?: string;
    file?: string;
    moduleUrl?: string;
  }): Promise<void> {
    try {
      if (data.type === "css" && data.action === "reload-stylesheet") {
        // CSS 文件：只更新样式表
        if (data.file) {
          this.reloadStylesheet(data.file);
        }
      } else if (
        data.type === "component" && data.action === "update-component"
      ) {
        // 组件文件：检查是否应该更新当前页面
        if (data.file && !this.shouldUpdateCurrentPage(data.file)) {
          // 文件不属于当前路由，跳过更新
          // console.log(`[HMR] 跳过更新：${data.file} 不属于当前路由 ${globalThis.location.pathname}`);
          return;
        }

        // 组件文件：通过 GET 请求获取编译后的模块
        if (data.moduleUrl && data.file) {
          await this.updateComponent(data.moduleUrl, data.file);
        } else if (data.file) {
          // 如果没有模块 URL，回退到重新加载组件（不是完全重载）
          await this.reloadComponent();
        }
      } else if (
        data.type === "component" && data.action === "reload-component"
      ) {
        // 组件文件：检查是否应该更新当前页面
        if (data.file && !this.shouldUpdateCurrentPage(data.file)) {
          // 文件不属于当前路由，跳过更新
          // console.log(`[HMR] 跳过更新：${data.file} 不属于当前路由 ${globalThis.location.pathname}`);
          return;
        }

        // 组件文件：重新加载组件内容（降级方案）
        await this.reloadComponent();
      } else {
        // 其他情况：完全重载
        globalThis.location.reload();
      }
    } catch (error) {
      // 记录错误，但不立即重载页面
      console.error("[HMR] 处理更新消息失败:", error);
      // 只有在严重错误时才回退到完全重载
      if (error instanceof Error && error.message.includes("严重")) {
        globalThis.location.reload();
      }
    }
  }

  /**
   * 处理 HMR WebSocket 消息
   */
  private async handleHMRMessage(event: MessageEvent): Promise<void> {
    try {
      const message = JSON.parse(event.data) as {
        type?: string;
        data?: {
          type?: string;
          action?: string;
          file?: string;
          moduleUrl?: string;
        };
      };

      if (message.type === "reload") {
        // 无感刷新：不进行整页重载，尝试重载当前路由组件
        try {
          const routePath = globalThis.location.pathname;
          const moduleUrl = `${globalThis.location.origin}${routePath}`;
          await this.updateComponent(moduleUrl, routePath);
        } catch (_error) {
          // 回退到组件级降级刷新
          await this.reloadComponent();
        }
      } else if (message.type === "update") {
        await this.handleUpdateMessage(message.data || {});
      }
    } catch {
      // 静默处理错误
    }
  }
}

/**
 * 初始化 HMR 系统
 * 暴露到全局，供内联脚本调用
 */
function initHMR(config: HMRConfig): void {
  new HMRClient(config);
}

// 暴露到全局，供内联脚本调用
if (typeof globalThis !== "undefined") {
  (globalThis as Record<string, unknown>).initHMR = initHMR;
}
