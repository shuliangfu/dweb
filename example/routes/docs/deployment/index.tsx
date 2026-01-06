/**
 * 配置与部署 - 配置与部署概述文档页面
 * 展示 DWeb 框架的配置和部署相关文档
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "配置与部署概述 - DWeb 框架文档",
  description:
    "DWeb 框架的配置管理和部署指南，包括配置文件、Docker 部署、开发指南等",
};

export default function DeploymentOverviewPage() {
  // 配置文件示例
  const configCode = `// dweb.config.ts
import { tailwind, seo } from "@dreamer/dweb";

export default {
  // 应用配置
  port: 3000,
  host: "0.0.0.0",

  // 插件配置
  plugins: [
    tailwind({ version: 'v4' }),
    seo({ title: 'My App' }),
  ],

  // 中间件配置
  middleware: [
    // ...
  ],
};`;

  // Docker 部署示例
  const dockerCode = `# Dockerfile
FROM denoland/deno:latest

WORKDIR /app
COPY . .
RUN deno task build

EXPOSE 3000
CMD ["deno", "task", "start"]`;

  // 页面文档数据
  const content = {
    title: "配置与部署概述",
    description:
      "DWeb 框架的配置管理和部署指南，包括配置文件、Docker 部署、开发指南等。",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "配置文件",
            blocks: [
              {
                type: "code",
                code: configCode,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "Docker 部署",
            blocks: [
              {
                type: "code",
                code: dockerCode,
                language: "dockerfile",
              },
            ],
          },
        ],
      },
      {
        title: "文档导航",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[配置文档](/docs/deployment/configuration) - 详细的配置选项和说明",
              "[Docker 部署](/docs/deployment/docker) - 使用 Docker 部署应用",
              "[开发指南](/docs/deployment/development) - 开发环境配置和最佳实践",
            ],
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
              "[核心模块](/docs/core) - 框架核心功能",
              "[功能模块](/docs/features) - 框架功能模块",
              "[中间件系统](/docs/middleware) - 中间件系统",
              "[插件系统](/docs/plugins) - 插件系统",
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
