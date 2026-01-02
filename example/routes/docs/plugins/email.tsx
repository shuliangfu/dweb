/**
 * 插件 - email 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "email 插件 - DWeb 框架文档",
  description: "email 插件使用指南",
};

export default function EmailPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const emailCode = `import { email } from '@dreamer/dweb';

plugins: [
  email({
    smtp: {
      host: 'smtp.example.com',
      port: 587,
      user: 'user@example.com',
      password: 'password',
    },
  }),
],`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "email - 邮件插件",
    description: "email 插件用于发送邮件，支持 SMTP 和模板渲染。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: emailCode,
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
                  "**`smtp`** - SMTP 配置对象，包含：",
                  "  - `host` - SMTP 服务器地址（必需）",
                  "  - `port` - SMTP 端口（必需）",
                  "  - `secure` - 是否使用 TLS（可选）",
                  "  - `user` - 用户名（必需）",
                  "  - `password` - 密码（必需）",
                  "  - `from` - 发件人邮箱（必需）",
                  "  - `fromName` - 发件人名称（可选）",
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
                  "**`templates`** - 邮件模板列表，每个模板包含：",
                  "  - `name` - 模板名称",
                  "  - `html` - 模板内容（HTML）",
                  "  - `text` - 文本版本（可选）",
                  "  - `variableFormat` - 变量占位符格式（默认 `{{variable}}`）",
                  "**`defaults`** - 默认选项（Partial<EmailOptions>），包含 to, cc, bcc, subject, text, html, attachments, replyTo 等",
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
