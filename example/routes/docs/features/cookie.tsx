/**
 * Cookie 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "Cookie - DWeb 框架文档",
  description: "Cookie 管理和签名",
};

export default function CookiePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
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
  const basicUsageCode =
    `import { CookieManager } from "@dreamer/dweb/features/cookie";

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

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        Cookie
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 框架提供了完整的 Cookie 管理功能，支持 Cookie
        的设置、读取、删除和签名。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          基本使用
        </h3>
        <CodeBlock code={basicUsageCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          使用签名 Cookie
        </h3>
        <CodeBlock code={signedCookieCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置 Cookie
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          在{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            dweb.config.ts
          </code>{" "}
          中配置 Cookie：
        </p>
        <CodeBlock code={cookieConfigCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          在路由中使用 Cookie
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          在页面或 API 路由中使用 Cookie：
        </p>
        <CodeBlock code={cookieUsageCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          使用场景
        </h2>
        <CodeBlock code={useCasesCode} language="typescript" />
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          CookieManager
        </h3>
        <CodeBlock
          code={`new CookieManager(secret?: string)`}
          language="typescript"
        />
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          <strong>参数：</strong>
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              secret
            </code>{" "}
            - 可选，用于签名 Cookie 的密钥
          </li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方法
        </h3>

        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                set(name, value, options?)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              设置 Cookie（同步，不支持签名）。
            </p>
            <CodeBlock
              code={`const cookie = cookieManager.set("theme", "dark", {
  maxAge: 86400, // 1 天
  path: "/",
  domain: "example.com",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
});
res.setHeader("Set-Cookie", cookie);`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                setAsync(name, value, options?)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              设置 Cookie（异步，支持签名）。
            </p>
            <CodeBlock
              code={`const cookie = await cookieManager.setAsync("session", "session-id", {
  maxAge: 3600,
  httpOnly: true,
});
res.setHeader("Set-Cookie", cookie);`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                parse(cookieHeader)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              解析 Cookie（同步，不支持签名验证）。
            </p>
            <CodeBlock
              code={`const cookies = cookieManager.parse(req.headers.get("Cookie"));
const theme = cookies.theme;`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                parseAsync(cookieHeader)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              解析 Cookie（异步，支持签名验证）。
            </p>
            <CodeBlock
              code={`const cookies = await cookieManager.parseAsync(req.headers.get("Cookie"));
const session = cookies.session; // 已通过签名验证`}
              language="typescript"
            />
          </div>

          <div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                delete(name, options?)
              </code>
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
              删除 Cookie。
            </p>
            <CodeBlock
              code={`const deleteCookie = cookieManager.delete("session", {
  path: "/",
  domain: "example.com",
});
res.setHeader("Set-Cookie", deleteCookie);`}
              language="typescript"
            />
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          CookieOptions
        </h3>
        <CodeBlock code={cookieOptionsCode} language="typescript" />
      </section>

      {/* 安全最佳实践 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          安全最佳实践
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <strong>使用签名 Cookie</strong>：对于敏感数据（如会话 ID），使用
            {" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              setAsync
            </code>{" "}
            和{" "}
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              parseAsync
            </code>{" "}
            方法
          </li>
          <li>
            <strong>设置 HttpOnly</strong>：防止 XSS 攻击，禁止 JavaScript 访问
            Cookie
          </li>
          <li>
            <strong>设置 Secure</strong>：在生产环境中启用，确保 Cookie 仅在
            HTTPS 下传输
          </li>
          <li>
            <strong>设置 SameSite</strong>：防止 CSRF 攻击
          </li>
          <li>
            <strong>使用强密钥</strong>：签名密钥应该足够长且随机
          </li>
        </ul>
        <CodeBlock
          code={`// 安全的 Cookie 配置
const cookie = await cookieManager.setAsync("session", sessionId, {
  maxAge: 3600,
  httpOnly: true, // 防止 XSS
  secure: true, // 仅 HTTPS
  sameSite: "strict", // 防止 CSRF
  path: "/",
});`}
          language="typescript"
        />
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/features/session"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Session
            </a>{" "}
            - Session 管理
          </li>
          <li>
            <a
              href="/docs/core/application"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Application
            </a>{" "}
            - 应用核心
          </li>
        </ul>
      </section>
    </article>
  );
}
