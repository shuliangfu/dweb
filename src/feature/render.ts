/**
 * @dreamer/render 集成
 *
 * 初始化渲染引擎（Preact/React），处理 SSR/SSG 服务端渲染。
 * CSR 在客户端进行。导出 initializeRender、getRender、createRenderer*。
 *
 * @module
 */

import {
  type RenderResult,
  renderSSG,
  renderSSR,
  type SSGOptions,
  type SSROptions,
} from "@dreamer/render";
import type { ServiceContainer } from "@dreamer/service";
import type { AppConfig } from "../types/app.ts";

/**
 * 初始化渲染引擎
 *
 * 创建 renderSSR、renderSSG 服务并注册到容器，供 SSR/SSG 模式使用。
 *
 * @param container 服务容器
 * @param config 应用配置
 * @returns void
 *
 * @example
 * ```ts
 * initializeRender(container, config);
 * const render = getRender(container);
 * const html = await render.renderSSR({ path: "/", url: "/" });
 * ```
 */
export function initializeRender(
  container: ServiceContainer,
  config: AppConfig,
): void {
  // 从配置中获取渲染选项
  const renderConfig = (config.render || {}) as {
    engine?: "react" | "preact" | "view";
    mode?: "ssr" | "csr" | "ssg";
  };

  // 创建渲染服务对象
  const renderService = {
    /**
     * 服务端渲染
     */
    async renderSSR(options: SSROptions): Promise<RenderResult> {
      return await renderSSR({
        ...options,
        engine: options.engine || renderConfig.engine || "preact",
      });
    },

    /**
     * 静态站点生成
     */
    async renderSSG(options: SSGOptions): Promise<string[]> {
      return await renderSSG({
        ...options,
        engine: options.engine || renderConfig.engine || "preact",
      });
    },
  };

  // 将渲染服务注册到服务容器
  container.registerSingleton("render", () => renderService);
}

/**
 * 获取渲染服务
 *
 * @param container 服务容器
 * @returns 渲染服务（含 renderSSR、renderSSG 方法）
 *
 * @example
 * ```ts
 * const render = getRender(container);
 * const result = await render.renderSSR({ path: "/", url: "/" });
 * const files = await render.renderSSG({ routes: ["/"] });
 * ```
 */
export function getRender(container: ServiceContainer): {
  renderSSR: (options: SSROptions) => Promise<RenderResult>;
  renderSSG: (options: SSGOptions) => Promise<string[]>;
} {
  return container.get("render");
}
