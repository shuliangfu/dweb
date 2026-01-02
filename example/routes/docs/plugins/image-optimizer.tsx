/**
 * 插件 - imageOptimizer 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "imageOptimizer 插件 - DWeb 框架文档",
  description: "imageOptimizer 插件使用指南",
};

export default function ImageOptimizerPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const imageOptimizerCode =
    `import { imageOptimizer } from '@dreamer/dweb';

plugins: [
  imageOptimizer({
    quality: 80,
    formats: ['webp', 'avif'],
  }),
],`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "imageOptimizer - 图片优化",
    description: "imageOptimizer 插件自动优化图片，支持压缩和格式转换。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: imageOptimizerCode,
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
                  "**`imageDir`** - 图片目录（相对于项目根目录），可以是字符串或数组",
                  "**`outputDir`** - 输出目录（相对于构建输出目录）",
                  "**`compression`** - 压缩配置对象：",
                  "  - `enabled` - 是否启用压缩",
                  "  - `quality` - 压缩质量（0-100，仅用于有损格式）",
                  "  - `optimizeSvg` - 是否优化 SVG",
                  "  - `maxFileSize` - 最大文件大小（字节），超过此大小才压缩",
                  "**`webp`** - WebP 配置对象：",
                  "  - `enabled` - 是否生成 WebP 格式",
                  "  - `quality` - WebP 质量（0-100）",
                  "  - `keepOriginal` - 是否同时保留原格式",
                  "**`avif`** - AVIF 配置对象：",
                  "  - `enabled` - 是否生成 AVIF 格式",
                  "  - `quality` - AVIF 质量（0-100）",
                  "  - `keepOriginal` - 是否同时保留原格式",
                  "**`responsive`** - 响应式图片配置对象：",
                  "  - `breakpoints` - 断点配置数组（宽度）",
                  "  - `defaultSize` - 默认尺寸对象（width, height, suffix）",
                  "  - `generateSrcset` - 是否生成 srcset",
                  "  - `generateSizes` - 是否生成 sizes 属性",
                  "**`placeholder`** - 占位符配置对象：",
                  "  - `enabled` - 是否生成占位符",
                  "  - `type` - 占位符类型（'blur' | 'color' | 'lqip'）",
                  "  - `size` - 占位符尺寸对象（width, height, suffix）",
                  "**`lazyLoad`** - 懒加载配置对象：",
                  "  - `enabled` - 是否启用懒加载",
                  "  - `attribute` - 懒加载属性名（默认 'loading'）",
                  "  - `value` - 懒加载值（默认 'lazy'）",
                  "**`exclude`** - 排除的文件数组（支持 glob 模式）",
                  "**`include`** - 包含的文件数组（支持 glob 模式）",
                  "**`autoTransform`** - 是否在 HTML 中自动转换图片标签（默认 true）",
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
