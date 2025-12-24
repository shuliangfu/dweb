### requestValidator - 请求验证

```typescript
import { requestValidator } from "@dreamer/dweb/middleware";

server.use(requestValidator({
  body: {
    name: { type: "string", required: true, min: 2, max: 50 },
    email: {
      type: "string",
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    age: { type: "number", min: 0, max: 150 },
  },
}));
```
