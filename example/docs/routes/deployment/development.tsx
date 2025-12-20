/**
 * 开发指南文档页面
 * 详细介绍开发流程、构建、部署等
 */

import CodeBlock from '../../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: '开发指南 - DWeb 框架文档',
  description: 'DWeb 框架开发指南，包括项目创建、开发流程、构建部署等',
};

/**
 * 开发指南文档页面
 */
export default function DevelopmentPage({ params: _params, query: _query, data: _data }: PageProps) {
  // 创建项目
  const createProjectCode = `# 交互式创建项目
deno run -A jsr:@dreamer/dweb/init

# 指定项目名称
deno run -A jsr:@dreamer/dweb/init my-app`;

  // 项目结构
  const projectStructureCode = `my-app/
├── routes/              # 路由目录
│   ├── index.tsx        # 首页
│   ├── about.tsx        # 关于页面
│   └── api/             # API 路由
│       └── users.ts
├── components/          # 组件目录
├── assets/              # 静态资源
├── dweb.config.ts       # 配置文件
├── deno.json            # Deno 配置
└── main.ts              # 入口文件（可选）`;

  // 启动开发服务器
  const devServerCode = `# 单应用模式
deno task dev

# 多应用模式 - 启动所有应用
deno task dev

# 多应用模式 - 启动指定应用
deno run -A src/cli.ts dev:app-name`;

  // main.ts 示例
  const mainTsCode = `// main.ts（可选）
import { createApp, cors, staticFiles } from '@dreamer/dweb';

const app = createApp();

// 配置中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// 配置静态文件服务
app.use(staticFiles({
  dir: 'assets',
  prefix: '/assets',
}));

export default app;`;

  // 构建项目
  const buildCode = `# 单应用模式
deno task build

# 多应用模式 - 构建所有应用
deno task build

# 多应用模式 - 构建指定应用
deno run -A src/cli.ts build:app-name`;

  // 生产环境启动
  const startCode = `# 单应用模式
deno task start

# 多应用模式 - 启动所有应用
deno task start

# 多应用模式 - 启动指定应用
deno run -A src/cli.ts start:app-name`;

  // 代码格式化
  const formatCode = `# 格式化所有文件
deno fmt

# 格式化指定目录
deno fmt src/

# 检查格式（不修改文件）
deno fmt --check`;

  // 代码检查
  const lintCode = `# 检查所有文件
deno lint

# 检查指定目录
deno lint src/

# 自动修复
deno lint --fix`;

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          {/* 标题 */}
          <h1 className="text-4xl font-bold text-gray-900 mb-8">开发指南</h1>
          
          <p className="text-gray-700 leading-relaxed mb-8">
            DWeb 框架开发指南，包括项目创建、开发流程、构建部署等。
          </p>

          {/* 项目创建 */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">项目创建</h2>
            
            <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">使用 CLI 创建项目</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              使用框架提供的初始化工具快速创建新项目：
            </p>
            <CodeBlock code={createProjectCode} language="bash" />
            
            <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">项目结构</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              创建的项目结构如下：
            </p>
            <CodeBlock code={projectStructureCode} language="text" />
            
            <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">入口文件 (main.ts)</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>注意：</strong><code className="bg-gray-100 px-2 py-1 rounded">main.ts</code> 文件是可选的，不是必须的。框架可以通过 CLI 命令自动启动服务器。
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              如果你需要自定义应用配置（如添加中间件、插件等），可以创建 <code className="bg-gray-100 px-2 py-1 rounded">main.ts</code> 文件：
            </p>
            <CodeBlock code={mainTsCode} language="typescript" />
          </section>

          {/* 开发流程 */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">开发流程</h2>
            
            <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">启动开发服务器</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              启动开发服务器，支持热更新（HMR）：
            </p>
            <CodeBlock code={devServerCode} language="bash" />
            
            <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">开发工具</h3>
            
            <h4 className="text-xl font-bold text-gray-900 mt-8 mb-3">代码格式化</h4>
            <CodeBlock code={formatCode} language="bash" />
            
            <h4 className="text-xl font-bold text-gray-900 mt-8 mb-3">代码检查</h4>
            <CodeBlock code={lintCode} language="bash" />
          </section>

          {/* 构建与部署 */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">构建与部署</h2>
            
            <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">构建项目</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              构建生产版本的应用：
            </p>
            <CodeBlock code={buildCode} language="bash" />
            
            <h3 className="text-2xl font-bold text-gray-900 mt-10 mb-4">生产环境启动</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              在生产环境中启动应用：
            </p>
            <CodeBlock code={startCode} language="bash" />
          </section>

          {/* 最佳实践 */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">最佳实践</h2>
            
            <ul className="list-disc list-inside space-y-2 my-4">
              <li className="text-gray-700">使用 TypeScript 进行类型检查，提高代码质量</li>
              <li className="text-gray-700">遵循文件系统路由约定，保持路由结构清晰</li>
              <li className="text-gray-700">合理使用中间件，避免过度嵌套</li>
              <li className="text-gray-700">使用环境变量管理配置，避免硬编码敏感信息</li>
              <li className="text-gray-700">定期更新依赖，保持框架和依赖的最新版本</li>
              <li className="text-gray-700">使用代码格式化工具，保持代码风格一致</li>
              <li className="text-gray-700">编写单元测试和集成测试，确保代码质量</li>
            </ul>
          </section>
        </article>
      </div>
    </div>
  );
}
