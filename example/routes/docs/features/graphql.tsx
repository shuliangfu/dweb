/**
 * 功能模块 - GraphQL 文档页面
 * 展示 DWeb 框架的 GraphQL 功能和使用方法
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "GraphQL - DWeb 框架文档",
  description: "DWeb 框架的 GraphQL 服务器支持，可以轻松构建 GraphQL API",
};

export default function GraphQLPage() {
  // 基本使用
  const basicUsageCode = `import { GraphQLServer } from "@dreamer/dweb";
import { Server } from "@dreamer/dweb";

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
import { GraphQLServer } from "@dreamer/dweb";
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
  const dataSourceCode = `import { GraphQLServer } from "@dreamer/dweb";
import { getDatabase } from "@dreamer/dweb";

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
  const subscriptionCode = `import { GraphQLServer } from "@dreamer/dweb";

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

  const content = {
    title: "GraphQL",
    description: "DWeb 框架提供了 GraphQL 服务器支持，可以轻松构建 GraphQL API。",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "基本使用",
            blocks: [
              {
                type: "code",
                code: basicUsageCode,
                language: "typescript",
              },
            ],
          },
        ],
      },
      {
        title: "在路由中使用",
        blocks: [
          {
            type: "code",
            code: routeUsageCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "使用数据源",
        blocks: [
          {
            type: "text",
            content: "在 GraphQL Resolver 中使用数据库：",
          },
          {
            type: "code",
            code: dataSourceCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "订阅支持",
        blocks: [
          {
            type: "text",
            content: "GraphQL 服务器支持订阅（Subscriptions）功能，可以实现实时数据推送：",
          },
          {
            type: "code",
            code: subscriptionCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "API 参考",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "GraphQLServer",
            blocks: [
              {
                type: "code",
                code: `new GraphQLServer(config: GraphQLServerConfig)`,
                language: "typescript",
              },
              {
                type: "code",
                code: `interface GraphQLServerConfig {
  typeDefs: string;
  resolvers: Resolvers;
  context?: (req: Request) => any;
  formatError?: (error: GraphQLError) => any;
}`,
                language: "typescript",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "方法",
            blocks: [
              {
                type: "list",
                ordered: false,
                items: [
                  "**`handleRequest(req, res)`** - 处理 GraphQL 请求",
                  "**`executeQuery(query, variables?, context?)`** - 执行 GraphQL 查询",
                ],
              },
            ],
          },
        ],
      },
      {
        title: "相关文档",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[Database](/docs/features/database) - 数据库",
              "[API 路由](/docs/core/api) - API 路由系统",
              "[Application](/docs/core/application) - 应用核心",
            ],
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
