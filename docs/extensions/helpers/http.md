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

#### 请求重试

```typescript
import { http } from "@dreamer/dweb/extensions";

// 配置重试
await http.get("/api/data", {
  retry: {
    times: 3,           // 重试次数
    delay: 1000,        // 重试延迟（毫秒）
    retryCondition: (error) => {
      // 自定义重试条件
      return error instanceof Response && error.status >= 500;
    },
    onRetry: (error, attempt) => {
      console.log(`重试第 ${attempt} 次`);
    },
  },
});
```

#### 并发请求

```typescript
import { http, all, allSettled } from "@dreamer/dweb/extensions";

// 并发请求所有接口（类似 Promise.all）
const [users, posts, comments] = await http.all([
  http.get("/api/users"),
  http.get("/api/posts"),
  http.get("/api/comments"),
]);

// 并发请求（部分失败也返回结果，类似 Promise.allSettled）
const results = await http.allSettled([
  http.get("/api/users"),
  http.get("/api/posts"),
  http.get("/api/comments"),
]);

// 使用便捷方法
const data = await all([
  http.get("/api/users"),
  http.get("/api/posts"),
]);
```

#### 请求去重

```typescript
import { http } from "@dreamer/dweb/extensions";

// 启用请求去重（防止重复请求）
await http.get("/api/users", {
  dedupe: true,        // 启用去重
  dedupeKey: "users", // 自定义去重键（可选）
});

// 如果同时发起多个相同请求，只会发送一次
Promise.all([
  http.get("/api/users", { dedupe: true }),
  http.get("/api/users", { dedupe: true }),
  http.get("/api/users", { dedupe: true }),
]); // 只会发送一次请求
```

#### 文件上传

```typescript
import { http, upload } from "@dreamer/dweb/extensions";

// 上传文件
const file = document.querySelector('input[type="file"]')?.files?.[0];
if (file) {
  const result = await http.upload("/api/upload", file, {
    onUploadProgress: (progress) => {
      console.log(`上传进度: ${progress.percent}%`);
    },
  });
}

// 使用便捷方法
await upload("/api/upload", file);
```

#### 文件下载

```typescript
import { http, download, downloadFile } from "@dreamer/dweb/extensions";

// 下载文件（返回 Blob）
const blob = await http.download("/api/files/report.pdf", {
  onDownloadProgress: (progress) => {
    console.log(`下载进度: ${progress.percent}%`);
  },
});

// 下载文件并保存到本地（浏览器环境）
await http.downloadFile("/api/files/report.pdf", "report.pdf");

// 使用便捷方法
await downloadFile("/api/files/report.pdf", "report.pdf");
```

#### 请求进度追踪

```typescript
import { http } from "@dreamer/dweb/extensions";

// 上传进度
await http.post("/api/upload", formData, {
  onUploadProgress: (progress) => {
    console.log(`上传: ${progress.loaded}/${progress.total}`);
    console.log(`进度: ${progress.percent}%`);
  },
});

// 下载进度
await http.get("/api/files/data.zip", {
  responseType: "blob",
  onDownloadProgress: (progress) => {
    console.log(`下载: ${progress.loaded}/${progress.total}`);
    console.log(`进度: ${progress.percent}%`);
  },
});
```

#### API 方法

**基础 HTTP 方法：**
- `get<T>(url, config?)` - GET 请求
- `post<T>(url, data?, config?)` - POST 请求
- `put<T>(url, data?, config?)` - PUT 请求
- `delete<T>(url, config?)` - DELETE 请求
- `patch<T>(url, data?, config?)` - PATCH 请求
- `head<T>(url, config?)` - HEAD 请求
- `options<T>(url, config?)` - OPTIONS 请求
- `request<T>(config)` - 通用请求方法

**并发请求：**
- `all<T>(requests)` - 并发请求（类似 Promise.all）
- `allSettled<T>(requests)` - 并发请求（类似 Promise.allSettled）

**文件操作：**
- `upload<T>(url, file, config?)` - 文件上传
- `download(url, config?)` - 文件下载（返回 Blob）
- `downloadFile(url, filename?, config?)` - 下载文件并保存到本地
