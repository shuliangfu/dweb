/**
 * 首页组件
 * 路由: /
 */

import type { LoadContext } from "@dreamer/dweb";
import { useState } from "react";

/** 首页元数据（常量），用于生成 <title> / <meta> */
export const metadata = {
  title: "首页 - Dweb Basic",
  description: "Dweb 示例项目首页",
};

/** e2e 用：页面 load 注入的标记 */
export interface HomeLoadData {
  pageLoadMarker: string;
}

export function load(_ctx: LoadContext): Promise<HomeLoadData> {
  return Promise.resolve({
    pageLoadMarker: "page-load-ok",
  });
}

interface HomeProps {
  data?: HomeLoadData;
}

/**
 * 首页
 */
export default function Home({ data }: HomeProps) {
  const [count, setCount] = useState(0);
  return (
    <div className="py-5">
      {/* e2e: 验证页面 load 数据注入 */}
      <span
        data-testid="page-load"
        data-value={data?.pageLoadMarker ?? ""}
        aria-hidden="true"
      />
      <section className="mb-10 rounded-xl bg-linear-to-br from-[#667eea] to-[#764ba2] px-5 py-15 text-center text-white">
        <h1 className="mb-4 text-4xl">欢迎使用 Dweb 框架</h1>
        <p className="text-xl text-white/90">
          这是一个使用 @dreamer/dweb 框架构建的 React 示例项目
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-wide bg-clip-text text-transparent bg-linear-to-r from-[#667eea] to-[#764ba2]">
          特性
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2.5 text-[#667eea]">文件路由</h3>
            <p>基于文件系统的路由，无需手动配置</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2.5 text-[#667eea]">SSR 渲染</h3>
            <p>服务端渲染，提供最佳首屏性能</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2.5 text-[#667eea]">TypeScript</h3>
            <p>完整的 TypeScript 支持</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h3 className="mb-2.5 text-[#667eea]">React</h3>
            <p>流行的 UI 库</p>
          </div>
        </div>
      </section>

      {
        /*
         * data-testid / data-counter-value：与 e2e assertBrowserCounterButtons 一致，便于稳定读数与定位。
         */
      }
      <section
        className="mb-10 rounded-xl border border-gray-200 bg-white p-6 shadow-md"
        data-testid="e2e-counter"
      >
        <h2 className="mb-4 text-center text-[#667eea]">计数器示例</h2>
        <p className="mb-4 text-center text-sm text-gray-500">
          加一、减一、重置
        </p>
        <div className="flex flex-col items-center justify-center gap-4">
          <span
            className="text-2xl font-semibold"
            data-counter-value={String(count)}
          >
            count: {count}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="rounded-lg border-0 bg-[#667eea] px-4 py-2 text-white hover:opacity-90"
              onClick={() => setCount((c) => c + 1)}
            >
              加一
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
              onClick={() => setCount((c) => c - 1)}
            >
              减一
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-gray-600 hover:bg-gray-200"
              onClick={() => setCount(0)}
            >
              重置
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
