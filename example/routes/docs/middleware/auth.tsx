/**
 * 中间件 - auth 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "auth 中间件 - DWeb 框架文档",
  description: "auth 中间件使用指南",
};

export default function AuthMiddlewarePage() {
  const authCode = `import { auth } from '@dreamer/dweb';

server.use(auth({
  secret: 'your-secret-key',
  algorithms: ['HS256'],
}));`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "auth - JWT 认证",
    description: "auth 中间件提供 JWT 认证功能，支持令牌生成和验证。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: authCode,
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
            title: "必需参数",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`secret`** - JWT 密钥（必需）",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "可选参数",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`headerName`** - Token 在请求头中的名称（默认 'Authorization'）",
                  "**`tokenPrefix`** - Token 前缀（默认 'Bearer '）",
                  "**`cookieName`** - Token 在 Cookie 中的名称（可选）",
                  "**`skip`** - 跳过认证的路径数组（支持 glob 模式）",
                  "**`verifyToken`** - 验证 Token 的函数（可选，默认使用内置验证）",
                  "**`onError`** - 自定义错误处理函数",
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
