/**
 * 主题 Store
 * 使用 defineStore 定义，提供类型安全的主题状态管理
 */

import { defineStore, useStore, type StoreInstance } from "../../plugins/store/define-store.ts";

/**
 * 主题 Store 状态类型
 */
export interface ThemeStoreState extends Record<string, unknown> {
  /** 用户选择的主题模式（'light' | 'dark' | 'auto'） */
  mode: "light" | "dark" | "auto";
  /** 当前实际主题值（'light' | 'dark'），当 mode 为 'auto' 时，根据系统主题确定 */
  value: "light" | "dark";
}

/**
 * 主题 Store Actions 类型
 */
interface ThemeStoreActions {
  /** 设置主题模式 */
  setMode: (mode: "light" | "dark" | "auto") => void;
  /** 设置主题值 */
  setValue: (value: "light" | "dark") => void;
}

/**
 * 主题 Store 类型
 */
export type ThemeStore = StoreInstance<ThemeStoreState> & ThemeStoreState & ThemeStoreActions;

/**
 * 定义主题 Store
 * 使用对象式 API，简洁易用
 */
export const themeStore: ThemeStore = defineStore("theme", {
  state: (): ThemeStoreState => ({
    mode: "auto",
    value: "light",
  }),
  actions: {
    /**
     * 设置主题模式
     * @param mode 主题模式（'light' | 'dark' | 'auto'）
     */
    setMode(mode: "light" | "dark" | "auto") {
      this.mode = mode;
    },
    /**
     * 设置主题值
     * @param value 实际主题值（'light' | 'dark'）
     */
    setValue(value: "light" | "dark") {
      this.value = value;
    },
  },
});


export const useThemeStore = (): ThemeStore => {
  return useStore(themeStore) as ThemeStore;
};