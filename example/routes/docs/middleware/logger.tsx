/**
 * 中间件 - logger 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "logger 中间件 - DWeb 框架文档",
  description: "logger 中间件使用指南",
};

export default function LoggerMiddlewarePage({
  params: _params,
  query: _query,
  data: _data,
}: PageProps) {
  const loggerCode = `import { logger } from '@dreamer/dweb';

server.use(logger({
  format: 'combined', // 'combined' | 'common' | 'dev' | 'short' | 'tiny'
}));`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "logger - 请求日志",
    description: "logger 中间件用于记录 HTTP 请求日志，支持多种日志格式。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: loggerCode,
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
                  "**`format`** - 日志格式（默认 'combined'）：",
                  "  - `'combined'` - 完整格式，包含方法、路径、状态码、耗时和 User-Agent",
                  "  - `'common'` - 通用格式，类似 Apache 日志",
                  "  - `'dev'` - 开发格式，带颜色标记",
                  "  - `'short'` - 简短格式",
                  "  - `'tiny'` - 最简格式",
                  "**`skip`** - 跳过日志记录的函数，接收请求对象，返回布尔值（默认跳过 Chrome DevTools 的自动请求）",
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
