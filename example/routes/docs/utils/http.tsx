/**
 * HTTP 请求库文档页面
 */

import DocRenderer from "@components/DocRenderer.tsx";

export const metadata = {
  title: "HTTP 请求库 - DWeb 框架文档",
  description:
    "DWeb 框架的 HTTP 请求库，提供基于 fetch 的前端 HTTP 请求功能，支持拦截器、错误处理、请求取消、重试、并发请求、文件上传/下载、进度追踪等功能",
};

export default function HttpPage() {
  const quickStartCode =
    `import { http, get, post } from "@dreamer/dweb/utils/http";

// 使用默认实例
const data = await http.get("/api/users");
const result = await http.post("/api/users", { name: "Alice" });

// 使用便捷方法
const users = await get("/api/users");
const newUser = await post("/api/users", { name: "Bob" });`;

  const createInstanceCode =
    `import { createHttpClient } from "@dreamer/dweb/utils/http";

const api = createHttpClient({
  baseURL: "https://api.example.com",
  headers: {
    Authorization: "Bearer token",
  },
  timeout: 5000, // 5秒超时
});

// 使用自定义实例
const data = await api.get("/users");`;

  const requestInterceptorCode =
    `import { http } from "@dreamer/dweb/utils/http";

// 请求拦截器：添加 token
http.interceptors.request.use((config) => {
  const token = globalThis.localStorage?.getItem("token");
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: \`Bearer \${token}\`,
    };
  }
  return config;
});`;

  const responseInterceptorCode =
    `import { http } from "@dreamer/dweb/utils/http";

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
);`;

  const fullExampleCode =
    `import { createHttpClient } from "@dreamer/dweb/utils/http";

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
      Authorization: \`Bearer \${token}\`,
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
});`;

  const cancelCode = `import { http } from "@dreamer/dweb/utils/http";

const controller = new AbortController();

// 发送请求
const promise = http.get("/api/data", {
  signal: controller.signal,
});

// 取消请求
controller.abort();`;

  const timeoutCode = `// 全局超时（创建实例时设置）
const api = createHttpClient({ timeout: 5000 });

// 单次请求超时
await api.get("/api/data", { timeout: 3000 });`;

  const retryCode = `import { http } from "@dreamer/dweb/utils/http";

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
      console.log(\`重试第 \${attempt} 次\`);
    },
  },
});`;

  const concurrentCode =
    `import { http, all, allSettled } from "@dreamer/dweb/utils/http";

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
]);`;

  const dedupeCode = `import { http } from "@dreamer/dweb/utils/http";

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
]); // 只会发送一次请求`;

  const uploadCode = `import { http, upload } from "@dreamer/dweb/utils/http";

// 上传文件
const file = document.querySelector('input[type="file"]')?.files?.[0];
if (file) {
  const result = await http.upload("/api/upload", file, {
    onUploadProgress: (progress) => {
      console.log(\`上传进度: \${progress.percent}%\`);
    },
  });
}

// 使用便捷方法
await upload("/api/upload", file);`;

  const downloadCode =
    `import { http, download, downloadFile } from "@dreamer/dweb/utils/http";

// 下载文件（返回 Blob）
const blob = await http.download("/api/files/report.pdf", {
  onDownloadProgress: (progress) => {
    console.log(\`下载进度: \${progress.percent}%\`);
  },
});

// 下载文件并保存到本地（浏览器环境）
await http.downloadFile("/api/files/report.pdf", "report.pdf");

// 使用便捷方法
await downloadFile("/api/files/report.pdf", "report.pdf");`;

  const progressCode = `import { http } from "@dreamer/dweb/utils/http";

// 上传进度
await http.post("/api/upload", formData, {
  onUploadProgress: (progress) => {
    console.log(\`上传: \${progress.loaded}/\${progress.total}\`);
    console.log(\`进度: \${progress.percent}%\`);
  },
});

// 下载进度
await http.get("/api/files/data.zip", {
  responseType: "blob",
  onDownloadProgress: (progress) => {
    console.log(\`下载: \${progress.loaded}/\${progress.total}\`);
    console.log(\`进度: \${progress.percent}%\`);
  },
});`;

  const responseTypeCode = `import { http } from "@dreamer/dweb/utils/http";

// JSON 响应（默认）
const jsonData = await http.get("/api/users", {
  responseType: "json",
});

// 文本响应
const textData = await http.get("/api/text", {
  responseType: "text",
});

// Blob 响应（用于文件）
const blobData = await http.get("/api/file", {
  responseType: "blob",
});

// ArrayBuffer 响应
const bufferData = await http.get("/api/binary", {
  responseType: "arrayBuffer",
});

// FormData 响应
const formData = await http.get("/api/form", {
  responseType: "formData",
});`;

  const configCode = `import { http } from "@dreamer/dweb/utils/http";

await http.get("/api/data", {
  // 请求头
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer token",
  },

  // URL 查询参数
  params: {
    page: 1,
    limit: 10,
    keyword: "search",
  },

  // 超时时间（毫秒）
  timeout: 5000,

  // 是否携带凭证（cookies）
  credentials: "include",

  // 请求模式
  mode: "cors", // "cors" | "no-cors" | "same-origin"

  // 缓存模式
  cache: "default", // "default" | "no-store" | "reload" | "no-cache" | "force-cache" | "only-if-cached"

  // 重定向模式
  redirect: "follow", // "follow" | "error" | "manual"

  // 响应类型
  responseType: "json", // "json" | "text" | "blob" | "arrayBuffer" | "formData"
});`;

  const apiCode = `// HttpClient 类

// 构造函数
const client = new HttpClient({
  baseURL?: string;        // 基础 URL
  headers?: Record<string, string>;  // 默认请求头
  timeout?: number;        // 默认超时时间（毫秒）
});

// 基础 HTTP 方法
- get<T>(url, config?) - GET 请求
- post<T>(url, data?, config?) - POST 请求
- put<T>(url, data?, config?) - PUT 请求
- delete<T>(url, config?) - DELETE 请求
- patch<T>(url, data?, config?) - PATCH 请求
- head<T>(url, config?) - HEAD 请求
- options<T>(url, config?) - OPTIONS 请求
- request<T>(config) - 通用请求方法

// 并发请求
- all<T>(requests) - 并发请求（类似 Promise.all）
- allSettled<T>(requests) - 并发请求（类似 Promise.allSettled）

// 文件操作
- upload<T>(url, file, config?) - 文件上传
- download(url, config?) - 文件下载（返回 Blob）
- downloadFile(url, filename?, config?) - 下载文件并保存到本地

// 拦截器
- interceptors.request.use(interceptor) - 添加请求拦截器
- interceptors.response.use(onFulfilled, onRejected?) - 添加响应拦截器

// 便捷函数
- get<T>(url, config?) - GET 请求
- post<T>(url, data?, config?) - POST 请求
- put<T>(url, data?, config?) - PUT 请求
- del<T>(url, config?) - DELETE 请求
- patch<T>(url, data?, config?) - PATCH 请求
- head<T>(url, config?) - HEAD 请求
- options<T>(url, config?) - OPTIONS 请求
- request<T>(config) - 通用请求方法
- all<T>(requests) - 并发请求
- allSettled<T>(requests) - 并发请求
- upload<T>(url, file, config?) - 文件上传
- download(url, config?) - 文件下载
- downloadFile(url, filename?, config?) - 下载文件并保存
- createHttpClient(config?) - 创建 HTTP 客户端实例

// 默认实例
import { http } from "@dreamer/dweb/utils/http";
// http 是默认的 HttpClient 实例，可以直接使用`;

  const content = {
    title: "HTTP 请求库",
    description:
      "提供基于 fetch 的前端 HTTP 请求库，支持拦截器、错误处理、请求取消、重试、并发请求、文件上传/下载、进度追踪等功能。所有函数在服务端和客户端都可用，部分功能如文件上传/下载、进度追踪在服务端环境可能受限。",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "code",
            code: quickStartCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "创建自定义实例",
        blocks: [
          {
            type: "code",
            code: createInstanceCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "请求拦截器",
        blocks: [
          {
            type: "code",
            code: requestInterceptorCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "响应拦截器",
        blocks: [
          {
            type: "code",
            code: responseInterceptorCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "完整示例",
        blocks: [
          {
            type: "code",
            code: fullExampleCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "取消请求",
        blocks: [
          {
            type: "code",
            code: cancelCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "超时设置",
        blocks: [
          {
            type: "code",
            code: timeoutCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "请求重试",
        blocks: [
          {
            type: "code",
            code: retryCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "并发请求",
        blocks: [
          {
            type: "code",
            code: concurrentCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "请求去重",
        blocks: [
          {
            type: "code",
            code: dedupeCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "文件上传",
        blocks: [
          {
            type: "code",
            code: uploadCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "文件下载",
        blocks: [
          {
            type: "code",
            code: downloadCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "请求进度追踪",
        blocks: [
          {
            type: "code",
            code: progressCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "响应类型",
        blocks: [
          {
            type: "text",
            content: "HTTP 客户端支持多种响应类型：",
          },
          {
            type: "code",
            code: responseTypeCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "请求配置选项",
        blocks: [
          {
            type: "code",
            code: configCode,
            language: "typescript",
          },
        ],
      },
      {
        title: "API 参考",
        blocks: [
          {
            type: "code",
            code: apiCode,
            language: "typescript",
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
