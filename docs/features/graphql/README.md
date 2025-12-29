# GraphQL 模块

DWeb 框架提供了完整的 GraphQL 支持，包括 Schema 定义、查询解析、执行引擎等功能。

## 目录结构

```
src/features/graphql/
├── server.ts      # GraphQL 服务器
├── parser.ts      # 查询解析器
├── executor.ts    # 查询执行器
├── types.ts       # 类型定义
└── mod.ts         # 模块导出
```

## 快速开始

### 创建 GraphQL 服务器

```typescript
import { GraphQLServer } from "@dreamer/dweb";

const server = new GraphQLServer({
  schema: {
    query: {
      name: "Query",
      fields: {
        hello: {
          type: "String",
          resolve: () => "Hello World",
        },
        user: {
          type: "User",
          args: {
            id: { type: "ID!", required: true },
          },
          resolve: async (parent, args, context) => {
            return await User.findById(args.id);
          },
        },
      },
    },
  },
});

// 执行查询
const result = await server.execute({
  query: '{ hello user(id: "1") { name email } }',
});
```

### 定义 Schema

```typescript
const schema = {
  query: {
    name: "Query",
    fields: {
      // 查询字段
    },
  },
  mutation: {
    name: "Mutation",
    fields: {
      // 变更字段
    },
  },
  types: {
    User: {
      name: "String!",
      email: "String!",
      age: "Int",
      posts: {
        type: "[Post!]!",
        resolve: async (parent) => {
          return await Post.findAll({ userId: parent.id });
        },
      },
    },
    Post: {
      title: "String!",
      content: "String!",
      author: {
        type: "User!",
        resolve: async (parent) => {
          return await User.findById(parent.userId);
        },
      },
    },
  },
};
```

### 在 HTTP 路由中使用

```typescript
import { Server } from "@dreamer/dweb";
import { GraphQLServer } from "@dreamer/dweb";

const server = new Server();
const graphqlServer = new GraphQLServer({ schema });

server.setHandler(async (req, res) => {
  if (req.path === "/graphql" && req.method === "POST") {
    const body = await req.json();
    const result = await graphqlServer.execute({
      query: body.query,
      variables: body.variables,
      operationName: body.operationName,
    });
    res.json(result);
  } else {
    res.text("Not Found", 404);
  }
});
```

## API 参考

### GraphQLServer

#### 构造函数

```typescript
new GraphQLServer(config: GraphQLConfig)
```

#### 方法

- `execute(request: GraphQLRequest): Promise<GraphQLResponse>` - 执行 GraphQL
  查询
- `validate(query: string): Promise<boolean>` - 验证查询
- `parse(query: string): Promise<ParsedQuery>` - 解析查询

### 类型定义

```typescript
interface GraphQLSchema {
  query?: GraphQLType;
  mutation?: GraphQLType;
  types?: Record<string, GraphQLType>;
}

interface GraphQLType {
  name: string;
  fields: Record<string, GraphQLField>;
}

interface GraphQLField {
  type: string;
  args?: Record<string, GraphQLArgument>;
  resolve?: GraphQLResolver;
  description?: string;
}
```

---

## 📚 相关文档

### 核心文档

- [文档总览](./README.md)
- [核心模块](./core.md)
- [配置文档](./configuration.md)
- [开发指南](./development.md)

### 功能模块

- [数据库](./database.md)
- [GraphQL](./graphql.md)
- [WebSocket](./websocket.md)
- [Session](./session.md)
- [Cookie](./cookie.md)
- [Logger](./logger.md)

### 扩展模块

- [中间件](./middleware.md)
- [插件](./plugins.md)

### 部署与运维

- [Docker 部署](./docker.md)
