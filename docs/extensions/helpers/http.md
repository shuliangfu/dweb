### HTTP 请求库

提供基于 fetch 的前端 HTTP 请求库，支持拦截器、错误处理、请求取消等功能。

#### 快速开始

```typescript
import { http, get, post } from "@dreamer/dweb/extensions";

// 使用默认实例
const data = await http.get("/api/users");
const result = await http.post("/api/users", { name: "Alice" });

// 使用便捷方法
const users = await get("/api/users");
const newUser = await post("/api/users", { name: "Bob" });
```

#### 创建自定义实例

```typescript
import { createHttpClient } from "@dreamer/dweb/extensions";

const api = createHttpClient({
  baseURL: "https://api.example.com",
  headers: {
    Authorization: "Bearer token",
  },
  timeout: 5000, // 5秒超时
});

// 使用自定义实例
const data = await api.get("/users");
```

#### 请求拦截器

```typescript
import { http } from "@dreamer/dweb/extensions";

// 请求拦截器：添加 token
http.interceptors.request.use((config) => {
  const token = globalThis.localStorage?.getItem("token");
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});
```

#### 响应拦截器

```typescript
import { http } from "@dreamer/dweb/extensions";

// 响应拦截器：统一处理错误
http.interceptors.response.use(
  (response) => {
    // 成功响应，直接返回
    return response;
  },
  async (error) => {
    // 错误处理
    if (error.response?.status === 401) {
      // token 过期，跳转登录
      globalThis.location.href = "/login";
    }
    throw error;
  },
);
```

#### 完整示例

```typescript
import { createHttpClient } from "@dreamer/dweb/extensions";

// 创建 API 客户端
const api = createHttpClient({
  baseURL: "/api",
  timeout: 10000,
});

// 请求拦截器：自动添加 token
api.interceptors.request.use((config) => {
  const token = globalThis.localStorage?.getItem("token");
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

// 响应拦截器：统一处理响应
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // 未授权，清除 token 并跳转登录
      globalThis.localStorage?.removeItem("token");
      globalThis.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// 使用
const users = await api.get("/users", {
  params: { page: 1, limit: 10 },
});

const newUser = await api.post("/users", {
  name: "Alice",
  email: "alice@example.com",
});
```

#### 取消请求

```typescript
import { http } from "@dreamer/dweb/extensions";

const controller = new AbortController();

// 发送请求
const promise = http.get("/api/data", {
  signal: controller.signal,
});

// 取消请求
controller.abort();
```

#### 超时设置

```typescript
// 全局超时（创建实例时设置）
const api = createHttpClient({ timeout: 5000 });

// 单次请求超时
await api.get("/api/data", { timeout: 3000 });
```

#### API 方法

- `get<T>(url, config?)` - GET 请求
- `post<T>(url, data?, config?)` - POST 请求
- `put<T>(url, data?, config?)` - PUT 请求
- `delete<T>(url, config?)` - DELETE 请求
- `patch<T>(url, data?, config?)` - PATCH 请求
- `head<T>(url, config?)` - HEAD 请求
- `options<T>(url, config?)` - OPTIONS 请求
- `request<T>(config)` - 通用请求方法
