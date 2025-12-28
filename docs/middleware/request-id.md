### requestId - 请求 ID

```typescript
import { requestId } from "@dreamer/dweb/middleware";

server.use(requestId({
  headerName: "X-Request-ID", // 请求 ID 响应头名称（默认 'X-Request-Id'）
  exposeHeader: true, // 是否在响应头中包含请求 ID（默认 true）
  generator: () => crypto.randomUUID(), // 自定义 ID 生成器函数（如果不提供，使用默认的 UUID v4 生成器）
  skip: ["/health"], // 跳过生成请求 ID 的路径数组（支持 glob 模式）
  useHeader: true, // 是否从请求头中读取现有的请求 ID（默认 true）。如果请求头中已有请求 ID，则使用它而不是生成新的
}));

// 在处理器中访问请求 ID
server.setHandler(async (req, res) => {
  const id = req.id; // 请求 ID
  res.json({ requestId: id });
});
```

#### 配置选项

**可选参数：**

- `headerName` - 请求 ID 响应头名称（默认 'X-Request-Id'）
- `exposeHeader` - 是否在响应头中包含请求 ID（默认 true）
- `generator` - 自定义 ID 生成器函数（如果不提供，使用默认的 UUID v4 生成器）
- `skip` - 跳过生成请求 ID 的路径数组（支持 glob 模式）
- `useHeader` - 是否从请求头中读取现有的请求 ID（默认 true）。如果请求头中已有请求 ID，则使用它而不是生成新的
