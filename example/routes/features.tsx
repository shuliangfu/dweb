/**
 * 特性页面
 * 详细介绍 DWeb 框架的所有特性
 */

import FeatureSection from "../components/FeatureSection.tsx";
import CodeBlock from "../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";
import { getStore } from "../../src/client/mod.ts";

export const metadata = {
  title: "功能特性 - DWeb 框架完整功能列表",
  description:
    "DWeb 框架的完整功能列表，包括文件系统路由、多种渲染模式、HMR、中间件系统、插件系统、Cookie & Session、TypeScript 支持等",
  keywords:
    "DWeb, 功能特性, 文件系统路由, SSR, CSR, Hybrid, HMR, 中间件, 插件, TypeScript",
  author: "DWeb",
};

/**
 * 特性页面组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function FeaturesPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const store = getStore();
  if (store) {
    console.log(store.getState());
    console.log("获取Store数据成功");
  }

  // 所有特性列表
  const allFeatures = [
    {
      title: "文件系统路由",
      description:
        "基于文件系统的自动路由，类似 Next.js。只需在 routes 目录下创建文件，即可自动生成路由，无需手动配置。支持动态路由、嵌套路由和 API 路由。",
      icon: "📁",
      highlighted: true,
    },
    {
      title: "多种渲染模式",
      description:
        "支持 SSR（服务端渲染）、CSR（客户端渲染）和 Hybrid（混合渲染）三种模式。可根据页面需求灵活选择，实现最佳性能和 SEO 优化。",
      icon: "🎨",
      highlighted: true,
    },
    {
      title: "热更新（HMR）",
      description:
        "开发时实时热更新，支持服务端和客户端组件热替换。修改代码后立即看到效果，无需手动刷新页面，大幅提升开发效率。",
      icon: "🔥",
    },
    {
      title: "中间件系统",
      description:
        "灵活的中间件系统，支持链式调用和异步处理。内置日志、CORS、Body Parser、压缩、安全、限流、认证等常用中间件，开箱即用。",
      icon: "🛠️",
    },
    {
      title: "插件系统",
      description:
        "强大的插件系统，支持 Tailwind CSS、自定义插件等。提供完整的插件生命周期钩子，可灵活扩展框架功能。",
      icon: "🔌",
    },
    {
      title: "Cookie & Session",
      description:
        "内置 Cookie 和 Session 管理功能，支持安全的会话存储和配置。提供简单易用的 API，轻松处理用户认证和状态管理。",
      icon: "🍪",
    },
    {
      title: "函数式 API 路由",
      description:
        "基于文件系统的函数式 API 路由，支持 GET、POST 等多种请求方式。通过 URL 路径直接调用函数，简化 API 开发。",
      icon: "⚡",
    },
    {
      title: "TypeScript 支持",
      description:
        "完整的 TypeScript 类型定义，提供优秀的开发体验和类型安全。所有 API 都有完整的类型提示，减少开发错误。",
      icon: "📘",
    },
    {
      title: "Deno 原生",
      description:
        "基于 Deno 运行时，内置安全性和现代 Web API 支持。无需复杂的构建配置，直接使用 ES Modules，享受现代 JavaScript 特性。",
      icon: "🦕",
    },
    {
      title: "单应用和多应用模式",
      description:
        "支持单应用和多应用两种模式。单应用模式适合简单项目，多应用模式适合大型项目，可灵活选择。",
      icon: "📦",
    },
    {
      title: "环境变量管理",
      description:
        "内置环境变量管理功能，支持 .env 文件、类型转换、默认值等。提供 env() API，轻松访问环境变量。",
      icon: "🔐",
    },
    {
      title: "健康检查",
      description:
        "内置健康检查端点，支持基础健康检查、就绪检查和存活检查。方便监控和运维，确保应用正常运行。",
      icon: "💚",
    },
  ];

  // 代码示例
  const routingExample = `// routes/index.tsx
export default function HomePage() {
  return <h1>首页</h1>;
}

// routes/about.tsx
export default function AboutPage() {
  return <h1>关于</h1>;
}

// 自动生成路由：
// / -> routes/index.tsx
// /about -> routes/about.tsx`;

  const renderModeExample = `// 页面级别配置渲染模式
export const renderMode = 'ssr'; // 'ssr' | 'csr' | 'hybrid'

export default function Page() {
  return <div>服务端渲染</div>;
}`;

  const middlewareExample = `// 使用内置中间件
import { cors, logger } from 'dweb';

app.use(logger());
app.use(cors());
// 注意：响应压缩由 Deno.serve 自动处理，无需手动配置`;

  return (
    <div className="space-y-0">
      {/* 页面标题 */}
      <div className="relative overflow-hidden bg-linear-to-r bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 py-24">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
            功能特性
          </h1>
          <p className="text-xl text-orange-100 dark:text-orange-200 max-w-3xl mx-auto leading-relaxed">
            DWeb 提供了现代化 Web 开发所需的所有功能，让您专注于业务逻辑
          </p>
        </div>
      </div>

      {/* 特性展示 */}
      <div className="py-12">
        <FeatureSection
          features={allFeatures}
          title="完整功能列表"
          subtitle="探索 DWeb 框架的所有强大功能"
        />
      </div>

      {/* 代码示例区域 */}
      <div className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              代码示例
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              看看使用 DWeb 开发有多简单
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* 文件系统路由示例 */}
            <CodeBlock 
              code={routingExample} 
              language="typescript" 
              title="文件系统路由" 
            />

            {/* 渲染模式示例 */}
            <CodeBlock 
              code={renderModeExample} 
              language="typescript" 
              title="渲染模式配置" 
            />

          </div>
        </div>
      </div>

      {/* CTA 区域 */}
      <div className="py-24 bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-900 dark:to-amber-900 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
           <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
            准备开始了吗？
          </h2>
          <p className="text-xl text-orange-100 dark:text-orange-200 mb-10 leading-relaxed">
            立即开始使用 DWeb，体验现代化的 Web 开发方式
          </p>
          <a
            href="/docs"
            className="group inline-flex items-center px-10 py-5 text-lg font-bold text-orange-600 dark:text-orange-500 bg-white dark:bg-gray-100 rounded-full hover:bg-gray-50 dark:hover:bg-gray-200 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
          >
            查看文档
            <svg
              className="ml-2 w-5 h-5 transform group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
