/**
 * 状态管理插件
 * 提供跨组件的响应式状态管理功能
 */

import type { Plugin, Request, Response } from '../../types/index.ts';
import type { StorePluginOptions, Store } from './types.ts';

/**
 * 创建 Store 实例（客户端）
 */
function createClientStore<T = Record<string, unknown>>(
  initialState: T,
  persist: boolean = false,
  storageKey: string = 'dweb-store',
): Store<T> {
  // 从 localStorage 恢复状态
  let state: T = { ...initialState };
  if (persist && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        state = { ...initialState, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('[Store Plugin] 无法从 localStorage 恢复状态:', error);
    }
  }

  const listeners = new Set<(state: T) => void>();

  return {
    getState: () => state,
    setState: (updater) => {
      const prevState = state;
      const nextState = typeof updater === 'function' 
        ? { ...prevState, ...updater(prevState) }
        : { ...prevState, ...updater };
      
      state = nextState;
      
      // 持久化到 localStorage
      if (persist && typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, JSON.stringify(nextState));
        } catch (error) {
          console.warn('[Store Plugin] 无法保存状态到 localStorage:', error);
        }
      }
      
      // 通知所有监听者
      listeners.forEach((listener) => {
        try {
          listener(state);
        } catch (error) {
          console.error('[Store Plugin] 监听器执行错误:', error);
        }
      });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      // 立即调用一次，传递当前状态
      try {
        listener(state);
      } catch (error) {
        console.error('[Store Plugin] 监听器执行错误:', error);
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
      state = { ...initialState };
      if (persist && typeof window !== 'undefined') {
        try {
          localStorage.removeItem(storageKey);
        } catch (error) {
          console.warn('[Store Plugin] 无法清除 localStorage:', error);
        }
      }
      listeners.forEach((listener) => {
        try {
          listener(state);
        } catch (error) {
          console.error('[Store Plugin] 监听器执行错误:', error);
        }
      });
    },
  };
}

/**
 * 创建 Store 实例（服务端）
 */
function createServerStore<T = Record<string, unknown>>(
  initialState: T,
): Store<T> {
  let state: T = { ...initialState };
  const listeners = new Set<(state: T) => void>();

  return {
    getState: () => state,
    setState: (updater) => {
      const prevState = state;
      const nextState = typeof updater === 'function' 
        ? { ...prevState, ...updater(prevState) }
        : { ...prevState, ...updater };
      
      state = nextState;
      
      // 通知所有监听者
      listeners.forEach((listener) => {
        try {
          listener(state);
        } catch (error) {
          console.error('[Store Plugin] 监听器执行错误:', error);
        }
      });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      // 立即调用一次，传递当前状态
      try {
        listener(state);
      } catch (error) {
        console.error('[Store Plugin] 监听器执行错误:', error);
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
      state = { ...initialState };
      listeners.forEach((listener) => {
        try {
          listener(state);
        } catch (error) {
          console.error('[Store Plugin] 监听器执行错误:', error);
        }
      });
    },
  };
}

/**
 * 生成客户端 Store 脚本
 */
function generateStoreScript(
  options: StorePluginOptions,
  serverState?: Record<string, unknown>,
): string {
  const config = options;
  const persist = config.persist !== false;
  const storageKey = config.storageKey || 'dweb-store';
  const initialState = config.initialState || {};

  // 序列化服务端状态（如果存在）
  const serverStateJson = serverState ? JSON.stringify(serverState) : 'null';

  return `
    <script>
      (function() {
        // 获取服务端状态（如果存在）
        const serverState = ${serverStateJson};
        
        // 从 localStorage 恢复状态
        let state = ${JSON.stringify(initialState)};
        if (${persist}) {
          try {
            const stored = localStorage.getItem(${JSON.stringify(storageKey)});
            if (stored) {
              // 合并：服务端状态 > localStorage > 初始状态
              const storedState = JSON.parse(stored);
              state = { ...${JSON.stringify(initialState)}, ...storedState };
            }
          } catch (error) {
            console.warn('[Store Plugin] 无法从 localStorage 恢复状态:', error);
          }
        }
        
        // 如果有服务端状态，合并到当前状态中（服务端状态优先级最高）
        if (serverState && typeof serverState === 'object') {
          state = { ...state, ...serverState };
        }

        const listeners = new Set();

        // 创建 Store 对象
        const Store = {
          getState: function() {
            return state;
          },
          setState: function(updater) {
            const prevState = state;
            const nextState = typeof updater === 'function' 
              ? { ...prevState, ...updater(prevState) }
              : { ...prevState, ...updater };
            
            state = nextState;
            
            // 持久化到 localStorage
            if (${persist}) {
              try {
                localStorage.setItem(${JSON.stringify(storageKey)}, JSON.stringify(nextState));
              } catch (error) {
                console.warn('[Store Plugin] 无法保存状态到 localStorage:', error);
              }
            }
            
            // 通知所有监听者
            listeners.forEach((listener) => {
              try {
                listener(state);
              } catch (error) {
                console.error('[Store Plugin] 监听器执行错误:', error);
              }
            });
          },
          subscribe: function(listener) {
            listeners.add(listener);
            // 立即调用一次，传递当前状态
            try {
              listener(state);
            } catch (error) {
              console.error('[Store Plugin] 监听器执行错误:', error);
            }
            // 返回取消订阅函数
            return () => {
              listeners.delete(listener);
            };
          },
          unsubscribe: function(listener) {
            listeners.delete(listener);
          },
          reset: function() {
            state = ${JSON.stringify(initialState)};
            if (${persist}) {
              try {
                localStorage.removeItem(${JSON.stringify(storageKey)});
              } catch (error) {
                console.warn('[Store Plugin] 无法清除 localStorage:', error);
              }
            }
            listeners.forEach((listener) => {
              try {
                listener(state);
              } catch (error) {
                console.error('[Store Plugin] 监听器执行错误:', error);
              }
            });
          },
        };

        // 暴露到全局
        window.__STORE__ = Store;
      })();
    </script>
  `;
}

/**
 * 创建状态管理插件
 */
export function store(options: StorePluginOptions = {}): Plugin {
  const config = options;
  const persist = config.persist !== false;
  const storageKey = config.storageKey || 'dweb-store';
  const enableServer = config.enableServer !== false;
  const initialState = config.initialState || {};

  // 服务端 Store 实例（每个请求独立）
  const serverStores = new WeakMap<Request, Store>();

  return {
    name: 'store',
    config: options as unknown as Record<string, unknown>,

    /**
     * 初始化钩子
     */
    onInit: async (app) => {
      // 在应用实例上添加 getStore 方法
      (app as any).getStore = () => {
        if (typeof globalThis !== 'undefined' && globalThis.window) {
          // 客户端：返回全局 Store
          return (globalThis.window as any).__STORE__;
        }
        return null;
      };
    },

    /**
     * 请求处理钩子 - 为每个请求创建独立的 Store 实例（服务端）
     */
    onRequest: (req: Request) => {
      if (enableServer) {
        const serverStore = createServerStore(initialState);
        serverStores.set(req, serverStore);
        // 在请求对象上添加 getStore 方法
        (req as any).getStore = () => serverStore;
      }
    },

    /**
     * 响应处理钩子 - 注入客户端 Store 脚本
     * 将服务端 Store 的状态注入到客户端 Store 中
     */
    onResponse: (req: Request, res: Response) => {
      // 只处理 HTML 响应
      if (!res.body || typeof res.body !== 'string') {
        return;
      }

      const contentType = res.headers.get('Content-Type') || '';
      if (!contentType.includes('text/html')) {
        return;
      }

      try {
        const html = res.body as string;
        
        // 获取服务端 Store 的状态（如果存在）
        let serverState: Record<string, unknown> | undefined;
        if (enableServer) {
          const serverStore = serverStores.get(req);
          if (serverStore) {
            serverState = serverStore.getState() as Record<string, unknown>;
          }
        }
        
        // 注入 Store 脚本（在 </head> 之前）
        if (html.includes('</head>')) {
          const script = generateStoreScript(options, serverState);
          const newHtml = html.replace('</head>', `${script}\n</head>`);
          res.body = newHtml;
        }
      } catch (error) {
        console.error('[Store Plugin] 注入 Store 脚本时出错:', error);
      }
    },
  };
}

// 导出类型
export type { StorePluginOptions, Store } from './types.ts';

