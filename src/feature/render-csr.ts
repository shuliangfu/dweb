/**
 * CSR 渲染器
 *
 * 职责：
 * - 生成 CSR 模式的 HTML 外壳
 * - 注入客户端路由配置
 * - 提供客户端脚本引用
 *
 * CSR 工作流程：
 * 1. 服务端返回空的 HTML 外壳
 * 2. 客户端加载 _client.js
 * 3. 客户端脚本根据路由渲染页面
 */

import type { RouteMatch, Router } from "@dreamer/router";
import type { ServiceContainer } from "@dreamer/service";
import { getEnv } from "../core/runtime-adapter.ts";
import type { AppConfig } from "../types/app.ts";

/**
 * CSR 渲染选项
 */
export interface RenderCSROptions {
  /** 客户端脚本路径 */
  clientScript?: string;
  /** 容器元素 ID */
  containerId?: string;
  /** 页面标题 */
  title?: string;
  /** 额外的 head 标签 */
  headTags?: string;
  /** 额外的 body 标签 */
  bodyTags?: string;
}

/**
 * 创建 CSR 渲染器
 *
 * @param _container 服务容器
 * @param router 路由实例
 * @param config 应用配置
 * @returns CSR 渲染回调函数
 */
export function createRendererCSR(
  _container: ServiceContainer,
  router: Router,
  config: AppConfig,
): (_ctx: unknown, match: RouteMatch) => Promise<Response | null> {
  // 获取 CSR 配置
  const renderConfig = (config.render || {}) as {
    engine?: "react" | "preact";
    mode?: "ssr" | "csr" | "ssg";
    csr?: RenderCSROptions;
  };

  const csrOptions: RenderCSROptions = {
    clientScript: "/_client.js",
    containerId: "app",
    title: config.name || "App",
    ...renderConfig.csr,
  };

  // 收集所有路由信息（用于注入到客户端）
  const clientRoutes = collectClientRoutes(router);

  return (_ctx: unknown, match: RouteMatch): Promise<Response | null> => {
    try {
      // 只处理非 API 路由
      if (match.isApi) {
        return Promise.resolve(null);
      }

      // 生成 HTML 外壳
      const html = generateCSRHtml(
        csrOptions,
        clientRoutes,
        renderConfig.engine || "preact",
      );

      // 返回 HTML 响应（开发模式禁用缓存，确保 HMR 刷新后拿到最新内容）
      const isDev =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || "prod") === "dev";
      return Promise.resolve(
        new Response(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            ...(isDev
              ? { "Cache-Control": "no-cache, no-store, must-revalidate" }
              : {}),
          },
        }),
      );
    } catch (error) {
      console.error("CSR 渲染错误:", error);

      // 返回错误响应（开发模式禁用缓存）
      const isDev =
        (getEnv("DENO_ENV") || getEnv("BUN_ENV") || "prod") === "dev";
      return Promise.resolve(
        new Response(
          `<!DOCTYPE html><html><head><title>500 Error</title></head><body><h1>Internal Server Error</h1><p>${
            error instanceof Error ? error.message : String(error)
          }</p></body></html>`,
          {
            status: 500,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              ...(isDev
                ? { "Cache-Control": "no-cache, no-store, must-revalidate" }
                : {}),
            },
          },
        ),
      );
    }
  };
}

/**
 * 收集客户端路由信息
 *
 * @param router 路由实例
 * @returns 客户端路由数组
 */
function collectClientRoutes(
  router: Router,
): Array<{ path: string; component: string; type: string }> {
  const routes: Array<{ path: string; component: string; type: string }> = [];

  // 获取所有注册的路由
  const allRoutes = router.getRoutes?.() || [];

  for (const route of allRoutes) {
    // 跳过 API 路由
    if (route.isApi) continue;

    routes.push({
      path: route.path,
      component: route.file || route.path,
      type: route.type || "static",
    });
  }

  return routes;
}

/**
 * 生成 CSR HTML 外壳
 *
 * @param options CSR 选项
 * @param routes 客户端路由
 * @param engine 渲染引擎
 * @returns HTML 字符串
 */
function generateCSRHtml(
  options: RenderCSROptions,
  routes: Array<{ path: string; component: string; type: string }>,
  engine: "react" | "preact",
): string {
  const { clientScript, containerId, title, headTags, bodyTags } = options;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${headTags || ""}
  <style>
    /* 加载动画 */
    .dweb-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-family: system-ui, sans-serif;
    }
    .dweb-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div id="${containerId}">
    <div class="dweb-loading">
      <div class="dweb-spinner"></div>
    </div>
  </div>
  <script>
    // 注入客户端配置
    globalThis.__DWEB_ROUTES__ = ${JSON.stringify(routes)};
    globalThis.__DWEB_ENGINE__ = "${engine}";
    globalThis.__DWEB_CONTAINER_ID__ = "${containerId}";
  </script>
  <script type="module" src="${clientScript}"></script>
  ${bodyTags || ""}
</body>
</html>`;
}
