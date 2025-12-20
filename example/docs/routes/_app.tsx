/**
 * 根应用组件
 * 这是框架必需的固定文件，用于包裹所有页面
 * 包含 HTML 文档结构（DOCTYPE、head、body 等）
 *
 * 注意：此文件是框架特定的，必须存在于 routes 目录下
 */

/**
 * 应用组件属性
 */
export interface AppProps {
  /** 页面内容（已渲染的 HTML） */
  children: string;
}

/**
 * 根应用组件
 * 提供完整的 HTML 文档结构
 * 注意：HMR 客户端脚本由框架在解析时自动注入
 */
export default function App({ children }: AppProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="DWeb 框架的完整使用文档和 API 参考" />
        <meta name="keywords" content="DWeb, Deno, Preact, Web 框架, 文档" />
        <title>DWeb 框架文档</title>
        <link rel="stylesheet" href="/assets/style.css" />
        {/* Prism.js 用于代码高亮 */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css" />
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
      </head>
      <body>
        {/* 使用 dangerouslySetInnerHTML 插入已渲染的页面内容 */}
        <div id="root" dangerouslySetInnerHTML={{ __html: children }} />
      </body>
    </html>
  );
}
