/**
 * 中间件 - requestId 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "requestId 中间件 - DWeb 框架文档",
  description: "requestId 中间件使用指南",
};

export default function RequestIdMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const requestIdCode = `import { requestId } from '@dreamer/dweb';

server.use(requestId({
  header: 'X-Request-ID',
  generator: () => crypto.randomUUID(),
}));`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "requestId - 请求 ID",
    description: "requestId 中间件为每个请求生成唯一 ID，便于追踪和调试。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: requestIdCode,
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
                  "**`headerName`** - 请求 ID 响应头名称（默认 'X-Request-Id'）",
                  "**`exposeHeader`** - 是否在响应头中包含请求 ID（默认 true）",
                  "**`generator`** - 自定义 ID 生成器函数（如果不提供，使用默认的 UUID v4 生成器）",
                  "**`skip`** - 跳过生成请求 ID 的路径数组（支持 glob 模式）",
                  "**`useHeader`** - 是否从请求头中读取现有的请求 ID（默认 true）。如果请求头中已有请求 ID，则使用它而不是生成新的",
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
