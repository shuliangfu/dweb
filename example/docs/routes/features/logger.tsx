/**
 * Logger 文档页面
 */

import CodeBlock from '../../components/CodeBlock.tsx';
import type { PageProps } from '@dreamer/dweb';

export const metadata = {
  title: 'Logger - DWeb 框架文档',
  description: '日志系统和日志轮转',
};

export default function LoggerPage({ params: _params, query: _query, data: _data }: PageProps) {
  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Logger</h1>
          <p className="text-gray-700 leading-relaxed mb-8">
            DWeb 框架提供了强大的日志系统，支持多种日志级别、日志轮转等功能。
          </p>
          <p className="text-gray-700 leading-relaxed mb-8">
            详细文档正在完善中...
          </p>
        </article>
      </div>
    </div>
  );
}
