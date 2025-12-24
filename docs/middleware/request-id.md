### requestId - 请求 ID

```typescript
import { requestId } from "@dreamer/dweb/middleware";

server.use(requestId({
  header: "X-Request-ID",
  generator: () => crypto.randomUUID(),
}));

// 在处理器中访问请求 ID
server.setHandler(async (req, res) => {
  const id = req.id; // 请求 ID
  res.json({ requestId: id });
});
```
