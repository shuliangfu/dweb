### form-validator - 表单验证

```typescript
import { formValidator, validateForm } from "@dreamer/dweb/plugins";

usePlugin(formValidator({
  injectClientScript: true, // 是否在客户端注入验证脚本（默认 true）
  defaultConfig: { // 默认验证配置（可选）
    fields: [ // 字段验证配置数组
      {
        name: "email",
        rules: [
          { type: "required", message: "邮箱是必填的" },
          { type: "email", message: "邮箱格式不正确" },
        ],
        label: "邮箱",
      },
    ],
    messages: { // 全局错误消息模板
      required: "{field} 是必填字段",
      email: "{field} 格式不正确",
    },
  },
}));

// 验证表单
const result = await validateForm(data, {
  name: { type: "string", required: true },
  email: { type: "string", required: true },
});
```

#### 配置选项

**可选参数：**

- `injectClientScript` - 是否在客户端注入验证脚本（默认 true）
- `defaultConfig` - 默认验证配置对象，包含：
  - `fields` - 字段验证配置数组，每个字段包含 name, rules, label
  - `messages` - 全局错误消息模板对象

验证规则类型：'required' | 'email' | 'url' | 'number' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom'
