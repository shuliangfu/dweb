/// <reference lib="dom" />
/**
 * Store 客户端脚本
 * 在浏览器中运行的状态管理代码
 */

interface StoreConfig {
  persist: boolean;
  storageKey: string;
  initialState: Record<string, unknown>;
  serverState?: Record<string, unknown>;
}

interface Store<T = Record<string, unknown>> {
  getState(): T;
  setState(updater: T | ((prevState: T) => T)): void;
  subscribe(listener: (state: T) => void): () => void;
  unsubscribe(listener: (state: T) => void): void;
  reset(): void;
}

/**
 * 创建客户端 Store
 */
function createClientStore(config: StoreConfig): Store {
  // 获取服务端状态（如果存在）
  const serverState = config.serverState;

  // 从 localStorage 恢复状态
  let state: Record<string, unknown> = { ...config.initialState };
  if (config.persist) {
    try {
      const stored = localStorage.getItem(config.storageKey);
      if (stored) {
        // 合并：服务端状态 > localStorage > 初始状态
        const storedState = JSON.parse(stored);
        state = { ...config.initialState, ...storedState };
      }
    } catch (error) {
      console.warn("[Store Plugin] 无法从 localStorage 恢复状态:", error);
    }
  }

  // 如果有服务端状态，合并到当前状态中（服务端状态优先级最高）
  if (serverState && typeof serverState === "object") {
    state = { ...state, ...serverState };
  }

  const listeners = new Set<(state: Record<string, unknown>) => void>();

  return {
    getState: () => state,

    setState: (updater) => {
      const prevState = state;
      const nextState = typeof updater === "function"
        ? { ...prevState, ...updater(prevState) }
        : { ...prevState, ...updater };

      state = nextState;

      // 持久化到 localStorage
      if (config.persist) {
        try {
          localStorage.setItem(config.storageKey, JSON.stringify(nextState));
        } catch (error) {
          console.warn("[Store Plugin] 无法保存状态到 localStorage:", error);
        }
      }

      // 通知所有监听者
      listeners.forEach((listener) => {
        try {
          listener(state);
        } catch (error) {
          console.error("[Store Plugin] 监听器执行错误:", error);
        }
      });
    },

    subscribe: (listener) => {
      listeners.add(listener);
      // 立即调用一次，传递当前状态
      try {
        listener(state);
      } catch (error) {
        console.error("[Store Plugin] 监听器执行错误:", error);
      }
      // 返回取消订阅函数
      return () => {
        listeners.delete(listener);
      };
    },

    unsubscribe: (listener) => {
      listeners.delete(listener);
    },

    reset: () => {
      state = { ...config.initialState };
      if (config.persist) {
        try {
          localStorage.removeItem(config.storageKey);
        } catch (error) {
          console.warn("[Store Plugin] 无法清除 localStorage:", error);
        }
      }
      listeners.forEach((listener) => {
        try {
          listener(state);
        } catch (error) {
          console.error("[Store Plugin] 监听器执行错误:", error);
        }
      });
    },
  };
}

/**
 * 初始化 Store 系统
 * 暴露到全局，供内联脚本调用
 */
function initStore(config: StoreConfig): void {
  // 创建客户端 Store
  const store = createClientStore(config);

  // 暴露到全局
  (globalThis as any).__STORE__ = store;
}

// 暴露到全局，供内联脚本调用
if (typeof globalThis !== "undefined") {
  (globalThis as any).initStore = initStore;
}
