/**
 * 验证工具函数文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "验证函数 - DWeb 框架文档",
  description:
    "DWeb 框架的验证工具函数，提供常用的数据验证功能，包括邮箱、手机号、身份证等验证",
};

export default function ValidationPage() {
  const quickStartCode = `import {
  validateEmail,
  validateUrl,
  validatePhone,
  validateIdCard,
  validatePassword,
  validateRange,
  validateLength,
  validateNumber,
  validateInteger,
  validatePositive,
  validateEmpty,
} from "@dreamer/dweb/utils/validation";

// 验证邮箱
validateEmail("test@example.com"); // true

// 验证URL
validateUrl("https://example.com"); // true

// 验证手机号（中国）
validatePhone("13800138000"); // true

// 验证身份证号（中国）
validateIdCard("110101199001011234"); // true

// 验证密码强度
validatePassword("MyP@ssw0rd", 8);
// { valid: true, strength: 'strong', message: '密码强度强' }

// 验证数字范围
validateRange(50, 0, 100); // true

// 验证字符串长度
validateLength("hello", 3, 10); // true

// 验证是否为空值
validateEmpty(""); // true
validateEmpty([]); // true
validateEmpty({}); // true`;

  const content = {
    title: "验证函数",
    description:
      "提供常用的数据验证函数，包括邮箱、手机号、身份证等验证。所有函数在服务端和客户端都可用。",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "code",
            code: quickStartCode,
            language: "typescript",
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
