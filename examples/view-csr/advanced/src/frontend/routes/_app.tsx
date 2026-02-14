/**
 * 应用根组件
 * 定义 HTML 文档结构
 * TailwindCSS 由 @dreamer/plugins/tailwindcss 插件自动注入
 */

import type { VNode } from "@dreamer/view";

/** 应用组件属性 */
interface AppProps {
  children?: VNode | VNode[];
  title?: string;
  description?: string;
}

/**
 * 应用根组件
 */
export default function App({
  children,
  title = "View CSR Advanced Example",
  description = "A full-stack Preact application with Tailwind CSS v4",
}: AppProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={description} />
        <title>{title}</title>
        <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
        {/* TailwindCSS 由插件自动注入到 </head> 前 */}
      </head>
      <body class="bg-gray-100 text-gray-900 antialiased">
        <div id="app">{children}</div>
      </body>
    </html>
  );
}
