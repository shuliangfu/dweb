/**
 * DWeb 框架客户端 API
 * 只导出可以在浏览器中使用的函数和类型
 * 避免导入服务端模块（如 Router、Server 等）
 */

// 导出客户端 Store 函数
export {
  getStore,
  getStoreState,
  setStoreState,
  subscribeStore,
  resetStore,
} from './plugins/store/client.ts';

// 导出 defineStore API（声明式 API）
export {
  defineStore,
  getStoreInitialState,
  storeAction,
  useStore,
} from './plugins/store/define-store.ts';

// 导出 Store 类型
export type { Store, StorePluginOptions } from './plugins/store/types.ts';
export type { StoreInstance, StoreOptions } from './plugins/store/define-store.ts';

// 导出主题客户端函数
export {
  getTheme,
  getActualTheme,
  setTheme,
  toggleTheme,
  switchTheme,
  subscribeTheme,
  getThemeValue,
  getThemeMode,
  getThemeManager,
  getThemeStore,
} from './plugins/theme/client.ts';

// 导出主题 Store 实例和类型（方便外部直接访问）
export { themeStore, useThemeStore } from './plugins/theme/store.ts';
export type { ThemeStoreState } from './plugins/theme/store.ts';

// 导出类型（这些只是类型，不会在运行时导入任何代码）
export type {
  Request,
  Response,
  CookieOptions,
  Session,
  LoadContext,
  PageProps,
  LayoutProps,
} from './types/index.ts';

