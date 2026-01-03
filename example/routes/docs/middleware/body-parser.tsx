/**
 * 中间件 - bodyParser 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "bodyParser 中间件 - DWeb 框架文档",
  description: "bodyParser 中间件使用指南",
};

export default function BodyParserMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const bodyParserCode = `import { bodyParser } from '@dreamer/dweb';

server.use(bodyParser({
  json: { limit: '1mb' },
  urlencoded: { limit: '1mb', extended: true },
  text: { limit: '1mb' },
  raw: { limit: '1mb' },
}));`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "bodyParser - 请求体解析",
    description:
      "bodyParser 中间件用于解析 HTTP 请求体，支持 JSON、URL-encoded、文本和原始数据。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: bodyParserCode,
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
                  "**`json`** - JSON 解析配置对象：",
                  "  - `limit` - 大小限制（如 '1mb'，默认 '1mb'）",
                  "  - `strict` - 是否严格模式（默认 true）",
                  "**`urlencoded`** - URL-encoded 解析配置对象：",
                  "  - `extended` - 是否使用扩展模式（默认 true）",
                  "  - `limit` - 大小限制（如 '1mb'，默认 '1mb'）",
                  "**`text`** - 文本解析配置对象：",
                  "  - `limit` - 大小限制（如 '1mb'，默认 '1mb'）",
                  "**`raw`** - 原始数据解析配置对象：",
                  "  - `limit` - 大小限制（如 '1mb'，默认 '1mb'）",
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
