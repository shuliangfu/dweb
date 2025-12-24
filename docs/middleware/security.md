### security - 安全头

```typescript
import { security } from "@dreamer/dweb/middleware";

server.use(security({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```
