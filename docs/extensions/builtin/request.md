## Request 扩展

为 Request 类型提供请求处理相关的扩展方法。

### getQuery()

从请求 URL 中获取查询参数。

```typescript
// URL: /api/users?page=1&limit=10
request.getQuery('page'); // "1"
request.getQuery('limit'); // "10"
request.getQuery(); // { page: "1", limit: "10" }
request.getQuery('sort'); // null
```

### getParams()

获取路由路径中的参数（需要在路由系统中设置 params）。

```typescript
// 路由: /api/users/:id/posts/:postId
// 请求: /api/users/123/posts/456
// 如果路由系统设置了 params
request.getParams(); // { id: "123", postId: "456" }
```

### isAjax()

检查请求是否为 AJAX 请求。

```typescript
// 设置了 X-Requested-With: XMLHttpRequest 的请求
request.isAjax(); // true

// Content-Type 为 application/json 的请求
request.isAjax(); // true

// 普通页面请求
request.isAjax(); // false
```

### isMobile()

检查请求是否来自移动设备。

```typescript
// User-Agent 包含 Mobile、Android、iPhone 或 iPad
request.isMobile(); // true

// 普通桌面浏览器
request.isMobile(); // false
```

### getIp()

从请求头中获取客户端真实IP地址。

```typescript
// 如果请求头包含 X-Forwarded-For: 192.168.1.1, 10.0.0.1
request.getIp(); // "192.168.1.1"（取第一个IP）

// 如果请求头包含 X-Real-IP: 192.168.1.1
request.getIp(); // "192.168.1.1"

// 如果都没有，返回 'unknown'
request.getIp(); // "unknown"
```

### isMethod()

检查请求的 HTTP 方法是否与指定方法匹配。

```typescript
// GET 请求
request.isMethod('GET'); // true
request.isMethod('get'); // true（不区分大小写）
request.isMethod('POST'); // false

// POST 请求
request.isMethod('POST'); // true
request.isMethod('PUT'); // false
```

### getJson()

获取请求体并解析为 JSON 对象。

```typescript
// 请求体: { "name": "Alice", "age": 30 }
const data = await request.getJson();
// data = { name: "Alice", age: 30 }

// 如果请求体不是有效的 JSON
const invalid = await request.getJson();
// invalid = null
```

### getText()

获取请求体的文本内容。

```typescript
// 请求体: "Hello World"
const text = await request.getText();
// text = "Hello World"

// 如果请求体为空或获取失败
const empty = await request.getText();
// empty = ""
```
