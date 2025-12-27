# API 路由

DWeb 框架的 API 路由处理，支持两种 API 路由模式：method 模式和 REST 模式。

**重要说明**：两种模式是互斥的，通过 `dweb.config.ts` 中的 `routes.apiMode` 配置项选择。不能混用两种模式。

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

通过 URL 路径指定方法名，**必须使用中划线格式（kebab-case）**。

### ⚠️ 重要：URL 格式要求

- ✅ **允许**：URL 必须使用中划线格式（kebab-case），例如 `/api/users/get-user`
- ❌ **不允许**：URL 不能使用驼峰格式（camelCase），例如 `/api/users/getUser` 会返回 400 错误
- ✅ **允许**：函数名可以使用驼峰格式（camelCase），例如 `getUser`、`createUser`

### 创建 API 路由

```typescript
// routes/api/users.ts（默认配置）
// 如果配置了 apiDir: 'api'，则路径为 api/users.ts

// ✅ 正确：函数名使用驼峰格式 getUser
// URL 必须使用中划线格式：/api/users/get-user
export async function getUser(req: Request, res: Response) {
  const users = await getUsers();
  res.json(users);
}

// ✅ 正确：函数名使用驼峰格式 createUser
// URL 必须使用中划线格式：/api/users/create-user
export async function createUser(req: Request, res: Response) {
  const data = await req.json();
  const user = await createUser(data);
  res.json(user);
}

// ✅ 正确：函数名使用驼峰格式 getUserById
// URL 必须使用中划线格式：/api/users/get-user-by-id
export async function getUserById(req: Request, res: Response) {
  const id = req.params.id;
  const user = await getUserById(id);
  res.json(user);
}
```

### 访问 API

```bash
# ✅ 正确：使用中划线格式
curl http://localhost:3000/api/users/get-user

# ❌ 错误：使用驼峰格式会返回 400 错误
curl http://localhost:3000/api/users/getUser
# 返回: {
#   "success": false,
#   "error": "API 方法名必须使用中划线格式（kebab-case），不允许使用驼峰格式（camelCase）。请使用 /api/users/get-user 替代 /api/users/getUser",
#   "details": {
#     "methodName": "getUser",
#     "suggestedPath": "/api/users/get-user",
#     "pathname": "/api/users/getUser"
#   }
# }

# ✅ 正确：POST 请求使用中划线格式
curl -X POST http://localhost:3000/api/users/create-user \
  -H "Content-Type: application/json" \
  -d '{"name":"John"}'
```

### URL 格式转换规则

框架会自动将 URL 中的中划线格式转换为函数名的驼峰格式：

- `/api/users/get-user` → 查找函数 `getUser`
- `/api/users/create-user` → 查找函数 `createUser`
- `/api/users/get-user-by-id` → 查找函数 `getUserById`

**注意**：只支持中划线到驼峰的转换，不支持驼峰到中划线的转换。如果 URL 使用驼峰格式，会直接返回 400 错误。

## REST 模式

基于 HTTP 方法和资源路径的 RESTful API。

### 创建 API 路由

REST 模式支持两种命名方式：

#### 方式 1：直接使用 HTTP 方法名（推荐）

```typescript
// routes/api/users.ts

// GET /api/users
export async function GET(req: Request, res: Response) {
  const users = await getUsers();
  res.json(users);
}

// GET /api/users/:id
export async function GET_ID(req: Request, res: Response) {
  const id = req.params.id;
  const user = await getUserById(id);
  res.json(user);
}

// POST /api/users
export async function POST(req: Request, res: Response) {
  const data = await req.json();
  const user = await createUser(data);
  res.status(201);
  res.json(user);
}

// PUT /api/users/:id
export async function PUT_ID(req: Request, res: Response) {
  const id = req.params.id;
  const data = await req.json();
  const user = await updateUser(id, data);
  res.json(user);
}

// PATCH /api/users/:id
export async function PATCH_ID(req: Request, res: Response) {
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

#### 方式 2：使用标准 RESTful 命名（备选）

```typescript
// routes/api/users.ts

// GET /api/users -> index 或 list
export async function index(req: Request, res: Response) {
  const users = await getUsers();
  res.json(users);
}

// 或者使用 list
export async function list(req: Request, res: Response) {
  const users = await getUsers();
  res.json(users);
}

// POST /api/users -> create
export async function create(req: Request, res: Response) {
  const data = await req.json();
  const user = await createUser(data);
  res.status(201);
  res.json(user);
}

// GET /api/users/:id -> show 或 get
export async function show(req: Request, res: Response) {
  const id = req.params.id;
  const user = await getUserById(id);
  res.json(user);
}

// PUT /api/users/:id -> update
// PATCH /api/users/:id -> update
export async function update(req: Request, res: Response) {
  const id = req.params.id;
  const data = await req.json();
  const user = await updateUser(id, data);
  res.json(user);
}

// DELETE /api/users/:id -> destroy 或 delete
export async function destroy(req: Request, res: Response) {
  const id = req.params.id;
  await deleteUser(id);
  res.status(204);
}
```

### RESTful 方法映射规则

框架会根据 HTTP 方法和路径自动映射到对应的函数，支持两种命名方式：

#### 方式 1：直接使用 HTTP 方法名（优先级更高）

| HTTP 方法 | 路径 | 函数名 |
|----------|------|--------|
| GET | `/api/users` | `GET` |
| GET | `/api/users/:id` | `GET_ID` |
| POST | `/api/users` | `POST` |
| PUT | `/api/users/:id` | `PUT_ID` |
| PATCH | `/api/users/:id` | `PATCH_ID` |
| DELETE | `/api/users/:id` | `DELETE_ID` |

#### 方式 2：标准 RESTful 命名（备选）

| HTTP 方法 | 路径 | 函数名（优先级） |
|----------|------|----------------|
| GET | `/api/users` | `index` → `list` |
| GET | `/api/users/:id` | `show` → `get` |
| POST | `/api/users` | `create` |
| PUT | `/api/users/:id` | `update` |
| PATCH | `/api/users/:id` | `update` |
| DELETE | `/api/users/:id` | `destroy` → `delete` |

**映射规则**：
- 框架优先查找 HTTP 方法名（如 `GET`, `GET_ID`, `POST` 等）
- 如果找不到，则回退到标准 RESTful 命名（如 `index`, `show`, `create` 等）
- 框架会根据路径中是否有 ID 参数自动判断调用哪个函数
- 对于标准 RESTful 命名，如果首选函数不存在，会自动尝试备选函数

### 访问 API

```bash
# GET 请求（获取列表）
curl http://localhost:3000/api/users

# POST 请求（创建）
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John"}'

# GET 单个用户（获取详情）
curl http://localhost:3000/api/users/123

# PUT 更新用户
curl -X PUT http://localhost:3000/api/users/123 \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane"}'

# PATCH 更新用户（部分更新）
curl -X PATCH http://localhost:3000/api/users/123 \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane"}'

# DELETE 删除用户
curl -X DELETE http://localhost:3000/api/users/123
```

### 完整示例

REST 模式支持直接使用 HTTP 方法名，更直观易用：

```typescript
// routes/api/users.ts
import type { Request, Response } from '@dreamer/dweb';

// GET /api/users -> 获取用户列表
export async function GET(req: Request, res: Response) {
  const users = await getUsers();
  res.json({ users });
}

// GET /api/users/:id -> 获取单个用户
export async function GET_ID(req: Request, res: Response) {
  const id = req.params.id;
  const user = await getUserById(id);
  if (!user) {
    res.status = 404;
    res.json({ error: '用户不存在' });
    return;
  }
  res.json({ user });
}

// POST /api/users -> 创建用户
export async function POST(req: Request, res: Response) {
  const data = await req.json();
  const user = await createUser(data);
  res.status = 201;
  res.json({ user });
}

// PUT /api/users/:id -> 更新用户（完整更新）
export async function PUT_ID(req: Request, res: Response) {
  const id = req.params.id;
  const data = await req.json();
  const user = await updateUser(id, data);
  res.json({ user });
}

// PATCH /api/users/:id -> 更新用户（部分更新）
export async function PATCH_ID(req: Request, res: Response) {
  const id = req.params.id;
  const data = await req.json();
  const user = await updateUser(id, data);
  res.json({ user });
}

// DELETE /api/users/:id -> 删除用户
export async function DELETE_ID(req: Request, res: Response) {
  const id = req.params.id;
  await deleteUser(id);
  res.status = 204;
}
```

### REST 模式 vs Method 模式对比

| 特性 | REST 模式 | Method 模式 |
|------|----------|-------------|
| **URL 格式** | `GET /api/users`<br>`GET /api/users/123` | `POST /api/users/get-user`<br>`POST /api/users/get-user-by-id` |
| **HTTP 方法** | 使用标准 HTTP 方法（GET, POST, PUT, DELETE） | 所有请求默认使用 POST |
| **函数命名** | 标准 RESTful 命名（index, show, create, update, destroy） | 自定义函数名（getUser, createUser 等） |
| **路径简洁性** | 路径简洁，符合 RESTful 规范 | 路径中包含方法名 |
| **适用场景** | 标准的 CRUD 操作 | 自定义业务方法 |

**选择建议**：
- 如果需要标准的 CRUD 操作，使用 **REST 模式**
- 如果需要自定义的业务方法（如 `sendEmail`, `resetPassword`），使用 **Method 模式**

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

## 错误处理

### 驼峰格式错误

如果 API 请求使用了驼峰格式（camelCase），框架会返回 400 错误，并提供正确的 URL 建议：

```json
{
  "success": false,
  "error": "API 方法名必须使用中划线格式（kebab-case），不允许使用驼峰格式（camelCase）。请使用 /api/users/get-user 替代 /api/users/getUser",
  "details": {
    "methodName": "getUser",
    "suggestedPath": "/api/users/get-user",
    "pathname": "/api/users/getUser"
  }
}
```

### 错误响应格式

所有 API 错误都会返回 JSON 格式的响应，包含：
- `success`: `false` - 表示请求失败
- `error`: 错误消息
- `details`: 错误详情（可选）

## 相关文档

- [路由系统](./router.md) - 文件系统路由
- [路由处理器](./route-handler.md) - 路由处理逻辑

