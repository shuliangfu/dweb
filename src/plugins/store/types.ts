/**
 * 状态管理插件类型定义
 */

/**
 * Store 插件配置选项
 */
export interface StorePluginOptions {
  /** 是否启用持久化（默认 false） */
  persist?: boolean;
  /** 持久化存储键名（默认 'dweb-store'） */
  storageKey?: string;
  /** 是否在服务端启用（默认 true） */
  enableServer?: boolean;
  /** 初始状态 */
  initialState?: Record<string, unknown>;
}

/**
 * Store 实例接口
 */
export interface Store<T = Record<string, unknown>> {
  /** 获取状态值 */
  getState(): T;
  /** 设置状态值 */
  setState(updater: Partial<T> | ((prev: T) => Partial<T>)): void;
  /** 订阅状态变化 */
  subscribe(listener: (state: T) => void): () => void;
  /** 取消订阅 */
  unsubscribe(listener: (state: T) => void): void;
  /** 重置状态 */
  reset(): void;
}
