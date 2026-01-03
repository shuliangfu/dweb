/**
 * 插件 - formValidator 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "formValidator 插件 - DWeb 框架文档",
  description: "formValidator 插件使用指南",
};

export default function FormValidatorPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const formValidatorCode = `import { formValidator } from '@dreamer/dweb';

plugins: [
  formValidator({
    rules: {
      email: { type: 'email', required: true },
      password: { type: 'string', min: 8 },
    },
  }),
],`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "formValidator - 表单验证",
    description: "formValidator 插件用于验证表单数据，支持多种验证规则。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: formValidatorCode,
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
                  "**`injectClientScript`** - 是否在客户端注入验证脚本（默认 true）",
                  "**`defaultConfig`** - 默认验证配置对象，包含：",
                  "  - `fields` - 字段验证配置数组，每个字段包含 name, rules, label",
                  "  - `messages` - 全局错误消息模板对象",
                  "验证规则类型：'required' | 'email' | 'url' | 'number' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom'",
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
