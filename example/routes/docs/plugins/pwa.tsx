/**
 * 插件 - pwa 文档页面
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "pwa 插件 - DWeb 框架文档",
  description: "pwa 插件使用指南",
};

export default function PwaPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const pwaCode = `import { pwa } from '@dreamer/dweb';

plugins: [
  pwa({
    manifest: {
      name: 'My App',
      shortName: 'App',
    },
  }),
],`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        pwa - 渐进式 Web 应用
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        pwa 插件将应用转换为渐进式 Web 应用（PWA），支持离线访问。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={pwaCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          必需参数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              manifest
            </code>{" "}
            - PWA Manifest 配置对象，包含：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">name</code> - 应用名称（必需）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">short_name</code> - 应用简短名称</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">description</code> - 应用描述</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">theme_color</code> - 应用主题色</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">background_color</code> - 应用背景色</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">display</code> - 显示模式（'fullscreen' | 'standalone' | 'minimal-ui' | 'browser'）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">start_url</code> - 起始 URL</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">scope</code> - 作用域</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">orientation</code> - 方向（'any' | 'natural' | 'landscape' | 'portrait' 等）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">icons</code> - 图标列表数组</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">shortcuts</code> - 快捷方式数组</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">related_applications</code> - 相关应用数组</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">prefer_related_applications</code> - 是否首选相关应用</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">lang</code> - 语言</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">dir</code> - 目录（'ltr' | 'rtl' | 'auto'）</li>
            </ul>
          </li>
        </ul>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          可选参数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              serviceWorker
            </code>{" "}
            - Service Worker 配置对象或 false（禁用），包含：
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">swPath</code> - Service Worker 文件路径</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">scope</code> - Service Worker 作用域</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">cacheStrategy</code> - 缓存策略（'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only'）</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">precache</code> - 要缓存的资源数组</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">runtimeCache</code> - 运行时缓存规则数组</li>
              <li><code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">offlinePage</code> - 离线页面路径</li>
            </ul>
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              manifestOutputPath
            </code>{" "}
            - manifest.json 输出路径（相对于输出目录）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              swOutputPath
            </code>{" "}
            - Service Worker 输出路径（相对于输出目录）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              injectLinks
            </code>{" "}
            - 是否在 HTML 中自动注入 manifest 和 Service Worker 链接（默认 true）
          </li>
        </ul>
      </section>
    </article>
  );
}
