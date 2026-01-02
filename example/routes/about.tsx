/**
 * 关于页面
 * 详细介绍 DWeb 框架的技术栈和设计理念
 */

import TechCard from "../components/TechCard.tsx";
import type { PageProps } from "@dreamer/dweb";

import { getJsrPackageUrl, getVersionString } from "../utils.ts";
import type { LoadContext } from "@dreamer/dweb";

/**
 * 加载页面数据（服务端执行）
 * @param context 包含 params、query、cookies、session 等的上下文对象
 * @returns 页面数据，会自动赋值到组件的 data 属性
 */
export const load = async ({
  params: _params,
  query: _query,
  cookies,
  session,
  getCookie,
  getSession,
}: LoadContext) => {
  // 示例：读取 Cookie
  const token = getCookie("token") || cookies.token;

  // 示例：读取 Session
  const currentSession = session || (await getSession());
  const userId = currentSession?.data?.userId;

  const jsrPackageUrl = getJsrPackageUrl();
  const versionString = getVersionString();

  // console.log({ jsrPackageUrl, versionString });

  return {
    message: "Hello, World!",
    token,
    userId,
    jsrPackageUrl,
    versionString,
  };
};

export const metadata = {
  title: "关于 DWeb - 技术栈与设计理念",
  description:
    "了解 DWeb 框架的技术栈（Deno、Preact、Tailwind CSS）和设计理念（简单易用、性能优先、开发体验、灵活扩展）",
  keywords: "DWeb, Deno, Preact, Tailwind CSS, 技术栈, 设计理念, Web 框架",
  author: "DWeb",
};

/**
 * 关于页面组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function AboutPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 技术栈数据
  const technologies = [
    {
      name: "Deno",
      description:
        "现代 JavaScript/TypeScript 运行时，内置安全性和现代 Web API 支持。Deno 提供了更好的开发体验，无需复杂的构建配置。",
      icon: "🦕",
    },
    {
      name: "Preact",
      description:
        "轻量级 React 替代品，提供相同的 API 但体积更小、性能更好。Preact 只有 3KB，但功能完整，是构建现代 Web 应用的理想选择。",
      icon: "⚛️",
    },
    {
      name: "Tailwind CSS v4",
      description:
        "实用优先的 CSS 框架，快速构建现代化的用户界面。Tailwind CSS v4 提供了更好的性能和更灵活的配置选项。",
      icon: "🎨",
    },
  ];

  // 设计理念
  const principles = [
    {
      title: "简单易用",
      description:
        "提供直观的 API 和清晰的文档，让开发者能够快速上手，专注于业务逻辑而不是框架配置。",
    },
    {
      title: "性能优先",
      description:
        "基于 Deno 和 Preact 等高性能技术，提供多种渲染模式，确保应用在各种场景下都能获得最佳性能。",
    },
    {
      title: "开发体验",
      description:
        "内置 HMR、TypeScript 支持、完整的类型定义，提供优秀的开发体验，让开发更高效、更愉快。",
    },
    {
      title: "灵活扩展",
      description:
        "强大的中间件和插件系统，支持自定义扩展，满足各种业务需求，同时保持框架的简洁性。",
    },
  ];

  return (
    <div className="space-y-0">
      {/* 页面标题 */}
      <div className="relative overflow-hidden bg-linear-to-r bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 py-24">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2">
          </div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2">
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
            关于 DWeb
          </h1>
          <p className="text-xl text-purple-100 dark:text-purple-200 max-w-3xl mx-auto leading-relaxed">
            DWeb 是一个现代化的全栈 Web 框架，基于 Deno + Preact + Tailwind CSS
            构建
          </p>
        </div>
      </div>

      {/* 简介 */}
      <div className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg md:prose-xl max-w-none dark:prose-invert">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-8 tracking-tight">
              框架简介
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-6">
              DWeb 是一个基于 Deno + Preact + Tailwind CSS 的现代化全栈 Web
              框架。
              它旨在提供高性能、易用的开发体验，让开发者能够快速构建现代化的 Web
              应用。
            </p>
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-6">
              DWeb 借鉴了 Next.js、Remix 等优秀框架的设计理念，同时充分利用 Deno
              的现代特性，
              提供了文件系统路由、多种渲染模式、中间件系统、插件系统等强大功能。
            </p>
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
              无论是构建简单的静态网站，还是复杂的全栈应用，DWeb
              都能为您提供最佳的支持。
            </p>
          </div>
        </div>
      </div>

      {/* 技术栈 */}
      <div className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              技术栈
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              DWeb 基于以下现代 Web 技术构建
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {technologies.map((tech, index) => (
              <div
                key={index}
                className="transform hover:-translate-y-2 transition-transform duration-300"
              >
                <TechCard
                  name={tech.name}
                  description={tech.description}
                  icon={tech.icon}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 设计理念 */}
      <div className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              设计理念
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              DWeb 的设计遵循以下核心原则
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {principles.map((principle, index) => (
              <div
                key={index}
                className="p-10 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="w-2 h-8 bg-purple-500 rounded-full mr-3">
                  </span>
                  {principle.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                  {principle.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 开始使用 */}
      <div className="py-24 bg-linear-to-r from-purple-600 to-pink-600 dark:from-purple-900 dark:to-pink-900 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl">
          </div>
          <div className="absolute right-0 top-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl">
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
            准备开始了吗？
          </h2>
          <p className="text-xl text-purple-100 dark:text-purple-200 mb-10 leading-relaxed">
            立即开始使用 DWeb，体验现代化的 Web 开发方式
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a
              href="/docs"
              className="group inline-flex items-center px-10 py-5 text-lg font-bold text-purple-600 dark:text-purple-500 bg-white dark:bg-gray-100 rounded-full hover:bg-gray-50 dark:hover:bg-gray-200 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              查看文档
            </a>
            <a
              href="https://github.com/shuliangfu/dweb"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-10 py-5 text-lg font-bold text-white bg-purple-700 dark:bg-purple-800 rounded-full hover:bg-purple-800 dark:hover:bg-purple-900 transition-all shadow-xl hover:shadow-2xl border-2 border-white/20 dark:border-white/30 hover:-translate-y-1"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
