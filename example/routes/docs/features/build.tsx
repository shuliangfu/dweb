/**
 * 功能模块 - 构建 (build) 文档页面
 * 展示 DWeb 框架的构建功能和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "构建 (build) - DWeb 框架文档",
  description: "DWeb 框架的构建功能使用指南，构建生产版本",
};

export default function FeaturesBuildPage() {
  // 构建生产版本 - 单应用模式
  const singleAppCode = `# 构建项目
deno task build

# 或使用 CLI 命令
deno run -A @dreamer/dweb/cli build`;

  // 构建生产版本 - 多应用模式
  const multiAppCode = `# 构建所有应用
deno task build

# 构建指定应用
deno run -A @dreamer/dweb/cli build:app-name

# 或在 deno.json 中配置任务别名
# "build:app-name": "deno run -A @dreamer/dweb/cli build:app-name"`;

  // 构建配置
  const buildConfigCode = `// dweb.config.ts
export default {
  build: {
    // 输出目录
    outDir: "dist",

    // 是否生成 source map（用于调试）
    sourcemap: true,

    // 是否压缩代码
    minify: true,

    // 目标 JavaScript 版本
    target: "es2022",
    
    // 其他选项
    // assetsDir: 'assets',      // 静态资源目录
    // publicDir: 'public',      // 公共文件目录
    // emptyOutDir: true,        // 构建前清空输出目录
  },
};`;

  // 构建输出结构
  const outputStructureCode = `构建输出结构：

dist/
├── routes/          # 编译后的路由文件
├── assets/          # 静态资源
├── public/          # 公共文件（直接复制）
└── index.js         # 入口文件（如果存在）`;

  const content = {
    title: "构建 (build)",
    description:
      "DWeb 框架提供了强大的构建功能，可以将项目编译为生产版本，优化代码并生成静态资源。",
    sections: [
      {
        title: "构建生产版本",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "单应用模式",
            blocks: [
              {
                type: "code",
                code: singleAppCode,
                language: "bash",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "多应用模式",
            blocks: [
              {
                type: "code",
                code: multiAppCode,
                language: "bash",
              },
            ],
          },
        ],
      },
      {
        title: "构建优化",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "**Tree Shaking**：基于 esbuild 的高效 Tree Shaking，自动移除未使用的代码，显著减小生产环境包体积。",
              "**资源哈希**：自动为静态资源生成内容哈希文件名（如 style.a1b2c3.css），配合永久缓存策略，最大化利用浏览器缓存。",
              "**预渲染优化**：构建时自动识别静态路由并进行预渲染（SSG），提升首屏加载速度和 SEO 表现。",
            ],
          },
        ],
      },
      {
        title: "构建配置",
        blocks: [
          {
            type: "text",
            content: "在 `dweb.config.ts` 中配置构建选项：",
          },
          {
            type: "code",
            code: buildConfigCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "构建输出结构",
        blocks: [
          {
            type: "code",
            code: outputStructureCode,
            language: "text",
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
              "[生产服务器](/docs/features/prod)",
              "[开发服务器](/docs/features/dev)",
              "[开发指南](/docs/deployment/development)",
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
