/**
 * 应用根组件
 * 定义 HTML 文档结构
 * UnoCSS 由 @dreamer/plugins/unocss 插件自动注入
 */

import type { VNode } from "@dreamer/view";

/** 应用组件属性 */
interface AppProps {
  /** 子组件 */
  children?: VNode | VNode[];
  /** 页面标题 */
  title?: string;
  /** 页面描述 */
  description?: string;
}

/**
 * 应用根组件
 * @param props - 组件属性
 * @returns HTML 文档结构
 */
export default function App({
  children,
  title = "View Hybrid UnoCSS Example",
  description = "A basic View application Built with @dreamer/dweb + UnoCSS",
}: AppProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={description} />
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
