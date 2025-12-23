/**
 * 主题 Store
 * 使用 defineStore 定义，提供类型安全的主题状态管理
 */

import { defineStore } from "../../plugins/store/define-store.ts";

/**
 * 主题 Store 状态类型
 */
export interface ThemeStoreState extends Record<string, unknown> {
  /** 当前实际主题值（'light' | 'dark'） */
  value: "light" | "dark";
}

/**
 * 定义主题 Store
 * 使用对象式 API，简洁易用
 */
export const themeStore = defineStore("theme", {
  state: (): ThemeStoreState => ({
    value: "light",
  }),
  actions: {
    /**
     * 设置主题值
     * @param theme 主题值（'light' | 'dark'）
     */
    setValue(theme: "light" | "dark") {
      this.value = theme;
    },
  },
});

