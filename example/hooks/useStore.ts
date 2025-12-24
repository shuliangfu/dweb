/**
 * Store Hook
 * 用于在组件中响应式地使用 defineStore 创建的 store
 * 
 * @example
 * ```typescript
 * import { sidebarStore } from '../stores/sidebar.ts';
 * import { useStore } from '../hooks/useStore.ts';
 * 
 * export default function HomePage() {
 *   // 直接使用，会自动响应状态变化
 *   const state = useStore(sidebarStore);
 *   
 *   useEffect(() => {
 *     console.log('isCollapsed changed:', state.isCollapsed);
 *   }, [state.isCollapsed]);
 * 
 *   return (
 *     <div onClick={() => sidebarStore.setCollapsed(!state.isCollapsed)}>
 *       isCollapsed: {state.isCollapsed ? 'true' : 'false'}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect } from 'preact/hooks';

/**
 * Store 实例类型（通过 defineStore 创建的）
 */
type StoreInstance<T = Record<string, unknown>> = T & {
  $subscribe: (listener: (state: T) => void) => (() => void) | null;
  $state: T;
  [key: string]: unknown;
};

/**
 * 响应式地使用 Store
 * 
 * @param store Store 实例（通过 defineStore 创建）
 * @returns Store 的当前状态，当状态变化时会自动更新
 * 
 * @example
 * ```typescript
 * const state = useStore(sidebarStore);
 * // state.isCollapsed 会自动响应 store 的变化
 * ```
 */
export function useStore<T extends Record<string, unknown>>(
  store: StoreInstance<T>
): T {
  // 使用 useState 存储状态，初始值为 store 的当前状态
  const [state, setState] = useState<T>(store.$state);

  useEffect(() => {
    // 订阅 store 状态变化
    // $subscribe 会立即调用一次，传递当前状态
    const unsubscribe = store.$subscribe((newState: T) => {
      // 当 store 状态变化时，更新本地 state，触发组件重新渲染
      setState(newState);
    });

    // 清理函数：组件卸载时取消订阅
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [store]); // 依赖 store 实例

  // 返回当前状态
  return state;
}

