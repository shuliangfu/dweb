### auth - JWT 认证

```typescript
import { auth, signJWT, verifyJWT } from "@dreamer/dweb/middleware";

// 签名 JWT
const token = await signJWT({ userId: 123 }, "secret", { expiresIn: "1h" });

// 验证 JWT
const payload = await verifyJWT(token, "secret");

// 认证中间件
server.use(auth({
  secret: "your-secret-key", // JWT 密钥（必需）
  headerName: "Authorization", // Token 在请求头中的名称（默认 'Authorization'）
  tokenPrefix: "Bearer ", // Token 前缀（默认 'Bearer '）
  cookieName: "token", // Token 在 Cookie 中的名称（可选）
  skip: ["/login", "/register"], // 跳过认证的路径数组（支持 glob 模式）
  verifyToken: async (token, secret) => { // 验证 Token 的函数（可选，默认使用内置验证）
    // 自定义验证逻辑
    return payload;
  },
  onError: (error, req) => { // 自定义错误处理
    console.error("认证失败:", error);
  },
}));

// 在处理器中访问用户信息
server.setHandler(async (req, res) => {
  const user = req.user; // JWT 载荷
  res.json({ user });
});
```

#### 配置选项

**必需参数：**

- `secret` - JWT 密钥（必需）

**可选参数：**

- `headerName` - Token 在请求头中的名称（默认 'Authorization'）
- `tokenPrefix` - Token 前缀（默认 'Bearer '）
- `cookieName` - Token 在 Cookie 中的名称（可选）
- `skip` - 跳过认证的路径数组（支持 glob 模式）
- `verifyToken` - 验证 Token 的函数（可选，默认使用内置验证）
- `onError` - 自定义错误处理函数
