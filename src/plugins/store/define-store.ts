/**
 * defineStore - 声明式的 Store 定义 API
 * 
 * 支持两种定义方式：
 * 
 * 1. 对象式（Options API）：
 * ```typescript
 * export const exampleStore = defineStore('example', {
 *   state: () => ({
 *     count: 0,
 *     message: '',
 *   }),
 *   actions: {
 *     increment() {
 *       this.count++;
 *     },
 *   },
 * });
 * ```
 * 
 * 2. 函数式（Setup API）：
 * ```typescript
 * export const exampleStore = defineStore('example', () => {
 *   const count = ref(0);
 *   const message = ref('');
 *   
 *   function increment() {
 *     count.value++;
 *   }
 *   
 *   return {
 *     count,
 *     message,
 *     increment,
 *   };
 * });
 * ```
 * 
 * // 在组件中使用
 * import { exampleStore } from '../stores/example.ts';
 * console.log(exampleStore.count); // 直接访问状态
 * exampleStore.increment(); // 调用 action
 * exampleStore.$reset(); // 重置状态
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
 * 辅助类型：让 actions 中的 this 自动推断为 T & StoreInstance<T>
 */
type StoreActions<T extends StoreState> = {
  [K in string]?: (this: T & StoreInstance<T>, ...args: never[]) => void | Promise<void>;
};

/**
 * 辅助函数：用于函数式定义，让 actions 中的 this 自动推断
 * 在函数式定义中，使用这个函数包装 action，让 TypeScript 知道 this 的类型
 * 
 * @example
 * ```typescript
 * export const exampleStore = defineStore('example', ({ storeAction }) => {
 *   const count = 0;
 *   
 *   const increment = storeAction(function() {
 *     this.count++;  // this 类型自动推断
 *   });
 *   
 *   return { count, increment };
 * });
 * ```
 */
export function storeAction<T extends StoreState>(
  fn: (this: T & StoreInstance<T>, ...args: never[]) => void | Promise<void>
): typeof fn {
  return fn;
}

/**
 * Store 选项
 */
export interface StoreOptions<T extends StoreState, A extends StoreActions<T> = StoreActions<T>> {
  /** 初始状态（函数形式，返回状态对象） */
  state: () => T;
  /** 操作函数（可选） */
  actions?: A;
}

// 辅助类型：从返回值中提取状态类型（排除函数）
type ExtractStateFromReturn<R extends Record<string, unknown>> = {
  [K in keyof R as R[K] extends (...args: never[]) => unknown ? never : K]: R[K];
};

/**
 * 定义 Store - 对象式（Options API）
 * 自动推断 actions 类型，无需手动添加类型断言
 * actions 中的 this 类型会自动推断为 T & StoreInstance<T>，无需手动指定
 */
export function defineStore<
  T extends StoreState,
  A extends StoreActions<T> = StoreActions<T>
>(
  name: string,
  options: StoreOptions<T, A>
): StoreInstance<T> & T & {
  [K in keyof A]: A[K] extends (this: T & StoreInstance<T>, ...args: infer P) => infer R
    ? (...args: P) => R
    : never;
};

/**
 * 定义 Store - 函数式（Setup API）
 * 使用函数返回状态和 actions，更灵活
 * actions 中的 this 类型会自动推断，无需手动指定
 * 
 * setup 函数接收一个参数，包含已绑定状态类型的 storeAction 函数
 * storeAction 的类型参数会从 setup 函数的返回值中自动推断
 * 
 * 通过使用条件类型和类型推断，让 storeAction 能够从返回值中提取状态类型
 */
export function defineStore<
  R extends Record<string, unknown>
>(
  name: string,
  setupFn: (helpers: {
    storeAction: <TState extends StoreState = R>(
      fn: (this: TState & StoreInstance<TState>, ...args: never[]) => void | Promise<void>
    ) => typeof fn;
  }) => R
): StoreInstance<Extract<Record<string, unknown>, R>> & R;

/**
 * defineStore 实现
 */
export function defineStore<
  T extends StoreState,
  A extends StoreActions<T> = StoreActions<T>
>(
  name: string,
  optionsOrSetup: StoreOptions<T, A> | ((helpers: { storeAction: <TState extends StoreState = T>(fn: (this: TState & StoreInstance<TState>, ...args: never[]) => void | Promise<void>) => typeof fn }) => T & { [K in string]?: (...args: never[]) => void | Promise<void> | unknown })
): StoreInstance<T> & T & {
  [K in keyof A]: A[K] extends (this: T & StoreInstance<T>, ...args: infer P) => infer R
    ? (...args: P) => R
    : never;
} {
  // 判断是对象式还是函数式
  const isSetupFn = typeof optionsOrSetup === 'function';
  
  let initialState: T;
  let actions: A | undefined;
  
  if (isSetupFn) {
    // 函数式：创建已绑定状态类型的 storeAction 辅助函数
    // 类型参数默认值为 T，但会在调用时从 setup 函数的返回值中推断
    const createStoreAction = <TState extends StoreState = T>(
      fn: (this: TState & StoreInstance<TState>, ...args: never[]) => void | Promise<void>
    ): typeof fn => {
      return fn;
    };
    
    // 调用 setup 函数，传入辅助函数
    // 类型断言：告诉 TypeScript 这个函数的类型，以便类型推断能够工作
    // 使用 R 作为默认类型，让 TypeScript 能够从返回值中推断
    const setupFn = optionsOrSetup as <R extends Record<string, unknown>>(helpers: { 
      storeAction: <TState extends StoreState = R>(
        fn: (this: TState & StoreInstance<TState>, ...args: never[]) => void | Promise<void>
      ) => typeof fn;
    }) => R;
    
    const setupResult = setupFn({
      storeAction: createStoreAction,
    });
    // 从返回值中分离状态和 actions
    const stateObj: Record<string, unknown> = {};
    const actionsObj: Record<string, (...args: never[]) => void | Promise<void>> = {};
    
    for (const [key, value] of Object.entries(setupResult)) {
      if (typeof value === 'function') {
        actionsObj[key] = value as (...args: never[]) => void | Promise<void>;
      } else {
        stateObj[key] = value;
      }
    }
    
    initialState = stateObj as T;
    actions = actionsObj as A;
  } else {
    // 对象式：直接使用 options
    initialState = optionsOrSetup.state();
    actions = optionsOrSetup.actions;
  }
  
  // 自动注册初始状态到全局注册表（用于自动收集）
  __STORE_REGISTRY__.set(name, initialState as Record<string, unknown>);
  
  // 获取当前状态
  const getCurrentState = (): Record<string, unknown> => {
    return (getStoreState<{ [key: string]: Record<string, unknown> }>()?.[name] || initialState) as Record<string, unknown>;
  };
  
  // 创建 actions 的代理，绑定 this（仅用于对象式）
  const createActionProxy = (
    _actionName: string, 
    actionFn: (this: T & StoreInstance<T>, ...args: never[]) => void | Promise<void>
  ) => {
    return (...args: never[]) => {
      // 创建 action 的上下文，this 指向 store 实例
      const context = storeProxy as T & StoreInstance<T>;
      return (actionFn as (this: T & StoreInstance<T>, ...args: never[]) => void | Promise<void>).call(context, ...args);
    };
  };
  
  // 创建 store 代理对象
  const storeProxy = new Proxy({} as T & StoreInstance<T> & {
    [K in keyof A]: A[K] extends (this: T & StoreInstance<T>, ...args: infer P) => infer R
      ? (...args: P) => R
      : never;
  }, {
    get(_target, prop: string | symbol) {
      const currentState = getCurrentState();
      
      // 特殊属性
      if (prop === '$name') return name;
      if (prop === '$state') return currentState;
      if (prop === '$reset') {
        return () => {
          setStoreState<{ [key: string]: Record<string, unknown> }>((prev) => ({
            ...prev,
            [name]: initialState,
          }));
        };
      }
      if (prop === '$subscribe') {
        return (listener: (state: Record<string, unknown>) => void) => {
          // 先立即调用一次，传递当前状态（即使 store 未初始化，也传递初始状态）
          const currentState = getCurrentState();
          listener(currentState);
          
          // 然后订阅全局状态变化
          return subscribeStore<{ [key: string]: Record<string, unknown> }>((allState) => {
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
      if (actions && typeof prop === 'string' && prop in actions) {
        const action = actions[prop];
        if (action) {
          // 函数式和对象式都使用 this 绑定
          // 这样 actions 中可以使用 this 来访问和修改状态
          return createActionProxy(prop, action);
        }
      }
      
      // 状态属性
      if (typeof prop === 'string' && prop in currentState) {
        return (currentState as Record<string, unknown>)[prop];
      }
      
      return undefined;
    },
    
    set(_target, prop: string | symbol, value: unknown) {
      if (typeof prop === 'string' && !prop.startsWith('$')) {
        setStoreState<{ [key: string]: Record<string, unknown> }>((prev) => {
          const current = prev?.[name] || initialState;
          return {
            ...prev,
            [name]: {
              ...current,
              [prop]: value,
            },
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

