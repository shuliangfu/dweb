/**
 * Preact 渲染适配器
 * 当前默认渲染引擎
 *
 * @module core/render/preact
 */

import type { ComponentType, RenderAdapter, VNode } from "./adapter.ts";
import type { RenderEngine } from "./adapter.ts";

/**
 * Preact 渲染适配器
 * 当前默认渲染引擎
 *
 * @example
 * ```ts
 * const adapter = new PreactRenderAdapter();
 * await adapter.initialize();
 *
 * const vnode = adapter.createElement('div', { id: 'app' }, 'Hello');
 * const html = adapter.renderToString(vnode);
 * ```
 */
export class PreactRenderAdapter implements RenderAdapter {
  readonly name: RenderEngine = "preact";

  /** Preact 的 h 函数 */
  private h?: typeof import("npm:preact@10.28.0").h;
  /** Preact 的 renderToString 函数 */
  private preactRenderToString?:
    typeof import("npm:preact-render-to-string@6.5.1").renderToString;
  /** Preact 的 renderToReadableStream 函数 */
  // deno-lint-ignore no-explicit-any
  private preactRenderToStream?: any;
  /** Preact 的 hydrate 函数 */
  private preactHydrate?: typeof import("npm:preact@10.28.0").hydrate;
  /** Preact 的 render 函数 */
  private preactRender?: typeof import("npm:preact@10.28.0").render;

  /**
   * 初始化适配器
   * 动态导入 Preact 模块
   */
  async initialize(): Promise<void> {
    // 动态导入 Preact 模块
    const { h } = await import("npm:preact@10.28.0");
    this.h = h;

    const { renderToString } = await import(
      "npm:preact-render-to-string@6.5.1"
    );
    this.preactRenderToString = renderToString;

    try {
      // deno-lint-ignore no-explicit-any
      const preactServer: any = await import(
        "npm:preact-render-to-string@6.5.1"
      );
      this.preactRenderToStream = preactServer.renderToReadableStream;
      if (!this.preactRenderToStream) {
        // console.warn(
        //   "preact-render-to-string 模块中未找到 renderToReadableStream，流式渲染将不可用",
        // );
      }
    } catch {
      // 忽略，可能版本不支持
    }

    const { hydrate, render } = await import("npm:preact@10.28.0");
    this.preactHydrate = hydrate;
    this.preactRender = render;
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
      throw new Error("Preact 适配器未初始化，请先调用 initialize()");
    }
    // 将 children 转换为 Preact 接受的类型
    const preactChildren = children as any;
    return this.h(
      type as any,
      props || {},
      ...preactChildren,
    ) as unknown as VNode;
  }

  /**
   * 服务端渲染
   *
   * @param element - 虚拟节点
   * @returns HTML 字符串
   */
  renderToString(element: VNode): string {
    if (!this.preactRenderToString) {
      throw new Error("Preact 适配器未初始化，请先调用 initialize()");
    }
    return this.preactRenderToString(element as any);
  }

  /**
   * 服务端流式渲染
   *
   * @param element - 虚拟节点
   * @returns 可读流
   */
  renderToStream(element: VNode): ReadableStream {
    if (!this.preactRenderToStream) {
      throw new Error("Preact 适配器未初始化或不支持流式渲染");
    }
    return this.preactRenderToStream(element as any);
  }

  /**
   * 客户端水合
   *
   * @param element - 虚拟节点
   * @param container - 容器元素
   */
  hydrate(element: VNode, container: Element): void {
    if (!this.preactHydrate) {
      throw new Error("Preact 适配器未初始化，请先调用 initialize()");
    }
    this.preactHydrate(element as any, container);
  }

  /**
   * 客户端渲染
   *
   * @param element - 虚拟节点
   * @param container - 容器元素
   */
  render(element: VNode, container: Element): void {
    if (!this.preactRender) {
      throw new Error("Preact 适配器未初始化，请先调用 initialize()");
    }
    this.preactRender(element as any, container);
  }

  /**
   * 获取 JSX Runtime 模块路径
   *
   * @returns JSX Runtime 模块路径
   */
  getJSXRuntimePath(): string {
    return "preact/jsx-runtime";
  }

  /**
   * 获取客户端运行时模块路径
   *
   * @returns 客户端运行时模块路径
   */
  getClientRuntimePath(): string {
    return "preact";
  }

  /**
   * 获取服务端运行时模块路径
   *
   * @returns 服务端运行时模块路径
   */
  getServerRuntimePath(): string {
    return "preact-render-to-string";
  }

  /**
   * 检测组件是否使用了 Preact Hooks
   *
   * @param filePath - 文件路径
   * @returns 如果使用了 Hooks 返回 true，否则返回 false
   */
  async detectHooks(filePath: string): Promise<boolean> {
    try {
      // 检测文件是否使用了 Preact Hooks
      const content = await Deno.readTextFile(filePath);
      return /from\s+['"]preact\/hooks['"]|import\s+.*\s+from\s+['"]preact\/hooks['"]/
        .test(content);
    } catch {
      return false;
    }
  }
}
