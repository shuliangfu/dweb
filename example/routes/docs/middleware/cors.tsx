/**
 * 中间件 - cors 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "cors 中间件 - DWeb 框架文档",
  description: "cors 中间件使用指南",
};

export default function CorsMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const corsCode = `import { cors } from '@dreamer/dweb';

server.use(cors({
  origin: '*', // 或指定域名 ['https://example.com']
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "cors - 跨域支持",
    description: "cors 中间件用于处理跨域资源共享（CORS）请求。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: corsCode,
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
                  "**`origin`** - 允许的源，可以是字符串、数组或函数（默认 '*'）",
                  "**`methods`** - 允许的 HTTP 方法（默认 ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']）",
                  "**`allowedHeaders`** - 允许的请求头（默认 ['Content-Type', 'Authorization']）",
                  "**`exposedHeaders`** - 暴露的响应头（默认 []）",
                  "**`credentials`** - 是否允许发送凭证（默认 false）",
                  "**`maxAge`** - 预检请求的缓存时间（秒，默认 86400）",
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
