/**
 * 中间件 - ipFilter 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "ipFilter 中间件 - DWeb 框架文档",
  description: "ipFilter 中间件使用指南",
};

export default function IpFilterMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const ipFilterCode = `import { ipFilter } from '@dreamer/dweb/middleware';

// 白名单
server.use(ipFilter({
  whitelist: ['192.168.1.0/24', '10.0.0.0/8'],
}));

// 黑名单
server.use(ipFilter({
  blacklist: ['192.168.1.100'],
}));`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        ipFilter - IP 过滤
      </h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        ipFilter 中间件根据 IP 地址过滤请求，支持白名单和黑名单。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          基本使用
        </h2>
        <CodeBlock code={ipFilterCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          配置选项
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4">
          可选参数
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              whitelist
            </code>{" "}
            - IP 白名单数组（允许的 IP 列表），支持单个 IP 或 CIDR 格式（如 '192.168.1.0/24'）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              blacklist
            </code>{" "}
            - IP 黑名单数组（禁止的 IP 列表），支持单个 IP 或 CIDR 格式
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              whitelistMode
            </code>{" "}
            - 是否启用白名单模式（默认 false）。true: 只允许白名单中的 IP；false: 允许所有 IP，除非在黑名单中
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              skip
            </code>{" "}
            - 跳过过滤的路径数组（支持 glob 模式）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              message
            </code>{" "}
            - 自定义错误消息
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              statusCode
            </code>{" "}
            - 自定义错误状态码（默认 403）
          </li>
          <li>
            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
              getClientIP
            </code>{" "}
            - 获取客户端 IP 的函数（默认使用标准方法，会尝试从 X-Forwarded-For、X-Real-IP、CF-Connecting-IP 等请求头获取）
          </li>
        </ul>
      </section>
    </article>
  );
}
