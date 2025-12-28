### security - 安全头

```typescript
import { security } from "@dreamer/dweb/middleware";

server.use(security({
  xssProtection: true, // 是否启用 XSS 防护（默认 true）
  csrfProtection: true, // 是否启用 CSRF 防护（默认 true）
  csrfCookieName: "_csrf", // CSRF Token Cookie 名称（默认 '_csrf'）
  csrfHeaderName: "X-CSRF-Token", // CSRF Token 请求头名称（默认 'X-CSRF-Token'）
  csrfFieldName: "_csrf", // CSRF Token 表单字段名称（默认 '_csrf'）
  csrfMethods: ["POST", "PUT", "DELETE", "PATCH"], // 需要 CSRF 验证的方法（默认 ['POST', 'PUT', 'DELETE', 'PATCH']）
  csrfSkip: ["/api/public"], // 跳过 CSRF 验证的路径数组（支持 glob 模式）
  contentSecurityPolicy: { // 内容安全策略（CSP），可以是字符串或配置对象
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: true,
  },
  hsts: { // 是否启用严格传输安全（HSTS），可以是布尔值或配置对象（默认 false，生产环境建议 true）
    maxAge: 31536000, // 最大年龄（秒）
    includeSubDomains: true, // 是否包含子域
    preload: false, // 是否预加载
  },
  frameOptions: "SAMEORIGIN", // X-Frame-Options（默认 'SAMEORIGIN'）：'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM'
  contentTypeOptions: "nosniff", // X-Content-Type-Options（默认 'nosniff'）：'nosniff' | 'none'
  xssProtectionHeader: "1; mode=block", // X-XSS-Protection（默认 '1; mode=block'）
  referrerPolicy: "no-referrer", // Referrer-Policy（默认 'no-referrer'）：'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url'
  permissionsPolicy: { // Permissions-Policy（功能策略），对象格式，键为功能名，值为允许的来源数组
    geolocation: ["'self'"],
    camera: ["'none'"],
  },
}));
```

#### 配置选项

**可选参数：**

- `xssProtection` - 是否启用 XSS 防护（默认 true）
- `csrfProtection` - 是否启用 CSRF 防护（默认 true）
- `csrfCookieName` - CSRF Token Cookie 名称（默认 '_csrf'）
- `csrfHeaderName` - CSRF Token 请求头名称（默认 'X-CSRF-Token'）
- `csrfFieldName` - CSRF Token 表单字段名称（默认 '_csrf'）
- `csrfMethods` - 需要 CSRF 验证的方法（默认 ['POST', 'PUT', 'DELETE', 'PATCH']）
- `csrfSkip` - 跳过 CSRF 验证的路径数组（支持 glob 模式）
- `contentSecurityPolicy` - 内容安全策略（CSP），可以是字符串或配置对象（包含 defaultSrc, scriptSrc, styleSrc, imgSrc, connectSrc, fontSrc, objectSrc, mediaSrc, frameSrc, baseUri, formAction, frameAncestors, upgradeInsecureRequests）
- `hsts` - 是否启用严格传输安全（HSTS），可以是布尔值或配置对象（默认 false，生产环境建议 true），包含 maxAge, includeSubDomains, preload
- `frameOptions` - X-Frame-Options（默认 'SAMEORIGIN'）：'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM'
- `contentTypeOptions` - X-Content-Type-Options（默认 'nosniff'）：'nosniff' | 'none'
- `xssProtectionHeader` - X-XSS-Protection（默认 '1; mode=block'）
- `referrerPolicy` - Referrer-Policy（默认 'no-referrer'）：'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url'
- `permissionsPolicy` - Permissions-Policy（功能策略），对象格式，键为功能名，值为允许的来源数组
