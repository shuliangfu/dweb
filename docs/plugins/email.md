### email - 邮件发送

```typescript
import { email, sendEmail } from "@dreamer/dweb/plugins";

usePlugin(email({
  smtp: { // SMTP 配置（必需）
    host: "smtp.example.com", // SMTP 服务器地址（必需）
    port: 587, // SMTP 端口（必需）
    secure: false, // 是否使用 TLS（可选）
    user: "user@example.com", // 用户名（必需）
    password: "password", // 密码（必需）
    from: "sender@example.com", // 发件人邮箱（必需）
    fromName: "Sender Name", // 发件人名称（可选）
  },
  templates: [ // 邮件模板列表（可选）
    {
      name: "welcome",
      html: "<h1>Welcome, {{name}}!</h1>",
      text: "Welcome, {{name}}!",
      variableFormat: "{{variable}}", // 变量占位符格式（默认 '{{variable}}'）
    },
  ],
  defaults: { // 默认选项（可选）
    to: "default@example.com",
    from: "sender@example.com",
  },
}));

// 发送邮件
await sendEmail({
  to: "recipient@example.com",
  subject: "Hello",
  text: "Hello World",
  html: "<h1>Hello World</h1>",
});
```

#### 配置选项

**必需参数：**

- `smtp` - SMTP 配置对象，包含：
  - `host` - SMTP 服务器地址（必需）
  - `port` - SMTP 端口（必需）
  - `secure` - 是否使用 TLS（可选）
  - `user` - 用户名（必需）
  - `password` - 密码（必需）
  - `from` - 发件人邮箱（必需）
  - `fromName` - 发件人名称（可选）

**可选参数：**

- `templates` - 邮件模板列表，每个模板包含 name, html, text, variableFormat
- `defaults` - 默认选项（Partial<EmailOptions>），包含 to, cc, bcc, subject, text, html, attachments, replyTo 等
