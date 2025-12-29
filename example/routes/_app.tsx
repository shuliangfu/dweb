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
        <title>DWeb - 现代化的全栈 Web 框架</title>
        <link
          rel="alternate icon"
          type="image/png"
          href="/assets/favicon.png"
        />
        <link rel="stylesheet" href="/assets/style.css" />
      </head>
      <body>
        <div id="root" dangerouslySetInnerHTML={{ __html: children }} />
      </body>
    </html>
  );
}

