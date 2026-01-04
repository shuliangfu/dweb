/**
 * 状态管理示例页面
 * 使用 Store 插件进行跨组件的响应式状态管理
 */

import { useEffect, useState } from "preact/hooks";
import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";
import {
  exampleStore,
  type ExampleStoreState,
  useExampleStore,
} from "@stores/example.ts";

export const metadata = {
  title: "状态管理示例 - DWeb 框架使用示例",
  description: "使用 Store 插件进行跨组件的响应式状态管理",
  keywords: "DWeb, 示例, 状态管理, Store, defineStore",
  author: "DWeb",
};

export const renderMode = "csr";

/**
 * 状态管理示例页面组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function StorePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const [storeState, setStoreState] = useState<ExampleStoreState>(
    exampleStore.$state,
  );

  const store = useExampleStore();

  useEffect(() => {
    const listItems = store.getListItems();
    console.log({ listItems });
  }, [store]);

  useEffect(() => {
    // 订阅状态变化
    const unsubscribe = exampleStore.$subscribe(
      (newState: ExampleStoreState) => {
        setStoreState(newState);
      },
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const storeExampleCode = `// 方式 1：对象式定义（Options API）
// stores/example.ts
import { defineStore } from '@dreamer/dweb/client';

export interface ExampleStoreState extends Record<string, unknown> {
  count: number;
  message: string;
  items: string[];
}

export const exampleStore = defineStore('example', {
  state: (): ExampleStoreState => ({
    count: 0,
    message: '',
    items: [],
  }),
  actions: {
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

// 在页面中使用
import { exampleStore, type ExampleStoreState } from '../stores/example.ts';
import { useState, useEffect } from 'preact/hooks';

export default function MyPage() {
  const [state, setState] = useState<ExampleStoreState>(exampleStore.$state);

  useEffect(() => {
    const unsubscribe = exampleStore.$subscribe((newState: ExampleStoreState) => {
      setState(newState);
    });
    return () => unsubscribe?.();
  }, []);

  return (
    <div>
      <p>Count: {exampleStore.count}</p>
      <button type="button" onClick={() => exampleStore.increment()}>+1</button>
      <button type="button" onClick={() => exampleStore.$reset()}>重置</button>
    </div>
  );
}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Store 状态管理示例
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          使用{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100 font-mono text-sm">
            defineStore
          </code>{" "}
          定义 store，实现跨组件的状态管理。
          <br />
          <span className="text-sm text-gray-500 dark:text-gray-400 mt-2 block">
            支持两种定义方式：<strong>对象式（Options API）</strong> 和{" "}
            <strong>函数式（Setup API）</strong>
          </span>
        </p>
      </div>

      {/* 示例演示 */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* 状态展示 */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              >
              </path>
            </svg>
            当前状态
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <span className="text-gray-500 dark:text-gray-400 font-medium">
                Count
              </span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                {storeState?.count ?? 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <span className="text-gray-500 dark:text-gray-400 font-medium">
                Message
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {storeState?.message || "(空)"}
              </span>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  Items
                </span>
                <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-1 rounded text-xs font-bold">
                  {storeState?.items.length ?? 0}
                </span>
              </div>
              {storeState?.items && storeState.items.length > 0
                ? (
                  <ul className="space-y-1 mt-2 max-h-32 overflow-y-auto">
                    {storeState.items.map((item, index) => (
                      <li
                        key={index}
                        className="text-sm text-gray-600 dark:text-gray-300 flex items-center"
                      >
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2">
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )
                : <p className="text-sm text-gray-400 italic">暂无项目</p>}
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                >
                </path>
              </svg>
              操作控制
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => exampleStore.increment()}
                className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-semibold"
              >
                +1 增加
              </button>
              <button
                type="button"
                onClick={() => exampleStore.decrement()}
                className="px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-semibold"
              >
                -1 减少
              </button>
              <button
                type="button"
                onClick={() => exampleStore.setMessage("Hello from Store!")}
                className="col-span-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors font-semibold"
              >
                设置消息
              </button>
              <button
                type="button"
                onClick={() => exampleStore.addItem(`Item ${Date.now()}`)}
                className="px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors font-semibold"
              >
                添加项目
              </button>
              <button
                type="button"
                onClick={() =>
                  storeState?.items && storeState.items.length > 0 &&
                  exampleStore.removeItem(storeState.items.length - 1)}
                disabled={!storeState?.items || storeState.items.length === 0}
                className="px-4 py-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                删除末项
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => exampleStore.$reset()}
            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-semibold"
          >
            重置所有状态
          </button>
        </div>
      </div>

      {/* 代码示例 */}
      <CodeBlock
        code={storeExampleCode}
        language="typescript"
        title="Store 状态管理代码示例"
      />
    </div>
  );
}
