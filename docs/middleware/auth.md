### auth - JWT 认证

```typescript
import { auth, signJWT, verifyJWT } from "@dreamer/dweb/middleware";

// 签名 JWT
const token = await signJWT({ userId: 123 }, "secret", { expiresIn: "1h" });

// 验证 JWT
const payload = await verifyJWT(token, "secret");

// 认证中间件
server.use(auth({
  secret: "your-secret-key",
  unless: ["/login", "/register"], // 排除路径
}));

// 在处理器中访问用户信息
server.setHandler(async (req, res) => {
  const user = req.user; // JWT 载荷
  res.json({ user });
});
```
