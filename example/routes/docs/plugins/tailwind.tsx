/**
 * 插件 - tailwind 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "tailwind 插件 - DWeb 框架文档",
  description: "tailwind 插件使用指南",
};

export default function TailwindPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const tailwindCode = `import { tailwind } from '@dreamer/dweb';

plugins: [
  tailwind({
    version: 'v4',
    cssPath: 'assets/style.css',
    optimize: true,
  }),
],`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "tailwind - Tailwind CSS 支持",
    description: "tailwind 插件集成 Tailwind CSS，支持 V3 和 V4 版本。",
    sections: [
      {
        title: "特性与优化",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**智能回退机制**：优先尝试使用 Tailwind CLI（支持 v3 和 v4）进行编译，如果失败则自动回退到 PostCSS 处理，确保环境兼容性。",
              "**自动化运维**：能够自动检测并下载所需的 Tailwind CLI 二进制文件，实现开箱即用，无需用户手动安装依赖。",
              "**环境自适应优化**：",
              "  - 开发环境：使用内存缓存 (Map) 存储编译结果，带 TTL 控制，实现毫秒级热更新。",
              "  - 生产环境：在构建阶段编译 CSS 并输出文件，运行时自动注入 link 标签，实现最佳性能。",
            ],
          },
        ],
      },
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: tailwindCode,
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
                  "**`version`** - Tailwind CSS 版本：'v3' | 'v4'（默认为 'v4'）",
                  "**`cssPath`** - 主 CSS 文件路径（如 'assets/style.css'），用于开发环境实时编译。如果不指定，默认查找 'assets/style.css'",
                  "**`cssFiles`** - CSS 文件路径（支持 glob 模式），用于构建时处理多个文件。默认为 'assets/**/*.css'",
                  "**`exclude`** - 排除的文件（支持 glob 模式）",
                  "**`content`** - 内容扫描路径（用于 Tailwind CSS 扫描项目文件）。默认为 `[\"./routes/**/*.{tsx,ts,jsx,js}\", \"./components/**/*.{tsx,ts,jsx,js}\"]`",
                  "**`autoprefixer`** - v3 特定选项：Autoprefixer 配置对象，包含：",
                  "  - `env` - Browserslist 环境",
                  "  - `cascade` - 是否使用 Visual Cascade",
                  "  - `add` - 是否添加前缀",
                  "  - `remove` - 是否移除过时的前缀",
                  "  - `flexbox` - 是否为 flexbox 属性添加前缀",
                  "  - `grid` - 是否为 Grid Layout 属性添加前缀",
                  "  - `overrideBrowserslist` - 目标浏览器查询列表",
                  "**`optimize`** - v4 特定选项：是否优化（生产环境默认 true）",
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
