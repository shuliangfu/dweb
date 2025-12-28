### bodyParser - 请求体解析

```typescript
import { bodyParser } from "@dreamer/dweb/middleware";

server.use(bodyParser({
  json: { limit: "1mb", strict: true }, // JSON 解析配置
  urlencoded: { limit: "1mb", extended: true }, // URL-encoded 解析配置
  text: { limit: "1mb" }, // 文本解析配置
  raw: { limit: "1mb" }, // 原始数据解析配置
}));

// 使用
server.setHandler(async (req, res) => {
  const json = await req.json(); // 自动解析 JSON
  const form = await req.formData(); // 自动解析表单
});
```

#### 配置选项

**可选参数：**

- `json` - JSON 解析配置对象：
  - `limit` - 大小限制（如 '1mb'，默认 '1mb'）
  - `strict` - 是否严格模式（默认 true）
- `urlencoded` - URL-encoded 解析配置对象：
  - `extended` - 是否使用扩展模式（默认 true）
  - `limit` - 大小限制（如 '1mb'，默认 '1mb'）
- `text` - 文本解析配置对象：
  - `limit` - 大小限制（如 '1mb'，默认 '1mb'）
- `raw` - 原始数据解析配置对象：
  - `limit` - 大小限制（如 '1mb'，默认 '1mb'）
