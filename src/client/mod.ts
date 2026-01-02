/**
 * DWeb 客户端模块
 * 导出客户端运行时核心
 *
 * 注意：browser-client.ts 和 browser-hmr.ts 不应该从这里导出
 * 它们应该通过 <script> 标签单独加载，避免被打包到页面组件代码中
 */

// 导出通用常量（对浏览器安全）
export { IS_CLIENT, IS_SERVER } from "../common/constants.ts";

// 导出客户端 Store 函数
export {
  getStore,
  getStoreState,
  resetStore,
  setStoreState,
  subscribeStore,
} from "../plugins/store/client.ts";

// 导出 defineStore API（声明式 API）
export {
  defineStore,
  getStoreInitialState,
  storeAction,
  useStore,
} from "../plugins/store/define-store.ts";

// 导出 Store 类型
export type { Store, StorePluginOptions } from "../plugins/store/types.ts";
export type {
  StoreInstance,
  StoreOptions,
} from "../plugins/store/define-store.ts";

// 导出主题客户端函数
export {
  getActualTheme,
  getTheme,
  getThemeManager,
  getThemeMode,
  getThemeStore,
  getThemeValue,
  setTheme,
  subscribeTheme,
  switchTheme,
  toggleTheme,
} from "../plugins/theme/client.ts";

// 导出主题 Store 实例和类型（方便外部直接访问）
export { themeStore, useThemeStore } from "../plugins/theme/store.ts";
export type { ThemeStoreState } from "../plugins/theme/store.ts";

// 导出 i18n 客户端函数
export {
  getCurrentLanguage,
  getI18n,
  getTranslations,
  isI18nInitialized,
  setCurrentLanguage,
  translate,
} from "../plugins/i18n/client.ts";

// 导出路由工具函数
export {
  getCurrentPath,
  getCurrentUrl,
  getQueryParams,
  route,
} from "./utils/route.ts";

// 导出类型（这些只是类型，不会在运行时导入任何代码）
export type {
  ComponentChild,
  ComponentChildren,
  CookieOptions,
  LayoutProps,
  LoadContext,
  PageProps,
  Request,
  Response,
  Session,
} from "../common/types/index.ts";
