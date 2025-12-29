/**
 * Vue 3 渲染适配器
 *
 * @module core/render/vue3
 */

import type { ComponentType, RenderAdapter, VNode } from "./adapter.ts";
import type { RenderEngine } from "./adapter.ts";

/**
 * Vue 3 渲染适配器
 *
 * @example
 * ```ts
 * const adapter = new Vue3RenderAdapter();
 * await adapter.initialize();
 *
 * const vnode = adapter.createElement('div', { id: 'app' }, 'Hello');
 * const html = await adapter.renderToString(vnode);
 * ```
 */
export class Vue3RenderAdapter implements RenderAdapter {
  readonly name: RenderEngine = "vue3";

  /** Vue 3 的 h 函数 */
  private h?: typeof import("npm:vue@^3.5.13").h;
  /** Vue 3 的 renderToString 函数 */
  private vueRenderToString?:
    typeof import("npm:@vue/server-renderer@^3.5.13").renderToString;
  /** Vue 3 的 renderToWebStream 函数 */
  private vueRenderToStream?:
    typeof import("npm:@vue/server-renderer@^3.5.13").renderToWebStream;
  /** Vue 3 的 createApp 函数 */
  private createApp?: typeof import("npm:vue@^3.5.13").createApp;

  /**
   * 初始化适配器
   * 动态导入 Vue 3 模块
   */
  async initialize(): Promise<void> {
    const [vueModule, serverRenderer] = await Promise.all([
      import("npm:vue@^3.5.13"),
      import("npm:@vue/server-renderer@^3.5.13"),
    ]);

    this.h = vueModule.h;
    this.vueRenderToString = serverRenderer.renderToString;
    this.vueRenderToStream = serverRenderer.renderToWebStream;
    this.createApp = vueModule.createApp;
  }

  /**
   * 创建 VNode
   *
   * @param type - 组件类型
   * @param props - 组件属性
   * @param children - 子元素
   * @returns 虚拟节点
   */
  createElement(
    type: ComponentType,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ): VNode {
    if (!this.h) {
      throw new Error("Vue 3 适配器未初始化，请先调用 initialize()");
    }
    // 将 children 转换为 Vue 3 接受的类型
    const vueChildren = children as any;
    return this.h(type as any, props || {}, ...vueChildren) as unknown as VNode;
  }

  /**
   * 服务端渲染
   * Vue 3 的 renderToString 是异步的
   *
   * @param element - 虚拟节点
   * @returns HTML 字符串（Promise）
   */
  async renderToString(element: VNode): Promise<string> {
    if (!this.vueRenderToString) {
      throw new Error("Vue 3 适配器未初始化，请先调用 initialize()");
    }
    // Vue 3 的 renderToString 是异步的
    return await this.vueRenderToString(element as any);
  }

  /**
   * 服务端流式渲染
   *
   * @param element - 虚拟节点
   * @returns 可读流
   */
  async renderToStream(element: VNode): Promise<ReadableStream> {
    if (!this.vueRenderToStream) {
      throw new Error("Vue 3 适配器未初始化，请先调用 initialize()");
    }
    // Vue 3 的 renderToWebStream 需要 app 实例
    // 这里我们创建一个临时的 app 实例
    if (!this.createApp) {
      throw new Error("Vue 3 适配器未初始化，请先调用 initialize()");
    }
    const app = this.createApp({
      render: () => element as any,
    });
    return this.vueRenderToStream(app);
  }

  /**
   * 客户端水合
   *
   * @param element - 虚拟节点
   * @param container - 容器元素
   */
  hydrate(element: VNode, container: Element): void {
    if (!this.createApp) {
      throw new Error("Vue 3 适配器未初始化，请先调用 initialize()");
    }
    const app = this.createApp({
      render: () => element as any,
    });
    app.mount(container);
  }

  /**
   * 客户端渲染
   *
   * @param element - 虚拟节点
   * @param container - 容器元素
   */
  render(element: VNode, container: Element): void {
    if (!this.createApp) {
      throw new Error("Vue 3 适配器未初始化，请先调用 initialize()");
    }
    const app = this.createApp({
      render: () => element as any,
    });
    app.mount(container);
  }

  /**
   * 获取 JSX Runtime 模块路径
   *
   * @returns JSX Runtime 模块路径
   */
  getJSXRuntimePath(): string {
    return "@vue/babel-plugin-jsx";
  }

  /**
   * 获取客户端运行时模块路径
   *
   * @returns 客户端运行时模块路径
   */
  getClientRuntimePath(): string {
    return "vue";
  }

  /**
   * 获取服务端运行时模块路径
   *
   * @returns 服务端运行时模块路径
   */
  getServerRuntimePath(): string {
    return "@vue/server-renderer";
  }

  /**
   * 检测组件是否使用了 Vue 3 Composition API
   *
   * @param filePath - 文件路径
   * @returns 如果使用了 Composition API 返回 true，否则返回 false
   */
  async detectHooks(filePath: string): Promise<boolean> {
    try {
      // 检测文件是否使用了 Vue 3 Composition API
      const content = await Deno.readTextFile(filePath);
      return /ref\(|reactive\(|computed\(|watch\(|watchEffect\(/.test(content);
    } catch {
      return false;
    }
  }
}
