/**
 * GraphQL 文档页面
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "GraphQL - DWeb 框架文档",
  description: "GraphQL 服务器和查询处理",
};

export default function GraphQLPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  return (
    <article className="prose prose-lg max-w-none">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">GraphQL</h1>
      <p className="text-gray-700 leading-relaxed mb-8">
        DWeb 框架提供了 GraphQL 服务器支持，可以轻松构建 GraphQL API。
      </p>
      <p className="text-gray-700 leading-relaxed mb-8">
        详细文档正在完善中...
      </p>
    </article>
  );
}
