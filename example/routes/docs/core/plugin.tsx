/**
 * 核心模块 - 插件系统文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "插件系统 - DWeb 框架文档",
  description: "DWeb 框架的插件系统介绍",
};

export default function CorePluginPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const pluginCode = `import type { Plugin } from '@dreamer/dweb/core/plugin';

const myPlugin: Plugin = {
  name: 'my-plugin',
  setup(app) {
    // 插件初始化
    console.log('Plugin initialized');
  },
};`;

  const usePluginCode = `import { createApp } from '@dreamer/dweb';
import { tailwind, seo } from '@dreamer/dweb/plugins';

const app = createApp();

// 注册插件
app.plugin(tailwind({ version: 'v4' }));
app.plugin(seo({ title: 'My App' }));

export default app;`;

  // 插件生命周期钩子示例
  const lifecycleHooksCode =
    `import type { Plugin } from '@dreamer/dweb/core/plugin';

const myPlugin: Plugin = {
  name: 'my-plugin',
  
  // 应用初始化时执行
  onInit: async (app) => {
    console.log('插件初始化');
  },
  
  // 每个请求前执行
  onRequest: async (req, res) => {
    console.log('请求:', req.url);
  },
  
  // 每个响应后执行
  onResponse: async (req, res, html) => {
    // 可以修改 HTML 内容
    return html.replace('</body>', '<script>console.log("插件注入")</script></body>');
  },
  
  // 发生错误时执行
  onError: async (error, req, res) => {
    console.error('错误:', error);
  },
  
  // 构建时执行
  onBuild: async (config) => {
    console.log('构建配置:', config);
  },
};`;

  // 插件配置
  const pluginConfigCode = `// 插件可以接受配置
const myPlugin = (options: { apiKey: string }) => ({
  name: 'my-plugin',
  onInit: async (app) => {
    console.log('API Key:', options.apiKey);
  },
});

// 使用插件
app.plugin(myPlugin({ apiKey: 'your-api-key' }));`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
        插件系统
      </h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 框架提供了灵活的插件系统，允许你扩展框架功能。
      </p>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          什么是插件
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          插件是一个对象，包含名称和初始化函数。插件可以：
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>扩展框架功能</li>
          <li>添加全局中间件</li>
          <li>修改应用配置</li>
          <li>注册生命周期钩子</li>
          <li>注入 HTML 内容</li>
          <li>处理 API 请求</li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          创建插件
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          创建一个自定义插件：
        </p>
        <CodeBlock code={pluginCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          使用插件
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          在应用中使用插件：
        </p>
        <CodeBlock code={usePluginCode} language="typescript" />
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          插件生命周期
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          插件支持多个生命周期钩子：
        </p>
        <CodeBlock code={lifecycleHooksCode} language="typescript" />
        <div className="mt-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            生命周期钩子说明
          </h3>
          <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
            <li>
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                onInit
              </code>{" "}
              - 应用初始化时执行，用于设置插件初始状态
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                onRequest
              </code>{" "}
              - 每个请求前执行，可以拦截请求或处理 API 路由
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                onResponse
              </code>{" "}
              - 每个响应后执行，可以修改响应内容或注入 HTML
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                onError
              </code>{" "}
              - 发生错误时执行，用于错误处理和日志记录
            </li>
            <li>
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">
                onBuild
              </code>{" "}
              - 构建时执行，用于构建时的处理逻辑
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          插件配置
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          插件可以接受配置选项：
        </p>
        <CodeBlock code={pluginConfigCode} language="typescript" />
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          插件接口
        </h3>
        <CodeBlock
          code={`interface Plugin {
  name: string;
  onInit?: (app: AppLike) => Promise<void> | void;
  onRequest?: (req: Request, res: Response) => Promise<void> | void;
  onResponse?: (req: Request, res: Response, html: string) => Promise<string> | string;
  onError?: (error: Error, req: Request, res: Response) => Promise<void> | void;
  onBuild?: (config: AppConfig) => Promise<void> | void;
}`}
          language="typescript"
        />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          使用插件
        </h3>
        <CodeBlock
          code={`// 在 Application 上使用
app.plugin(plugin);

// 在配置文件中使用
export default {
  plugins: [
    tailwind({ version: 'v4' }),
    seo({ title: 'My App' }),
  ],
};`}
          language="typescript"
        />
      </section>

      {/* 内置插件 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          内置插件
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          框架提供了多个内置插件：
        </p>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/plugins/tailwind"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              tailwind
            </a>{" "}
            - Tailwind CSS 支持
          </li>
          <li>
            <a
              href="/docs/plugins/store"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              store
            </a>{" "}
            - 状态管理
          </li>
          <li>
            <a
              href="/docs/plugins/seo"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              seo
            </a>{" "}
            - SEO 优化
          </li>
          <li>
            <a
              href="/docs/plugins/sitemap"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              sitemap
            </a>{" "}
            - 网站地图生成
          </li>
          <li>
            <a
              href="/docs/plugins/pwa"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              pwa
            </a>{" "}
            - PWA 支持
          </li>
          <li>
            <a
              href="/docs/plugins/cache"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              cache
            </a>{" "}
            - 缓存管理
          </li>
          <li>
            <a
              href="/docs/plugins/email"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              email
            </a>{" "}
            - 邮件发送
          </li>
          <li>
            <a
              href="/docs/plugins/file-upload"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              fileUpload
            </a>{" "}
            - 文件上传
          </li>
          <li>
            <a
              href="/docs/plugins/form-validator"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              formValidator
            </a>{" "}
            - 表单验证
          </li>
          <li>
            <a
              href="/docs/plugins/i18n"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              i18n
            </a>{" "}
            - 国际化
          </li>
          <li>
            <a
              href="/docs/plugins/image-optimizer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              imageOptimizer
            </a>{" "}
            - 图片优化
          </li>
          <li>
            <a
              href="/docs/plugins/performance"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              performance
            </a>{" "}
            - 性能优化
          </li>
          <li>
            <a
              href="/docs/plugins/theme"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              theme
            </a>{" "}
            - 主题管理
          </li>
          <li>
            <a
              href="/docs/plugins/rss"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              rss
            </a>{" "}
            - RSS 订阅
          </li>
        </ul>
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li>
            <a
              href="/docs/core/application"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Application (应用核心)
            </a>
          </li>
          <li>
            <a
              href="/docs/core/middleware"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              中间件系统
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}
