/**
 * defineStore - 声明式的 Store 定义 API
 * 
 * 使用示例：
 * ```typescript
 * import { defineStore } from '@dreamer/dweb/client';
 * 
 * export const exampleStore = defineStore('example', {
 *   state: () => ({
 *     count: 0,
 *     message: '',
 *     items: [],
 *   }),
 *   actions: {
 *     increment() {
 *       this.count++;
 *     },
 *     setMessage(msg: string) {
 *       this.message = msg;
 *     },
 *   },
 * });
 * 
 * // 在组件中使用
 * import { exampleStore } from '../stores/example.ts';
 * console.log(exampleStore.count); // 直接访问状态
 * exampleStore.increment(); // 调用 action
 * exampleStore.$reset(); // 重置状态
 * ```
 */

import { 
  getStoreState, 
  setStoreState, 
  subscribeStore 
} from "../../client.ts";

/**
 * Store 状态类型（支持任意对象类型）
 */
type StoreState = Record<string, unknown>;

/**
 * Store 注册表（全局）
 * 用于自动收集所有已定义的 store 的初始状态
 */
const __STORE_REGISTRY__: Map<string, Record<string, unknown>> = new Map();

/**
 * 获取所有已注册的 store 初始状态
 * @returns 所有 store 的初始状态对象
 */
export function getAllStoreInitialStates(): Record<string, unknown> {
  const states: Record<string, unknown> = {};
  for (const [name, state] of __STORE_REGISTRY__.entries()) {
    states[name] = state;
  }
  return states;
}

/**
 * 清除所有已注册的 store（主要用于测试）
 */
export function clearStoreRegistry(): void {
  __STORE_REGISTRY__.clear();
}

/**
 * Store 选项
 */
export interface StoreOptions<T extends StoreState> {
  /** 初始状态（函数形式，返回状态对象） */
  state: () => T;
  /** 操作函数（可选） */
  actions?: Record<string, (this: T & StoreInstance<T>, ...args: any[]) => void | Promise<void>>;
}

/**
 * Store 实例类型
 */
export interface StoreInstance<T extends StoreState> {
  /** Store 名称 */
  $name: string;
  /** 获取完整状态 */
  $state: T;
  /** 重置状态 */
  $reset: () => void;
  /** 订阅状态变化 */
  $subscribe: (listener: (state: T) => void) => (() => void) | null;
}

/**
 * 定义 Store
 * 自动推断 actions 类型，无需手动添加类型断言
 */
export function defineStore<
  T extends StoreState,
  A extends Record<string, (this: T & StoreInstance<T>, ...args: any[]) => void | Promise<void>> = Record<string, never>
>(
  name: string,
  options: StoreOptions<T> & { actions?: A }
): StoreInstance<T> & T & A {
  const initialState = options.state();
  
  // 自动注册初始状态到全局注册表（用于自动收集）
  __STORE_REGISTRY__.set(name, initialState as Record<string, unknown>);
  
  // 获取当前状态
  const getCurrentState = (): T => {
    return (getStoreState<{ [key: string]: T }>()?.[name] || initialState) as T;
  };
  
  // 创建 actions 的代理，绑定 this
  const createActionProxy = (
    _actionName: string, 
    actionFn: (this: T & StoreInstance<T>, ...args: never[]) => void | Promise<void>
  ) => {
    return (...args: unknown[]) => {
      // 创建 action 的上下文，this 指向 store 实例
      const context = storeProxy as T & StoreInstance<T>;
      return (actionFn as (this: T & StoreInstance<T>, ...args: unknown[]) => void | Promise<void>).call(context, ...args);
    };
  };
  
  // 创建 store 代理对象
  const storeProxy = new Proxy({} as StoreInstance<T> & T & A, {
    get(_target, prop: string | symbol) {
      const currentState = getCurrentState();
      
      // 特殊属性
      if (prop === '$name') return name;
      if (prop === '$state') return currentState;
      if (prop === '$reset') {
        return () => {
          setStoreState<{ [key: string]: T }>((prev) => ({
            ...prev,
            [name]: initialState,
          }));
        };
      }
      if (prop === '$subscribe') {
        return (listener: (state: T) => void) => {
          // 先立即调用一次，传递当前状态（即使 store 未初始化，也传递初始状态）
          const currentState = getCurrentState();
          listener(currentState);
          
          // 然后订阅全局状态变化
          return subscribeStore<{ [key: string]: T }>((allState) => {
            const state = allState?.[name];
            if (state) {
              listener(state);
            } else {
              // 如果 store 中还没有这个状态，使用初始状态
              listener(initialState);
            }
          });
        };
      }
      
      // Actions
      if (options.actions && typeof prop === 'string' && prop in options.actions) {
        return createActionProxy(prop, options.actions[prop]);
      }
      
      // 状态属性
      if (typeof prop === 'string' && prop in currentState) {
        return (currentState as Record<string, unknown>)[prop];
      }
      
      return undefined;
    },
    
    set(_target, prop: string | symbol, value: unknown) {
      if (typeof prop === 'string' && !prop.startsWith('$')) {
        setStoreState<{ [key: string]: T }>((prev) => {
          const current = prev?.[name] || initialState;
          return {
            ...prev,
            [name]: {
              ...current,
              [prop]: value,
            } as T,
          };
        });
        return true;
      }
      return false;
    },
  });
  
  return storeProxy;
}

/**
 * 获取 Store 的初始状态（用于自动收集）
 * @param store Store 实例
 * @returns 初始状态
 */
export function getStoreInitialState<T extends StoreState>(
  store: StoreInstance<T>
): T {
  return store.$state;
}

