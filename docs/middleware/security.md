### security - 安全头

提供开箱即用的企业级安全防护，包括动态 CSP、HSTS、XSS 防护等。

**核心特性：**

- **动态 CSP**: 自动生成 CSP 头，支持根据构建时的脚本哈希自动配置 `script-src`，有效防御 XSS 攻击。
- **安全头增强**: 集成 Helmet 全套安全头（HSTS, X-Frame-Options, X-Content-Type-Options 等）。
- **默认安全**: 生产环境默认开启强安全策略。

```typescript
import { security } from "@dreamer/dweb/middleware";

server.use(security({
  // ... 配置项
  contentSecurityPolicy: { // 支持动态 CSP
     useDefaults: true,
     directives: {
       "script-src": ["'self'", "'unsafe-inline'"],
       // ...
     }
  }
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
