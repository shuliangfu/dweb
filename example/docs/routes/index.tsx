/**
 * 文档首页
 * 展示文档导航和快速开始指南
 */

import CodeBlock from '../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'DWeb 框架文档',
  description: 'DWeb 框架的完整使用文档和 API 参考',
};

/**
 * 文档首页组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function DocsHome({ params: _params, query: _query, data: _data }: PageProps) {
  // 快速开始代码
  const installCode = `# 创建新项目
deno run -A jsr:@dreamer/dweb/init

# 进入项目目录
cd my-app

# 启动开发服务器
deno task dev`;

  // 基本配置代码
  const configCode = `// dweb.config.ts
import type { DWebConfig } from '@dreamer/dweb';
import { tailwind, cors } from '@dreamer/dweb';

const config: DWebConfig = {
  apps: [
    {
      name: 'my-app',
      renderMode: 'hybrid',
      server: {
        port: 3000,
        host: 'localhost',
      },
      routes: {
        dir: 'routes',
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

  // 文档分类
  const docCategories = [
    {
      title: '核心模块',
      description: '服务器、路由、配置等核心功能',
      items: [
        { title: '核心模块', path: '/core', description: '服务器、路由、配置等核心功能' },
      ],
    },
    {
      title: '功能模块',
      description: '数据库、GraphQL、WebSocket 等功能模块',
      items: [
        { title: '数据库', path: '/database', description: '数据库支持、ORM/ODM、查询构建器' },
        { title: 'GraphQL', path: '/graphql', description: 'GraphQL 服务器和查询处理' },
        { title: 'WebSocket', path: '/websocket', description: 'WebSocket 服务器和客户端' },
        { title: 'Session', path: '/session', description: 'Session 管理和多种存储方式' },
        { title: 'Cookie', path: '/cookie', description: 'Cookie 管理和签名' },
        { title: 'Logger', path: '/logger', description: '日志系统和日志轮转' },
      ],
    },
    {
      title: '扩展模块',
      description: '中间件和插件系统',
      items: [
        { title: '中间件', path: '/middleware', description: '内置中间件和使用指南' },
        { title: '插件', path: '/plugins', description: '插件系统和使用指南' },
      ],
    },
    {
      title: '配置与部署',
      description: '配置文档和部署指南',
      items: [
        { title: '配置文档', path: '/configuration', description: 'dweb.config.ts 详细配置说明' },
        { title: 'Docker 部署', path: '/docker', description: 'Docker 部署指南' },
        { title: '开发指南', path: '/development', description: '开发流程、构建、部署' },
      ],
    },
  ];

  return (
    <div className="space-y-0">
      {/* Hero 区域 */}
      <div className="bg-linear-to-r from-indigo-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            DWeb 框架文档
          </h1>
          <p className="text-xl text-indigo-100 max-w-3xl mx-auto">
            完整的框架使用指南和 API 参考
          </p>
        </div>
      </div>

      {/* 快速开始 */}
      <div className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">快速开始</h2>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-4">创建新项目</h3>
          <CodeBlock code={installCode} language="bash" />
          
          <h3 className="text-xl font-semibold text-gray-800 mb-4 mt-8">基本配置</h3>
          <p className="text-gray-600 mb-4">
            在项目根目录创建 <code className="bg-gray-100 px-2 py-1 rounded">dweb.config.ts</code> 文件：
          </p>
          <CodeBlock code={configCode} language="typescript" />
        </div>
      </div>

      {/* 文档目录 */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">文档目录</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {docCategories.map((category, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{category.title}</h3>
                <p className="text-gray-600 mb-4 text-sm">{category.description}</p>
                <ul className="space-y-2">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex}>
                      <a
                        href={item.path}
                        className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium"
                      >
                        {item.title}
                      </a>
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
