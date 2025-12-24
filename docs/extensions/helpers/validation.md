# 验证函数

提供常用的数据验证函数，包括邮箱、手机号、身份证等验证。

**环境兼容性：** 通用（服务端和客户端都可用）

```typescript
import {
  validateEmail,
  validateUrl,
  validatePhone,
  validateIdCard,
  validatePassword,
  validateRange,
  validateLength,
  validateNumber,
  validateInteger,
  validatePositive,
  validateEmpty,
} from "@dreamer/dweb/extensions";

// 验证邮箱
validateEmail("test@example.com"); // true

// 验证URL
validateUrl("https://example.com"); // true

// 验证手机号（中国）
validatePhone("13800138000"); // true

// 验证身份证号（中国）
validateIdCard("110101199001011234"); // true

// 验证密码强度
validatePassword("MyP@ssw0rd", 8);
// { valid: true, strength: 'strong', message: '密码强度强' }

// 验证数字范围
validateRange(50, 0, 100); // true

// 验证字符串长度
validateLength("hello", 3, 10); // true

// 验证是否为空值
validateEmpty(""); // true
validateEmpty([]); // true
validateEmpty({}); // true
```
