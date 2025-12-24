### form-validator - 表单验证

```typescript
import { formValidator, validateForm } from "@dreamer/dweb/plugins";

usePlugin(formValidator({
  rules: {
    name: { type: "string", required: true, min: 2, max: 50 },
    email: {
      type: "string",
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
  },
}));

// 验证表单
const result = await validateForm(data, {
  name: { type: "string", required: true },
  email: { type: "string", required: true },
});
```
