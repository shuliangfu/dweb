# 客户端 API 文档

本文档详细说明 `@dreamer/dweb/client` 模块导出的所有客户端 API。

## 目录

- [通用常量](#通用常量)
- [Store 状态管理](#store-状态管理)
- [主题管理](#主题管理)
- [国际化 (i18n)](#国际化-i18n)
- [路由工具](#路由工具)
- [类型定义](#类型定义)

---

## 通用常量

### `IS_CLIENT`

标识当前代码是否在客户端环境运行。

**类型**: `boolean`

**说明**: 在浏览器环境中为 `true`，在服务端环境中为 `false`。

**示例**:
```typescript
import { IS_CLIENT } from "@dreamer/dweb/client";

if (IS_CLIENT) {
  // 仅在客户端执行的代码
  console.log("运行在浏览器中");
}
```

### `IS_SERVER`

标识当前代码是否在服务端环境运行。

**类型**: `boolean`

**说明**: 在服务端环境中为 `true`，在浏览器环境中为 `false`。

**示例**:
```typescript
import { IS_SERVER } from "@dreamer/dweb/client";

if (IS_SERVER) {
  // 仅在服务端执行的代码
  console.log("运行在服务端");
}
```

---

## Store 状态管理

### `getStore()`

获取全局 Store 实例。

**返回值**: `Store | null`

- 在客户端环境返回 Store 实例
- 在服务端环境返回 `null`

**示例**:
```typescript
import { getStore } from "@dreamer/dweb/client";

const store = getStore();
if (store) {
  const state = store.getState();
  console.log("当前状态:", state);
}
```

### `getStoreState<T>()`

获取当前 Store 状态。

**泛型参数**:
- `T`: 状态类型（默认为 `Record<string, unknown>`）

**返回值**: `T | null`

**示例**:
```typescript
import { getStoreState } from "@dreamer/dweb/client";

interface AppState {
  user: { name: string; age: number };
  count: number;
}

const state = getStoreState<AppState>();
if (state) {
  console.log("用户名:", state.user.name);
  console.log("计数:", state.count);
}
```

### `setStoreState<T>(updater)`

更新 Store 状态。

**参数**:
- `updater`: `Partial<T> | ((prev: T) => Partial<T>)` - 状态更新函数或新状态对象

**示例**:
```typescript
import { setStoreState } from "@dreamer/dweb/client";

// 方式1：直接传入新状态对象
setStoreState({ count: 10 });

// 方式2：使用函数更新
setStoreState((prev) => ({
  ...prev,
  count: prev.count + 1,
}));
```

### `subscribeStore<T>(listener)`

订阅 Store 状态变化。

**参数**:
- `listener`: `(state: T) => void` - 状态变化监听器函数

**返回值**: `(() => void) | null` - 取消订阅函数，如果订阅失败返回 `null`

**示例**:
```typescript
import { subscribeStore } from "@dreamer/dweb/client";

const unsubscribe = subscribeStore((state) => {
  console.log("状态已更新:", state);
});

// 取消订阅
if (unsubscribe) {
  unsubscribe();
}
```

### `resetStore()`

重置 Store 状态为初始值。

**示例**:
```typescript
import { resetStore } from "@dreamer/dweb/client";

// 重置所有状态
resetStore();
```

### `defineStore(name, options)`

声明式定义 Store（Options API）。

**参数**:
- `name`: `string` - Store 名称
- `options`: Store 配置对象

**返回值**: `StoreInstance<T>`

**示例**:
```typescript
import { defineStore } from "@dreamer/dweb/client";

export const counterStore = defineStore("counter", {
  state: () => ({
    count: 0,
    message: "",
  }),
  actions: {
    increment() {
      this.count++;
    },
    decrement() {
      this.count--;
    },
  },
});

// 使用
counterStore.increment();
console.log(counterStore.count);
```

### `getStoreInitialState()`

获取所有已注册 Store 的初始状态。

**返回值**: `Record<string, unknown>`

**说明**: 用于服务端渲染时获取初始状态，以便在客户端进行状态同步。

### `storeAction(fn)`

定义 Store Action 的装饰器。

**参数**:
- `fn`: `Function` - Action 函数

**返回值**: 装饰后的函数

**示例**:
```typescript
import { storeAction } from "@dreamer/dweb/client";

const increment = storeAction(function() {
  this.count++;
});
```

### `useStore(store)`

在组件中响应式使用 Store（Hook）。

**参数**:
- `store`: `StoreInstance<T>` - Store 实例

**返回值**: `StoreInstance<T> & T`

**说明**: 仅在客户端可用，返回响应式的 Store 实例。

**示例**:
```typescript
import { useStore } from "@dreamer/dweb/client";
import { counterStore } from "../stores/counter.ts";

function CounterComponent() {
  const store = useStore(counterStore);
  
  // store 是响应式的，状态变化会自动触发组件更新
  return <div>{store.count}</div>;
}
```

---

## 主题管理

### `getThemeManager()`

获取主题管理器实例。

**返回值**: `ThemeManager | null`

**示例**:
```typescript
import { getThemeManager } from "@dreamer/dweb/client";

const manager = getThemeManager();
if (manager) {
  const currentTheme = manager.getTheme();
  console.log("当前主题:", currentTheme);
}
```

### `getThemeStore()`

获取主题 Store 实例。

**返回值**: `StoreInstance<ThemeStoreState> & ThemeStoreState | null`

**示例**:
```typescript
import { getThemeStore } from "@dreamer/dweb/client";

const themeStore = getThemeStore();
if (themeStore) {
  console.log("主题值:", themeStore.value);
  console.log("主题模式:", themeStore.mode);
}
```

### `getTheme()`

获取当前主题模式。

**返回值**: `"light" | "dark" | "auto" | null`

**示例**:
```typescript
import { getTheme } from "@dreamer/dweb/client";

const theme = getTheme();
console.log("当前主题模式:", theme); // 'light' | 'dark' | 'auto'
```

### `getActualTheme()`

获取实际主题（处理 `auto` 模式）。

**返回值**: `"light" | "dark" | null`

**说明**: 如果主题模式为 `auto`，会根据系统主题返回 `light` 或 `dark`。

**示例**:
```typescript
import { getActualTheme } from "@dreamer/dweb/client";

const actualTheme = getActualTheme();
console.log("实际主题:", actualTheme); // 'light' 或 'dark'
```

### `getThemeMode()`

获取当前主题模式（从 Store 中获取）。

**返回值**: `"light" | "dark" | "auto" | null`

**示例**:
```typescript
import { getThemeMode } from "@dreamer/dweb/client";

const mode = getThemeMode();
console.log("主题模式:", mode);
```

### `getThemeValue()`

获取当前主题值（从 Store 中获取）。

**返回值**: `"light" | "dark" | null`

**示例**:
```typescript
import { getThemeValue } from "@dreamer/dweb/client";

const value = getThemeValue();
console.log("主题值:", value);
```

### `setTheme(theme)`

设置主题。

**参数**:
- `theme`: `"light" | "dark" | "auto"` - 主题模式

**示例**:
```typescript
import { setTheme } from "@dreamer/dweb/client";

// 设置为深色主题
setTheme("dark");

// 设置为浅色主题
setTheme("light");

// 设置为自动（跟随系统）
setTheme("auto");
```

### `toggleTheme()`

切换主题（在 `dark` 和 `light` 之间切换）。

**返回值**: `"dark" | "light" | null`

**示例**:
```typescript
import { toggleTheme } from "@dreamer/dweb/client";

// 切换主题
const newTheme = toggleTheme();
console.log("新主题:", newTheme);
```

### `switchTheme(theme)`

切换到指定主题。

**参数**:
- `theme`: `"light" | "dark" | "auto"` - 目标主题

**返回值**: `"light" | "dark" | "auto" | null`

**示例**:
```typescript
import { switchTheme } from "@dreamer/dweb/client";

const newTheme = switchTheme("dark");
console.log("切换后的主题:", newTheme);
```

### `subscribeTheme(listener)`

订阅主题变化。

**参数**:
- `listener`: `(theme: "light" | "dark") => void` - 主题变化监听器

**返回值**: `(() => void) | null` - 取消订阅函数

**示例**:
```typescript
import { subscribeTheme } from "@dreamer/dweb/client";

const unsubscribe = subscribeTheme((theme) => {
  console.log("主题已切换为:", theme);
});

// 取消订阅
if (unsubscribe) {
  unsubscribe();
}
```

### `themeStore`

主题 Store 实例（使用 `defineStore` 定义）。

**类型**: `StoreInstance<ThemeStoreState> & ThemeStoreState`

**示例**:
```typescript
import { themeStore } from "@dreamer/dweb/client";

// 直接访问状态
console.log(themeStore.value); // 'light' | 'dark'
console.log(themeStore.mode); // 'light' | 'dark' | 'auto'

// 更新状态
themeStore.setValue("dark");

// 订阅变化
themeStore.$subscribe((state) => {
  console.log("主题状态变化:", state);
});
```

### `useThemeStore()`

在组件中响应式使用主题 Store（Hook）。

**返回值**: `StoreInstance<ThemeStoreState> & ThemeStoreState`

**示例**:
```typescript
import { useThemeStore } from "@dreamer/dweb/client";

function ThemeToggle() {
  const theme = useThemeStore();
  
  return (
    <button onClick={() => theme.setValue(theme.value === "light" ? "dark" : "light")}>
      当前主题: {theme.value}
    </button>
  );
}
```

---

## 国际化 (i18n)

### `getI18n()`

获取 i18n 数据对象。

**返回值**: `I18nData | null`

**I18nData 接口**:
```typescript
interface I18nData {
  lang: string; // 当前语言代码
  translations: Record<string, unknown>; // 翻译数据
  t: (key: string, params?: Record<string, any>) => string; // 翻译函数
}
```

**示例**:
```typescript
import { getI18n } from "@dreamer/dweb/client";

const i18n = getI18n();
if (i18n) {
  console.log("当前语言:", i18n.lang);
  const text = i18n.t("common.welcome", { name: "John" });
  console.log(text);
}
```

### `getCurrentLanguage()`

获取当前语言代码。

**返回值**: `string | null`

**示例**:
```typescript
import { getCurrentLanguage } from "@dreamer/dweb/client";

const lang = getCurrentLanguage();
console.log("当前语言:", lang); // 'zh-CN' | 'en-US' 等
```

### `setCurrentLanguage(langCode)`

设置当前语言。

**参数**:
- `langCode`: `string` - 语言代码（如 `'zh-CN'`, `'en-US'`）

**返回值**: `Promise<void>`

**说明**: 会通过 API 重新加载对应语言的语言包，并更新全局 i18n 数据。

**示例**:
```typescript
import { setCurrentLanguage } from "@dreamer/dweb/client";

// 切换到英文
await setCurrentLanguage("en-US");

// 切换到中文
await setCurrentLanguage("zh-CN");
```

### `translate(key, params?)`

翻译函数。

**参数**:
- `key`: `string` - 翻译键（支持嵌套键，如 `'common.title'`）
- `params?`: `Record<string, any>` - 参数对象（可选，用于替换翻译文本中的占位符）

**返回值**: `string` - 翻译后的文本，如果未找到则返回 key 本身

**示例**:
```typescript
import { translate } from "@dreamer/dweb/client";

// 简单翻译
const title = translate("common.title");

// 带参数的翻译
const welcome = translate("common.welcome", { name: "John" });
// 假设翻译文本为 "欢迎, {name}!"，结果将是 "欢迎, John!"
```

### `getTranslations()`

获取当前语言的翻译数据。

**返回值**: `Record<string, unknown> | null`

**示例**:
```typescript
import { getTranslations } from "@dreamer/dweb/client";

const translations = getTranslations();
if (translations) {
  console.log("所有翻译数据:", translations);
}
```

### `isI18nInitialized()`

检查 i18n 是否已初始化。

**返回值**: `boolean`

**示例**:
```typescript
import { isI18nInitialized } from "@dreamer/dweb/client";

if (isI18nInitialized()) {
  console.log("i18n 已初始化");
} else {
  console.log("i18n 未初始化");
}
```

---

## 路由工具

### `route(path, replace?)`

路由导航函数。

**参数**:
- `path`: `string | { path: string; params?: Record<string, string | number | boolean> }` - 目标路径
  - 字符串形式：直接路径或带查询参数的路径
  - 对象形式：包含 `path` 和 `params` 的对象
- `replace?`: `boolean` - 是否替换当前历史记录（默认 `false`，使用 `pushState`）

**返回值**: `boolean` - 如果导航成功返回 `true`，否则返回 `false`

**说明**: 
- 优先使用框架的 SPA 导航函数（无刷新切换）
- 如果框架导航函数不可用，回退到整页跳转

**示例**:
```typescript
import { route } from "@dreamer/dweb/client";

// 基本用法
route("/docs");

// 带查询参数（字符串形式）
route("/docs?page=1&sort=name");

// 使用对象形式传递参数
route({ 
  path: "/docs", 
  params: { page: 1, sort: "name" } 
});

// 替换当前历史记录
route("/docs", true);
```

### `getCurrentPath()`

获取当前路由路径。

**返回值**: `string` - 当前路径（不包含查询参数和哈希）

**示例**:
```typescript
import { getCurrentPath } from "@dreamer/dweb/client";

const path = getCurrentPath();
console.log("当前路径:", path); // '/docs' | '/about' 等
```

### `getQueryParams()`

获取当前路由的查询参数。

**返回值**: `Record<string, string>` - 查询参数对象

**示例**:
```typescript
import { getQueryParams } from "@dreamer/dweb/client";

// 假设当前 URL 为 /docs?page=1&sort=name
const params = getQueryParams();
console.log(params); // { page: "1", sort: "name" }
```

### `getCurrentUrl()`

获取当前路由的完整 URL。

**返回值**: `string` - 完整的 URL 字符串

**示例**:
```typescript
import { getCurrentUrl } from "@dreamer/dweb/client";

const url = getCurrentUrl();
console.log("当前 URL:", url); // 'https://example.com/docs?page=1#section'
```

### `routeTo(path, replace?)`

路由导航函数（`routeTo` 是 `route` 的别名）。

提供与 `route` 方法相同的功能，用于更语义化的方法命名。

**参数**:
- `path`: `string | { path: string; params?: Record<string, string | number | boolean> }` - 目标路径
  - 字符串形式：直接路径或带查询参数的路径
  - 对象形式：包含 `path` 和 `params` 的对象
- `replace?`: `boolean` - 是否替换当前历史记录（默认 `false`，使用 `pushState`）

**返回值**: `boolean` - 如果导航成功返回 `true`，否则返回 `false`

**说明**: 
- 优先使用框架的 SPA 导航函数（无刷新切换）
- 如果框架导航函数不可用，回退到整页跳转
- 功能与 `route` 方法完全相同

**示例**:
```typescript
import { routeTo } from "@dreamer/dweb/client";

// 基本用法
routeTo("/docs");

// 带查询参数（字符串形式）
routeTo("/docs?page=1&sort=name");

// 使用对象形式传递参数
routeTo({ 
  path: "/docs", 
  params: { page: 1, sort: "name" } 
});

// 替换当前历史记录
routeTo("/docs", true);
```

### `goBack(steps?)`

返回上一页，使用浏览器的历史记录 API 返回到上一个页面。

**参数**:
- `steps?`: `number` - 返回的步数，默认为 `1`（返回上一页）。可以传入负数表示前进

**返回值**: `boolean` - 如果成功返回 `true`，否则返回 `false`

**说明**:
- 使用浏览器的 `history.go()` API 进行导航
- 正数表示后退，负数表示前进
- 如果浏览器不支持 history API 或没有历史记录，返回 `false`

**示例**:
```typescript
import { goBack } from "@dreamer/dweb/client";

// 返回上一页
goBack();

// 返回上两页
goBack(2);

// 前进一页（如果历史记录中有）
goBack(-1);
```

---

## 类型定义

以下类型定义仅用于 TypeScript 类型检查，不会在运行时导入任何代码。

### `ComponentChild`

组件子元素类型。

### `ComponentChildren`

组件子元素集合类型。

### `CookieOptions`

Cookie 选项类型。

### `LayoutProps`

布局组件 Props 类型。

### `LoadContext`

页面/布局 `load` 函数的上下文类型。

### `PageProps`

页面组件 Props 类型。

### `Request`

请求对象类型。

### `Response`

响应对象类型。

### `Session`

会话对象类型。

### `Store`

Store 接口类型。

### `StorePluginOptions`

Store 插件选项类型。

### `StoreInstance<T>`

Store 实例类型。

### `StoreOptions`

Store 选项类型。

### `ThemeStoreState`

主题 Store 状态类型。

---

## 完整示例

### 在组件中使用多个 API

```typescript
import { 
  route, 
  getCurrentPath, 
  getQueryParams,
  useThemeStore,
  translate,
  useStore 
} from "@dreamer/dweb/client";
import { counterStore } from "../stores/counter.ts";
import { useEffect } from "preact/hooks";

export default function ExamplePage() {
  const theme = useThemeStore();
  const counter = useStore(counterStore);
  const currentPath = getCurrentPath();
  const queryParams = getQueryParams();

  useEffect(() => {
    console.log("当前路径:", currentPath);
    console.log("查询参数:", queryParams);
  }, []);

  const handleNavigate = () => {
    route({ 
      path: "/docs", 
      params: { page: 1, section: "api" } 
    });
  };

  return (
    <div>
      <h1>{translate("page.title")}</h1>
      <p>当前主题: {theme.value}</p>
      <p>计数: {counter.count}</p>
      <button onClick={handleNavigate}>跳转到文档</button>
    </div>
  );
}
```

---

## 注意事项

1. **客户端环境检查**: 所有客户端 API 在服务端环境中会返回 `null` 或执行空操作，这是正常行为。

2. **类型安全**: 使用 TypeScript 时，建议为 Store 状态定义明确的类型，以获得更好的类型提示。

3. **响应式更新**: 使用 `useStore` 和 `useThemeStore` Hook 时，状态变化会自动触发组件重新渲染。

4. **路由导航**: `route` 函数优先使用框架的 SPA 导航，如果不可用会回退到整页跳转。

5. **i18n 初始化**: 使用 i18n 相关 API 前，确保 i18n 插件已正确初始化。

---

## 相关文档

- [Store 插件文档](./plugins/store.md)
- [主题插件文档](./plugins/theme.md)
- [i18n 插件文档](./plugins/i18n.md)
- [路由约定文档](./routing-conventions.md)
