/**
 * React 渲染适配器
 * 
 * @module core/render/react
 */

import type { RenderAdapter, VNode, ComponentType } from './adapter.ts';
import type { RenderEngine } from './adapter.ts';

/**
 * React 渲染适配器
 * 
 * @example
 * ```ts
 * const adapter = new ReactRenderAdapter();
 * await adapter.initialize();
 * 
 * const vnode = adapter.createElement('div', { id: 'app' }, 'Hello');
 * const html = adapter.renderToString(vnode);
 * ```
 */
export class ReactRenderAdapter implements RenderAdapter {
  readonly name: RenderEngine = 'react';
  
  /** React 的 createElement 函数 */
  private reactCreateElement?: typeof import('react').createElement;
  /** React 的 renderToString 函数 */
  private reactRenderToString?: typeof import('react-dom/server').renderToString;
  /** React 的 hydrateRoot 函数 */
  private hydrateRoot?: typeof import('react-dom/client').hydrateRoot;
  /** React 的 createRoot 函数 */
  private createRoot?: typeof import('react-dom/client').createRoot;

  /**
   * 初始化适配器
   * 动态导入 React 模块
   */
  async initialize(): Promise<void> {
    const [reactModule, reactDomServer, reactDomClient] = await Promise.all([
      import('react'),
      import('react-dom/server'),
      import('react-dom/client'),
    ]);

    this.reactCreateElement = reactModule.createElement;
    this.reactRenderToString = reactDomServer.renderToString;
    this.hydrateRoot = reactDomClient.hydrateRoot;
    this.createRoot = reactDomClient.createRoot;
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
    if (!this.reactCreateElement) {
      throw new Error('React 适配器未初始化，请先调用 initialize()');
    }
    // 将 children 转换为 React 接受的类型
    const reactChildren = children as any;
    return this.reactCreateElement(type as any, props || {}, ...reactChildren) as unknown as VNode;
  }

  /**
   * 服务端渲染
   * 
   * @param element - 虚拟节点
   * @returns HTML 字符串
   */
  renderToString(element: VNode): string {
    if (!this.reactRenderToString) {
      throw new Error('React 适配器未初始化，请先调用 initialize()');
    }
    return this.reactRenderToString(element as any);
  }

  /**
   * 客户端水合
   * 
   * @param element - 虚拟节点
   * @param container - 容器元素
   */
  hydrate(element: VNode, container: Element): void {
    if (!this.hydrateRoot) {
      throw new Error('React 适配器未初始化，请先调用 initialize()');
    }
    const root = this.hydrateRoot(container);
    root.render(element as any);
  }

  /**
   * 客户端渲染
   * 
   * @param element - 虚拟节点
   * @param container - 容器元素
   */
  render(element: VNode, container: Element): void {
    if (!this.createRoot) {
      throw new Error('React 适配器未初始化，请先调用 initialize()');
    }
    const root = this.createRoot(container);
    root.render(element as any);
  }

  /**
   * 获取 JSX Runtime 模块路径
   * 
   * @returns JSX Runtime 模块路径
   */
  getJSXRuntimePath(): string {
    return 'react/jsx-runtime';
  }

  /**
   * 获取客户端运行时模块路径
   * 
   * @returns 客户端运行时模块路径
   */
  getClientRuntimePath(): string {
    return 'react-dom/client';
  }

  /**
   * 获取服务端运行时模块路径
   * 
   * @returns 服务端运行时模块路径
   */
  getServerRuntimePath(): string {
    return 'react-dom/server';
  }

  /**
   * 检测组件是否使用了 React Hooks
   * 
   * @param filePath - 文件路径
   * @returns 如果使用了 Hooks 返回 true，否则返回 false
   */
  async detectHooks(filePath: string): Promise<boolean> {
    try {
      // 检测文件是否使用了 React Hooks
      const content = await Deno.readTextFile(filePath);
      return /useState|useEffect|useContext|useReducer|useCallback|useMemo|useRef|useImperativeHandle|useLayoutEffect|useDebugValue/.test(content);
    } catch {
      return false;
    }
  }
}
