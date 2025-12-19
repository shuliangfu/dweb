# 安全指南

本文档说明 DWeb 框架的安全机制和最佳实践。

## Cookie 安全

### 签名保护

框架支持 Cookie 签名，使用 HMAC-SHA256 算法防止 Cookie 被篡改。

**配置方式：**

```typescript
// dweb.config.ts
export default {
  cookie: {
    secret: 'your-secret-key-here', // 必须配置，建议使用强随机字符串
  }
}
```

**安全特性：**
- ✅ Cookie 值会被签名，任何篡改都会被检测到
- ✅ 签名验证失败时，Cookie 会被忽略
- ✅ 使用 Web Crypto API，符合安全标准

**⚠️ 安全警告：**
- 如果没有配置 `secret`，Cookie **没有签名保护**，可能被客户端篡改
- `secret` 应该使用强随机字符串，建议至少 32 个字符
- 生产环境必须配置 `secret`

### HttpOnly 和 Secure

Session Cookie 默认启用 `httpOnly`，防止 XSS 攻击：

```typescript
// Session Cookie 自动设置
{
  httpOnly: true,
  secure: config.secure || false, // 生产环境建议设置为 true
  sameSite: 'strict' // 建议配置
}
```

## Session 安全

### Session ID 生成

Session ID 使用 `crypto.getRandomValues()` 生成，是密码学安全的随机数：

```typescript
// 生成 32 字节随机数，转换为 64 位十六进制字符串
const array = new Uint8Array(32);
crypto.getRandomValues(array);
const sessionId = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
```

**安全特性：**
- ✅ Session ID 是随机生成的，不可预测
- ✅ Session 数据存储在服务器端，客户端只存储 Session ID
- ✅ Session 有过期时间检查，过期后自动清理

**⚠️ 安全警告：**
- Session ID 通过 Cookie 传递，如果 Cookie 没有签名，可能被伪造
- 建议同时配置 Cookie 签名和 Session，双重保护

### Session 固定攻击防护

框架支持 Session 重新生成（regenerate），防止 Session 固定攻击：

```typescript
// 在用户登录后重新生成 Session ID
await session.regenerate();
```

## 路由安全

### 路径遍历防护

框架在多个层面防止路径遍历攻击：

1. **静态文件中间件：**
   ```typescript
   // 检查路径是否包含 ..
   if (!url.pathname.startsWith('/') || url.pathname.includes('..')) {
     return; // 拒绝请求
   }
   ```

2. **Tailwind 插件：**
   ```typescript
   // 安全检查：防止路径遍历攻击
   if (!url.pathname.startsWith('/') || url.pathname.includes('..')) {
     return;
   }
   ```

3. **路由扫描：**
   - 路由文件路径是从文件系统扫描的，不是从 URL 直接读取
   - 路由匹配基于预扫描的路由表，不会执行任意文件

**安全特性：**
- ✅ 路由文件路径是预扫描的，不会动态加载任意文件
- ✅ 动态路由参数只用于匹配，不会直接用于文件路径
- ✅ 路径遍历字符（`..`）会被检测并拒绝

### 命令注入防护

**✅ 框架没有执行系统命令的代码**

框架中唯一使用 `Deno.Command` 的地方是开发环境的浏览器自动打开功能：

```typescript
// 仅用于开发环境，打开浏览器
const command = new Deno.Command("open", {
  args: [url],
  stdout: "null",
  stderr: "null",
});
```

这个功能：
- 只在开发环境使用
- 只执行固定的 `open` 命令
- 参数是框架内部生成的 URL，不来自用户输入

### 动态路由参数验证

**⚠️ 需要开发者自行验证**

动态路由参数（如 `/users/[id]`）的值会直接传递给路由处理器，**框架不会自动验证或清理**。

**最佳实践：**

```typescript
// routes/users/[id].tsx
export default function UserPage({ params }: PageProps) {
  const userId = params.id;
  
  // ✅ 验证参数格式
  if (!/^\d+$/.test(userId)) {
    return <div>Invalid user ID</div>;
  }
  
  // ✅ 验证参数范围
  const id = parseInt(userId);
  if (id < 1 || id > 1000000) {
    return <div>User ID out of range</div>;
  }
  
  // ✅ 使用参数（已验证）
  return <div>User {id}</div>;
}
```

## 静态文件安全

### 路径验证

静态文件中间件会验证文件路径：

```typescript
// 1. 检查路径遍历
if (pathname.includes('..')) {
  return; // 拒绝
}

// 2. 检查文件是否存在
const fullPath = `${dir}${filePath}`;
const fileStat = await Deno.stat(fullPath);

// 3. 确保是文件，不是目录
if (!fileStat.isFile) {
  return; // 拒绝
}
```

### 点文件控制

可以通过配置控制点文件（隐藏文件）的访问：

```typescript
static: {
  dir: 'assets',
  dotfiles: 'deny', // 'allow' | 'deny' | 'ignore'
}
```

## CSRF 防护

框架提供了 CSRF 防护中间件：

```typescript
import { security } from '@dreamer/dweb/middleware';

app.use(security({
  csrfProtection: true,
  csrfMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
  csrfCookieName: 'csrf-token',
  csrfHeaderName: 'X-CSRF-Token',
  csrfFieldName: '_csrf',
}));
```

**工作原理：**
1. 服务器生成 CSRF Token，存储在 Cookie 中
2. 客户端在请求头或表单字段中发送 Token
3. 服务器验证 Token 是否匹配

## XSS 防护

### 响应头设置

框架的 `security` 中间件可以设置安全响应头：

```typescript
app.use(security({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // 注意：unsafe-inline 有风险
    styleSrc: ["'self'", "'unsafe-inline'"],
  },
  xssProtection: true,
}));
```

### 模板渲染

框架使用 Preact 进行服务端渲染，默认会转义 HTML：

```typescript
// ✅ 安全：自动转义
<h1>{userInput}</h1>

// ⚠️ 危险：需要手动验证
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

## 安全最佳实践

### 1. 配置 Cookie 签名

```typescript
// dweb.config.ts
export default {
  cookie: {
    secret: process.env.COOKIE_SECRET || 'change-me-in-production',
  }
}
```

### 2. 启用 HTTPS

```typescript
// 生产环境配置
export default {
  cookie: {
    secure: true, // 只在 HTTPS 下传输
  },
  session: {
    secure: true,
  }
}
```

### 3. 验证用户输入

```typescript
// API 路由示例
export const POST = async (req: Request) => {
  const body = await req.json();
  
  // ✅ 验证输入
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return Response.json({ error: 'Invalid email' }, { status: 400 });
  }
  
  // ✅ 使用验证后的数据
  // ...
}
```

### 4. 使用参数化查询

如果使用数据库，使用参数化查询防止 SQL 注入：

```typescript
// ✅ 正确：使用参数化查询
const result = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// ❌ 错误：字符串拼接
const result = await db.query(
  `SELECT * FROM users WHERE id = ${userId}`
);
```

### 5. 限制文件上传

```typescript
// 验证文件类型和大小
if (file.type !== 'image/jpeg' || file.size > 5 * 1024 * 1024) {
  return Response.json({ error: 'Invalid file' }, { status: 400 });
}
```

## 已实施的安全修复

### 1. 路由参数验证

**修复内容：**
- 路由参数名必须符合标识符规则（字母、数字、下划线）
- 路由参数值自动清理控制字符
- 限制参数值长度（单个参数 1000 字符，捕获所有 2000 字符）

**位置：** `src/core/router.ts` - `extractParams()` 方法

### 2. API 方法名验证

**修复内容：**
- API 方法名必须符合安全规则（字母开头，可包含字母、数字、下划线、短横线）
- 限制方法名长度（最大 100 字符）
- 防止通过 URL 路径注入恶意方法名

**位置：** `src/core/api-route.ts` - `handleApiRoute()` 方法

### 3. 安全工具函数

**新增：** `src/utils/security.ts`
- `isPathSafe()` - 验证路径是否在允许的目录内
- `isValidIdentifier()` - 验证标识符
- `isSafeFileName()` - 验证文件名
- `sanitizeRouteParams()` - 清理路由参数
- `isSafeMethodName()` - 验证方法名
- `isSafeQueryValue()` - 验证查询参数值

## 已知安全问题

### 1. Cookie 签名可选

**问题：** 如果未配置 `cookie.secret`，Cookie 没有签名保护。

**影响：** 客户端可能篡改 Cookie 值。

**缓解措施：** 
- 生产环境必须配置 `cookie.secret`
- 考虑在框架层面强制要求配置

### 2. 动态路由参数需要开发者验证

**问题：** 虽然框架已进行基本清理，但业务逻辑验证仍需要开发者实现。

**影响：** 如果开发者不验证参数，可能导致业务逻辑错误。

**缓解措施：**
- 框架已提供基本清理（移除控制字符、限制长度）
- 开发者需要在路由处理器中验证参数的业务逻辑
- 使用 `src/utils/security.ts` 中的工具函数

### 3. 静态文件路径安全

**状态：** 已使用 `path.join()` 规范化路径

**建议：** 考虑添加路径边界检查（确保文件在允许的目录内）

## 报告安全问题

如果发现安全问题，请通过以下方式报告：

1. **GitHub Issues：** https://github.com/shuliangfu/dweb/issues
2. **Email：** （如果提供）

请包含：
- 问题描述
- 复现步骤
- 影响范围
- 建议的修复方案

