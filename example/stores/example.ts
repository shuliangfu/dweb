/**
 * Example Store
 * 使用 defineStore 定义，声明式 API
 */

import { defineStore } from "@dreamer/dweb/client";

export interface ExampleStoreState extends Record<string, unknown> {
  count: number;
  message: string;
  items: string[];
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
  }),
  actions: {
    // 在 actions 中，可以直接通过 this.xxx 访问和修改状态
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
export const useExampleStore = (): typeof exampleStore.$state => {
  return (exampleStore.$use as () =>
    typeof exampleStore.$state)() as typeof exampleStore.$state;
};
