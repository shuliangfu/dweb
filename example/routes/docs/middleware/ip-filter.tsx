/**
 * 中间件 - ipFilter 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "ipFilter 中间件 - DWeb 框架文档",
  description: "ipFilter 中间件使用指南",
};

export default function IpFilterMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const ipFilterCode = `import { ipFilter } from '@dreamer/dweb';

// 白名单
server.use(ipFilter({
  whitelist: ['192.168.1.0/24', '10.0.0.0/8'],
}));

// 黑名单
server.use(ipFilter({
  blacklist: ['192.168.1.100'],
}));`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "ipFilter - IP 过滤",
    description: "ipFilter 中间件根据 IP 地址过滤请求，支持白名单和黑名单。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: ipFilterCode,
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
                  "**`whitelist`** - IP 白名单数组（允许的 IP 列表），支持单个 IP 或 CIDR 格式（如 '192.168.1.0/24'）",
                  "**`blacklist`** - IP 黑名单数组（禁止的 IP 列表），支持单个 IP 或 CIDR 格式",
                  "**`whitelistMode`** - 是否启用白名单模式（默认 false）。true: 只允许白名单中的 IP；false: 允许所有 IP，除非在黑名单中",
                  "**`skip`** - 跳过过滤的路径数组（支持 glob 模式）",
                  "**`message`** - 自定义错误消息",
                  "**`statusCode`** - 自定义错误状态码（默认 403）",
                  "**`getClientIP`** - 获取客户端 IP 的函数（默认使用标准方法，会尝试从 X-Forwarded-For、X-Real-IP、CF-Connecting-IP 等请求头获取）",
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
