### static - 静态文件

```typescript
import { staticFiles } from "@dreamer/dweb/middleware";

server.use(staticFiles({
  root: "./public",
  prefix: "/static",
  index: "index.html",
}));
```
