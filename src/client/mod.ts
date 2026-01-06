/**
 * DWeb 客户端模块
 * 导出客户端运行时核心功能，用于浏览器环境
 *
 * 此模块提供以下功能：
 *
 * **状态管理（Store）**
 * - 客户端状态管理 API
 * - 声明式 Store 定义（defineStore）
 * - Store 状态订阅和更新
 *
 * **主题管理（Theme）**
 * - 主题切换功能
 * - 明暗主题支持
 * - 主题状态管理
 *
 * **国际化（i18n）**
 * - 多语言支持
 * - 翻译函数
 * - 语言切换
 *
 * **路由工具**
 * - 获取当前路径和 URL
 * - 查询参数处理
 * - 客户端路由导航
 *
 * **类型定义**
 * - 组件类型（ComponentChild, ComponentChildren）
 * - 页面属性类型（PageProps, LayoutProps）
 * - 请求响应类型（Request, Response, Session）
 *
 * **注意**
 * - `browser-client.ts` 和 `browser-hmr.ts` 不应该从这里导出
 * - 它们应该通过 `<script>` 标签单独加载，避免被打包到页面组件代码中
 *
 * @example
 * ```typescript
 * import { getStore, setStoreState, getTheme, setTheme } from "@dreamer/dweb/client";
 *
 * // 使用 Store
 * const store = getStore("myStore");
 * setStoreState("myStore", { count: 1 });
 *
 * // 使用主题
 * const currentTheme = getTheme();
 * setTheme("dark");
 * ```
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
