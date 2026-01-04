/**
 * Example Store
 * 使用 defineStore 定义，声明式 API
 */

import { defineStore, useStore } from "../../src/client/mod.ts";

export interface ExampleStoreState extends Record<string, unknown> {
  count: number;
  message: string;
  items: string[];
  isLoading: boolean;
  listItems: Record<string, unknown>;
}

/**
 * 定义 Example Store
 * 使用声明式 API，简洁易用
 * 直接导出，类型会自动推断
 */
export const exampleStore = defineStore("example", {
  state: (): ExampleStoreState => ({
    count: 0,
    message: "",
    items: [] as string[],
    isLoading: false,
    listItems: {
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    },
  }),
  getters: {
    // 计算属性：在 getters 中，可以通过 this.xxx 访问状态和其他 getters
    // defineStore 会自动处理计算属性的缓存，this 类型会自动推断，无需手动指定
    /**
     * 获取双倍计数
     */
    doubleCount() {
      return this.count * 2;
    },
    /**
     * 获取项目数量
     */
    itemCount() {
      return this.items.length;
    },
    /**
     * 获取是否有项目
     */
    hasItems() {
      return this.items.length > 0;
    },
    /**
     * 获取格式化的消息
     */
    formattedMessage() {
      return this.message ? `消息: ${this.message}` : "暂无消息";
    },
  },
  actions: {
    // 在 actions 中，可以直接通过 this.xxx 访问和修改状态，也可以访问 getters
    // defineStore 会自动处理状态更新，this 类型会自动推断，无需手动指定
    increment() {
      this.count++;
    },
    decrement() {
      this.count--;
    },
    setMessage(message: string) {
      this.message = message;
    },
    addItem(item: string) {
      this.items = [...this.items, item];
    },
    removeItem(index: number) {
      this.items = this.items.filter((_item: string, i: number) => i !== index);
    },
    toggleIsLoading() {
      this.isLoading = !this.isLoading;
    },

    getListItems() {
      return this.listItems;
    },
  },
});

/**
 * 响应式使用 Example Store 的 Hook
 * 在组件中使用，会自动响应状态变化
 *
 * @example
 * ```tsx
 * const state = useExampleStore();
 * // state.count 会自动响应变化
 * // state.increment() 可以调用 actions
 * ```
 */
export const useExampleStore = () => {
  return useStore(exampleStore);
};
