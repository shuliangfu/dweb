/**
 * 关于页面
 * 介绍应用和框架的基本信息
 */

import type { LoadContext } from '@dreamer/dweb';

/**
 * 页面元数据（用于 SEO）
 * 支持对象或函数两种形式：
 * - 对象：静态元数据
 * - 函数：动态元数据（可以基于 params、query、data、cookies、session 等生成）
 * 
 * metadata 函数接收与 load 函数相同的完整参数（LoadContext），
 * 并额外提供 data 参数（load 函数返回的数据）
 */
export function metadata({
  params: _params,
  query: _query,
  cookies: _cookies,
  session: _session,
  getCookie: _getCookie,
  getSession: _getSession,
  db: _db,
  lang: _lang,
  store: _store,
  data: _data,
}: LoadContext & { data: unknown }): {
  title: string;
  description: string;
  keywords: string;
  author: string;
} {
  return {
    title: '关于 - app-test',
    description: '了解 app-test 应用和 DWeb 框架的技术栈与设计理念',
    keywords: 'app-test, DWeb, Deno, Preact, Tailwind CSS, 技术栈',
    author: 'app-test',
  };
}

/**
 * 关于页面组件
 * @returns JSX 元素
 */
export default function About() {
  // 技术栈信息
  const technologies = [
    {
      name: 'Deno',
      description: '现代 JavaScript/TypeScript 运行时，内置安全性和现代 Web API 支持',
      icon: '🦕',
    },
    {
      name: 'Preact',
      description: '轻量级 React 替代品，提供相同的 API 但体积更小、性能更好',
      icon: '⚛️',
    },
    {
      name: 'Tailwind CSS',
      description: '实用优先的 CSS 框架，快速构建现代化的用户界面',
      icon: '🎨',
    },
  ];

  return (
    <div className="space-y-0">
      {/* 页面标题 */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            关于
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            了解这个应用和 DWeb 框架
          </p>
        </div>
      </div>

      {/* 简介 */}
      <div className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">应用简介</h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              这是一个使用 DWeb 框架创建的示例应用。DWeb 是一个基于 Deno + Preact + Tailwind CSS 的现代化全栈 Web 框架。
      </p>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              DWeb 提供了文件系统路由、多种渲染模式、中间件系统、插件系统等强大功能，
              让开发者能够快速构建现代化的 Web 应用。
            </p>
            <p className="text-gray-600 text-lg leading-relaxed">
              无论是构建简单的静态网站，还是复杂的全栈应用，DWeb 都能为您提供最佳的支持。
            </p>
          </div>
        </div>
      </div>

      {/* 技术栈 */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              技术栈
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              基于以下现代 Web 技术构建
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {technologies.map((tech, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
              >
                <div className="text-5xl mb-4">{tech.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{tech.name}</h3>
                <p className="text-gray-600 leading-relaxed">{tech.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 返回首页 */}
      <div className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 text-lg font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all"
          >
            返回首页
          </a>
        </div>
      </div>
    </div>
  );
}
