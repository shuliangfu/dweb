/**
 * 功能模块 - GraphQL 文档页面
 * 展示 DWeb 框架的 GraphQL 功能和使用方法
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "GraphQL - DWeb 框架文档",
  description: "DWeb 框架的 GraphQL 服务器支持，可以轻松构建 GraphQL API",
};

export default function GraphQLPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // 基本使用
  const basicUsageCode = `import { GraphQLServer } from "@dreamer/dweb/features/graphql";
import { Server } from "@dreamer/dweb/core/server";

// 定义 GraphQL Schema
const typeDefs = \`
  type Query {
    hello: String
    user(id: ID!): User
  }

  type User {
    id: ID!
    name: String!
    email: String!
  }
\`;

// 定义 Resolvers
const resolvers = {
  Query: {
    hello: () => "Hello World",
    user: (parent, args) => {
      return {
        id: args.id,
        name: "John Doe",
        email: "john@example.com",
      };
    },
  },
};

// 创建 GraphQL 服务器
const graphqlServer = new GraphQLServer({
  typeDefs,
  resolvers,
});

// 在 HTTP 服务器中使用
const server = new Server();
server.setHandler(async (req, res) => {
  if (req.url.startsWith("/graphql")) {
    return await graphqlServer.handleRequest(req, res);
  }
  res.text("Not Found", 404);
});

await server.start(3000);`;

  // 在路由中使用
  const routeUsageCode = `// routes/api/graphql.ts
import { GraphQLServer } from "@dreamer/dweb/features/graphql";
import type { ApiContext } from "@dreamer/dweb";

const graphqlServer = new GraphQLServer({
  typeDefs: \`
    type Query {
      hello: String
    }
  \`,
  resolvers: {
    Query: {
      hello: () => "Hello from GraphQL",
    },
  },
});

export async function post({ req, res }: ApiContext) {
  return await graphqlServer.handleRequest(req, res);
}`;

  // 使用数据源
  const dataSourceCode = `import { GraphQLServer } from "@dreamer/dweb/features/graphql";
import { getDatabase } from "@dreamer/dweb/features/database";

const graphqlServer = new GraphQLServer({
  typeDefs: \`
    type Query {
      users: [User!]!
    }
    type User {
      id: ID!
      name: String!
      email: String!
    }
  \`,
  resolvers: {
    Query: {
      users: async () => {
        const db = await getDatabase();
        return await db.query("SELECT * FROM users");
      },
    },
  },
});`;

  // 订阅支持
  const subscriptionCode = `import { GraphQLServer } from "@dreamer/dweb/features/graphql";

const graphqlServer = new GraphQLServer({
  typeDefs: \`
    type Query {
      hello: String
    }
    type Subscription {
      messageAdded: Message
    }
    type Message {
      id: ID!
      content: String!
    }
  \`,
  resolvers: {
    Query: {
      hello: () => "Hello",
    },
    Subscription: {
      messageAdded: {
        subscribe: () => {
          // 返回 AsyncIterator
          return messagePubSub.asyncIterator("MESSAGE_ADDED");
        },
      },
    },
  },
});`;

  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">GraphQL</h1>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
        DWeb 框架提供了 GraphQL 服务器支持，可以轻松构建 GraphQL API。
      </p>

      {/* 快速开始 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          快速开始
        </h2>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          基本使用
        </h3>
        <CodeBlock code={basicUsageCode} language="typescript" />
      </section>

      {/* 在路由中使用 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          在路由中使用
        </h2>
        <CodeBlock code={routeUsageCode} language="typescript" />
      </section>

      {/* 使用数据源 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          使用数据源
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          在 GraphQL Resolver 中使用数据库：
        </p>
        <CodeBlock code={dataSourceCode} language="typescript" />
      </section>

      {/* 订阅支持 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          订阅支持
        </h2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
          GraphQL 服务器支持订阅（Subscriptions）功能，可以实现实时数据推送：
        </p>
        <CodeBlock code={subscriptionCode} language="typescript" />
      </section>

      {/* API 参考 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          API 参考
        </h2>
        
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          GraphQLServer
        </h3>
        <CodeBlock code={`new GraphQLServer(config: GraphQLServerConfig)`} language="typescript" />
        <CodeBlock code={`interface GraphQLServerConfig {
  typeDefs: string;
  resolvers: Resolvers;
  context?: (req: Request) => any;
  formatError?: (error: GraphQLError) => any;
}`} language="typescript" />

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
          方法
        </h3>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">handleRequest(req, res)</code> - 处理 GraphQL 请求</li>
          <li><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">executeQuery(query, variables?, context?)</code> - 执行 GraphQL 查询</li>
        </ul>
      </section>

      {/* 相关文档 */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-12 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          相关文档
        </h2>
        <ul className="list-disc list-inside space-y-2 my-4 text-gray-700 dark:text-gray-300">
          <li><a href="/docs/features/database" className="text-blue-600 dark:text-blue-400 hover:underline">Database</a> - 数据库</li>
          <li><a href="/docs/core/api" className="text-blue-600 dark:text-blue-400 hover:underline">API 路由</a> - API 路由系统</li>
          <li><a href="/docs/core/application" className="text-blue-600 dark:text-blue-400 hover:underline">Application</a> - 应用核心</li>
        </ul>
      </section>
    </article>
  );
}
