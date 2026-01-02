/**
 * 中间件 - staticFiles 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "staticFiles 中间件 - DWeb 框架文档",
  description: "staticFiles 中间件使用指南",
};

export default function StaticFilesMiddlewarePage() {
  const staticFilesCode = `import { staticFiles } from '@dreamer/dweb';

server.use(staticFiles({
  dir: 'assets',
  prefix: '/assets',
  maxAge: 86400, // 缓存时间（秒）
}));`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "staticFiles - 静态文件服务",
    description:
      "staticFiles 中间件用于提供静态文件服务，支持缓存和 MIME 类型识别。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: staticFilesCode,
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
            title: "必需参数",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`dir`** - 静态文件根目录",
                ],
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "可选参数",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`prefix`** - URL 前缀（如果未配置，默认使用 dir 的名称）",
                  "**`index`** - 索引文件名（字符串或数组，默认 ['index.html']）",
                  "**`dotfiles`** - 点文件处理方式（'allow' | 'deny' | 'ignore'，默认 'ignore'）",
                  "**`etag`** - 是否启用 ETag（默认 true）",
                  "**`lastModified`** - 是否发送 Last-Modified（默认 true）",
                  "**`maxAge`** - 缓存时间（秒，默认 0）",
                  "**`outDir`** - 构建输出目录（生产环境使用，如果未提供则自动检测）",
                  "**`isProduction`** - 是否为生产环境（如果未提供则自动检测）",
                  "**`extendDirs`** - 扩展的静态资源目录数组（如上传目录，这些目录不会被打包，始终从项目根目录读取），可以是字符串或对象：",
                  "  - 字符串：目录路径",
                  "  - 对象：`{ dir: string, prefix?: string }` - 目录路径和 URL 前缀",
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
