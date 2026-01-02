/**
 * 中间件 - health 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "health 中间件 - DWeb 框架文档",
  description: "health 中间件使用指南",
};

export default function HealthMiddlewarePage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const healthCode = `import { health } from '@dreamer/dweb';

server.use(health({
  path: '/health',
  checks: {
    database: async () => {
      // 检查数据库连接
      return { status: 'ok' };
    },
  },
}));`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "health - 健康检查",
    description: "health 中间件提供应用健康检查端点，用于监控应用状态。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: healthCode,
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
                  "**`path`** - 健康检查路径（默认 '/health'）",
                  "**`readyPath`** - 就绪检查路径（默认 '/health/ready'）",
                  "**`livePath`** - 存活检查路径（默认 '/health/live'）",
                  "**`healthCheck`** - 自定义健康检查函数，返回 Promise，包含 status（'ok' | 'error'）、message 和 details",
                  "**`readyCheck`** - 自定义就绪检查函数，返回 Promise，包含 status（'ready' | 'not-ready'）、message 和 details",
                  "**`liveCheck`** - 自定义存活检查函数，返回 Promise，包含 status（'alive' | 'dead'）、message 和 details",
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
