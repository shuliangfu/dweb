/**
 * 开发指南文档页面
 */

import type { PageProps, LoadContext } from '@dreamer/dweb';
import { loadDoc, markdownToHtml } from '../utils/doc-loader.ts';

export const metadata = {
  title: '开发指南 - DWeb 框架文档',
  description: 'DWeb 框架开发指南，包括项目创建、开发流程、构建部署等',
};

/**
 * 加载文档内容
 */
export async function load(_context: LoadContext) {
  const content = await loadDoc('development');
  return { content };
}

/**
 * 开发指南文档页面
 */
export default function DevelopmentPage({ params: _params, query: _query, data }: PageProps) {
  const { content } = data as { content: string };
  const html = markdownToHtml(content);

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="prose prose-lg max-w-none">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </div>
    </div>
  );
}

