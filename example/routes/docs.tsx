/**
 * 文档/快速开始页面
 * 提供 DWeb 框架的使用文档和快速开始指南
 */

import CodeBlock from '../components/CodeBlock.tsx';
import type { PageProps, LoadContext } from '@dreamer/dweb';

/**
 * 加载页面数据（服务端执行）
 * @param context 包含 params、query、cookies、session 等的上下文对象
 * @returns 页面数据，会自动赋值到组件的 data 属性
 */
export async function load({
  params: _params,
  query: _query,
  cookies: _cookies,
  session: _session,
  getCookie: _getCookie,
  getSession: _getSession,
}: LoadContext) {
  // 在 load 函数内部动态导入 utils（只在服务端执行）
  const { getJsrPackageUrl } = await import('../utils.ts');

  return {
    jsrPackageUrl: getJsrPackageUrl(),
    jsrPackageUrlWithCli: getJsrPackageUrl('/cli'),
  };
}

/**
 * 文档页面组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function DocsPage({ params: _params, query: _query, data }: PageProps) {
  // 从 load 函数返回的数据中获取 JSR 包 URL
  const { jsrPackageUrl, jsrPackageUrlWithCli } = data as {
    jsrPackageUrl: string;
    jsrPackageUrlWithCli: string;
  };

  // 安装代码
  const installCode = `# 创建新项目
deno run -A jsr:@dreamer/dweb/cli create

cd my-app
deno task dev`;

  // 作为库使用
  const libraryCode = `# 安装依赖
deno add jsr:@dreamer/dweb

# 或在 deno.json 中配置导入映射
{
  "imports": {
    "@dreamer/dweb": "jsr:@dreamer/dweb"
  }
}`;

  // 基本配置
  const configCode = `// dweb.config.ts
import type { AppConfig } from 'jsr:@dreamer/dweb';
import { tailwind, cors } from 'jsr:@dreamer/dweb';

const config: AppConfig = {
  name: 'my-app',
  renderMode: 'hybrid', // 'ssr' | 'csr' | 'hybrid'
  
  // 服务器配置
  server: {
    port: 3000,
    host: 'localhost',
  },
  
  // 路由配置
  routes: {
    dir: 'routes',
    ignore: ['**/*.test.ts', '**/*.test.tsx'],
  },
  
  // Cookie 配置
  cookie: {
    secret: 'your-secret-key-here-change-in-production',
  },
  
  // Session 配置
  session: {
    secret: 'your-session-secret-here-change-in-production',
    store: 'memory',
    maxAge: 3600000, // 1小时
    secure: false,
    httpOnly: true,
  },
  
  // 插件配置
  plugins: [
    tailwind({
      version: 'v4',
      cssPath: 'assets/style.css',
      optimize: true,
    }),
  ],
  
  // 中间件配置
  middleware: [
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  ],
  
  // 开发配置
  dev: {
    hmrPort: 24678,
    reloadDelay: 300,
  },
  
  // 构建配置
  build: {
    outDir: 'dist',
  },
};

export default config;`;

  // 创建页面
  const pageCode = `// routes/index.tsx
export default function HomePage() {
  return (
    <div>
      <h1>欢迎使用 DWeb</h1>
      <p>这是一个简单的页面示例</p>
    </div>
  );
}`;

  // API 路由
  const apiCode = `// routes/api/users.ts
export async function GET(req: Request) {
  return new Response(JSON.stringify({ users: [] }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// 函数式 API 路由
export async function getUser(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  return new Response(JSON.stringify({ id, name: 'User' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}`;

  // 中间件使用
  const middlewareCode = `// main.ts
import { createApp } from 'jsr:@dreamer/dweb';
import { logger, cors, compression } from 'jsr:@dreamer/dweb';

const app = createApp();

// 使用内置中间件
app.use(logger());
app.use(cors());
app.use(compression());

export default app;`;

  return (
    <div className="space-y-0">
      {/* 页面标题 */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            文档
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            快速开始使用 DWeb 框架，构建现代化的 Web 应用
          </p>
        </div>
      </div>

      {/* 文档内容 */}
      <div className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            {/* 快速开始 */}
            <section className="mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">快速开始</h2>
              
              <h3 className="text-2xl font-bold text-gray-800 mb-4">创建新项目</h3>
              <CodeBlock code={installCode} language="bash" />
              
              <h3 className="text-2xl font-bold text-gray-800 mb-4 mt-8">作为库使用</h3>
              <CodeBlock code={libraryCode} language="bash" />
            </section>

            {/* 配置 */}
            <section className="mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">配置</h2>
              <p className="text-gray-600 mb-4">
                在项目根目录创建 <code className="bg-gray-100 px-2 py-1 rounded">dweb.config.ts</code> 文件：
              </p>
              <CodeBlock code={configCode} language="typescript" />
            </section>

            {/* 创建页面 */}
            <section className="mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">创建页面</h2>
              <p className="text-gray-600 mb-4">
                在 <code className="bg-gray-100 px-2 py-1 rounded">routes</code> 目录下创建文件即可自动生成路由：
              </p>
              <CodeBlock code={pageCode} language="typescript" />
              <p className="text-gray-600 mt-4">
                文件路径会自动映射为路由路径：
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 mt-4">
                <li><code className="bg-gray-100 px-2 py-1 rounded">routes/index.tsx</code> → <code className="bg-gray-100 px-2 py-1 rounded">/</code></li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">routes/about.tsx</code> → <code className="bg-gray-100 px-2 py-1 rounded">/about</code></li>
                <li><code className="bg-gray-100 px-2 py-1 rounded">routes/blog/[id].tsx</code> → <code className="bg-gray-100 px-2 py-1 rounded">/blog/:id</code></li>
              </ul>
            </section>

            {/* API 路由 */}
            <section className="mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">API 路由</h2>
              <p className="text-gray-600 mb-4">
                在 <code className="bg-gray-100 px-2 py-1 rounded">routes/api</code> 目录下创建 API 路由：
              </p>
              <CodeBlock code={apiCode} language="typescript" />
            </section>

            {/* 中间件 */}
            <section className="mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">使用中间件</h2>
              <p className="text-gray-600 mb-4">
                在 <code className="bg-gray-100 px-2 py-1 rounded">main.ts</code> 文件中注册中间件：
              </p>
              <CodeBlock code={middlewareCode} language="typescript" />
            </section>

            {/* 渲染模式 */}
            <section className="mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">渲染模式</h2>
              <p className="text-gray-600 mb-4">
                DWeb 支持三种渲染模式：
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li><strong>SSR（服务端渲染）</strong>：在服务器端渲染 HTML，适合 SEO 和首屏性能</li>
                <li><strong>CSR（客户端渲染）</strong>：完全在客户端渲染，支持 SPA 无刷新切换</li>
                <li><strong>Hybrid（混合渲染）</strong>：服务端渲染 + 客户端 hydration，兼顾 SEO 和交互性</li>
              </ul>
              <p className="text-gray-600 mt-4">
                可以在页面组件中配置渲染模式：
              </p>
              <CodeBlock code={`export const renderMode = 'hybrid';`} language="typescript" />
            </section>

            {/* 更多资源 */}
            <section className="mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">更多资源</h2>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
                <ul className="space-y-3 text-gray-700">
                  <li>
                    <a href="https://github.com/shuliangfu/dweb" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                      GitHub 仓库
                    </a>
                    - 查看源代码和提交问题
                  </li>
                  <li>
                    <a href="https://jsr.io/@dreamer/dweb" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                      JSR 包页面
                    </a>
                    - 查看包信息和版本
                  </li>
                  <li>
                    <a href="/features" className="text-blue-600 hover:text-blue-800 underline">
                      功能特性
                    </a>
                    - 了解所有功能
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

