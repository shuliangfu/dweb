/**
 * 中间件 - errorHandler 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "errorHandler 中间件 - DWeb 框架文档",
  description: "errorHandler 中间件使用指南",
};

export default function ErrorHandlerMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const errorHandlerCode =
    `import { errorHandler } from '@dreamer/dweb';

server.use(errorHandler({
  format: 'json', // 'json' | 'html' | 'text'
  includeStack: Deno.env.get('DENO_ENV') === 'development',
}));`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "errorHandler - 错误处理",
    description: "errorHandler 中间件统一处理应用错误，提供友好的错误响应。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: errorHandlerCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "配置选项",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "可选参数",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`debug`** - 是否在开发环境中显示详细错误信息（默认 true）",
                  "**`formatError`** - 自定义错误格式化函数，接收错误对象和请求对象，返回格式化后的错误信息对象（包含 error, message, statusCode, details）",
                  "**`onError`** - 错误日志记录函数，接收错误对象和请求对象",
                  "**`defaultMessage`** - 默认错误消息（当无法获取错误消息时使用）",
                  "**`logStack`** - 是否记录错误堆栈（默认在开发环境中记录）",
                  "**`skip`** - 跳过错误处理的路径数组（支持 glob 模式）",
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
