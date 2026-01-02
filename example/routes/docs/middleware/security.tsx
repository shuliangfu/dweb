/**
 * 中间件 - security 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "security 中间件 - DWeb 框架文档",
  description: "security 中间件使用指南",
};

export default function SecurityMiddlewarePage() {
  const securityCode = `import { security } from '@dreamer/dweb';

server.use(security({
  contentSecurityPolicy: true,
  xFrameOptions: 'DENY',
  xContentTypeOptions: true,
}));`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "security - 安全头",
    description: "security 中间件用于设置 HTTP 安全响应头，提高应用安全性。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: securityCode,
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
                  "**`xssProtection`** - 是否启用 XSS 防护（默认 true）",
                  "**`csrfProtection`** - 是否启用 CSRF 防护（默认 true）",
                  "**`csrfCookieName`** - CSRF Token Cookie 名称（默认 '_csrf'）",
                  "**`csrfHeaderName`** - CSRF Token 请求头名称（默认 'X-CSRF-Token'）",
                  "**`csrfFieldName`** - CSRF Token 表单字段名称（默认 '_csrf'）",
                  "**`csrfMethods`** - 需要 CSRF 验证的方法（默认 ['POST', 'PUT', 'DELETE', 'PATCH']）",
                  "**`csrfSkip`** - 跳过 CSRF 验证的路径数组（支持 glob 模式）",
                  "**`contentSecurityPolicy`** - 内容安全策略（CSP），可以是字符串或配置对象：",
                  "  - 字符串：直接设置 CSP 头",
                  "  - 对象：包含 defaultSrc, scriptSrc, styleSrc, imgSrc, connectSrc, fontSrc, objectSrc, mediaSrc, frameSrc, baseUri, formAction, frameAncestors, upgradeInsecureRequests 等配置",
                  "**`hsts`** - 是否启用严格传输安全（HSTS），可以是布尔值或配置对象（默认 false，生产环境建议 true）：",
                  "  - 布尔值：启用或禁用",
                  "  - 对象：包含 maxAge（最大年龄，秒）、includeSubDomains（是否包含子域）、preload（是否预加载）",
                  "**`frameOptions`** - X-Frame-Options（默认 'SAMEORIGIN'）：'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM'",
                  "**`contentTypeOptions`** - X-Content-Type-Options（默认 'nosniff'）：'nosniff' | 'none'",
                  "**`xssProtectionHeader`** - X-XSS-Protection（默认 '1; mode=block'）",
                  "**`referrerPolicy`** - Referrer-Policy（默认 'no-referrer'）：'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url'",
                  "**`permissionsPolicy`** - Permissions-Policy（功能策略），对象格式，键为功能名，值为允许的来源数组",
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
