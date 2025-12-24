### email - 邮件发送

```typescript
import { email, sendEmail } from "@dreamer/dweb/plugins";

usePlugin(email({
  smtp: {
    host: "smtp.example.com",
    port: 587,
    secure: false,
    auth: {
      user: "user@example.com",
      pass: "password",
    },
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
