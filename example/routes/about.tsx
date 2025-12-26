/**
 * 关于页面
 * 详细介绍 DWeb 框架的技术栈和设计理念
 */

import TechCard from '../components/TechCard.tsx';
import type { PageProps } from '@dreamer/dweb';

import { getJsrPackageUrl, getVersionString } from '../utils.ts';
import type { LoadContext } from '@dreamer/dweb';

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
  const token = getCookie('token') || cookies.token;

  // 示例：读取 Session
  const currentSession = session || (await getSession());
  const userId = currentSession?.data?.userId;

  const jsrPackageUrl = getJsrPackageUrl();
  const versionString = getVersionString();

  // console.log({ jsrPackageUrl, versionString });

  return {
    message: 'Hello, World!',
    token,
    userId,
    jsrPackageUrl,
    versionString,
  };
};

export const metadata = {
  title: '关于 DWeb - 技术栈与设计理念',
  description: '了解 DWeb 框架的技术栈（Deno、Preact、Tailwind CSS）和设计理念（简单易用、性能优先、开发体验、灵活扩展）',
  keywords: 'DWeb, Deno, Preact, Tailwind CSS, 技术栈, 设计理念, Web 框架',
  author: 'DWeb',
};

/**
 * 关于页面组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function AboutPage({ params: _params, query: _query, data: _data }: PageProps) {
  // 技术栈数据
  const technologies = [
    {
      name: 'Deno',
      description: '现代 JavaScript/TypeScript 运行时，内置安全性和现代 Web API 支持。Deno 提供了更好的开发体验，无需复杂的构建配置。',
      icon: '🦕',
    },
    {
      name: 'Preact',
      description: '轻量级 React 替代品，提供相同的 API 但体积更小、性能更好。Preact 只有 3KB，但功能完整，是构建现代 Web 应用的理想选择。',
      icon: '⚛️',
    },
    {
      name: 'Tailwind CSS v4',
      description: '实用优先的 CSS 框架，快速构建现代化的用户界面。Tailwind CSS v4 提供了更好的性能和更灵活的配置选项。',
      icon: '🎨',
    },
  ];

  // 设计理念
  const principles = [
    {
      title: '简单易用',
      description: '提供直观的 API 和清晰的文档，让开发者能够快速上手，专注于业务逻辑而不是框架配置。',
    },
    {
      title: '性能优先',
      description: '基于 Deno 和 Preact 等高性能技术，提供多种渲染模式，确保应用在各种场景下都能获得最佳性能。',
    },
    {
      title: '开发体验',
      description: '内置 HMR、TypeScript 支持、完整的类型定义，提供优秀的开发体验，让开发更高效、更愉快。',
    },
    {
      title: '灵活扩展',
      description: '强大的中间件和插件系统，支持自定义扩展，满足各种业务需求，同时保持框架的简洁性。',
    },
  ];

  return (
    <div className="space-y-0">
      {/* 页面标题 */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            关于 DWeb 
          </h1>
          <p className="text-xl text-blue-100 dark:text-blue-200 max-w-3xl mx-auto">
            DWeb 是一个现代化的全栈 Web 框架，基于 Deno + Preact + Tailwind CSS 构建
          </p>
        </div>
      </div>

      {/* 简介 */}
      <div className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">框架简介</h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-6">
              DWeb 是一个基于 Deno + Preact + Tailwind CSS 的现代化全栈 Web 框架。
              它旨在提供高性能、易用的开发体验，让开发者能够快速构建现代化的 Web 应用。
            </p>
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-6">
              DWeb 借鉴了 Next.js、Remix 等优秀框架的设计理念，同时充分利用 Deno 的现代特性，
              提供了文件系统路由、多种渲染模式、中间件系统、插件系统等强大功能。
            </p>
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
              无论是构建简单的静态网站，还是复杂的全栈应用，DWeb 都能为您提供最佳的支持。
            </p>
          </div>
        </div>
      </div>

      {/* 技术栈 */}
      <div className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              技术栈
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              DWeb 基于以下现代 Web 技术构建
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
        {technologies.map((tech, index) => (
          <TechCard
            key={index}
            name={tech.name}
            description={tech.description}
            icon={tech.icon}
          />
        ))}
          </div>
        </div>
      </div>

      {/* 设计理念 */}
      <div className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              设计理念
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              DWeb 的设计遵循以下核心原则
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {principles.map((principle, index) => (
              <div
                key={index}
                className="p-8 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg dark:hover:shadow-xl transition-all bg-white dark:bg-gray-800"
              >
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {principle.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {principle.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 开始使用 */}
      <div className="py-20 bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            准备开始了吗？
          </h2>
          <p className="text-xl text-blue-100 dark:text-blue-200 mb-8">
            立即开始使用 DWeb，体验现代化的 Web 开发方式
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/docs"
              className="inline-flex items-center px-8 py-4 text-lg font-semibold text-blue-600 dark:text-blue-500 bg-white dark:bg-gray-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-200 transition-all shadow-lg hover:shadow-xl"
            >
              查看文档
            </a>
            <a
              href="https://github.com/shuliangfu/dweb"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-blue-700 dark:bg-blue-800 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-900 transition-all shadow-lg hover:shadow-xl border-2 border-white/20 dark:border-white/30"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
