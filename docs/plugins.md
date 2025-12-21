# 插件

DWeb 框架提供了强大的插件系统，支持各种功能扩展。

## 目录结构

```
src/plugins/
├── cache/              # 缓存插件
├── email/              # 邮件插件
├── file-upload/        # 文件上传插件
├── form-validator/     # 表单验证插件
├── i18n/               # 国际化插件
├── image-optimizer/    # 图片优化插件
├── performance/        # 性能监控插件
├── pwa/                # PWA 插件
├── rss/                # RSS 插件
├── seo/                # SEO 插件
├── sitemap/            # 网站地图插件
├── store/              # 状态管理插件
├── tailwind/           # Tailwind CSS 插件
├── theme/              # 主题插件
└── mod.ts              # 模块导出
```

## 使用插件

### 基本用法

```typescript
import { usePlugin } from "@dreamer/dweb/core/plugin";
import { seo } from "@dreamer/dweb/plugins";

usePlugin(seo({
  title: "My App",
  description: "My awesome app",
}));
```

## 内置插件

### seo - SEO 优化

```typescript
import { seo } from "@dreamer/dweb/plugins";

usePlugin(seo({
  title: "My App",
  description: "My awesome app",
  keywords: ["web", "framework"],
  openGraph: {
    type: "website",
    image: "https://example.com/og-image.jpg",
  },
  twitter: {
    card: "summary_large_image",
  },
}));
```

### sitemap - 网站地图

```typescript
import { sitemap } from "@dreamer/dweb/plugins";

usePlugin(sitemap({
  hostname: "https://example.com",
  urls: [
    { url: "/", changefreq: "daily", priority: 1.0 },
    { url: "/about", changefreq: "monthly", priority: 0.8 },
  ],
}));
```

### pwa - 渐进式 Web 应用

```typescript
import { pwa } from "@dreamer/dweb/plugins";

usePlugin(pwa({
  manifest: {
    name: "My App",
    shortName: "App",
    description: "My awesome app",
    themeColor: "#000000",
    backgroundColor: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  serviceWorker: {
    enabled: true,
    path: "/sw.js",
  },
}));
```

### i18n - 国际化

i18n 插件提供多语言支持，支持自动语言检测、翻译文件管理和全局翻译函数。

#### 基本配置

```typescript
import { i18n } from "@dreamer/dweb/plugins";

app.plugin(
  i18n({
    languages: [
      { code: "en-US", name: "English" },
      { code: "zh-CN", name: "中文" },
    ],
    defaultLanguage: "en-US",
    translationsDir: "locales",
    detection: {
      fromCookie: true, // 从 Cookie 检测语言
      fromHeader: false, // 默认不启用 Accept-Language 头检测
      fromQuery: true, // 从查询参数检测（如 ?lang=en）
      fromPath: false, // 从 URL 路径检测（如 /en/page）
    },
  }),
);
```

#### 翻译文件结构

翻译文件应放在 `translationsDir` 目录下，文件名格式为 `{语言代码}.json`：

```json
// locales/en-US.json
{
  "common": {
    "welcome": "Hello, World!",
    "greeting": "Hello, {name}!"
  },
  "validation": {
    "required": "{field} is required"
  }
}
```

```json
// locales/zh-CN.json
{
  "common": {
    "welcome": "你好，世界！",
    "greeting": "你好，{name}！"
  },
  "validation": {
    "required": "{field} 是必填字段"
  }
}
```

#### 使用翻译函数

**方式 1：全局 `$t()` 函数（推荐）**

无需导入，全局可用：

```typescript
// 在任何地方直接使用
console.log($t("common.welcome"));
const message = $t("common.greeting", { name: "John" });
```

**方式 2：通过 `LoadContext` 或 `PageProps`**

```typescript
// routes/index.tsx
export async function load({ t }: LoadContext) {
  const message = t("common.welcome");
  return { message };
}

export default function HomePage({ t }: PageProps) {
  return <div>{t("common.welcome")}</div>;
}
```

**方式 3：使用 `getI18n()` 函数**

```typescript
import { getI18n } from "@dreamer/dweb/plugins";

const t = getI18n();
const message = t("common.welcome");
```

#### 语言检测优先级

1. URL 路径（如 `/en/page`）- 需要启用 `fromPath: true`
2. 查询参数（如 `?lang=en`）- 需要启用 `fromQuery: true`
3. Cookie - 需要启用 `fromCookie: true`
4. Accept-Language 头 - 需要启用 `fromHeader: true`
5. 默认语言（配置中的 `defaultLanguage`）

#### 更多信息

详细使用说明请参考 [i18n 使用文档](./i18n-model-usage.md)。

### tailwind - Tailwind CSS

```typescript
import { tailwind } from "@dreamer/dweb/plugins";

usePlugin(tailwind({
  version: "v4", // 'v3' | 'v4'
  config: {
    content: ["./routes/**/*.{tsx,ts}"],
    theme: {
      extend: {},
    },
  },
}));
```

### cache - 缓存

```typescript
import { cache, CacheManager } from "@dreamer/dweb/plugins";

usePlugin(cache({
  store: "memory", // 'memory' | 'redis' | 'file'
  ttl: 3600, // 默认 TTL（秒）
}));

// 使用缓存管理器
const cacheManager = CacheManager.getInstance();
await cacheManager.set("key", "value", 3600);
const value = await cacheManager.get("key");
```

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

### file-upload - 文件上传

```typescript
import { fileUpload, handleFileUpload } from "@dreamer/dweb/plugins";

usePlugin(fileUpload({
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ["image/jpeg", "image/png"],
  uploadDir: "./uploads",
}));

// 处理文件上传
server.setHandler(async (req, res) => {
  if (req.method === "POST" && req.path === "/upload") {
    const result = await handleFileUpload(req, {
      field: "file",
      maxSize: 5 * 1024 * 1024,
    });
    res.json(result);
  }
});
```

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

### image-optimizer - 图片优化

```typescript
import { imageOptimizer } from "@dreamer/dweb/plugins";

usePlugin(imageOptimizer({
  formats: ["webp", "avif"],
  sizes: [320, 640, 1024, 1920],
  quality: 80,
}));
```

### performance - 性能监控

```typescript
import { performance } from "@dreamer/dweb/plugins";

usePlugin(performance({
  enabled: true,
  collectMetrics: true,
  reportInterval: 60000, // 1 分钟
}));
```

### rss - RSS 订阅

```typescript
import { rss } from "@dreamer/dweb/plugins";

usePlugin(rss({
  feeds: [
    {
      title: "My Blog",
      description: "My awesome blog",
      link: "https://example.com",
      items: [
        {
          title: "Post 1",
          link: "https://example.com/post-1",
          description: "Post 1 description",
          pubDate: new Date(),
        },
      ],
    },
  ],
}));
```

### store - 状态管理

状态管理插件提供了跨组件的响应式状态管理功能，支持服务端和客户端，可以用于在多个组件之间共享状态。

**特性：**
- ✅ 跨组件状态共享
- ✅ 响应式更新（订阅模式）
- ✅ 服务端和客户端支持
- ✅ 可选持久化（localStorage）
- ✅ 函数式更新支持
- ✅ 通过 PageProps 注入，使用简单

```typescript
import { store } from "@dreamer/dweb/plugins";

app.plugin(store({
  persist: true, // 是否启用持久化（默认 false）
  storageKey: 'my-app-store', // 持久化存储键名（默认 'dweb-store'）
  enableServer: true, // 是否在服务端启用（默认 true）
  initialState: { // 初始状态
    user: null,
    count: 0,
  },
}));
```

**配置选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `persist` | `boolean` | `false` | 是否启用持久化，启用后状态会保存到 localStorage |
| `storageKey` | `string` | `'dweb-store'` | 持久化存储的键名 |
| `enableServer` | `boolean` | `true` | 是否在服务端启用，每个请求会有独立的 Store 实例 |
| `initialState` | `Record<string, unknown>` | `{}` | 初始状态对象 |

#### 客户端使用（推荐方式：通过 PageProps）

```typescript
import { useState, useEffect } from 'preact/hooks';
import type { PageProps } from '@dreamer/dweb';

export default function MyPage({ store }: PageProps) {
  if (!store) {
    return <div>Store 未初始化</div>;
  }
  
  // 获取状态
  const state = store.getState();
  console.log(state.user); // null
  console.log(state.count); // 0

  // 设置状态
  const handleIncrement = () => {
    store.setState({ count: (state.count || 0) + 1 });
  };

  // 在组件中使用（需要配合 useState 和 useEffect）
  const [count, setCount] = useState(state.count || 0);
  
  useEffect(() => {
    // 订阅状态变化
    const unsubscribe = store.subscribe((newState) => {
      setCount(newState.count || 0);
    });
    
    return () => {
      unsubscribe();
    };
  }, [store]);

  return (
    <div>
      <p>Count: {count}</p>
      <button type="button" onClick={handleIncrement}>增加</button>
    </div>
  );
}
```

#### 客户端使用（直接访问 window.__STORE__）

```typescript
// 获取 Store 实例
const store = window.__STORE__;

// 获取状态
const state = store.getState();
console.log(state.user); // null
console.log(state.count); // 0

// 设置状态
store.setState({ count: 1 });
// 或使用函数式更新
store.setState((prev) => ({ count: prev.count + 1 }));

// 订阅状态变化
const unsubscribe = store.subscribe((state) => {
  console.log('状态已更新:', state);
  // 更新 UI
});

// 取消订阅
unsubscribe();

// 重置状态
store.reset();
```

#### 服务端使用（在 load 函数或页面组件中）

```typescript
import type { LoadContext } from '@dreamer/dweb';

export async function load({ req }: LoadContext) {
  // 获取当前请求的 Store 实例
  const store = (req as any).getStore();
  
  if (store) {
    // 设置状态
    store.setState({ user: { id: 1, name: 'John' } });
    
    // 获取状态
    const state = store.getState();
    return { user: state.user };
  }
  
  return {};
}
```

#### Store API

**方法说明：**

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `getState()` | - | `T` | 获取当前状态 |
| `setState(updater)` | `Partial<T> \| ((prev: T) => Partial<T>)` | `void` | 设置状态，支持对象或函数式更新 |
| `subscribe(listener)` | `(state: T) => void` | `() => void` | 订阅状态变化，返回取消订阅函数 |
| `unsubscribe(listener)` | `(state: T) => void` | `void` | 取消订阅 |
| `reset()` | - | `void` | 重置状态到初始值 |

**完整示例：**

```typescript
import { useState, useEffect } from 'preact/hooks';
import type { PageProps } from '@dreamer/dweb';

export default function Counter({ store }: PageProps) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!store) return;
    
    // 初始化：从 Store 获取状态
    const state = store.getState();
    setCount(state.count || 0);
    
    // 订阅状态变化
    const unsubscribe = store.subscribe((newState) => {
      setCount(newState.count || 0);
    });
    
    return () => {
      unsubscribe();
    };
  }, [store]);
  
  const handleIncrement = () => {
    if (!store) return;
    // 使用函数式更新
    store.setState((prev: any) => ({ count: (prev.count || 0) + 1 }));
  };
  
  const handleReset = () => {
    if (!store) return;
    store.reset();
  };
  
  return (
    <div>
      <p>Count: {count}</p>
      <button type="button" onClick={handleIncrement}>增加</button>
      <button type="button" onClick={handleReset}>重置</button>
    </div>
  );
}
```

**注意事项：**

1. **服务端 Store**：每个请求都有独立的 Store 实例，不会在请求之间共享状态
2. **客户端 Store**：全局共享一个 Store 实例，所有组件共享同一份状态
3. **持久化**：启用 `persist` 后，状态会自动保存到 localStorage，页面刷新后会自动恢复
4. **类型安全**：建议为 Store 状态定义 TypeScript 类型，以获得更好的类型提示

### theme - 主题切换

```typescript
import { theme } from "@dreamer/dweb/plugins";

app.plugin(theme({
  config: {
    defaultTheme: "light", // 'light' | 'dark'（暂时移除 'auto' 选项）
    storageKey: "theme", // localStorage 键名
    injectDataAttribute: true, // 是否在 HTML 上添加 data-theme 属性
    injectBodyClass: true, // 是否添加类名到 body
    transition: true, // 主题切换动画
  },
}));
```

#### 响应式主题 Store

主题插件提供了一个响应式的主题 store，可以在任何地方订阅主题变化，特别适合与 Chart.js 等图表库集成。

**基本用法：**

```typescript
// 获取当前主题
const currentTheme = window.__THEME_STORE__.value; // 'light' 或 'dark'

// 订阅主题变化
const unsubscribe = window.__THEME_STORE__.subscribe((theme) => {
  console.log('主题已切换为:', theme);
  // 更新图表主题
  if (chart) {
    chart.options.plugins.legend.labels.color = theme === 'dark' ? '#fff' : '#000';
    chart.update();
  }
});

// 取消订阅
unsubscribe();
```

**在 Chart.js 中使用：**

```typescript
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// 创建图表
const ctx = document.getElementById('myChart');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [{
      label: 'Sales',
      data: [10, 20, 30],
    }],
  },
  options: {
    plugins: {
      legend: {
        labels: {
          color: window.__THEME_STORE__.value === 'dark' ? '#fff' : '#000',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: window.__THEME_STORE__.value === 'dark' ? '#fff' : '#000',
        },
        grid: {
          color: window.__THEME_STORE__.value === 'dark' ? '#333' : '#ddd',
        },
      },
      y: {
        ticks: {
          color: window.__THEME_STORE__.value === 'dark' ? '#fff' : '#000',
        },
        grid: {
          color: window.__THEME_STORE__.value === 'dark' ? '#333' : '#ddd',
        },
      },
    },
  },
});

// 订阅主题变化，自动更新图表
window.__THEME_STORE__.subscribe((theme) => {
  chart.options.plugins.legend.labels.color = theme === 'dark' ? '#fff' : '#000';
  chart.options.scales.x.ticks.color = theme === 'dark' ? '#fff' : '#000';
  chart.options.scales.x.grid.color = theme === 'dark' ? '#333' : '#ddd';
  chart.options.scales.y.ticks.color = theme === 'dark' ? '#fff' : '#000';
  chart.options.scales.y.grid.color = theme === 'dark' ? '#333' : '#ddd';
  chart.update();
});
```

**全局 API：**

```typescript
// 设置主题
window.setTheme('dark'); // 'light' | 'dark' | 'auto'

// 获取当前主题
window.getTheme(); // 'light' | 'dark' | 'auto'

// 获取实际主题（处理 'auto' 模式）
window.getActualTheme(); // 'light' | 'dark'

// 切换主题（在 dark 和 light 之间切换，不包含 auto）
window.toggleTheme(); // 'light' | 'dark'

// 切换到指定主题
window.switchTheme('dark'); // 'light' | 'dark' | 'auto'

// 访问主题管理器
window.__THEME_MANAGER__;

// 访问响应式主题 store
window.__THEME_STORE__;
```

## 创建自定义插件

```typescript
import type { Plugin } from "@dreamer/dweb/core/plugin";

const myPlugin: Plugin = {
  name: "my-plugin",
  version: "1.0.0",
  setup(app) {
    // 插件初始化
    console.log("Plugin initialized");

    // 添加中间件
    app.use((req, res, next) => {
      // 自定义逻辑
      next();
    });
  },
  teardown(app) {
    // 插件清理
    console.log("Plugin teardown");
  },
};

usePlugin(myPlugin);
```

## API 参考

### Plugin 接口

```typescript
interface Plugin {
  name: string;
  version?: string;
  setup: (app: AppLike) => void | Promise<void>;
  teardown?: (app: AppLike) => void | Promise<void>;
}
```

### 使用插件

```typescript
import { usePlugin } from "@dreamer/dweb/core/plugin";

usePlugin(plugin);
```

---

## 📚 相关文档

### 核心文档

- [文档总览](./README.md)
- [核心模块](./core.md)
- [配置文档](./configuration.md)
- [开发指南](./development.md)

### 功能模块

- [数据库](./database.md)
- [GraphQL](./graphql.md)
- [WebSocket](./websocket.md)
- [Session](./session.md)
- [Cookie](./cookie.md)
- [Logger](./logger.md)

### 扩展模块

- [中间件](./middleware.md)
- [插件](./plugins.md)

### 部署与运维

- [Docker 部署](./docker.md)
