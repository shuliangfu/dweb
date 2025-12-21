/**
 * 首页 - DWeb 官网
 * 使用 Preact + Tailwind CSS v4
 * 展示 DWeb 框架的核心信息和特性
 */

import Hero from '../components/Hero.tsx';
import CodeBlock from '../components/CodeBlock.tsx';
import type { PageProps, LoadContext } from '@dreamer/dweb';

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
   const { getJsrPackageUrl, getVersionString } = await import('../utils.ts');

  // 示例：读取 Cookie
  const token = getCookie('token') || cookies.token;

  // 示例：读取 Session
  const currentSession = session || (await getSession());
  const userId = currentSession?.data.userId;

  const jsrPackageUrl = getJsrPackageUrl();
  const versionString = getVersionString();

	console.log($t('common.welcome'));

  return {
    message: 'Hello, World!',
    token,
    userId,
    jsrPackageUrl,
    versionString,
  };
};

// 我想在这里设置 网页Title，Meta标签，SEO优化等
export const metadata = {
  title: 'DWeb - 现代化的全栈 Web 框架',
  description: '基于 Deno + Preact + Tailwind CSS 的现代化全栈 Web 框架',
  keywords: 'DWeb, Deno, Preact, Tailwind CSS, Web 框架',
  author: 'DWeb',
};

/**
 * 首页组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function HomePage({ params: _params, query: _query, data }: PageProps) {
  // data 就是 load 函数返回的数据
  // 例如：data.message 就是 'Hello, World!'

  const { versionString } = data as {
    versionString: string;
  };


  // 快速开始代码示例
  const quickStartCode = `# 创建新项目
deno run -A jsr:@dreamer/dweb/init

cd my-app
deno task dev`;

  const installCode = `# 安装依赖
deno add jsr:@dreamer/dweb

# 或直接在代码中导入
import { createApp, startDevServer } from 'jsr:@dreamer/dweb';`;

  return (
    <div className="space-y-0">
      {/* Hero 区域 */}
      <Hero
        title="DWeb"
        subtitle="基于 Deno + Preact + Tailwind CSS 的现代化全栈 Web 框架，让 Web 开发更简单、更快速、更高效。"
        primaryCTA="快速开始"
        primaryCTALink="/docs"
        secondaryCTA="查看特性"
        secondaryCTALink="/features"
        version={versionString}
      />

      {/* 特性展示区域 */}
      {/* <FeatureSection
        features={features}
        title="强大的功能特性"
        subtitle="DWeb 提供了现代化 Web 开发所需的所有功能，让您专注于业务逻辑"
      /> */}

      {/* 快速开始区域 */}
      <div className="py-20 bg-linear-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">快速开始</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              只需几分钟，即可开始使用 DWeb 构建您的下一个 Web 应用
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* 创建项目 */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">创建新项目</h3>
              <CodeBlock code={quickStartCode} language="bash" />
            </div>

            {/* 安装依赖 */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">安装依赖</h3>
              <CodeBlock code={installCode} language="bash" />
            </div>
          </div>

          <div className="text-center mt-12">
            <a
              href="/docs"
              className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-linear-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
            >
              查看完整文档
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* 技术栈展示区域 */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">技术栈</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              基于现代 Web 技术构建，提供最佳开发体验
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Deno */}
            <div className="text-center p-8 rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="text-6xl mb-4">🦕</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Deno</h3>
              <p className="text-gray-600">
                现代 JavaScript/TypeScript 运行时，内置安全性和现代 Web API 支持
              </p>
            </div>

            {/* Preact */}
            <div className="text-center p-8 rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="text-6xl mb-4">⚛️</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Preact</h3>
              <p className="text-gray-600">
                轻量级 React 替代品，提供相同的 API 但体积更小、性能更好
              </p>
            </div>

            {/* Tailwind CSS */}
            <div className="text-center p-8 rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Tailwind CSS</h3>
              <p className="text-gray-600">实用优先的 CSS 框架，快速构建现代化的用户界面</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA 区域 */}
      <div className="py-20 bg-linear-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            准备开始构建您的应用了吗？
          </h2>
          <p className="text-xl text-blue-100 mb-8">立即开始使用 DWeb，体验现代化的 Web 开发方式</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/docs"
              className="inline-flex items-center px-8 py-4 text-lg font-semibold text-blue-600 bg-white rounded-lg hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl"
            >
              查看文档
            </a>
            <a
              href="https://github.com/shuliangfu/dweb"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-all shadow-lg hover:shadow-xl border-2 border-white/20"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
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
