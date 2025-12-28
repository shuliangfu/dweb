/**
 * 插件 - 插件概述文档页面
 * 展示 DWeb 框架的插件系统概述
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "插件概述 - DWeb 框架文档",
  description: "DWeb 框架的插件系统概述，包括内置插件和使用方法",
};

export default function PluginsOverviewPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本用法
  const basicUsageCode = `import { Application } from "@dreamer/dweb/core/application";
import { tailwind, seo } from "@dreamer/dweb/plugins";

const app = new Application();
await app.initialize();

// 注册插件
app.plugin(tailwind({ version: 'v4' }));
app.plugin(seo({ title: 'My App' }));

await app.start();`;

  // 在配置文件中使用
  const configUsageCode = `// dweb.config.ts
import { tailwind, seo, store } from '@dreamer/dweb/plugins';

export default {
  plugins: [
    tailwind({ version: 'v4' }),
    seo({ title: 'My App' }),
    store({ persist: true }),
  ],
};`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        插件概述
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 框架提供了强大的插件系统，支持各种功能扩展。
      </p>

      {/* 目录结构 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          目录结构
        </h2>
        <CodeBlock code={`src/plugins/
├── cache/              # 缓存插件
├── email/              # 邮件插件
├── file-upload/        # 文件上传插件
├── form-validator/     # 表单验证插件
├── i18n/               # 国际化插件
├── image-optimizer/    # 图片优化插件
├── performance/        # 性能监控插件
├── pwa/                # PWA 插件
├── rss/                # RSS 插件
├── seo/                # SEO 插件
├── sitemap/            # 网站地图插件
├── store/              # 状态管理插件
├── tailwind/           # Tailwind CSS 插件
├── theme/              # 主题插件
└── mod.ts              # 模块导出`} language="text" />
      </section>

      {/* 使用插件 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          使用插件
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          基本用法
        </h3>
        <CodeBlock code={basicUsageCode} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          在配置文件中使用
        </h3>
        <CodeBlock code={configUsageCode} language="typescript" />
      </section>

      {/* 内置插件 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          内置插件
        </h2>
        <div className="grid md:grid-cols-2 gap-4 my-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a href="/docs/plugins/tailwind" className="text-blue-600 dark:text-blue-400 hover:underline">tailwind</a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">Tailwind CSS 支持</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a href="/docs/plugins/store" className="text-blue-600 dark:text-blue-400 hover:underline">store</a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">状态管理</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a href="/docs/plugins/seo" className="text-blue-600 dark:text-blue-400 hover:underline">seo</a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">SEO 优化</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a href="/docs/plugins/sitemap" className="text-blue-600 dark:text-blue-400 hover:underline">sitemap</a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">网站地图生成</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a href="/docs/plugins/pwa" className="text-blue-600 dark:text-blue-400 hover:underline">pwa</a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">渐进式 Web 应用</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a href="/docs/plugins/cache" className="text-blue-600 dark:text-blue-400 hover:underline">cache</a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">缓存管理</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a href="/docs/plugins/email" className="text-blue-600 dark:text-blue-400 hover:underline">email</a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">邮件发送</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a href="/docs/plugins/file-upload" className="text-blue-600 dark:text-blue-400 hover:underline">fileUpload</a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">文件上传</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a href="/docs/plugins/form-validator" className="text-blue-600 dark:text-blue-400 hover:underline">formValidator</a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">表单验证</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a href="/docs/plugins/i18n" className="text-blue-600 dark:text-blue-400 hover:underline">i18n</a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">国际化</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a href="/docs/plugins/image-optimizer" className="text-blue-600 dark:text-blue-400 hover:underline">imageOptimizer</a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">图片优化</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a href="/docs/plugins/performance" className="text-blue-600 dark:text-blue-400 hover:underline">performance</a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">性能监控</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a href="/docs/plugins/theme" className="text-blue-600 dark:text-blue-400 hover:underline">theme</a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">主题切换</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              <a href="/docs/plugins/rss" className="text-blue-600 dark:text-blue-400 hover:underline">rss</a>
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">RSS 订阅</p>
          </div>
        </div>
      </section>

      {/* 其他 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          其他
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li><a href="/docs/plugins/custom" className="text-blue-600 dark:text-blue-400 hover:underline">创建自定义插件</a> - 编写自己的插件</li>
        </ul>
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li><a href="/docs/core/plugin" className="text-blue-600 dark:text-blue-400 hover:underline">插件系统</a> - 框架核心功能</li>
          <li><a href="/docs/core/application" className="text-blue-600 dark:text-blue-400 hover:underline">Application</a> - 应用核心</li>
          <li><a href="/docs/middleware" className="text-blue-600 dark:text-blue-400 hover:underline">中间件系统</a> - 中间件系统</li>
        </ul>
      </section>
    </article>
  );
}
