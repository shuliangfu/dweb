/**
 * 应用根组件
 * 定义 HTML 文档结构
 * TailwindCSS 由 @dreamer/plugins/tailwindcss 插件自动注入
 *
 * 标题与 SEO 描述由各路由 `export const metadata` 经 `@dreamer/render` 的 `generateMetaTags`
 * 注入 head；此处勿再写 `<title>` / `<meta name="description">`，否则会与 SSR 注入重复多条标签。
 */

import type { VNode } from "@dreamer/view";

/** 应用组件属性 */
interface AppProps {
  /** 子组件 */
  children?: VNode | VNode[];
}

/**
 * 应用根组件
 * @param props - 组件属性
 * @returns HTML 文档结构
 */
export default function App({ children }: AppProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
      </head>
      <body class="bg-gray-100 text-gray-900 antialiased">
        <div id="app">{children}</div>
      </body>
    </html>
  );
}
