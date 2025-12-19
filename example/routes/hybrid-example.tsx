/**
 * Hybrid (混合渲染) 示例
 * 服务端渲染 + 客户端 Hydration
 */

import { useState } from 'preact/hooks';

export const metadata = {
  title: 'Hybrid 示例 - 混合渲染示例页面',
  description: 'DWeb 框架的 Hybrid（混合渲染）模式示例，展示服务端渲染 + 客户端 Hydration 的实现方式',
  keywords: 'DWeb, Hybrid, 混合渲染, SSR, Hydration, 示例, Preact',
  author: 'DWeb',
};

// 导出渲染模式
export const renderMode = 'hybrid' as const;

/**
 * Hybrid 页面组件
 * 服务端渲染初始内容，客户端进行 hydration 并添加交互
 */
export default function HybridPage({ params: _params, query: _query, data: _data }: any) {
  const [count, setCount] = useState(0);
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Hybrid 示例页面</h1>
      <p className="text-gray-600 mb-4">
        这是一个混合渲染（Hybrid）的示例页面。
        初始内容在服务端渲染，然后在客户端进行 hydration 并添加交互功能。
      </p>
      <div className="mt-4">
        <p className="mb-2">计数器: <span className="font-bold text-blue-600">{count}</span></p>
        <div className="space-x-2">
          <button 
            onClick={() => setCount(count + 1)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            增加
          </button>
          <button 
            onClick={() => setCount(count - 1)}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            减少
          </button>
          <button 
            onClick={() => setCount(0)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            重置
          </button>
        </div>
      </div>
    </div>
  );
}

