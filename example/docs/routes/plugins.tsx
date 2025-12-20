/**
 * 插件文档页面
 */

import CodeBlock from '../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: '插件 - DWeb 框架文档',
  description: '插件系统和使用指南',
};

export default function PluginsPage({ params: _params, query: _query, data: _data }: PageProps) {
  const pluginCode = `import type { Plugin } from '@dreamer/dweb/core/plugin';

const myPlugin: Plugin = {
  name: 'my-plugin',
  setup(app) {
    // 插件初始化
    console.log('Plugin initialized');
  },
};`;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">插件</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            DWeb 框架提供了灵活的插件系统，可以扩展框架功能。
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">创建插件</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              插件是一个对象，包含名称和初始化函数：
            </p>
            <CodeBlock code={pluginCode} language="typescript" />
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">内置插件</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              框架提供了多个内置插件，用于扩展应用功能：
            </p>

            {/* tailwind */}
            <section id="tailwind" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">tailwind - Tailwind CSS 支持</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                集成 Tailwind CSS，支持 V3 和 V4 版本。
              </p>
              <CodeBlock code={`import { tailwind } from '@dreamer/dweb/plugins';

plugins: [
  tailwind({
    version: 'v4',
    cssPath: 'assets/style.css',
    optimize: true,
  }),
],`} language="typescript" />
            </section>

            {/* seo */}
            <section id="seo" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">seo - SEO 优化</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                自动生成 SEO 元数据，包括 Open Graph 和 Twitter Card。
              </p>
              <CodeBlock code={`import { seo } from '@dreamer/dweb/plugins';

plugins: [
  seo({
    title: 'My App',
    description: 'My awesome app',
    keywords: ['web', 'framework'],
  }),
],`} language="typescript" />
            </section>

            {/* sitemap */}
            <section id="sitemap" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">sitemap - 网站地图</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                自动生成网站地图（sitemap.xml）。
              </p>
              <CodeBlock code={`import { sitemap } from '@dreamer/dweb/plugins';

plugins: [
  sitemap({
    hostname: 'https://example.com',
    urls: [
      { url: '/', changefreq: 'daily', priority: 1.0 },
    ],
  }),
],`} language="typescript" />
            </section>

            {/* pwa */}
            <section id="pwa" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">pwa - 渐进式 Web 应用</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                将应用转换为渐进式 Web 应用（PWA），支持离线访问。
              </p>
              <CodeBlock code={`import { pwa } from '@dreamer/dweb/plugins';

plugins: [
  pwa({
    manifest: {
      name: 'My App',
      shortName: 'App',
    },
  }),
],`} language="typescript" />
            </section>

            {/* cache */}
            <section id="cache" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">cache - 缓存插件</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                提供缓存功能，支持内存缓存和 Redis 缓存。
              </p>
              <CodeBlock code={`import { cache } from '@dreamer/dweb/plugins';

plugins: [
  cache({
    type: 'memory', // 'memory' | 'redis'
    ttl: 3600, // 缓存时间（秒）
  }),
],`} language="typescript" />
            </section>

            {/* email */}
            <section id="email" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">email - 邮件插件</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                发送邮件，支持 SMTP 和模板渲染。
              </p>
              <CodeBlock code={`import { email } from '@dreamer/dweb/plugins';

plugins: [
  email({
    smtp: {
      host: 'smtp.example.com',
      port: 587,
      user: 'user@example.com',
      password: 'password',
    },
  }),
],`} language="typescript" />
            </section>

            {/* fileUpload */}
            <section id="fileUpload" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">fileUpload - 文件上传</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                处理文件上传，支持多文件上传和文件验证。
              </p>
              <CodeBlock code={`import { fileUpload } from '@dreamer/dweb/plugins';

plugins: [
  fileUpload({
    dest: './uploads',
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  }),
],`} language="typescript" />
            </section>

            {/* formValidator */}
            <section id="formValidator" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">formValidator - 表单验证</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                验证表单数据，支持多种验证规则。
              </p>
              <CodeBlock code={`import { formValidator } from '@dreamer/dweb/plugins';

plugins: [
  formValidator({
    rules: {
      email: { type: 'email', required: true },
      password: { type: 'string', min: 8 },
    },
  }),
],`} language="typescript" />
            </section>

            {/* i18n */}
            <section id="i18n" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">i18n - 国际化</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                提供国际化支持，支持多语言切换。
              </p>
              <CodeBlock code={`import { i18n } from '@dreamer/dweb/plugins';

plugins: [
  i18n({
    defaultLocale: 'zh-CN',
    locales: ['zh-CN', 'en-US'],
    messages: {
      'zh-CN': { hello: '你好' },
      'en-US': { hello: 'Hello' },
    },
  }),
],`} language="typescript" />
            </section>

            {/* imageOptimizer */}
            <section id="imageOptimizer" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">imageOptimizer - 图片优化</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                自动优化图片，支持压缩和格式转换。
              </p>
              <CodeBlock code={`import { imageOptimizer } from '@dreamer/dweb/plugins';

plugins: [
  imageOptimizer({
    quality: 80,
    formats: ['webp', 'avif'],
  }),
],`} language="typescript" />
            </section>

            {/* performance */}
            <section id="performance" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">performance - 性能监控</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                监控应用性能，收集性能指标。
              </p>
              <CodeBlock code={`import { performance } from '@dreamer/dweb/plugins';

plugins: [
  performance({
    enabled: true,
    metrics: ['responseTime', 'memoryUsage'],
  }),
],`} language="typescript" />
            </section>

            {/* theme */}
            <section id="theme" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">theme - 主题插件</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                支持主题切换，包括亮色和暗色主题。
              </p>
              <CodeBlock code={`import { theme } from '@dreamer/dweb/plugins';

plugins: [
  theme({
    themes: {
      light: { colors: { primary: '#000' } },
      dark: { colors: { primary: '#fff' } },
    },
    defaultTheme: 'light',
  }),
],`} language="typescript" />
            </section>

            {/* rss */}
            <section id="rss" className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">rss - RSS 插件</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                生成 RSS Feed，支持内容订阅。
              </p>
              <CodeBlock code={`import { rss } from '@dreamer/dweb/plugins';

plugins: [
  rss({
    title: 'My Blog',
    description: 'My awesome blog',
    feedUrl: '/feed.xml',
  }),
],`} language="typescript" />
            </section>
          </section>
        </article>
      </div>
    </div>
  );
}
