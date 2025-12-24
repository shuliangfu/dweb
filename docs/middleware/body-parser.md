### bodyParser - 请求体解析

```typescript
import { bodyParser } from "@dreamer/dweb/middleware";

server.use(bodyParser({
  json: { limit: "1mb" },
  urlencoded: { limit: "1mb", extended: true },
  text: { limit: "1mb" },
  raw: { limit: "1mb" },
}));

// 使用
server.setHandler(async (req, res) => {
  const json = await req.json(); // 自动解析 JSON
  const form = await req.formData(); // 自动解析表单
});
```
