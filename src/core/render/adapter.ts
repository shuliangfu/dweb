/**
 * 渲染适配器模块
 * 提供统一的渲染引擎接口，支持 Preact、React、Vue3 等多种渲染引擎
 * 
 * @module core/render/adapter
 */

/**
 * 渲染引擎类型
 */
export type RenderEngine = 'preact' | 'react' | 'vue3';

/**
 * 组件类型
 * 可以是字符串（HTML 标签）或函数（组件）
 */
export type ComponentType = string | ((props: Record<string, unknown>) => unknown);

/**
 * VNode 类型（渲染引擎无关）
 * 抽象不同渲染引擎的虚拟节点差异
 */
export interface VNode {
  type: ComponentType;
  props: Record<string, unknown>;
  children?: VNode[];
}

/**
 * 渲染适配器接口
 * 所有渲染引擎适配器都必须实现此接口
 * 
 * @example
 * ```ts
 * class MyRenderAdapter implements RenderAdapter {
 *   readonly name: RenderEngine = 'preact';
 *   // 实现所有必需的方法
 * }
 * ```
 */
export interface RenderAdapter {
  /**
   * 渲染引擎名称
   */
  readonly name: RenderEngine;

  /**
   * 创建 VNode（JSX 工厂函数）
   * 对应 Preact 的 h(), React 的 createElement(), Vue 的 h()
   * 
   * @param type - 组件类型（字符串或函数）
   * @param props - 组件属性
   * @param children - 子元素
   * @returns 虚拟节点
   */
  createElement(
    type: ComponentType,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ): VNode;

  /**
   * 服务端渲染（SSR）
   * 将组件树渲染为 HTML 字符串
   * 
   * @param element - 虚拟节点
   * @returns HTML 字符串
   */
  renderToString(element: VNode): string | Promise<string>;

  /**
   * 客户端水合（Hydration）
   * 将服务端渲染的 HTML 与客户端组件关联
   * 
   * @param element - 虚拟节点
   * @param container - 容器元素
   */
  hydrate(element: VNode, container: Element): void;

  /**
   * 客户端渲染（CSR）
   * 在客户端渲染组件树
   * 
   * @param element - 虚拟节点
   * @param container - 容器元素
   */
  render(element: VNode, container: Element): void;

  /**
   * 获取 JSX Runtime 模块路径
   * 用于客户端代码编译
   * 
   * @returns JSX Runtime 模块路径
   */
  getJSXRuntimePath(): string;

  /**
   * 获取客户端运行时模块路径
   * 用于客户端渲染
   * 
   * @returns 客户端运行时模块路径
   */
  getClientRuntimePath(): string;

  /**
   * 获取服务端运行时模块路径
   * 用于服务端渲染
   * 
   * @returns 服务端运行时模块路径
   */
  getServerRuntimePath(): string;

  /**
   * 检测组件是否使用了 Hooks
   * 用于自动检测渲染模式
   * 
   * @param filePath - 文件路径
   * @returns 如果使用了 Hooks 返回 true，否则返回 false
   */
  detectHooks?(filePath: string): Promise<boolean>;

  /**
   * 初始化适配器
   * 在应用启动时调用，用于加载必要的模块
   */
  initialize?(): Promise<void> | void;

  /**
   * 清理适配器
   * 在应用关闭时调用，用于清理资源
   */
  destroy?(): Promise<void> | void;
}
