/**
 * 功能模块 - 构建 (build) 文档页面
 * 展示 DWeb 框架的构建功能和使用方法
 */

import CodeBlock from "@components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "构建 (build) - DWeb 框架文档",
  description: "DWeb 框架的构建功能使用指南，构建生产版本",
};

export default function FeaturesBuildPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
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

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        构建 (build)
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb
        框架提供了强大的构建功能，可以将项目编译为生产版本，优化代码并生成静态资源。
      </p>

      {/* 构建生产版本 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          构建生产版本
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          单应用模式
        </h3>
        <CodeBlock code={singleAppCode} language="bash" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          多应用模式
        </h3>
        <CodeBlock code={multiAppCode} language="bash" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          构建优化
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <strong>Tree Shaking</strong>：
            基于 esbuild 的高效 Tree Shaking，自动移除未使用的代码，显著减小生产环境包体积。
          </li>
          <li>
            <strong>资源哈希</strong>：
            自动为静态资源生成内容哈希文件名（如 style.a1b2c3.css），配合永久缓存策略，最大化利用浏览器缓存。
          </li>
          <li>
            <strong>预渲染优化</strong>：
            构建时自动识别静态路由并进行预渲染（SSG），提升首屏加载速度和 SEO 表现。
          </li>
        </ul>
      </section>

      {/* 构建配置 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          构建配置
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          在{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
            dweb.config.ts
          </code>{" "}
          中配置构建选项：
        </p>
        <CodeBlock code={buildConfigCode} language="typescript" />
      </section>

      {/* 构建输出结构 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          构建输出结构
        </h2>
        <CodeBlock code={outputStructureCode} language="text" />
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/features/prod"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              生产服务器
            </a>
          </li>
          <li>
            <a
              href="/docs/features/dev"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              开发服务器
            </a>
          </li>
          <li>
            <a
              href="/docs/deployment/development"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              开发指南
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}
