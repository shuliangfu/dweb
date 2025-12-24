# 扩展系统

DWeb 框架提供了强大的扩展系统，为原生类型（String、Array、Date、Object、Request）提供实用的扩展方法，以及丰富的辅助函数库，帮助开发者提高开发效率。

## 目录结构

```
src/extensions/
├── mod.ts              # 统一导出入口
├── types.ts            # 扩展类型定义
├── registry.ts         # 扩展注册器
├── builtin/            # 内置扩展
│   ├── string.ts       # String 扩展
│   ├── array.ts        # Array 扩展
│   ├── date.ts         # Date 扩展
│   ├── object.ts       # Object 扩展
│   └── request.ts      # Request 扩展
├── helpers/            # 辅助函数
│   ├── validation.ts   # 验证函数
│   ├── format.ts       # 格式化函数
│   ├── crypto.ts       # 加密函数
│   ├── cache.ts        # 缓存函数
│   ├── http.ts         # HTTP 请求库
│   └── web3.ts         # Web3 操作库
└── user/               # 用户自定义扩展
    └── index.ts
```

## 快速开始

### 初始化扩展系统

在使用扩展方法之前，需要先初始化扩展系统：

```typescript
import { setupExtensions } from "@dreamer/dweb/extensions";

// 初始化所有内置扩展
setupExtensions();
```

### 使用扩展方法

初始化后，可以直接在原生类型上使用扩展方法：

```typescript
// String 扩展
"hello world".capitalize(); // "Hello world"
"hello-world".toCamelCase(); // "helloWorld"
"test@example.com".isEmail(); // true

// Array 扩展
[1, 2, 3, 2, 1].unique(); // [1, 2, 3]
[{ id: 1 }, { id: 2 }, { id: 1 }].uniqueBy('id'); // [{ id: 1 }, { id: 2 }]

// Date 扩展
new Date().format("YYYY-MM-DD"); // "2024-01-15"
new Date().fromNow(); // "2小时前"
new Date().isToday(); // true

// Object 扩展
const user = { id: 1, name: 'Alice', email: 'alice@example.com' };
user.pick(['name', 'email']); // { name: 'Alice', email: 'alice@example.com' }
user.omit(['id']); // { name: 'Alice', email: 'alice@example.com' }
```

### 使用辅助函数

辅助函数可以直接导入使用，无需初始化：

```typescript
import { 
  validateEmail, 
  formatCurrency, 
  sha256, 
  setCache,
  http,
  all,
  upload,
} from "@dreamer/dweb/extensions";

// 验证函数
validateEmail("test@example.com"); // true

// 格式化函数
formatCurrency(1234.56); // "¥1,234.56"

// 加密函数
const hash = await sha256("hello world");

// 缓存函数
setCache("key", "value", 3600); // 缓存1小时

// HTTP 请求
const users = await http.get("/api/users");

// 并发请求
const [users, posts] = await all([
  http.get("/api/users"),
  http.get("/api/posts"),
]);

// 文件上传
await upload("/api/upload", file);
```

## 文档导航

### 内置扩展

- [String 扩展](./builtin/string.md) - 字符串处理方法
- [Array 扩展](./builtin/array.md) - 数组操作方法
- [Date 扩展](./builtin/date.md) - 日期处理方法
- [Object 扩展](./builtin/object.md) - 对象操作方法
- [Request 扩展](./builtin/request.md) - 请求处理方法

### 辅助函数

- [验证函数](./helpers/validation.md) - 数据验证工具
- [格式化函数](./helpers/format.md) - 数据格式化工具
- [加密函数](./helpers/crypto.md) - 加密、哈希、签名工具
- [缓存函数](./helpers/cache.md) - 内存缓存工具
- [HTTP 请求库](./helpers/http.md) - 前端 HTTP 请求库（支持拦截器、重试、并发请求、文件上传/下载、进度追踪）
- [Web3 操作库](./helpers/web3.md) - Web3 相关操作

### 其他

- [自定义扩展](./custom.md) - 注册自定义扩展
- [API 参考](./api.md) - 完整 API 文档

## 相关文档

- [核心模块](../core/README.md) - 框架核心功能
- [中间件](../middleware/README.md) - 中间件系统
- [插件](../plugins/README.md) - 插件系统
- [控制台工具](../console/README.md) - 命令行工具

