# GraphQL 使用指南

本文档介绍如何在 DWeb 框架中使用 GraphQL 功能。

## 📋 目录

- [快速开始](#快速开始)
- [配置 GraphQL](#配置-graphql)
- [定义 Schema](#定义-schema)
- [实现解析器](#实现解析器)
- [查询示例](#查询示例)
- [Mutation 示例](#mutation-示例)
- [与数据库集成](#与数据库集成)
- [最佳实践](#最佳实践)

---

## 快速开始

### 1. 配置 GraphQL

在 `dweb.config.ts` 中配置 GraphQL：

```typescript
import type { AppConfig } from '@dreamer/dweb';
import { getDatabase } from '@dreamer/dweb';

const config: AppConfig = {
  // ... 其他配置
  
  graphql: {
    schema: {
      query: {
        name: 'Query',
        fields: {
          hello: {
            type: 'String',
            resolve: () => 'Hello World',
          },
        },
      },
    },
    config: {
      path: '/graphql',
      graphiql: true,
      graphiqlPath: '/graphiql',
    },
  },
};

export default config;
```

### 2. 访问 GraphQL

- **GraphQL 端点**: `http://localhost:3000/graphql`
- **GraphiQL 界面**: `http://localhost:3000/graphiql`

---

## 配置 GraphQL

### 基本配置

```typescript
graphql: {
  // Schema 定义（必需）
  schema: {
    query: { /* ... */ },
    mutation: { /* ... */ },
    types: { /* ... */ },
  },
  
  // 服务器配置（可选）
  config: {
    // GraphQL 端点路径（默认: '/graphql'）
    path: '/graphql',
    
    // 是否启用 GraphiQL（开发环境，默认: true）
    graphiql: true,
    
    // GraphiQL 路径（默认: '/graphiql'）
    graphiqlPath: '/graphiql',
    
    // 是否启用查询验证（默认: true）
    validation: true,
    
    // 是否启用查询缓存（默认: true）
    cache: true,
    
    // 最大查询深度（默认: 10）
    maxDepth: 10,
    
    // 最大查询复杂度（默认: 1000）
    maxComplexity: 1000,
    
    // 上下文生成函数
    context: (req) => ({
      req,
      db: getDatabase(),
      user: req.user,
    }),
  },
}
```

---

## 定义 Schema

### 基本类型定义

```typescript
import type { GraphQLSchema } from '@dreamer/dweb';

const schema: GraphQLSchema = {
  // Query 类型（查询操作）
  query: {
    name: 'Query',
    fields: {
      // 简单字段
      hello: {
        type: 'String',
        resolve: () => 'Hello World',
      },
      
      // 带参数的字段
      user: {
        type: 'User',
        args: {
          id: {
            type: 'ID',
            isNonNull: true,
          },
        },
        resolve: async (_, args, context) => {
          const user = await getUserById(args.id);
          return user;
        },
      },
    },
  },
  
  // Mutation 类型（变更操作）
  mutation: {
    name: 'Mutation',
    fields: {
      createUser: {
        type: 'User',
        args: {
          name: { type: 'String', isNonNull: true },
          email: { type: 'String', isNonNull: true },
        },
        resolve: async (_, args, context) => {
          return await createUser(args);
        },
      },
    },
  },
  
  // 自定义类型
  types: {
    User: {
      name: 'User',
      fields: {
        id: { type: 'ID' },
        name: { type: 'String' },
        email: { type: 'String' },
        posts: {
          type: 'Post',
          isList: true,
          resolve: async (parent, _, context) => {
            return await getPostsByUserId(parent.id);
          },
        },
      },
    },
    Post: {
      name: 'Post',
      fields: {
        id: { type: 'ID' },
        title: { type: 'String' },
        content: { type: 'String' },
        author: {
          type: 'User',
          resolve: async (parent, _, context) => {
            return await getUserById(parent.authorId);
          },
        },
      },
    },
  },
};
```

### 类型系统

GraphQL 支持以下标量类型：
- `String` - 字符串
- `Int` - 整数
- `Float` - 浮点数
- `Boolean` - 布尔值
- `ID` - 唯一标识符

### 字段类型

```typescript
{
  // 基本类型
  name: { type: 'String' },
  
  // 非空类型
  email: { type: 'String', isNonNull: true },
  
  // 列表类型
  tags: { type: 'String', isList: true },
  
  // 非空列表
  items: { type: 'String', isList: true, isListNonNull: true },
  
  // 非空列表的非空项
  requiredItems: {
    type: 'String',
    isList: true,
    isListNonNull: true,
    isNonNull: true,
  },
}
```

---

## 实现解析器

### 简单解析器

```typescript
{
  hello: {
    type: 'String',
    resolve: () => 'Hello World',
  },
}
```

### 带参数的解析器

```typescript
{
  user: {
    type: 'User',
    args: {
      id: { type: 'ID', isNonNull: true },
    },
    resolve: async (parent, args, context) => {
      const { id } = args;
      return await getUserById(id);
    },
  },
}
```

### 使用上下文的解析器

```typescript
{
  currentUser: {
    type: 'User',
    resolve: async (parent, args, context) => {
      // 从上下文获取用户信息
      const user = context.user;
      if (!user) {
        throw new Error('未认证');
      }
      return user;
    },
  },
}
```

### 嵌套字段解析器

```typescript
{
  types: {
    User: {
      name: 'User',
      fields: {
        id: { type: 'ID' },
        name: { type: 'String' },
        // 嵌套字段，parent 是 User 对象
        posts: {
          type: 'Post',
          isList: true,
          resolve: async (parent, args, context) => {
            // parent 是当前的 User 对象
            return await getPostsByUserId(parent.id);
          },
        },
      },
    },
  },
}
```

---

## 查询示例

### 简单查询

```graphql
query {
  hello
}
```

**响应**:
```json
{
  "data": {
    "hello": "Hello World"
  }
}
```

### 带参数的查询

```graphql
query {
  user(id: "1") {
    id
    name
    email
  }
}
```

### 嵌套查询

```graphql
query {
  user(id: "1") {
    id
    name
    posts {
      id
      title
      content
    }
  }
}
```

### 使用变量

```graphql
query GetUser($userId: ID!) {
  user(id: $userId) {
    id
    name
    email
  }
}
```

**变量**:
```json
{
  "userId": "1"
}
```

---

## Mutation 示例

### 创建数据

```graphql
mutation {
  createUser(name: "John", email: "john@example.com") {
    id
    name
    email
  }
}
```

### 更新数据

```graphql
mutation {
  updateUser(id: "1", name: "Jane") {
    id
    name
    email
  }
}
```

### 删除数据

```graphql
mutation {
  deleteUser(id: "1") {
    success
    message
  }
}
```

---

## 与数据库集成

### 使用数据库查询

```typescript
import { getDatabase, SQLQueryBuilder } from '@dreamer/dweb';

const schema: GraphQLSchema = {
  query: {
    name: 'Query',
    fields: {
      users: {
        type: 'User',
        isList: true,
        resolve: async (parent, args, context) => {
          const db = context.db || getDatabase();
          const builder = new SQLQueryBuilder(db);
          const users = await builder
            .select(['*'])
            .from('users')
            .execute();
          return users;
        },
      },
      user: {
        type: 'User',
        args: {
          id: { type: 'ID', isNonNull: true },
        },
        resolve: async (parent, args, context) => {
          const db = context.db || getDatabase();
          const builder = new SQLQueryBuilder(db);
          const users = await builder
            .select(['*'])
            .from('users')
            .where('id = ?', [args.id])
            .execute();
          return users[0] || null;
        },
      },
    },
  },
  mutation: {
    name: 'Mutation',
    fields: {
      createUser: {
        type: 'User',
        args: {
          name: { type: 'String', isNonNull: true },
          email: { type: 'String', isNonNull: true },
        },
        resolve: async (parent, args, context) => {
          const db = context.db || getDatabase();
          const builder = new SQLQueryBuilder(db);
          await builder
            .insert('users', args)
            .execute();
          // 返回新创建的用户
          const users = await builder
            .select(['*'])
            .from('users')
            .where('email = ?', [args.email])
            .execute();
          return users[0];
        },
      },
    },
  },
  types: {
    User: {
      name: 'User',
      fields: {
        id: { type: 'ID' },
        name: { type: 'String' },
        email: { type: 'String' },
      },
    },
  },
};
```

### 使用 ORM 模型

```typescript
import { User } from '../models/User.ts';

const schema: GraphQLSchema = {
  query: {
    name: 'Query',
    fields: {
      users: {
        type: 'User',
        isList: true,
        resolve: async () => {
          return await User.findAll();
        },
      },
      user: {
        type: 'User',
        args: {
          id: { type: 'ID', isNonNull: true },
        },
        resolve: async (parent, args) => {
          return await User.find(args.id);
        },
      },
    },
  },
  mutation: {
    name: 'Mutation',
    fields: {
      createUser: {
        type: 'User',
        args: {
          name: { type: 'String', isNonNull: true },
          email: { type: 'String', isNonNull: true },
        },
        resolve: async (parent, args) => {
          return await User.create(args);
        },
      },
    },
  },
};
```

---

## 最佳实践

### 1. 错误处理

```typescript
{
  user: {
    type: 'User',
    args: {
      id: { type: 'ID', isNonNull: true },
    },
    resolve: async (parent, args, context) => {
      try {
        const user = await getUserById(args.id);
        if (!user) {
          throw new Error(`用户 ${args.id} 不存在`);
        }
        return user;
      } catch (error) {
        throw new Error(`查询用户失败: ${error.message}`);
      }
    },
  },
}
```

### 2. 认证和授权

```typescript
{
  config: {
    context: (req) => {
      // 从请求中获取用户信息
      const user = (req as any).user;
      return {
        req,
        db: getDatabase(),
        user,
        isAuthenticated: !!user,
      };
    },
  },
}

// 在解析器中使用
{
  currentUser: {
    type: 'User',
    resolve: async (parent, args, context) => {
      if (!context.isAuthenticated) {
        throw new Error('需要认证');
      }
      return context.user;
    },
  },
}
```

### 3. 数据加载优化

```typescript
// 使用数据加载器避免 N+1 查询
{
  types: {
    User: {
      name: 'User',
      fields: {
        posts: {
          type: 'Post',
          isList: true,
          resolve: async (parent, args, context) => {
            // 批量加载所有用户的文章
            return await loadPostsByUserIds([parent.id]);
          },
        },
      },
    },
  },
}
```

### 4. 查询验证

```typescript
{
  config: {
    validation: true,
    maxDepth: 10,        // 限制查询深度
    maxComplexity: 1000, // 限制查询复杂度
  },
}
```

### 5. 类型安全

```typescript
// 定义类型接口
interface User {
  id: string;
  name: string;
  email: string;
}

// 在解析器中使用
{
  user: {
    type: 'User',
    resolve: async (parent, args): Promise<User> => {
      return await getUserById(args.id);
    },
  },
}
```

---

## 相关文档

- [使用指南](./GUIDES.md) - 完整的使用指南
- [数据库使用指南](./DATABASE_USAGE.md) - 数据库功能使用指南

---

**最后更新**: 2024-12-20

