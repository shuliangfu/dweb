### cors - 跨域支持

```typescript
import { cors } from "@dreamer/dweb/middleware";

server.use(cors({
  origin: "*", // 或指定域名 ['https://example.com']，或函数 (origin: string | null) => boolean
  methods: ["GET", "POST", "PUT", "DELETE"], // 默认 ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  allowedHeaders: ["Content-Type", "Authorization"], // 默认 ['Content-Type', 'Authorization']
  exposedHeaders: [], // 暴露的响应头，默认 []
  credentials: true, // 是否允许发送凭证，默认 false
  maxAge: 86400, // 预检请求的缓存时间（秒），默认 86400
}));
```

#### 配置选项

**可选参数：**

- `origin` - 允许的源，可以是字符串、数组或函数（默认 '*'）
- `methods` - 允许的 HTTP 方法（默认 ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']）
- `allowedHeaders` - 允许的请求头（默认 ['Content-Type', 'Authorization']）
- `exposedHeaders` - 暴露的响应头（默认 []）
- `credentials` - 是否允许发送凭证（默认 false）
- `maxAge` - 预检请求的缓存时间（秒，默认 86400）
