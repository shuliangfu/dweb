# Cookie 管理

DWeb 框架提供了完整的 Cookie 管理功能，支持 Cookie 的设置、读取、删除和签名。

## 目录结构

```
src/features/cookie.ts  # Cookie 管理实现
```

## 快速开始

### 基本使用

```typescript
import { CookieManager } from '@dreamer/dweb/features/cookie';

// 创建 Cookie 管理器
const cookieManager = new CookieManager('your-secret-key');

// 在请求处理中使用
server.setHandler(async (req, res) => {
  // 设置 Cookie
  const cookieString = cookieManager.set('username', 'john', {
    maxAge: 3600, // 1 小时
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
  });
  res.setHeader('Set-Cookie', cookieString);
  
  // 读取 Cookie
  const cookies = cookieManager.parse(req.headers.get('Cookie'));
  const username = cookies.username;
  
  // 删除 Cookie
  const deleteCookie = cookieManager.delete('username');
  res.setHeader('Set-Cookie', deleteCookie);
  
  res.text('OK');
});
```

### 使用签名 Cookie

```typescript
// 创建带签名的 Cookie 管理器
const cookieManager = new CookieManager('your-secret-key');

// 设置签名 Cookie（异步）
const cookieString = await cookieManager.setAsync('session', 'session-id', {
  maxAge: 3600,
  httpOnly: true,
});

// 解析签名 Cookie（异步，自动验证签名）
const cookies = await cookieManager.parseAsync(req.headers.get('Cookie'));
const session = cookies.session; // 自动验证签名，如果签名无效则不会包含在结果中
```

## API 参考

### CookieManager

#### 构造函数

```typescript
new CookieManager(secret?: string)
```

- `secret` - 可选，用于签名 Cookie 的密钥

#### 方法

##### set - 设置 Cookie（同步，不支持签名）

```typescript
set(name: string, value: string, options?: CookieOptions): string
```

**参数：**
- `name` - Cookie 名称
- `value` - Cookie 值
- `options` - Cookie 选项（可选）

**返回：** Cookie 字符串，可直接用于 `Set-Cookie` 响应头

**示例：**
```typescript
const cookie = cookieManager.set('theme', 'dark', {
  maxAge: 86400, // 1 天
  path: '/',
  domain: 'example.com',
  secure: true,
  httpOnly: true,
  sameSite: 'lax',
});
res.setHeader('Set-Cookie', cookie);
```

##### setAsync - 设置 Cookie（异步，支持签名）

```typescript
setAsync(name: string, value: string, options?: CookieOptions): Promise<string>
```

**参数：** 同 `set` 方法

**返回：** Promise，解析为 Cookie 字符串（包含签名）

**示例：**
```typescript
const cookie = await cookieManager.setAsync('session', 'session-id', {
  maxAge: 3600,
  httpOnly: true,
});
res.setHeader('Set-Cookie', cookie);
```

##### parse - 解析 Cookie（同步，不支持签名验证）

```typescript
parse(cookieHeader: string | null): Record<string, string>
```

**参数：**
- `cookieHeader` - Cookie 请求头字符串

**返回：** Cookie 对象（键值对）

**示例：**
```typescript
const cookies = cookieManager.parse(req.headers.get('Cookie'));
const theme = cookies.theme;
```

##### parseAsync - 解析 Cookie（异步，支持签名验证）

```typescript
parseAsync(cookieHeader: string | null): Promise<Record<string, string>>
```

**参数：** 同 `parse` 方法

**返回：** Promise，解析为 Cookie 对象（自动验证签名，无效签名的 Cookie 会被忽略）

**示例：**
```typescript
const cookies = await cookieManager.parseAsync(req.headers.get('Cookie'));
const session = cookies.session; // 已通过签名验证
```

##### delete - 删除 Cookie

```typescript
delete(name: string, options?: CookieOptions): string
```

**参数：**
- `name` - Cookie 名称
- `options` - Cookie 选项（可选，用于指定路径和域名）

**返回：** Cookie 字符串（设置过期时间为 0）

**示例：**
```typescript
const deleteCookie = cookieManager.delete('session', {
  path: '/',
  domain: 'example.com',
});
res.setHeader('Set-Cookie', deleteCookie);
```

### CookieOptions

```typescript
interface CookieOptions {
  path?: string;           // Cookie 路径，默认 '/'
  domain?: string;         // Cookie 域名
  expires?: Date;          // 过期时间
  maxAge?: number;         // 最大存活时间（秒）
  secure?: boolean;        // 是否仅在 HTTPS 下发送
  httpOnly?: boolean;      // 是否禁止 JavaScript 访问，默认 true
  sameSite?: 'strict' | 'lax' | 'none'; // SameSite 属性
}
```

## 使用场景

### 用户偏好设置

```typescript
// 保存用户主题偏好
const cookie = cookieManager.set('theme', 'dark', {
  maxAge: 365 * 24 * 60 * 60, // 1 年
  path: '/',
});

// 读取用户主题
const cookies = cookieManager.parse(req.headers.get('Cookie'));
const theme = cookies.theme || 'light';
```

### 会话管理

```typescript
// 设置会话 Cookie（带签名）
const sessionCookie = await cookieManager.setAsync('session', sessionId, {
  maxAge: 3600, // 1 小时
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
});

// 验证会话 Cookie
const cookies = await cookieManager.parseAsync(req.headers.get('Cookie'));
const sessionId = cookies.session; // 已通过签名验证
```

### 购物车

```typescript
// 保存购物车数据
const cartData = JSON.stringify(cartItems);
const cookie = cookieManager.set('cart', cartData, {
  maxAge: 7 * 24 * 60 * 60, // 7 天
  path: '/',
});

// 读取购物车
const cookies = cookieManager.parse(req.headers.get('Cookie'));
const cartData = cookies.cart;
const cartItems = cartData ? JSON.parse(cartData) : [];
```

## 安全最佳实践

1. **使用签名 Cookie**：对于敏感数据（如会话 ID），使用 `setAsync` 和 `parseAsync` 方法
2. **设置 HttpOnly**：防止 XSS 攻击，禁止 JavaScript 访问 Cookie
3. **设置 Secure**：在生产环境中启用，确保 Cookie 仅在 HTTPS 下传输
4. **设置 SameSite**：防止 CSRF 攻击
5. **使用强密钥**：签名密钥应该足够长且随机

```typescript
// 安全的 Cookie 配置
const cookie = await cookieManager.setAsync('session', sessionId, {
  maxAge: 3600,
  httpOnly: true,    // 防止 XSS
  secure: true,      // 仅 HTTPS
  sameSite: 'strict', // 防止 CSRF
  path: '/',
});
```

## 在框架中使用

框架会自动创建 CookieManager 实例，可以通过 Request 和 Response 对象使用：

```typescript
// 在路由处理器中
server.setHandler(async (req, res) => {
  // 设置 Cookie
  res.setCookie('username', 'john', {
    maxAge: 3600,
    httpOnly: true,
  });
  
  // 读取 Cookie
  const username = req.getCookie('username');
  
  res.text(`Hello, ${username || 'Guest'}`);
});
```

---

## 📚 相关文档

### 核心文档
- [文档总览](./README.md)
- [核心模块](./core.md)
- [配置文档](./configuration.md)
- [开发指南](./development.md)

### 功能模块
- [数据库](./database.md)
- [GraphQL](./graphql.md)
- [WebSocket](./websocket.md)
- [Session](./session.md)
- [Cookie](./cookie.md)
- [Logger](./logger.md)

### 扩展模块
- [中间件](./middleware.md)
- [插件](./plugins.md)

### 部署与运维
- [Docker 部署](./docker.md)

