### cors - 跨域支持

```typescript
import { cors } from "@dreamer/dweb/middleware";

server.use(cors({
  origin: "*", // 或指定域名 ['https://example.com']
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
```
