/**
 * 插件 - fileUpload 文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "fileUpload 插件 - DWeb 框架文档",
  description: "fileUpload 插件使用指南",
};

export default function FileUploadPluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const fileUploadCode =
    `import { fileUpload, handleFileUpload } from '@dreamer/dweb/plugins';

// 注册插件
usePlugin(fileUpload({
  config: {
    uploadDir: './uploads',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowMultiple: true,
    namingStrategy: 'uuid',
    createSubdirs: true,
  },
  injectClientScript: true,
}));

// 处理文件上传
server.setHandler(async (req, res) => {
  if (req.method === 'POST' && req.path === '/upload') {
    const result = await handleFileUpload(req, {
      uploadDir: './uploads',
      maxFileSize: 5 * 1024 * 1024,
    });
    res.json(result);
  }
});`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "fileUpload - 文件上传",
    description:
      "fileUpload 插件用于处理文件上传，支持多文件上传和文件验证。该插件专注于文件上传功能，不包含图片处理功能。如需图片优化（压缩、裁切、格式转换等），请使用独立的 `image-optimizer` 插件。",
    sections: [
      {
        title: "基本使用",
        blocks: [
          {
            type: "code",
            code: fileUploadCode,
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
                  "**`config`** - 文件上传配置对象，包含：",
                  "  - `uploadDir` - 上传目录（相对于项目根目录）",
                  "  - `maxFileSize` - 最大文件大小（字节）",
                  "  - `allowedTypes` - 允许的文件类型数组（MIME 类型或扩展名）",
                  "  - `allowMultiple` - 是否允许多文件上传",
                  "  - `namingStrategy` - 文件命名策略（'original' | 'timestamp' | 'uuid' | 'hash'）",
                  "  - `createSubdirs` - 是否创建子目录（按日期）",
                  "  - `subdirStrategy` - 子目录创建策略（模板格式或预设值），默认为 `'YYYY/mm/dd'`",
                  "    - 模板格式（推荐）：`'YYYY/mm/dd'` - 2026/01/02（默认，适合上传较多的项目）",
                  "    - `'YYYY/mm'` - 2026/01（适合上传较少的项目）",
                  "    - `'YYYY'` - 2026（适合上传很少的项目）",
                  "    - `'YY/m/d'` - 26/1/2（使用2位年份和1-2位月日）",
                  "    - `'YYYY-MM-DD'` - 2026-01-02（使用横线分隔符）",
                  "    - 预设值（向后兼容）：`'year-month-day'` - 等同于 'YYYY/mm/dd'",
                  "    - `'year-month'` - 等同于 'YYYY/mm'",
                  "    - `'year'` - 等同于 'YYYY'",
                  "  - `perFileLimit` - 文件大小限制（每个文件）",
                  "  - `totalLimit` - 总大小限制（所有文件）",
                  "**`injectClientScript`** - 是否在客户端注入上传脚本（默认 true）",
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
