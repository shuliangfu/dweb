/**
 * 配置文档页面
 * 详细介绍 dweb.config.ts 配置选项
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "配置文档 - DWeb 框架文档",
  description: "dweb.config.ts 详细配置说明",
};

/**
 * 配置文档页面
 */
export default function ConfigurationPage({
  params: _params,
  query: _query,
  data: _data,
}: PageProps) {
  // 基本配置
  const basicConfigCode = `// dweb.config.ts
import type { DWebConfig } from '@dreamer/dweb';
import { tailwind, cors } from '@dreamer/dweb';

const config: DWebConfig = {
  apps: [
    {
      name: 'my-app',
      renderMode: 'hybrid', // 'ssr' | 'csr' | 'hybrid'
      server: {
        port: 3000,
        host: 'localhost',
      },
      routes: {
        dir: 'routes',
        ignore: ['**/*.test.ts', '**/*.test.tsx'],
      },
      static: {
        dir: 'assets',
      },
      plugins: [
        tailwind({
          version: 'v4',
          cssPath: 'assets/style.css',
        }),
      ],
      middleware: [
        cors({
          origin: '*',
        }),
      ],
    },
  ],
};

export default config;`;

  // 多应用配置
  const multiAppConfigCode = `// dweb.config.ts
import type { DWebConfig } from '@dreamer/dweb';
import { tailwind, cors } from '@dreamer/dweb';

const config: DWebConfig = {
  // 全局配置
  cookie: {
    secret: 'your-secret-key',
  },
  session: {
    secret: 'your-session-secret',
    store: 'memory',
    maxAge: 3600000,
  },
  
  // 应用列表
  apps: [
    {
      name: 'frontend',
      renderMode: 'hybrid',
      server: { port: 3000 },
      routes: { dir: 'frontend/routes' },
      static: { dir: 'frontend/assets' },
    },
    {
      name: 'backend',
      renderMode: 'ssr',
      server: { port: 3001 },
      routes: { dir: 'backend/routes' },
    },
  ],
};

export default config;`;

  // Session 配置
  const sessionConfigCode = `session: {
  // 存储方式
  store: 'memory', // 'memory' | 'file' | 'kv' | 'mongodb' | 'redis'
  
  // Session 密钥（必需）
  secret: 'your-session-secret',
  
  // 最大存活时间（毫秒）
  maxAge: 3600000, // 1小时
  
  // 文件存储配置
  file: {
    dir: './sessions',
  },
  
  // MongoDB 存储配置
  mongodb: {
    collection: 'sessions',
    password: 'password',
    db: 'mydb',
  },
  
  // Redis 存储配置
  redis: {
    password: 'password',
    db: 0,
  },
  
  // KV 存储配置
  kv: {},
},`;

  // 构建配置
  const buildConfigCode = `build: {
  // 输出目录
  outDir: 'dist',
  
  // 是否生成 source map
  sourcemap: true,
  
  // 是否压缩代码
  minify: true,
  
  // 目标环境
  target: 'es2022',
},`;

  // 开发配置
  const devConfigCode = `dev: {
  // 是否打开浏览器
  open: true,
  
  // HMR WebSocket 端口
  hmrPort: 24678,
  
  // 重新加载延迟（毫秒）
  reloadDelay: 300,
},`;

  return (
    <article className="prose prose-lg max-w-none">
      {/* 标题 */}
      <h1 className="text-4xl font-bold text-gray-900 mb-8">配置文档</h1>

      <p className="text-gray-700 leading-relaxed mb-8">
        DWeb 框架使用{" "}
        <code className="bg-gray-100 px-2 py-1 rounded">dweb.config.ts</code>
        {" "}
        文件进行配置，支持单应用和多应用模式。
      </p>

      {/* 配置文件位置 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          配置文件位置
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          配置文件应位于项目根目录，命名为{" "}
          <code className="bg-gray-100 px-2 py-1 rounded">
            dweb.config.ts
          </code>。
        </p>
      </section>

      {/* 基本配置 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          基本配置
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          单应用模式的基本配置示例：
        </p>
        <CodeBlock code={basicConfigCode} language="typescript" />
      </section>

      {/* 多应用配置 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          多应用配置
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          多应用模式允许在一个项目中运行多个独立的应用，每个应用可以有不同的配置：
        </p>
        <CodeBlock code={multiAppConfigCode} language="typescript" />
      </section>

      {/* Session 配置 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          Session 配置
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          框架支持多种 Session 存储方式：内存、文件、KV、MongoDB、Redis。
        </p>
        <CodeBlock code={sessionConfigCode} language="typescript" />
      </section>

      {/* 构建配置 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          构建配置
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          配置构建选项，包括输出目录、source map、代码压缩等：
        </p>
        <CodeBlock code={buildConfigCode} language="typescript" />
      </section>

      {/* 开发配置 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          开发配置
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          配置开发服务器的行为，包括 HMR、自动打开浏览器等：
        </p>
        <CodeBlock code={devConfigCode} language="typescript" />
      </section>

      {/* 配置选项说明 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">
          配置选项说明
        </h2>

        <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">
          应用配置 (apps)
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">name</code>{" "}
            - 应用名称（必需）
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">renderMode</code>
            {" "}
            - 渲染模式：'ssr' | 'csr' | 'hybrid'
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">server</code>{" "}
            - 服务器配置（端口、主机等）
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">routes</code>{" "}
            - 路由配置（目录、忽略模式等）
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">static</code>{" "}
            - 静态文件配置
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">plugins</code>{" "}
            - 插件列表
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">middleware</code>
            {" "}
            - 中间件列表
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">build</code>{" "}
            - 构建配置
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">dev</code>{" "}
            - 开发配置
          </li>
        </ul>

        <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">
          全局配置
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4">
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">cookie</code>{" "}
            - Cookie 配置（全局）
          </li>
          <li className="text-gray-700">
            <code className="bg-gray-100 px-2 py-1 rounded">session</code>{" "}
            - Session 配置（全局）
          </li>
        </ul>
      </section>
    </article>
  );
}
