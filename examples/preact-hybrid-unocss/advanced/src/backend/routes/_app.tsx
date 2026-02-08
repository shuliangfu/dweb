/**
 * 后台管理根组件
 * 定义 HTML 文档结构
 * UnoCSS 由 @dreamer/plugins/unocss 插件自动注入
 */

import type { ComponentChildren } from "preact";

/** 应用组件属性 */
interface AppProps {
  children: ComponentChildren;
  title?: string;
}

/**
 * 后台管理根组件
 */
export default function App({
  children,
  title = "后台管理 - Preact Hybrid Advanced",
}: AppProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
        {/* UnoCSS 由 unocssPlugin 自动注入到 </head> 前 */}
      </head>
      <body className="bg-gray-100 text-gray-900 antialiased">
        <div id="app">{children}</div>
      </body>
    </html>
  );
}
