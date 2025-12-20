/**
 * 中间件 - bodyParser 文档页面
 */

import CodeBlock from '../../../components/CodeBlock.tsx';
import Sidebar from '../../../components/Sidebar.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'bodyParser 中间件 - DWeb 框架文档',
  description: 'bodyParser 中间件使用指南',
};

export default function BodyParserMiddlewarePage({ params: _params, query: _query, data: _data }: PageProps) {
  const bodyParserCode = `import { bodyParser } from '@dreamer/dweb/middleware';

server.use(bodyParser({
  json: { limit: '1mb' },
  urlencoded: { limit: '1mb', extended: true },
  text: { limit: '1mb' },
  raw: { limit: '1mb' },
}));`;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 侧边栏导航 */}
      <Sidebar currentPath="/docs/middleware/body-parser" />

      {/* 文档内容区域 */}
      <div className="flex-1 overflow-auto">
        <div className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <article className="prose prose-lg max-w-none">
              <h1 className="text-4xl font-bold text-gray-900 mb-8">bodyParser - 请求体解析</h1>
              <p className="text-gray-700 leading-relaxed mb-8">
                bodyParser 中间件用于解析 HTTP 请求体，支持 JSON、URL-encoded、文本和原始数据。
              </p>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">基本使用</h2>
                <CodeBlock code={bodyParserCode} language="typescript" />
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mt-12 mb-6 border-b border-gray-200 pb-2">配置选项</h2>
                <ul className="list-disc list-inside space-y-2 my-4">
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">json</code> - JSON 解析配置</li>
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">urlencoded</code> - URL-encoded 解析配置</li>
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">text</code> - 文本解析配置</li>
                  <li className="text-gray-700"><code className="bg-gray-100 px-2 py-1 rounded">raw</code> - 原始数据解析配置</li>
                </ul>
              </section>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

