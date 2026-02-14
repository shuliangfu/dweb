/**
 * CSR 渲染器
 *
 * 职责：
 * - 与 Hybrid 相同流程：加载 _app、_layout，调用 renderSSR
 * - 区别：不渲染页面内容，仅渲染 loading 占位符（无服务端渲染）
 * - Tailwind 插件 onResponse 可正确注入 CSS
 *
 * CSR 工作流程：
 * 1. 服务端用 _app.tsx 渲染 HTML 外壳（含 loading 占位）
 * 2. 客户端加载 _client.js
 * 3. 客户端脚本根据路由渲染页面
 */

import { jsx as viewJsx } from "@dreamer/view/jsx-runtime";
import { createElement as createElementPreact } from "preact";
import { createElement as createElementReact } from "react";
import type { RouteMatch, Router } from "@dreamer/router";
import type { ServiceContainer } from "@dreamer/service";
import { cwd, getEnv, join } from "../core/runtime-adapter.ts";
import { getLogger } from "../utils/logger.ts";
import { extractComponentPathFromRouteFile } from "../utils/path.ts";
import type { AppConfig } from "../types/app.ts";
import { $t } from "../utils/i18n.ts";
import { loadRouteModule } from "./load-route-module.ts";
import { getRender } from "./render.ts";
import { hasContainerElementInHtml } from "./render-utils.ts";

/**
 * CSR 渲染选项
 *
 * 配置客户端脚本路径、容器 ID、标题及额外 head/body 标签。
 *
 * @example
 * ```ts
 * render: {
 *   mode: "csr",
 *   csr: {
 *     clientScript: "/_client.js",
 *     containerId: "app",
 *     title: "My App",
 *   },
 * }
 * ```
 */
export interface RenderCSROptions {
  /** 客户端脚本路径（默认："/_client.js"） */
  clientScript?: string;
  /** 挂载容器元素 ID（默认："app"） */
  containerId?: string;
  /** 页面标题 */
  title?: string;
  /** 额外 head 标签 */
  headTags?: string;
  /** 额外 body 标签 */
  bodyTags?: string;
}

/**
 * 创建 CSR 渲染器
 *
 * 与 Hybrid 结构一致，仅将 PageComponent 替换为 loading 占位符，不进行页面内容的服务端渲染。
 *
 * @param container 服务容器
 * @param router 路由实例
 * @param config 应用配置
 * @returns CSR 渲染回调函数（接收 ctx、match，返回 Response 或 null）
 *
 * @example
 * ```ts
 * const renderer = createRendererCSR(container, router, config);
 * const response = await renderer(ctx, match);
 * ```
 */
export function createRendererCSR(
  container: ServiceContainer,
  router: Router,
  config: AppConfig,
): (ctx: unknown, match: RouteMatch) => Promise<Response | null> {
  const renderService = getRender(container);
  const renderConfig = (config.render || {}) as {
    debug?: boolean;
    engine?: "react" | "preact" | "view";
    mode?: "ssr" | "csr" | "ssg";
    csr?: RenderCSROptions;
  };
  const csrOptions: RenderCSROptions = {
    clientScript: "/_client.js",
    containerId: "app",
    title: config.name || "App",
    ...renderConfig.csr,
  };
  const engine = renderConfig.engine || "preact";
  const routerConfig = (config.router || {}) as { routesDir?: string };
  const routesDir = routerConfig.routesDir ?? "./src/routes";
  const routesDirPath = join(cwd(), routesDir);
  const clientRoutes = collectClientRoutes(router, routesDirPath);

  /** 根据 engine 选择 createElement（仅 React/Preact 使用） */
  const createElement = engine === "react"
    ? createElementReact
    : createElementPreact;
  /** className (React) vs class (Preact/View) */
  const classProp = engine === "react" ? "className" : "class";

  /** loading 占位组件（React/Preact） */
  function LoadingPlaceholderReactPreact() {
    return createElement(
      "div",
      { [classProp]: "dweb-loading" },
      createElement("div", { [classProp]: "dweb-spinner" }),
    );
  }

  /** loading 占位组件（View 引擎，供 SSR 传入 renderSSR；children 放在 props 中） */
  function LoadingPlaceholderView() {
    return viewJsx("div", {
      class: "dweb-loading",
      children: viewJsx("div", { class: "dweb-spinner" }),
    });
  }

  return async (_ctx: unknown, match: RouteMatch): Promise<Response | null> => {
    try {
      if (match.isApi) return null;

      const appPath = router.getSpecialFile("_app");
      const layoutPath = router.getSpecialFile("_layout");
      const loadOpts = {
        logger: container.has("logger") ? getLogger(container) : undefined,
      };

      let AppComponent: unknown = null;
      if (appPath) {
        const appModule = await loadRouteModule(appPath, loadOpts);
        AppComponent = appModule?.default ?? appModule?.App;
      }

      if (!AppComponent) {
        return new Response(
          generateFallbackCSRHtml(csrOptions, clientRoutes, engine),
          {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          },
        );
      }

      let LayoutComponent: unknown = null;
      if (layoutPath) {
        const layoutModule = await loadRouteModule(layoutPath, loadOpts);
        LayoutComponent = layoutModule?.default ?? layoutModule?.Layout;
      }

      const LoadingPlaceholder = engine === "view"
        ? LoadingPlaceholderView
        : LoadingPlaceholderReactPreact;

      const layouts: Array<
        { component: unknown; props?: Record<string, unknown> }
      > = [
        { component: AppComponent },
      ];
      if (LayoutComponent) layouts.push({ component: LayoutComponent });

      const result = await renderService.renderSSR({
        engine,
        component: LoadingPlaceholder,
        props: {},
        layouts,
      });

      let html = result.html;

      // 强制要求 _app 必须渲染挂载容器，未找到则抛错（不自动注入）
      const containerId = csrOptions.containerId ?? "app";
      if (!hasContainerElementInHtml(html, containerId)) {
        throw new Error(
          `[dweb] _app 必须渲染挂载容器：请在 _app.tsx 的 body 内提供 <div id="${containerId}">{children}</div>，当前 SSR 输出中未找到该元素。`,
        );
      }

      // 关键 CSS 放 head 最前，避免闪白；body 背景兜底
      const loadingStyles = `<style id="dweb-loading-styles">
#dweb-loading-overlay{position:fixed;inset:0;z-index:99999;display:flex;justify-content:center;align-items:center;background:#f9fafb;font-family:system-ui,sans-serif;transition:opacity .15s ease-out}
#dweb-loading-overlay.dweb-loading-done{opacity:0;pointer-events:none}
.dweb-spinner{width:40px;height:40px;border:3px solid #e5e7eb;border-top:3px solid #3b82f6;border-radius:50%;animation:dweb-spin .8s linear infinite}
@keyframes dweb-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
</style>`;
      const overlayHtml =
        `<div id="dweb-loading-overlay" aria-hidden="true"><div class="dweb-spinner"></div></div>`;
      const isDevCsr =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || "prod") === "dev";
      const debugRender = renderConfig.debug === true;
      const clientConfigScript = `
${overlayHtml}
<script>
  ${
        debugRender
          ? "globalThis.__DWEB_HMR_DEBUG__ = globalThis.__DWEB_HMR_DEBUG__ ?? true; globalThis.__DWEB_DEBUG__ = globalThis.__DWEB_DEBUG__ ?? true;"
          : ""
      }
  globalThis.__DWEB_DEV__ = ${isDevCsr};
  globalThis.__DWEB_ROUTES__ = ${JSON.stringify(clientRoutes)};
  globalThis.__DWEB_ENGINE__ = "${engine}";
  globalThis.__DWEB_CONTAINER_ID__ = "${csrOptions.containerId}";
  globalThis.__DWEB_ON_READY__ = function(){var el=document.getElementById("dweb-loading-overlay");if(el){el.classList.add("dweb-loading-done");el.addEventListener("transitionend",function(){el.remove();var s=document.getElementById("dweb-loading-styles");if(s)s.remove()},{once:true})}};
</script>
<script type="module" src="${csrOptions.clientScript}"></script>
${csrOptions.bodyTags || ""}`;

      if (html.includes("<head>")) {
        html = html.replace("<head>", `<head>${loadingStyles}`);
      } else if (html.includes("</head>")) {
        html = html.replace("</head>", `${loadingStyles}</head>`);
      }
      if (html.includes("</body>")) {
        html = html.replace("</body>", `${clientConfigScript}</body>`);
      } else {
        html += clientConfigScript;
      }

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...(isDevCsr
            ? { "Cache-Control": "no-cache, no-store, must-revalidate" }
            : {}),
        },
      });
    } catch (error) {
      console.error($t("log.csrError"), error);
      const isDevCsr =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || "prod") === "dev";
      return new Response(
        `<!DOCTYPE html><html><head><title>500 Error</title></head><body><h1>Internal Server Error</h1><p>${
          error instanceof Error ? error.message : String(error)
        }</p></body></html>`,
        {
          status: 500,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            ...(isDevCsr
              ? { "Cache-Control": "no-cache, no-store, must-revalidate" }
              : {}),
          },
        },
      );
    }
  };
}

/**
 * 收集客户端路由信息
 *
 * @param router 路由实例
 * @param routesDirPath routes 目录绝对路径（用于 extractComponentPathFromRouteFile，确保 component 与 ROUTE_LOADERS key 一致）
 * @returns 客户端路由数组
 */
function collectClientRoutes(
  router: Router,
  routesDirPath: string,
): Array<{ path: string; component: string; type: string }> {
  const routes: Array<{ path: string; component: string; type: string }> = [];

  const allRoutes = router.getRoutes?.() || [];

  for (const route of allRoutes) {
    if (route.isApi) continue;

    const raw = route.file || route.path || "";
    const component = extractComponentPathFromRouteFile(routesDirPath, raw) ||
      raw.replace(/\\/g, "/").replace(/\.(tsx?|jsx?)$/, "").trim();
    routes.push({
      path: route.path,
      component,
      type: route.type || "static",
    });
  }

  return routes;
}

/** 无 _app.tsx 时的降级 HTML 外壳（静态模板），与主路径一致：全屏遮罩 + __DWEB_ON_READY__ */
function generateFallbackCSRHtml(
  options: RenderCSROptions,
  routes: Array<{ path: string; component: string; type: string }>,
  engine: "react" | "preact" | "view",
): string {
  const { clientScript, containerId, title, headTags, bodyTags } = options;
  const loadingStyles = `<style id="dweb-loading-styles">
#dweb-loading-overlay{position:fixed;inset:0;z-index:99999;display:flex;justify-content:center;align-items:center;background:#f9fafb;font-family:system-ui,sans-serif;transition:opacity .15s ease-out}
#dweb-loading-overlay.dweb-loading-done{opacity:0;pointer-events:none}
.dweb-spinner{width:40px;height:40px;border:3px solid #e5e7eb;border-top:3px solid #3b82f6;border-radius:50%;animation:dweb-spin .8s linear infinite}
@keyframes dweb-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
</style>`;
  const overlayHtml =
    `<div id="dweb-loading-overlay" aria-hidden="true"><div class="dweb-spinner"></div></div>`;
  const onReadyScript =
    `globalThis.__DWEB_ON_READY__=function(){var el=document.getElementById("dweb-loading-overlay");if(el){el.classList.add("dweb-loading-done");el.addEventListener("transitionend",function(){el.remove();var s=document.getElementById("dweb-loading-styles");if(s)s.remove()},{once:true})}};`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${headTags || ""}
  ${loadingStyles}
</head>
<body>
  <div id="${containerId}"></div>
  ${overlayHtml}
  <script>
    globalThis.__DWEB_ROUTES__ = ${JSON.stringify(routes)};
    globalThis.__DWEB_ENGINE__ = "${engine}";
    globalThis.__DWEB_CONTAINER_ID__ = "${containerId}";
    ${onReadyScript}
  </script>
  <script type="module" src="${clientScript}"></script>
  ${bodyTags || ""}
</body>
</html>`;
}
