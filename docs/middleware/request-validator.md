### requestValidator - 请求验证

```typescript
import { requestValidator } from "@dreamer/dweb/middleware";

server.use(requestValidator({
  body: { // 请求体验证规则
    name: { type: "string", required: true, min: 2, max: 50 },
    email: {
      type: "string",
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    age: { type: "number", min: 0, max: 150 },
  },
  query: { // 查询参数验证规则
    page: { type: "number", min: 1 },
  },
  params: { // 路由参数验证规则
    id: { type: "string", required: true },
  },
}));
```

#### 配置选项

可以在 `body`、`query`、`params` 中配置验证规则。

**验证规则配置：**

- `field` - 字段名（必需）
- `type` - 数据类型：'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'date'
- `required` - 是否必需
- `min` - 最小值（用于数字）或最小长度（用于字符串或数组）
- `max` - 最大值（用于数字）或最大长度（用于字符串或数组）
- `minLength` - 最小长度（用于字符串或数组）
- `maxLength` - 最大长度（用于字符串或数组）
- `pattern` - 正则表达式模式（字符串或 RegExp）
- `enum` - 枚举值（允许的值列表）
- `validate` - 自定义验证函数，接收值和字段名，返回布尔值或错误消息字符串
- `message` - 错误消息
- `properties` - 嵌套验证规则（用于对象类型）
