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

**基本配置：**

```typescript
import { store } from "@dreamer/dweb/plugins";

app.plugin(store({
  persist: true, // 是否启用持久化（默认 false）
  storageKey: 'dweb-store', // 持久化存储键名（默认 'dweb-store'）
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

**客户端 API（推荐方式）：**

```typescript
import { 
  getStore, 
  getStoreState, 
  setStoreState, 
  subscribeStore,
  resetStore 
} from '@dreamer/dweb/client';

// 方式1：获取 Store 实例（适用于需要多次操作）
const store = getStore();
if (store) {
  const state = store.getState();        // 获取状态
  store.setState({ count: 1 });          // 更新状态
  const unsubscribe = store.subscribe((state) => {
    console.log('状态变化:', state);
  });
  store.reset();                         // 重置状态
}

// 方式2：直接获取状态值（更简洁，适用于只读取一次）
const state = getStoreState<{ count: number }>();
if (state) {
  console.log(state.count);
}

// 方式3：更新状态
setStoreState({ count: 1 });
// 或使用函数式更新
setStoreState((prev) => ({ count: prev.count + 1 }));

// 方式4：订阅状态变化
const unsubscribe = subscribeStore((state) => {
  console.log('状态变化:', state);
});
// 取消订阅
if (unsubscribe) {
  unsubscribe();
}

// 方式5：重置状态
resetStore();
```

**在 React/Preact 组件中使用：**

```typescript
import { useEffect, useState } from 'preact/hooks';
import { getStoreState, setStoreState, subscribeStore } from '@dreamer/dweb/client';

interface NavState {
  currentPath: string;
  navOpen: boolean;
}

export default function Navbar() {
  const [state, setState] = useState<NavState | null>(null);

  useEffect(() => {
    // 初始化状态
    const initialState = getStoreState<NavState>();
    setState(initialState);

    // 订阅状态变化
    const unsubscribe = subscribeStore<NavState>((newState) => {
      setState(newState);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const toggleNav = () => {
    setStoreState<NavState>((prev) => ({
      ...prev,
      navOpen: !prev?.navOpen,
    }));
  };

  return (
    <nav>
      <button onClick={toggleNav}>
        {state?.navOpen ? '关闭' : '打开'}
      </button>
    </nav>
  );
}
```

**服务端使用（在 load 函数中）：**

```typescript
import type { LoadContext } from '@dreamer/dweb';

export async function load({ store }: LoadContext) {
  if (!store) {
    return {};
  }
  
  // 设置状态（这些状态会自动传递到客户端 Store）
  store.setState({ user: { id: 1, name: 'John' } });
  
  // 获取状态
  const state = store.getState();
  return { user: state.user };
}
```

**注意**：在 `load` 函数中设置的状态会自动同步到客户端 Store。服务端 Store 的状态会在响应时注入到客户端 Store 脚本中，客户端 Store 会使用服务端状态初始化（优先级：服务端状态 > localStorage > 初始状态）。

**API 参考：**

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `getStore()` | - | `Store \| null` | 获取 Store 实例，适用于需要多次操作 |
| `getStoreState<T>()` | - | `T \| null` | 直接获取当前状态值，更简洁 |
| `setStoreState<T>(updater)` | `Partial<T> \| ((prev: T) => Partial<T>)` | `void` | 设置状态，支持对象或函数式更新 |
| `subscribeStore<T>(listener)` | `(state: T) => void` | `(() => void) \| null` | 订阅状态变化，返回取消订阅函数 |
| `resetStore()` | - | `void` | 重置状态到初始值 |

**服务端到客户端状态同步：**

在 `load` 函数中设置的状态会自动同步到客户端 Store。工作流程如下：

1. 服务端 `load` 函数中调用 `store.setState()` 设置状态
2. 响应时，服务端 Store 的状态被注入到客户端 Store 脚本中
3. 客户端 Store 初始化时，会合并服务端状态（优先级：服务端状态 > localStorage > 初始状态）
4. 客户端组件可以通过 `getStoreState()` 获取到服务端设置的状态

**示例：**

```typescript
// 服务端 load 函数
export async function load({ store }: LoadContext) {
  if (store) {
    // 设置状态（会自动传递到客户端）
    store.setState({ user: { id: 1, name: 'John' } });
  }
  return {};
}

// 客户端组件
import { getStoreState } from '@dreamer/dweb/client';

export default function MyPage() {
  useEffect(() => {
    // 可以直接获取到服务端设置的状态
    const state = getStoreState<{ user: { id: number; name: string } }>();
    console.log(state?.user); // { id: 1, name: 'John' }
  }, []);
  
  return <div>...</div>;
}
```

**注意事项：**

1. **服务端 Store**：每个请求都有独立的 Store 实例，不会在请求之间共享状态
2. **客户端 Store**：全局共享一个 Store 实例，所有组件共享同一份状态
3. **状态同步**：服务端 Store 的状态会在响应时自动注入到客户端 Store，客户端 Store 初始化时会合并服务端状态
4. **状态优先级**：服务端状态 > localStorage > 初始状态
5. **持久化**：启用 `persist` 后，状态会自动保存到 localStorage，页面刷新后会自动恢复
6. **类型安全**：建议为 Store 状态定义 TypeScript 类型，以获得更好的类型提示
7. **客户端 API**：所有客户端 API 函数在服务端渲染时返回 `null`，不会报错
8. **导入路径**：客户端 API 需要从 `@dreamer/dweb/client` 导入，而不是从 `@dreamer/dweb`

### theme - 主题切换

主题插件提供主题切换功能，支持亮色、暗色和自动模式（跟随系统主题）。插件会自动在 HTML 元素上添加相应的 class，方便与 Tailwind CSS 的 dark mode 配合使用。

**基本配置：**

```typescript
import { theme } from "@dreamer/dweb/plugins";

app.plugin(theme({
  defaultTheme: "light", // 'light' | 'dark' | 'auto'（默认 'auto'）
  storageKey: "theme", // localStorage 键名（默认 'theme'）
  injectDataAttribute: true, // 是否在 HTML 上添加 data-theme 属性（默认 true）
  injectBodyClass: true, // 是否添加类名到 body（默认 true）
  transition: true, // 主题切换动画（默认 true）
  injectScript: true, // 是否注入客户端脚本（默认 true）
}));
```

**配置选项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `defaultTheme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | 默认主题，`'auto'` 会跟随系统主题 |
| `storageKey` | `string` | `'theme'` | localStorage 存储键名 |
| `injectDataAttribute` | `boolean` | `true` | 是否在 HTML 元素上添加 `data-theme` 属性 |
| `injectBodyClass` | `boolean` | `true` | 是否在 body 元素上添加主题类名 |
| `transition` | `boolean` | `true` | 是否启用主题切换过渡动画 |
| `injectScript` | `boolean` | `true` | 是否注入客户端脚本 |

**客户端 API（推荐方式）：**

```typescript
import { 
  getTheme, 
  getActualTheme, 
  setTheme, 
  toggleTheme,
  switchTheme,
  subscribeTheme,
  getThemeValue
} from '@dreamer/dweb/client';

// 获取当前主题
const theme = getTheme(); // 'light' | 'dark' | 'auto' | null

// 获取实际主题（处理 auto 模式）
const actualTheme = getActualTheme(); // 'light' | 'dark' | null

// 设置主题
setTheme('dark');
setTheme('light');
setTheme('auto'); // 自动跟随系统主题

// 切换主题（在 dark 和 light 之间切换）
const newTheme = toggleTheme(); // 'dark' | 'light' | null

// 切换到指定主题
const switchedTheme = switchTheme('dark'); // 'light' | 'dark' | 'auto' | null

// 订阅主题变化
const unsubscribe = subscribeTheme((actualTheme) => {
  console.log('主题变化:', actualTheme); // 'light' | 'dark'
});
// 取消订阅
if (unsubscribe) {
  unsubscribe();
}

// 获取当前主题值（从 Store 中获取）
const currentValue = getThemeValue(); // 'light' | 'dark' | null
```

**在 React/Preact 组件中使用：**

```typescript
import { useEffect, useState } from 'preact/hooks';
import { getActualTheme, toggleTheme, subscribeTheme } from '@dreamer/dweb/client';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    // 初始化主题
    const initialTheme = getActualTheme();
    setTheme(initialTheme);

    // 订阅主题变化
    const unsubscribe = subscribeTheme((newTheme) => {
      setTheme(newTheme);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleToggle = () => {
    toggleTheme();
  };

  return (
    <button onClick={handleToggle}>
      当前主题: {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
```

**在 Chart.js 中使用：**

```typescript
import { Chart, registerables } from 'chart.js';
import { getActualTheme, subscribeTheme } from '@dreamer/dweb/client';

Chart.register(...registerables);

// 创建图表
const ctx = document.getElementById('myChart');
const currentTheme = getActualTheme();

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
          color: currentTheme === 'dark' ? '#fff' : '#000',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: currentTheme === 'dark' ? '#fff' : '#000',
        },
        grid: {
          color: currentTheme === 'dark' ? '#333' : '#ddd',
        },
      },
      y: {
        ticks: {
          color: currentTheme === 'dark' ? '#fff' : '#000',
        },
        grid: {
          color: currentTheme === 'dark' ? '#333' : '#ddd',
        },
      },
    },
  },
});

// 订阅主题变化，自动更新图表
const unsubscribe = subscribeTheme((theme) => {
  chart.options.plugins.legend.labels.color = theme === 'dark' ? '#fff' : '#000';
  chart.options.scales.x.ticks.color = theme === 'dark' ? '#fff' : '#000';
  chart.options.scales.x.grid.color = theme === 'dark' ? '#333' : '#ddd';
  chart.options.scales.y.ticks.color = theme === 'dark' ? '#fff' : '#000';
  chart.options.scales.y.grid.color = theme === 'dark' ? '#333' : '#ddd';
  chart.update();
});
```

**与 Tailwind CSS 配合使用：**

主题插件会自动在 HTML 元素上添加 `dark` 或 `light` class，配合 Tailwind CSS v4 的 dark mode 使用：

```css
/* Tailwind CSS v4 配置 */
@custom-variant dark (&:is(.dark *));

/* 使用示例 */
<div className="bg-white dark:bg-gray-800 text-black dark:text-white">
  内容
</div>
```

**特性：**

- ✅ 三种模式：支持亮色（light）、暗色（dark）和自动（auto）模式
- ✅ 自动检测：auto 模式会自动检测系统主题偏好
- ✅ 持久化存储：主题设置会保存到 localStorage
- ✅ Tailwind CSS 集成：自动在 HTML 元素上添加 `dark` 或 `light` class
- ✅ 过渡动画：支持主题切换时的平滑过渡效果
- ✅ 响应式更新：支持订阅主题变化，实时响应主题切换

**注意事项：**

- 所有客户端 API 函数在服务端渲染时返回 `null`，不会报错
- 主题设置会保存到 localStorage，仅在浏览器环境中可用
- 建议在组件卸载时取消订阅，避免内存泄漏
- 客户端 API 需要从 `@dreamer/dweb/client` 导入，而不是从 `@dreamer/dweb`
- `getTheme()` 返回用户设置的主题（可能是 `'auto'`），而 `getActualTheme()` 返回实际应用的主题（`'light'` 或 `'dark'`）

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
