/**
 * Example Store - Setup API 方式
 * 使用函数式定义，更灵活
 *
 * 函数式定义的特点：
 * - 直接返回状态值和函数
 * - 状态值会作为初始状态
 * - 函数会作为 actions，可以通过 this 访问和修改状态（与对象式一致）
 */

import { defineStore } from "@dreamer/dweb/client";

export interface ExampleStoreState extends Record<string, unknown> {
  count: number;
  message: string;
  items: string[];
}

/**
 * 定义 Example Store（函数式）
 * 使用 Setup API，直接返回状态和 actions
 *
 * 在函数式中，actions 也可以通过 this 访问和修改状态
 * this 会绑定到 store 实例，与对象式定义方式一致
 */
export const exampleStoreSetup = defineStore(
  "example-setup",
  ({ storeAction }) => {
    // 定义初始状态
    const count: number = 0;
    const message: string = "";
    const items: string[] = [];

    // 定义 actions
    // 使用 storeAction 辅助函数，状态类型会自动推断，无需手动指定
    // 与对象式定义方式一致，无需手动指定 this 类型，也无需 @ts-expect-error 注释
    const increment = storeAction<ExampleStoreState>(function () {
      this.count = (this.count || 0) + 1;
    });

    const decrement = storeAction<ExampleStoreState>(function () {
      this.count = (this.count || 0) - 1;
    });

    const setMessage = storeAction<ExampleStoreState>(function (msg: string) {
      this.message = msg;
    });

    const addItem = storeAction<ExampleStoreState>(function (item: string) {
      const currentItems = this.items || [];
      this.items = [...currentItems, item];
    });

    const removeItem = storeAction<ExampleStoreState>(function (index: number) {
      const currentItems = this.items || [];
      this.items = currentItems.filter((_item: string, i: number) =>
        i !== index
      );
    });

    // 返回状态和 actions
    return {
      count,
      message,
      items,
      increment,
      decrement,
      setMessage,
      addItem,
      removeItem,
    };
  },
);
