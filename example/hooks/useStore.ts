/**
 * Store Hook
 * 用于在组件中响应式地使用 defineStore 创建的 store
 * 类似 useState 的 API，可以直接传入 store 实例
 *
 * @example
 * ```typescript
 * import { sidebarStore } from '../stores/sidebar.ts';
 * import { useStore } from '../hooks/useStore.ts';
 *
 * export default function HomePage() {
 *   // 直接使用，类似 useState(store)，会自动响应状态变化
 *   const state = useStore(sidebarStore);
 *
 *   useEffect(() => {
 *     console.log('isCollapsed changed:', state.isCollapsed);
 *   }, [state.isCollapsed]);
 *
 *   return (
 *     <div onClick={() => state.setCollapsed(!state.isCollapsed)}>
 *       isCollapsed: {state.isCollapsed ? 'true' : 'false'}
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * Store 实例类型（通过 defineStore 创建的）
 * 包含 $use 方法用于响应式使用
 */
type StoreInstance<T = Record<string, unknown>> = {
  $use?: () => T;
  $state: T;
  [key: string]: unknown;
};

/**
 * 响应式地使用 Store
 * 类似 useState 的 API，可以直接传入 store 实例
 *
 * @param store Store 实例（通过 defineStore 创建）
 * @returns Store 的当前状态（包含状态和 actions），当状态变化时会自动更新
 *
 * @example
 * ```typescript
 * const state = useStore(exampleStore);
 * // state.count 会自动响应 store 的变化
 * // state.increment() 可以调用 actions
 * ```
 */
export function useStore<T extends Record<string, unknown>>(
  store: StoreInstance<T> & { $use: () => T },
): T {
  // 使用 store 的 $use() 方法获取响应式状态
  // $use() 内部已经处理了 useState 和 useEffect
  return store.$use();
}
