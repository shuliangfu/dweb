/**
 * 应用根组件
 * 定义 HTML 文档结构
 */

import type { ReactNode } from "react";

/** 应用组件属性 */
interface AppProps {
  /** 子组件 */
  children: ReactNode;
  /** 页面标题 */
  title?: string;
  /** 页面描述 */
  description?: string;
}

/**
 * 应用根组件
 */
export default function App({
  children,
  title = "React SSR Basic Example",
  description = "A basic React application built with @dreamer/dweb",
}: AppProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={description} />
        <title>{title}</title>
      </head>
      <body className="bg-gray-100 text-gray-900 antialiased">
        <div id="app">{children}</div>
      </body>
    </html>
  );
}
