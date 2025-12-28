### logger - 请求日志

```typescript
import { logger } from "@dreamer/dweb/middleware";

server.use(logger({
  format: "combined", // 日志格式（默认 'combined'）：'combined' | 'common' | 'dev' | 'short' | 'tiny'
  skip: (req) => req.url.includes("/health"), // 跳过日志记录的函数，接收请求对象，返回布尔值（默认跳过 Chrome DevTools 的自动请求）
}));
```

#### 配置选项

**可选参数：**

- `format` - 日志格式（默认 'combined'）：
  - `'combined'` - 完整格式，包含方法、路径、状态码、耗时和 User-Agent
  - `'common'` - 通用格式，类似 Apache 日志
  - `'dev'` - 开发格式，带颜色标记
  - `'short'` - 简短格式
  - `'tiny'` - 最简格式
- `skip` - 跳过日志记录的函数，接收请求对象，返回布尔值（默认跳过 Chrome DevTools 的自动请求）
