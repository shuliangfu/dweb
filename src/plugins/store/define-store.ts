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
  subscribeStore,
} from "../../client/mod.ts";

/**
 * Store 状态类型（支持任意对象类型）
 */
type StoreState = Record<string, unknown>;

/**
 * Store 注册表（全局）
 * 用于自动收集所有已定义的 store 的初始状态
 * 使用全局变量初始化，确保在任何地方使用前都已初始化
 */
function getStoreRegistry(): Map<string, Record<string, unknown>> {
  // 使用全局变量缓存，避免重复创建
  if (!(globalThis as any).__STORE_REGISTRY_INTERNAL__) {
    (globalThis as any).__STORE_REGISTRY_INTERNAL__ = new Map<
      string,
      Record<string, unknown>
    >();
  }
  return (globalThis as any).__STORE_REGISTRY_INTERNAL__;
}

/**
 * 获取所有已注册的 store 初始状态
 * @returns 所有 store 的初始状态对象
 */
export function getAllStoreInitialStates(): Record<string, unknown> {
  const states: Record<string, unknown> = {};
  const registry = getStoreRegistry();
  for (const [name, state] of registry.entries()) {
    states[name] = state;
  }
  return states;
}

/**
 * 清除所有已注册的 store（主要用于测试）
 */
export function clearStoreRegistry(): void {
  getStoreRegistry().clear();
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
  /** 响应式使用 Store 的 Hook（仅在客户端可用） */
  $use: () => StoreInstance<T> & T & Record<string, unknown>;
}

/**
 * 辅助类型：将 actions 对象转换为方法类型（移除 this 参数）
 * 用于在 actions 的 this 类型中包含其他 actions 方法
 * 支持 IDE 代码跟踪，从实际的 actions 对象中提取具体的方法签名
 *
 * 注意：这个类型与 ExtractActions 相同，但用于 ThisType 中
 * 确保 actions 方法内部的 this 能够访问其他 actions 方法，并且 IDE 可以跟踪代码
 */
type ActionsMethods<A> = A extends Record<string, any> ? {
    [K in keyof A]: A[K] extends (this: any, ...args: infer P) => infer R
      ? (...args: P) => R
      : A[K] extends (...args: infer P) => infer R ? (...args: P) => R
      : never;
  }
  : Record<string, never>;

/**
 * 辅助类型：让 actions 中的 this 自动推断
 * 这个类型允许 actions 方法中的 this 访问状态和其他 actions 方法
 * 使用更具体的类型定义，支持 IDE 代码跟踪
 */
type StoreActions<T extends StoreState> = {
  [K in string]?: (
    this: T & StoreInstance<T> & Record<string, (...args: any[]) => any>,
    ...args: any[]
  ) => any;
};

/**
 * 辅助类型：从 actions 对象中提取方法签名
 * 用于在返回类型中包含具体的 actions 方法，支持 IDE 代码跟踪
 * 移除 this 参数，保留其他参数和返回类型
 */
type ExtractActions<A> = A extends Record<string, any> ? {
    [K in keyof A]: A[K] extends (this: any, ...args: infer P) => infer R
      ? (...args: P) => R
      : A[K] extends (...args: infer P) => infer R ? (...args: P) => R
      : never;
  }
  : Record<string, never>;

/**
 * 辅助类型：从 getters 对象中提取计算属性签名
 * 用于在返回类型中包含具体的 getters，支持 IDE 代码跟踪
 * getters 是只读的计算属性，不需要移除 this 参数
 */
type ExtractGetters<G> = G extends Record<string, any> ? {
    [K in keyof G]: G[K] extends (this: any, ...args: infer P) => infer R
      ? (...args: P) => R
      : G[K] extends (...args: infer P) => infer R ? (...args: P) => R
      : never;
  }
  : Record<string, never>;

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
  fn: (this: T & StoreInstance<T>, ...args: never[]) => void | Promise<void>,
): typeof fn {
  return fn;
}

/**
 * Store 选项
 * actions 中的 this 类型会自动包含所有 actions 方法，支持 IDE 代码跟踪
 * getters 中的 this 类型会自动包含状态和所有 getters，支持 IDE 代码跟踪
 * 使用 ThisType 来让 TypeScript 能够推断 actions 和 getters 中的 this 类型
 */
export interface StoreOptions<
  T extends StoreState,
  A extends StoreActions<T> = StoreActions<T>,
  G extends Record<
    string,
    (this: T & Record<string, unknown>, ...args: any[]) => any
  > = Record<
    string,
    (this: T & Record<string, unknown>, ...args: any[]) => any
  >,
> {
  /** 初始状态（函数形式，返回状态对象） */
  state: () => T;
  /** 计算属性（可选），类似 Vuex 的 getters */
  getters?: G & ThisType<T & G>;
  /** 操作函数（可选） */
  actions?:
    & A
    & ThisType<
      T & StoreInstance<T> & ActionsMethods<NonNullable<A>> & ExtractGetters<G>
    >;
}

// 辅助类型：从返回值中提取状态类型（排除函数）
type ExtractStateFromReturn<R extends Record<string, unknown>> = {
  [K in keyof R as R[K] extends (...args: never[]) => unknown ? never : K]:
    R[K];
};

/**
 * 定义 Store - 对象式（Options API）
 * 自动推断 actions 和 getters 类型，无需手动添加类型断言
 * actions 中的 this 类型会自动推断，支持 IDE 代码跟踪
 * getters 中的 this 类型会自动推断，可以访问状态和其他 getters
 * 返回类型包含状态、所有 getters 和所有 actions 方法，支持 IDE 跳转到定义
 *
 * 关键：让 TypeScript 从实际的 actions 和 getters 对象中推断类型
 * 使用 ExtractActions<A> 和 ExtractGetters<G> 提取方法签名，支持 IDE 代码跟踪
 * 在 ThisType 中使用 ActionsMethods<A>，从实际的 actions 对象中提取方法签名
 * 这样 actions 方法内部的 this 就能访问其他 actions 方法、getters 和状态，并且 IDE 可以跟踪代码
 *
 * 注意：这里使用默认类型，但通过 ThisType 让 TypeScript 能够从实际的 actions 和 getters 对象中推断类型
 * 虽然 ActionsMethods<A> 在默认情况下无法提取具体方法签名，但 ThisType 会让 TypeScript 尝试从实际的 actions 对象中推断
 */
export function defineStore<
  T extends StoreState,
  G extends Record<
    string,
    (this: T & Record<string, unknown>, ...args: any[]) => any
  > = Record<
    string,
    (this: T & Record<string, unknown>, ...args: any[]) => any
  >,
  A extends Record<
    string,
    (
      this: T & StoreInstance<T> & Record<string, (...args: any[]) => any>,
      ...args: any[]
    ) => any
  > = Record<
    string,
    (
      this: T & StoreInstance<T> & Record<string, (...args: any[]) => any>,
      ...args: any[]
    ) => any
  >,
>(
  name: string,
  options: {
    state: () => T;
    getters?: G & ThisType<T & G>;
    actions?:
      & A
      & ThisType<T & StoreInstance<T> & ActionsMethods<A> & ExtractGetters<G>>;
  },
): StoreInstance<T> & T & ExtractGetters<G> & ExtractActions<A>;

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
  R extends Record<string, unknown>,
>(
  name: string,
  setupFn: (helpers: {
    storeAction: <TState extends StoreState = R>(
      fn: (
        this: TState & StoreInstance<TState>,
        ...args: never[]
      ) => void | Promise<void>,
    ) => typeof fn;
  }) => R,
): StoreInstance<Extract<Record<string, unknown>, R>> & R;

/**
 * defineStore 实现
 */
export function defineStore<
  T extends StoreState,
  G extends Record<
    string,
    (this: T & Record<string, unknown>, ...args: any[]) => any
  > = Record<
    string,
    (this: T & Record<string, unknown>, ...args: any[]) => any
  >,
  A extends Record<
    string,
    (
      this: T & StoreInstance<T> & Record<string, (...args: any[]) => any>,
      ...args: any[]
    ) => any
  > = Record<
    string,
    (
      this: T & StoreInstance<T> & Record<string, (...args: any[]) => any>,
      ...args: any[]
    ) => any
  >,
>(
  name: string,
  optionsOrSetup:
    | {
      state: () => T;
      getters?: G & ThisType<T & G>;
      actions?:
        & A
        & ThisType<
          T & StoreInstance<T> & ActionsMethods<A> & ExtractGetters<G>
        >;
    }
    | ((
      helpers: {
        storeAction: <TState extends StoreState = T>(
          fn: (
            this: TState & StoreInstance<TState>,
            ...args: never[]
          ) => void | Promise<void>,
        ) => typeof fn;
      },
    ) =>
      & T
      & {
        [K in string]?: (...args: never[]) => void | Promise<void> | unknown;
      }),
): StoreInstance<T> & T & ExtractGetters<G> & ExtractActions<A> {
  // 判断是对象式还是函数式
  const isSetupFn = typeof optionsOrSetup === "function";

  let initialState: T;
  let getters: G | undefined;
  let actions: A | undefined;

  if (isSetupFn) {
    // 函数式：创建已绑定状态类型的 storeAction 辅助函数
    // 类型参数默认值为 T，但会在调用时从 setup 函数的返回值中推断
    const createStoreAction = <TState extends StoreState = T>(
      fn: (
        this: TState & StoreInstance<TState>,
        ...args: never[]
      ) => void | Promise<void>,
    ): typeof fn => {
      return fn;
    };

    // 调用 setup 函数，传入辅助函数
    // 类型断言：告诉 TypeScript 这个函数的类型，以便类型推断能够工作
    // 使用 R 作为默认类型，让 TypeScript 能够从返回值中推断
    const setupFn = optionsOrSetup as <R extends Record<string, unknown>>(
      helpers: {
        storeAction: <TState extends StoreState = R>(
          fn: (
            this: TState & StoreInstance<TState>,
            ...args: never[]
          ) => void | Promise<void>,
        ) => typeof fn;
      },
    ) => R;

    const setupResult = setupFn({
      storeAction: createStoreAction,
    });
    // 从返回值中分离状态和 actions
    const stateObj: Record<string, unknown> = {};
    const actionsObj: Record<
      string,
      (...args: never[]) => void | Promise<void>
    > = {};

    for (const [key, value] of Object.entries(setupResult)) {
      if (typeof value === "function") {
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
    getters = optionsOrSetup.getters;
    actions = optionsOrSetup.actions;
  }

  // 自动注册初始状态到全局注册表（用于自动收集）
  getStoreRegistry().set(name, initialState as Record<string, unknown>);

  // 获取当前状态
  const getCurrentState = (): Record<string, unknown> => {
    const globalState = getStoreState<
      { [key: string]: Record<string, unknown> }
    >();
    // 如果全局状态不存在，或者该 store 的状态不存在，使用初始状态
    if (!globalState || !globalState[name]) {
      return initialState as Record<string, unknown>;
    }
    // 合并初始状态和当前状态，确保所有初始定义的属性都存在
    return { ...initialState, ...globalState[name] } as Record<string, unknown>;
  };

  // 创建 actions 的代理，绑定 this（仅用于对象式）
  // this 类型包含状态、StoreInstance 方法和所有 actions 方法
  // 使用 ActionsMethods<A> 让 actions 中的 this 能够访问其他 actions 方法，支持 IDE 代码跟踪
  // 注意：这里使用 ActionsMethods<A> 而不是 ExtractActions<A>，因为 ThisType 中使用的是 ActionsMethods<A>
  const createActionProxy = (
    _actionName: string,
    actionFn: (
      this: T & StoreInstance<T> & ActionsMethods<A>,
      ...args: never[]
    ) => void | Promise<void>,
  ) => {
    return (...args: never[]) => {
      // 创建 action 的上下文，this 指向 store 实例（包含状态、StoreInstance 方法和所有 actions）
      // 使用 ActionsMethods<A> 确保类型一致性，支持 IDE 代码跟踪
      const context = storeProxy as T & StoreInstance<T> & ActionsMethods<A>;
      return (actionFn as (
        this: T & StoreInstance<T> & ActionsMethods<A>,
        ...args: never[]
      ) => void | Promise<void>).call(context, ...args);
    };
  };

  // 创建 getters 的代理，绑定 this（仅用于对象式）
  // this 类型包含状态和所有 getters，支持 IDE 代码跟踪
  const createGetterProxy = (
    _getterName: string,
    getterFn: (this: T & ExtractGetters<G>, ...args: never[]) => unknown,
  ) => {
    return (...args: never[]) => {
      // 创建 getter 的上下文，this 指向 store 实例（包含状态和所有 getters）
      // 使用 ExtractGetters<G> 确保类型一致性，支持 IDE 代码跟踪
      const context = storeProxy as T & ExtractGetters<G>;
      return (getterFn as (
        this: T & ExtractGetters<G>,
        ...args: never[]
      ) => unknown).call(context, ...args);
    };
  };

  // 创建 store 代理对象
  // 类型断言：确保 storeProxy 的类型与返回类型匹配
  // 使用 ExtractGetters<G> 和 ExtractActions<A> 支持 IDE 代码跟踪
  const storeProxy = new Proxy(
    {} as StoreInstance<T> & T & ExtractGetters<G> & ExtractActions<A>,
    {
      get(_target, prop: string | symbol) {
        const currentState = getCurrentState();

        // 特殊属性
        if (prop === "$name") return name;
        if (prop === "$state") {
          // 返回 store 代理对象本身，这样既可以访问状态，也可以调用 actions 和 getters
          // 例如：const state = store.$state; state.count; state.increment();
          return storeProxy;
        }
        if (prop === "$reset") {
          return () => {
            setStoreState<{ [key: string]: Record<string, unknown> }>((
              prev,
            ) => ({
              ...prev,
              [name]: initialState,
            }));
          };
        }
        if (prop === "$subscribe") {
          return (listener: (state: Record<string, unknown>) => void) => {
            // 先立即调用一次，传递当前状态（即使 store 未初始化，也传递初始状态）
            const currentState = getCurrentState();
            listener(currentState);

            // 然后订阅全局状态变化
            return subscribeStore<{ [key: string]: Record<string, unknown> }>(
              (allState) => {
                const state = allState?.[name];
                if (state) {
                  // 合并初始状态和当前状态，确保所有初始定义的属性都存在
                  listener(
                    { ...initialState, ...state } as Record<string, unknown>,
                  );
                } else {
                  // 如果 store 中还没有这个状态，使用初始状态
                  listener(initialState as Record<string, unknown>);
                }
              },
            );
          };
        }
        if (prop === "$use") {
          // 返回一个 hook 函数，用于在组件中响应式地使用 store
          // 这个函数会在组件的顶层被调用，所以可以安全地使用 hooks
          // 返回 store 代理对象本身，这样既可以访问状态，也可以调用 actions 和 getters
          return function useStoreHook(): typeof storeProxy {
            // 检查是否在客户端环境
            const isClient = typeof globalThis !== "undefined" &&
              "window" in globalThis &&
              "document" in globalThis;

            if (!isClient) {
              // 服务端渲染时，返回 store 代理对象
              return storeProxy;
            }

            // 客户端环境：使用 hooks 实现响应式更新
            try {
              // 从全局获取 hooks（preact 会被预加载到 globalThis.__PREACT_HOOKS__）
              const hooks = (globalThis as any).__PREACT_HOOKS__;

              if (!hooks || !hooks.useState || !hooks.useEffect) {
                // 如果 hooks 不可用，返回 store 代理对象
                return storeProxy;
              }

              const { useState, useEffect } = hooks;

              // 使用 useState 存储一个版本号，用于触发重新渲染
              // 当状态变化时，更新版本号，触发组件重新渲染
              const [_version, setVersion] = useState(0);

              // 使用 useEffect 订阅 store 状态变化
              useEffect(() => {
                // 订阅 store 状态变化
                const unsubscribe = storeProxy.$subscribe((_newState: T) => {
                  // 当 store 状态变化时，更新版本号，触发组件重新渲染
                  // 组件重新渲染时，会重新访问 store 代理对象的属性，获取最新状态
                  setVersion((v: number) => v + 1);
                });

                // 清理函数：组件卸载时取消订阅
                return () => {
                  if (unsubscribe) {
                    unsubscribe();
                  }
                };
              }, []); // 空依赖数组，只在组件挂载时订阅一次

              // 返回 store 代理对象本身（包含状态、getters 和 actions）
              // 当 version 变化时，组件会重新渲染，重新访问代理对象的属性，获取最新状态
              // 使用 _version 来确保依赖项正确，触发重新渲染
              void _version; // 标记为已使用，避免警告
              return storeProxy;
            } catch (error) {
              // 如果出错（比如 hooks 不可用），返回 store 代理对象
              console.warn(
                "[Store] $use hook 执行失败，返回 store 代理对象:",
                error,
              );
              return storeProxy;
            }
          };
        }

        // Getters（计算属性）
        if (getters && typeof prop === "string") {
          const getter = (getters as Record<string, unknown>)[prop];
          if (getter && typeof getter === "function") {
            // 创建 getter 的代理，绑定 this（包含状态和所有 getters）
            // 这样 getters 中可以使用 this 来访问状态和其他 getters
            return createGetterProxy(
              prop,
              getter as (
                this: T & ExtractGetters<G>,
                ...args: never[]
              ) => unknown,
            );
          }
        }

        // Actions
        if (actions && typeof prop === "string") {
          const action = (actions as Record<string, unknown>)[prop];
          if (action && typeof action === "function") {
            // 函数式和对象式都使用 this 绑定
            // 这样 actions 中可以使用 this 来访问和修改状态，也可以调用其他 actions 和 getters
            // 使用 ActionsMethods<A> 让 actions 中的 this 能够访问其他 actions 方法，支持 IDE 代码跟踪
            return createActionProxy(
              prop,
              action as (
                this: T & StoreInstance<T> & ActionsMethods<A>,
                ...args: never[]
              ) => void | Promise<void>,
            );
          }
        }

        // 状态属性
        if (typeof prop === "string" && prop in currentState) {
          return (currentState as Record<string, unknown>)[prop];
        }

        return undefined;
      },

      set(_target, prop: string | symbol, value: unknown) {
        if (typeof prop === "string" && !prop.startsWith("$")) {
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
    },
  );

  return storeProxy;
}

/**
 * 响应式使用 Store 的 Hook
 * 类似 useState 的 API，可以直接传入 store 实例
 *
 * @param store Store 实例（通过 defineStore 创建）
 * @returns Store 的当前状态（包含状态和 actions），当状态变化时会自动更新
 *
 * @example
 * ```typescript
 * import { exampleStore, useStore } from '@dreamer/dweb/client';
 *
 * export default function MyComponent() {
 *   const state = useStore(exampleStore);
 *   // state.count 会自动响应 store 的变化
 *   // state.increment() 可以调用 actions
 * }
 * ```
 */
export function useStore<
  T extends StoreState,
  S extends StoreInstance<T> & T & Record<string, unknown> =
    & StoreInstance<T>
    & T
    & Record<string, unknown>,
>(
  store: S,
): S {
  // 使用 store 的 $use() 方法获取响应式 store 代理对象
  // $use() 内部已经处理了 useState 和 useEffect
  // 返回 store 代理对象本身，这样既可以访问状态，也可以调用 actions
  return store.$use() as unknown as S;
}

/**
 * 获取 Store 的初始状态（用于自动收集）
 * @param store Store 实例
 * @returns 初始状态
 */
export function getStoreInitialState<T extends StoreState>(
  store: StoreInstance<T>,
): T {
  return store.$state;
}
