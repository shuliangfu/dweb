# URL 工具

提供 URL 解析、构建、查询参数处理等功能。

**环境兼容性：** 通用（服务端和客户端都可用）

## 快速开始

```typescript
import { parseUrl, buildUrl, getQueryParams } from "@dreamer/dweb/utils";

// 解析 URL
const parsed = parseUrl('https://example.com:8080/path?key=value#hash');

// 构建 URL
const url = buildUrl('/api/users', { page: 1, limit: 10 });

// 获取查询参数
const params = getQueryParams('https://example.com?page=1&limit=10');
```

## URL 解析

### 解析 URL

将 URL 字符串解析为对象。

```typescript
import { parseUrl } from "@dreamer/dweb/utils";

const parsed = parseUrl('https://example.com:8080/path?key=value#hash');
// {
//   protocol: 'https:',
//   hostname: 'example.com',
//   port: '8080',
//   pathname: '/path',
//   search: '?key=value',
//   hash: '#hash',
//   origin: 'https://example.com:8080',
//   href: 'https://example.com:8080/path?key=value#hash'
// }
```

## URL 构建

### 构建 URL

根据路径和查询参数构建完整的 URL。

```typescript
import { buildUrl } from "@dreamer/dweb/utils";

// 构建相对 URL
buildUrl('/api/users', { page: 1, limit: 10 });
// '/api/users?page=1&limit=10'

// 构建绝对 URL
buildUrl('/api/users', { page: 1 }, 'https://api.example.com');
// 'https://api.example.com/api/users?page=1'
```

## 查询参数操作

### 获取查询参数

从 URL 中提取查询参数并返回对象。

```typescript
import { getQueryParams, getQueryParam } from "@dreamer/dweb/utils";

// 获取所有查询参数
const params = getQueryParams('https://example.com?page=1&limit=10');
// { page: '1', limit: '10' }

// 获取单个查询参数
const page = getQueryParam('page', 'https://example.com?page=1&limit=10');
// '1'

// 使用当前页面 URL
const currentParams = getQueryParams();
const currentPage = getQueryParam('page');
```

### 设置查询参数

在 URL 中设置或更新查询参数，返回新的 URL。

```typescript
import { setQueryParams } from "@dreamer/dweb/utils";

setQueryParams('https://example.com', { page: 1, limit: 10 });
// 'https://example.com?page=1&limit=10'

setQueryParams('https://example.com?page=1', { limit: 10 });
// 'https://example.com?page=1&limit=10'
```

### 更新查询参数

更新 URL 中的查询参数（保留其他参数）。

```typescript
import { updateQueryParams } from "@dreamer/dweb/utils";

updateQueryParams('https://example.com?page=1&limit=10', { page: 2 });
// 'https://example.com?page=2&limit=10'
```

### 删除查询参数

从 URL 中删除指定的查询参数。

```typescript
import { removeQueryParams } from "@dreamer/dweb/utils";

removeQueryParams('https://example.com?page=1&limit=10&sort=name', ['page', 'limit']);
// 'https://example.com?sort=name'
```

## Hash 操作

### 获取和设置 Hash

```typescript
import { getHash, setHash } from "@dreamer/dweb/utils";

// 获取 hash
getHash('https://example.com#section1'); // 'section1'
getHash(); // 使用当前页面 URL

// 设置 hash
setHash('https://example.com', 'section1');
// 'https://example.com#section1'
```

## URL 工具函数

### 判断是否为绝对 URL

```typescript
import { isAbsoluteUrl } from "@dreamer/dweb/utils";

isAbsoluteUrl('https://example.com'); // true
isAbsoluteUrl('/api/users'); // false
isAbsoluteUrl('api/users'); // false
```

### 拼接 URL 路径

```typescript
import { joinUrl } from "@dreamer/dweb/utils";

joinUrl(['api', 'users', '1']);
// 'api/users/1'

joinUrl(['/api', '/users/', '/1']);
// '/api/users/1'

joinUrl(['https://example.com', 'api', 'users']);
// 'https://example.com/api/users'
```

### 规范化 URL

规范化 URL，移除多余的斜杠。

```typescript
import { normalizeUrl } from "@dreamer/dweb/utils";

normalizeUrl('https://example.com//api///users');
// 'https://example.com/api/users'
```

## 完整示例

```typescript
import {
  parseUrl,
  buildUrl,
  getQueryParams,
  setQueryParams,
  updateQueryParams,
} from "@dreamer/dweb/utils";

// 解析 URL
const parsed = parseUrl('https://api.example.com/users?page=1&limit=10');

// 构建 API URL
const apiUrl = buildUrl('/api/users', { page: 1, limit: 10 }, 'https://api.example.com');

// 获取当前页面的查询参数
const params = getQueryParams();
const page = parseInt(getQueryParam('page') || '1', 10);

// 更新查询参数（用于分页）
const nextPageUrl = updateQueryParams(
  globalThis.location.href,
  { page: page + 1 }
);
```

## API 参考

### URL 解析
- `parseUrl(url)` - 解析 URL 为对象

### URL 构建
- `buildUrl(path, params?, baseUrl?)` - 构建 URL

### 查询参数
- `getQueryParams(url?)` - 获取所有查询参数
- `getQueryParam(key, url?)` - 获取单个查询参数
- `setQueryParams(url, params)` - 设置查询参数
- `updateQueryParams(url, params)` - 更新查询参数
- `removeQueryParams(url, keys)` - 删除查询参数

### Hash 操作
- `getHash(url?)` - 获取 URL hash
- `setHash(url, hash)` - 设置 URL hash

### 工具函数
- `isAbsoluteUrl(url)` - 判断是否为绝对 URL
- `joinUrl(...paths)` - 拼接 URL 路径
- `normalizeUrl(url)` - 规范化 URL

### 类型
- `ParsedUrl` - 解析后的 URL 对象接口

