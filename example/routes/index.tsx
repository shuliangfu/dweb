/**
 * 首页 - DWeb 官网
 * 使用 Preact + Tailwind CSS v4
 * 展示 DWeb 框架的核心信息和特性
 */

import Hero from "../components/Hero.tsx";
import CodeBlock from "../components/CodeBlock.tsx";
import type { LoadContext, PageProps } from "@dreamer/dweb";
import { getJsrPackageUrl, getVersionString } from "../utils.ts";
import { useExampleStore } from "../stores/example.ts";
import { useEffect } from "preact/hooks";
import { useThemeStore } from "../../src/client/mod.ts";
import { twMerge } from "tailwind-merge";
import Chart from "chart/auto";

/**
 * 页面元数据（用于 SEO）
 * 支持对象或函数两种形式：
 * - 对象：静态元数据
 * - 函数：动态元数据（可以基于 params、query、data、cookies、session 等生成）
 *
 * metadata 函数接收与 load 函数相同的完整参数（LoadContext），
 * 并额外提供 data 参数（load 函数返回的数据）
 *
 * @example
 * // 对象形式（静态）
 * export const metadata = {
 *   title: "页面标题",
 *   description: "页面描述",
 * };
 *
 * @example
 * // 函数形式（动态）
 * export function metadata({ params, query, data, cookies, session, db }) {
 *   return {
 *     title: \`\${data.name} - 详情页\`,
 *     description: data.description,
 *   };
 * }
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
  data,
}: LoadContext & { data: unknown }): {
  title: string;
  description: string;
  keywords: string;
  author: string;
} {
  // 可以从 data 中获取动态信息
  const pageData = data as
    | { versionString?: string; message?: string }
    | undefined;

  return {
    title: "DWeb - 现代化的全栈 Web 框架",
    description: `基于 Deno + Preact + Tailwind CSS 的现代化全栈 Web 框架${
      pageData?.versionString ? ` (v${pageData.versionString})` : ""
    }`,
    keywords: "DWeb, Deno, Preact, Tailwind CSS, Web 框架",
    author: "DWeb",
  };
}

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
  const userId = currentSession?.data.userId;

  const jsrPackageUrl = getJsrPackageUrl();
  const versionString = getVersionString();

  // console.log($t("总共{count}条数据", { count: 100 }));

  return {
    message: "Hello, World!",
    token,
    userId,
    jsrPackageUrl,
    versionString,
  };
};

/**
 * 首页组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function HomePage(
  { params: _params, query: _query, data }: PageProps,
) {
  // 使用 useStore hook 获取响应式状态，类似 useState(exampleStore)
  const state = useExampleStore();
  const themeState = useThemeStore();

  // useEffect(() => {
  //   console.log({
  //     count: state.count,
  //     isLoading: state.isLoading,
  //     theme: themeState.value,
  //   });
  // }, [state.count, state.isLoading, themeState.value]);

  // // 只在组件挂载时执行一次
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     state.increment();
  //     state.toggleIsLoading();
  //   }, 2000);

  //   // 清理函数：组件卸载时清除定时器
  //   return () => {
  //     clearTimeout(timer);
  //   };
  // }, []) // 空依赖数组，确保只执行一次

  // const mergedClassName = twMerge("text-red-500", "text-blue-500");
  // console.log(mergedClassName);
  // console.log(Chart);

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

      {/* 快速开始区域 */}
      <div className="py-20 bg-linear-to-br bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              {$t("快速开始")}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              只需几分钟，即可开始使用 DWeb 构建您的下一个 Web 应用
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* 创建项目 */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                创建新项目
              </h3>
              <CodeBlock code={quickStartCode} language="bash" />
            </div>

            {/* 安装依赖 */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                安装依赖
              </h3>
              <CodeBlock code={installCode} language="bash" />
            </div>
          </div>

          <div className="text-center mt-12">
            <a
              href="/docs"
              className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-lg hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl"
            >
              查看完整文档
              <svg
                className="ml-2 w-5 h-5"
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

      {/* 技术栈展示区域 */}
      <div className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              技术栈
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              基于现代 Web 技术构建，提供最佳开发体验
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Deno */}
            <div className="text-center p-8 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg dark:hover:shadow-xl transition-all bg-white dark:bg-gray-800">
              <div className="text-6xl mb-4">🦕</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Deno
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                现代 JavaScript/TypeScript 运行时，内置安全性和现代 Web API 支持
              </p>
            </div>

            {/* Preact */}
            <div className="text-center p-8 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg dark:hover:shadow-xl transition-all bg-white dark:bg-gray-800">
              <div className="text-6xl mb-4">⚛️</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Preact
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                轻量级 React 替代品，提供相同的 API 但体积更小、性能更好
              </p>
            </div>

            {/* Tailwind CSS */}
            <div className="text-center p-8 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg dark:hover:shadow-xl transition-all bg-white dark:bg-gray-800">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Tailwind CSS
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                实用优先的 CSS 框架，快速构建现代化的用户界面
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA 区域 */}
      <div className="py-20 bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            准备开始构建您的应用了吗？
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
