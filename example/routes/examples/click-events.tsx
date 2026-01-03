/**
 * 点击事件示例页面
 * 展示如何使用 Preact 的 useState 和事件处理函数实现交互
 */

import { useState } from "preact/hooks";
import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "点击事件示例 - DWeb 框架使用示例",
  description: "使用 Preact 的 useState 和事件处理函数实现交互",
  keywords: "DWeb, 示例, 点击事件, Preact Hooks, useState",
  author: "DWeb",
};

export const renderMode = "csr";

/**
 * 点击事件示例页面组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function ClickEventsPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const [count, setCount] = useState(0);

  /**
   * 点击事件示例：增加计数器
   */
  const handleIncrement = () => {
    setCount(count + 1);
    console.log("计数器已增加到", count + 1);
  };

  /**
   * 点击事件示例：减少计数器
   */
  const handleDecrement = () => {
    setCount(count - 1);
    console.log("计数器已减少到", count - 1);
  };

  /**
   * 点击事件示例：重置计数器
   */
  const handleReset = () => {
    setCount(0);
    console.log("计数器已重置");
  };

  const clickEventCode = `// 点击事件示例
import { useState } from 'preact/hooks';

export default function MyComponent() {
  const [count, setCount] = useState(0);

  const handleIncrement = () => {
    setCount(count + 1);
  };

  const handleDecrement = () => {
    setCount(count - 1);
  };

  return (
    <div>
      <button type="button" onClick={handleDecrement}>-</button>
      <span>{count}</span>
      <button type="button" onClick={handleIncrement}>+</button>
    </div>
  );
}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          点击事件示例
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          使用 Preact 的{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100 font-mono text-sm">
            useState
          </code>{" "}
          和事件处理函数实现交互。
        </p>
      </div>

      {/* 示例演示 */}
      <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-center space-x-8 mb-8">
          <button
            type="button"
            onClick={handleDecrement}
            className="w-16 h-16 flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition-all transform hover:scale-110 active:scale-95 shadow-md"
            aria-label="减少"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20 12H4"
              >
              </path>
            </svg>
          </button>
          <div className="text-6xl font-black text-gray-900 dark:text-white min-w-[120px] text-center font-mono tracking-tighter">
            {count}
          </div>
          <button
            type="button"
            onClick={handleIncrement}
            className="w-16 h-16 flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-all transform hover:scale-110 active:scale-95 shadow-md"
            aria-label="增加"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              >
              </path>
            </svg>
          </button>
        </div>
        <div className="text-center">
          <button
            type="button"
            onClick={handleReset}
            className="px-8 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm tracking-wide uppercase"
          >
            重置计数器
          </button>
        </div>
      </div>

      {/* 代码示例 */}
      <CodeBlock
        code={clickEventCode}
        language="typescript"
        title="点击事件代码示例"
      />
    </div>
  );
}
