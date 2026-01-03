/**
 * Cookie 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "Cookie - DWeb 框架文档",
  description: "Cookie 管理和签名",
};

export default function CookiePage() {
  const cookieConfigCode = `// dweb.config.ts
cookie: {
  // Cookie 密钥（必需）
  secret: 'your-secret-key',
  
  // 默认选项
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  maxAge: 3600,
},`;

  const cookieUsageCode = `// 在路由中使用 Cookie
import type { LoadContext } from '@dreamer/dweb';

export async function load({ getCookie, setCookie }: LoadContext) {
  // 读取 Cookie
  const token = getCookie('token');
  
  // 设置 Cookie
  setCookie('token', 'value', {
    maxAge: 3600,
    httpOnly: true,
    secure: true,
  });
  
  return { token };
}`;

  // 基本使用
  const basicUsageCode = `import { CookieManager } from "@dreamer/dweb";

// 创建 Cookie 管理器
const cookieManager = new CookieManager("your-secret-key");

// 在请求处理中使用
server.setHandler(async (req, res) => {
  // 设置 Cookie
  const cookieString = cookieManager.set("username", "john", {
    maxAge: 3600, // 1 小时
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });
  res.setHeader("Set-Cookie", cookieString);

  // 读取 Cookie
  const cookies = cookieManager.parse(req.headers.get("Cookie"));
  const username = cookies.username;

  // 删除 Cookie
  const deleteCookie = cookieManager.delete("username");
  res.setHeader("Set-Cookie", deleteCookie);

  res.text("OK");
});`;

  // 签名 Cookie
  const signedCookieCode = `// 创建带签名的 Cookie 管理器
const cookieManager = new CookieManager("your-secret-key");

// 设置签名 Cookie（异步）
const cookieString = await cookieManager.setAsync("session", "session-id", {
  maxAge: 3600,
  httpOnly: true,
});

// 解析签名 Cookie（异步，自动验证签名）
const cookies = await cookieManager.parseAsync(req.headers.get("Cookie"));
const session = cookies.session; // 自动验证签名，如果签名无效则不会包含在结果中`;

  // 使用场景
  const useCasesCode = `// 用户偏好设置
const cookie = cookieManager.set("theme", "dark", {
  maxAge: 365 * 24 * 60 * 60, // 1 年
  path: "/",
});

// 会话管理（带签名）
const sessionCookie = await cookieManager.setAsync("session", sessionId, {
  maxAge: 3600, // 1 小时
  httpOnly: true,
  secure: true,
  sameSite: "strict",
});

// 购物车
const cartData = JSON.stringify(cartItems);
const cookie = cookieManager.set("cart", cartData, {
  maxAge: 7 * 24 * 60 * 60, // 7 天
  path: "/",
});`;

  // CookieOptions
  const cookieOptionsCode = `interface CookieOptions {
  path?: string; // Cookie 路径，默认 '/'
  domain?: string; // Cookie 域名
  expires?: Date; // 过期时间
  maxAge?: number; // 最大存活时间（秒）
  secure?: boolean; // 是否仅在 HTTPS 下发送
  httpOnly?: boolean; // 是否禁止 JavaScript 访问，默认 true
  sameSite?: "strict" | "lax" | "none"; // SameSite 属性
}`;

  const setCode = `const cookie = cookieManager.set("theme", "dark", {
  maxAge: 86400, // 1 天
  path: "/",
  domain: "example.com",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
});
res.setHeader("Set-Cookie", cookie);`;

  const setAsyncCode =
    `const cookie = await cookieManager.setAsync("session", "session-id", {
  maxAge: 3600,
  httpOnly: true,
});
res.setHeader("Set-Cookie", cookie);`;

  const parseCode =
    `const cookies = cookieManager.parse(req.headers.get("Cookie"));
const theme = cookies.theme;`;

  const parseAsyncCode =
    `const cookies = await cookieManager.parseAsync(req.headers.get("Cookie"));
const session = cookies.session; // 已通过签名验证`;

  const deleteCode = `const deleteCookie = cookieManager.delete("session", {
  path: "/",
  domain: "example.com",
});
res.setHeader("Set-Cookie", deleteCookie);`;

  const secureCookieCode = `// 安全的 Cookie 配置
const cookie = await cookieManager.setAsync("session", sessionId, {
  maxAge: 3600,
  httpOnly: true, // 防止 XSS
  secure: true, // 仅 HTTPS
  sameSite: "strict", // 防止 CSRF
  path: "/",
});`;

  const content = {
    title: "Cookie",
    description:
      "DWeb 框架提供了完整的 Cookie 管理功能，支持 Cookie 的设置、读取、删除和签名。",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "基本使用",
            blocks: [
              {
                type: "code",
                code: basicUsageCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用签名 Cookie",
            blocks: [
              {
                type: "code",
                code: signedCookieCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "配置 Cookie",
        blocks: [
          {
            type: "text",
            content: "在 `dweb.config.ts` 中配置 Cookie：",
          },
          {
            type: "code",
            code: cookieConfigCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "在路由中使用 Cookie",
        blocks: [
          {
            type: "text",
            content: "在页面或 API 路由中使用 Cookie：",
          },
          {
            type: "code",
            code: cookieUsageCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "使用场景",
        blocks: [
          {
            type: "code",
            code: useCasesCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "API 参考",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "CookieManager",
            blocks: [
              {
                type: "code",
                code: `new CookieManager(secret?: string)`,
                language: "typescript",
              },
              {
                type: "text",
                content: "**参数**：",
              },
              {
                type: "list",
                ordered: false,
                items: [
                  "**`secret`** - 可选，用于签名 Cookie 的密钥",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "方法",
            blocks: [
              {
                type: "api",
                name: "set(name, value, options?)",
                description: "设置 Cookie（同步，不支持签名）。",
                code: setCode,
              },
              {
                type: "api",
                name: "setAsync(name, value, options?)",
                description: "设置 Cookie（异步，支持签名）。",
                code: setAsyncCode,
              },
              {
                type: "api",
                name: "parse(cookieHeader)",
                description: "解析 Cookie（同步，不支持签名验证）。",
                code: parseCode,
              },
              {
                type: "api",
                name: "parseAsync(cookieHeader)",
                description: "解析 Cookie（异步，支持签名验证）。",
                code: parseAsyncCode,
              },
              {
                type: "api",
                name: "delete(name, options?)",
                description: "删除 Cookie。",
                code: deleteCode,
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "CookieOptions",
            blocks: [
              {
                type: "code",
                code: cookieOptionsCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "安全最佳实践",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**使用签名 Cookie**：对于敏感数据（如会话 ID），使用 `setAsync` 和 `parseAsync` 方法",
              "**设置 HttpOnly**：防止 XSS 攻击，禁止 JavaScript 访问 Cookie",
              "**设置 Secure**：在生产环境中启用，确保 Cookie 仅在 HTTPS 下传输",
              "**设置 SameSite**：防止 CSRF 攻击",
              "**使用强密钥**：签名密钥应该足够长且随机",
            ],
          },
          {
            type: "code",
            code: secureCookieCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "相关文档",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[Session](/docs/features/session) - Session 管理",
              "[Application](/docs/core/application) - 应用核心",
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
