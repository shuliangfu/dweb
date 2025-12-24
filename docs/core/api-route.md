# API 路由

DWeb 框架的 API 路由处理，支持两种 API 路由模式：method 模式和 REST 模式。

## API 目录配置

默认情况下，API 路由文件应放在 `routes/api` 目录下。你也可以在 `dweb.config.ts` 中配置自定义的 API 目录：

```typescript
// dweb.config.ts
export default {
  routes: {
    dir: "routes",
    // 默认 API 目录为 'routes/api'
    // 也可以配置为 'api'，此时 API 文件放在项目根目录的 api 文件夹中
    apiDir: "api", // 可选，默认为 'routes/api'
  },
};
```

## Method 模式（默认）

通过 URL 路径指定方法名，默认使用中划线格式。

### 创建 API 路由

```typescript
// routes/api/users.ts（默认配置）
// 如果配置了 apiDir: 'api'，则路径为 api/users.ts

// GET /api/users/get-user
export async function getUser(req: Request, res: Response) {
  const users = await getUsers();
  res.json(users);
}

// POST /api/users/create-user
export async function createUser(req: Request, res: Response) {
  const data = await req.json();
  const user = await createUser(data);
  res.json(user);
}
```

### 访问 API

```bash
# GET 请求
curl http://localhost:3000/api/users/get-user

# POST 请求
curl -X POST http://localhost:3000/api/users/create-user \
  -H "Content-Type: application/json" \
  -d '{"name":"John"}'
```

## REST 模式

基于 HTTP 方法和资源路径的 RESTful API。

### 创建 API 路由

```typescript
// routes/api/users.ts

// GET /api/users
export async function GET(req: Request, res: Response) {
  const users = await getUsers();
  res.json(users);
}

// POST /api/users
export async function POST(req: Request, res: Response) {
  const data = await req.json();
  const user = await createUser(data);
  res.json(user);
}

// GET /api/users/:id
export async function GET_ID(req: Request, res: Response) {
  const id = req.params.id;
  const user = await getUserById(id);
  res.json(user);
}

// PUT /api/users/:id
export async function PUT_ID(req: Request, res: Response) {
  const id = req.params.id;
  const data = await req.json();
  const user = await updateUser(id, data);
  res.json(user);
}

// DELETE /api/users/:id
export async function DELETE_ID(req: Request, res: Response) {
  const id = req.params.id;
  await deleteUser(id);
  res.status(204);
}
```

### 访问 API

```bash
# GET 请求
curl http://localhost:3000/api/users

# POST 请求
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John"}'

# GET 单个用户
curl http://localhost:3000/api/users/123

# PUT 更新用户
curl -X PUT http://localhost:3000/api/users/123 \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane"}'

# DELETE 删除用户
curl -X DELETE http://localhost:3000/api/users/123
```

## 加载 API 路由

```typescript
import { loadApiRoute } from "@dreamer/dweb/core/api-route";

// 加载 API 路由模块
const handlers = await loadApiRoute("routes/api/users.ts");
// handlers = { getUser: Function, createUser: Function, ... }
```

## API 参考

### loadApiRoute

```typescript
function loadApiRoute(filePath: string): Promise<Record<string, RouteHandler>>
```

从指定文件路径加载 API 路由模块，返回所有导出的路由处理函数。

**参数：**
- `filePath`: API 路由文件路径（相对路径或绝对路径）

**返回：**
- `Promise<Record<string, RouteHandler>>`: API 路由处理函数对象

**示例：**

```typescript
const handlers = await loadApiRoute("routes/api/users.ts");
// handlers = { getUser: Function, createUser: Function, ... }
```

## 相关文档

- [路由系统](./router.md) - 文件系统路由
- [路由处理器](./route-handler.md) - 路由处理逻辑

