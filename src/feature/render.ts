/**
 * @dreamer/render 集成
 *
 * 职责：
 * - 初始化渲染引擎
 * - 配置模板引擎（Preact、React）
 * - 处理 SSR/SSG 渲染（服务端）
 *
 * 注意：CSR 渲染在客户端进行，服务端只返回 HTML 外壳
 *
 * 功能：
 * - 创建 RenderEngine 实例
 * - 模板编译和渲染
 * - 渲染模式切换
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
 * @param container 服务容器
 * @param config 应用配置
 */
export function initializeRender(
  container: ServiceContainer,
  config: AppConfig,
): void {
  // 从配置中获取渲染选项
  const renderConfig = (config.render || {}) as {
    engine?: "react" | "preact";
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
 * @returns 渲染服务
 */
export function getRender(container: ServiceContainer): {
  renderSSR: (options: SSROptions) => Promise<RenderResult>;
  renderSSG: (options: SSGOptions) => Promise<string[]>;
} {
  return container.get("render");
}
