/**
 * 核心模块 - 配置管理 (Config) 文档页面
 */

import CodeBlock from '../../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: '配置管理 (Config) - DWeb 框架文档',
  description: 'DWeb 框架的配置管理介绍',
};

export default function CoreConfigPage({ params: _params, query: _query, data: _data }: PageProps) {
  // 加载配置
  const configCode = `import { loadConfig } from '@dreamer/dweb/core/config';

// 加载默认配置
const { config, configDir } = await loadConfig();

// 加载指定配置文件
const { config } = await loadConfig('./dweb.config.ts');

// 多应用模式
const { config } = await loadConfig('./dweb.config.ts', 'app-name');`;

  // 基本配置示例
  const basicConfigCode = `// dweb.config.ts
import type { DWebConfig } from '@dreamer/dweb';
import { tailwind, cors } from '@dreamer/dweb';

const config: DWebConfig = {
  server: {
    port: 3000,
    host: 'localhost',
  },
  routes: {
    dir: 'routes',
  },
  static: {
    dir: 'assets',
    prefix: '/assets',
  },
  plugins: [
    tailwind({ version: 'v4' }),
    cors({ origin: '*' }),
  ],
};

export default config;`;

  // 多应用配置示例
  const multiAppConfigCode = `// dweb.config.ts
import type { DWebConfig } from '@dreamer/dweb';
import { tailwind, cors } from '@dreamer/dweb';

const config: DWebConfig = {
  cookie: {
    secret: 'your-secret-key',
  },
  session: {
    secret: 'your-session-secret',
    store: 'memory',
  },
  apps: [
    {
      name: 'frontend',
      server: { port: 3000 },
      routes: { dir: 'frontend/routes' },
      plugins: [tailwind()],
    },
    {
      name: 'backend',
      server: { port: 3001 },
      routes: { dir: 'backend/routes' },
      plugins: [cors()],
    },
  ],
};

export default config;`;

  // 环境变量配置
  const envConfigCode = `// dweb.config.ts
import type { DWebConfig } from '@dreamer/dweb';

const config: DWebConfig = {
  server: {
    port: parseInt(Deno.env.get('PORT') || '3000'),
    host: Deno.env.get('HOST') || 'localhost',
  },
  // ... 其他配置
};

export default config;`;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">配置管理 (Config)</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            DWeb 框架提供了灵活的配置加载机制，支持单应用和多应用模式。配置文件使用 TypeScript，提供完整的类型支持。
          </p>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">加载配置</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              框架会自动查找并加载 <code className="bg-gray-100 px-2 py-1 rounded">dweb.config.ts</code> 配置文件。你也可以手动加载配置：
            </p>
            <CodeBlock code={configCode} language="typescript" />
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">基本配置</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              单应用模式的基本配置示例：
            </p>
            <CodeBlock code={basicConfigCode} language="typescript" />
            <div className="mt-4">
              <h3 className="text-xl font-bold text-gray-900 mb-3">配置选项</h3>
              <ul className="list-disc list-inside space-y-2 my-4">
                <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">server</code> - 服务器配置（端口、主机等）</li>
                <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">routes</code> - 路由配置（目录、忽略规则等）</li>
                <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">static</code> - 静态资源配置（目录、前缀、缓存等）</li>
                <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">plugins</code> - 插件列表</li>
                <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">middleware</code> - 中间件列表</li>
                <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">cookie</code> - Cookie 配置</li>
                <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">session</code> - Session 配置</li>
                <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">database</code> - 数据库配置</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">多应用模式</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              多应用模式允许你在一个配置文件中定义多个应用，每个应用有独立的服务器、路由和插件配置：
            </p>
            <CodeBlock code={multiAppConfigCode} language="typescript" />
            <p className="text-gray-700 leading-relaxed mt-4">
              启动指定应用：<code className="bg-gray-100 px-2 py-1 rounded">deno run -A jsr:@dreamer/dweb/cli dev:app-name</code>
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">环境变量</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              可以在配置文件中使用环境变量，方便在不同环境中使用不同的配置：
            </p>
            <CodeBlock code={envConfigCode} language="typescript" />
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">配置文件位置</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              框架会按以下顺序查找配置文件：
            </p>
            <ol className="list-decimal list-inside space-y-2 my-4">
              <li className="text-gray-700">当前工作目录的 <code className="bg-gray-100 px-2 py-1 rounded">dweb.config.ts</code></li>
              <li className="text-gray-700">当前工作目录的 <code className="bg-gray-100 px-2 py-1 rounded">dweb.config.js</code></li>
              <li className="text-gray-700">如果使用 <code className="bg-gray-100 px-2 py-1 rounded">loadConfig(path)</code>，则加载指定路径的配置文件</li>
            </ol>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">更多配置</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              详细的配置选项说明，请查看 <a href="/deployment/configuration" className="text-indigo-600 hover:text-indigo-700 hover:underline">配置文档</a>。
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}

