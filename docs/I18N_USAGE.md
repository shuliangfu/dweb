# i18n 插件使用指南

i18n 插件提供了完整的国际化支持，包括自动语言检测、翻译文件管理和在页面中使用翻译函数。

## 安装和配置

### 1. 配置插件

在 `dweb.config.ts` 中配置 i18n 插件：

```typescript
import { i18n } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  plugins: [
    i18n({
      languages: [
        { code: "zh-CN", name: "简体中文", default: true },
        { code: "en", name: "English" },
        { code: "ja", name: "日本語" },
      ],
      translationsDir: "locales", // 翻译文件目录
      defaultLanguage: "zh-CN",
      detection: {
        fromPath: true,      // 从 URL 路径检测（如 /en/page）
        fromQuery: true,     // 从查询参数检测（如 ?lang=en）
        fromCookie: true,    // 从 Cookie 检测
        fromHeader: true,    // 从 Accept-Language 头检测
        cookieName: "lang",  // Cookie 名称
      },
    }),
  ],
};

export default config;
```

### 2. 创建翻译文件

在项目根目录创建 `locales` 目录，然后为每种语言创建 JSON 文件：

**locales/zh-CN.json**:
```json
{
  "你好": "你好",
  "欢迎": "欢迎",
  "common": {
    "title": "我的网站",
    "description": "这是一个很棒的网站"
  },
  "user": {
    "name": "用户名",
    "email": "邮箱",
    "welcome": "欢迎，{name}！"
  }
}
```

**locales/en.json**:
```json
{
  "你好": "Hello",
  "欢迎": "Welcome",
  "common": {
    "title": "My Website",
    "description": "This is a great website"
  },
  "user": {
    "name": "Username",
    "email": "Email",
    "welcome": "Welcome, {name}!"
  }
}
```

**locales/ja.json**:
```json
{
  "你好": "こんにちは",
  "欢迎": "ようこそ",
  "common": {
    "title": "私のウェブサイト",
    "description": "これは素晴らしいウェブサイトです"
  },
  "user": {
    "name": "ユーザー名",
    "email": "メールアドレス",
    "welcome": "ようこそ、{name}さん！"
  }
}
```

## 在页面中使用翻译

### 方式一：使用全局 `$t()` 函数（推荐，服务端和客户端都支持）

在服务端渲染（SSR）和客户端渲染（CSR/Hybrid）中，都可以直接使用全局的 `$t()` 或 `t()` 函数。

**首先，添加类型声明**（只需添加一次）：

```typescript
// types/global.d.ts
declare global {
  var $t: (key: string, params?: Record<string, string>) => string;
  var t: (key: string, params?: Record<string, string>) => string;
}

export {};
```

**然后，在页面组件中直接使用**（不需要 `?.`）：

```tsx
export default function HomePage() {
  return (
    <div>
      <h1>{$t("common.title")}</h1>
      <p>{$t("common.description")}</p>
      <p>{$t("你好")}</p>
      <p>{$t("user.welcome", { name: "张三" })}</p>
    </div>
  );
}
```

或者使用 `t()` 函数（与 `$t()` 完全相同）：

```tsx
export default function HomePage() {
  return (
    <div>
      <h1>{t("common.title")}</h1>
      <p>{t("你好")}</p>
    </div>
  );
}
```

> **注意**：添加类型声明后，TypeScript 会知道这些全局函数存在，可以直接使用而不需要 `?.`。如果没有添加类型声明，可以使用 `(globalThis as any).$t("你好")`，但推荐添加类型声明以获得更好的类型支持。

### 方式二：使用 props 中的 `t` 函数

在页面组件中，`t` 函数也会通过 props 传递。如果已配置 i18n 插件，可以直接使用（不需要 `?.`）：

```tsx
import type { PageProps } from "@dreamer/dweb";

export default function HomePage({ t, lang }: PageProps) {
  // 如果已配置 i18n 插件，t 函数总是存在，可以直接使用
  return (
    <div>
      <h1>{t("common.title")}</h1>
      <p>{t("common.description")}</p>
      <p>{t("你好")}</p>
      <p>{t("user.welcome", { name: "张三" })}</p>
    </div>
  );
}
```

> **注意**：如果项目中没有配置 i18n 插件，`t` 可能是 `undefined`，此时需要使用 `t?.("你好")` 或使用全局 `$t()` 函数。

### 方式三：在 load 函数中使用

在 `load` 函数中，可以通过 `LoadContext` 访问 `t` 函数。如果已配置 i18n 插件，可以直接使用：

```tsx
import type { LoadContext, PageProps } from "@dreamer/dweb";

export async function load({ t, lang }: LoadContext) {
  // 在服务端获取数据时也可以使用翻译
  // 如果已配置 i18n 插件，t 函数总是存在
  const title = t("common.title");
  
  return {
    title,
    lang,
  };
}

export default function AboutPage({ t, data }: PageProps) {
  return (
    <div>
      <h1>{t("common.title")}</h1>
      <p>{data.title}</p>
    </div>
  );
}
```

或者使用全局 `$t()` 函数（推荐，更简洁）：

```tsx
export async function load({ lang }: LoadContext) {
  const title = $t("common.title");
  
  return {
    title,
    lang,
  };
}

export default function AboutPage({ data }: PageProps) {
  return (
    <div>
      <h1>{$t("common.title")}</h1>
      <p>{data.title}</p>
    </div>
  );
}
```

### 方式四：在客户端使用全局函数（CSR/Hybrid 模式）

在客户端渲染的组件中，可以使用全局的 `$t()` 或 `t()` 函数：

```tsx
import { useEffect, useState } from "preact/hooks";

export default function ClientComponent() {
  const [text, setText] = useState("");

  useEffect(() => {
    // 在客户端使用全局翻译函数
    if (typeof window !== "undefined" && (window as any).$t) {
      setText((window as any).$t("你好"));
    }
  }, []);

  return (
    <div>
      <p>{text}</p>
      {/* 或者直接在 JSX 中使用（需要类型断言） */}
      <p>{(window as any).$t?.("欢迎")}</p>
    </div>
  );
}
```

### 方式五：创建自定义 Hook（可选，通常不需要）

如果不想使用全局函数，可以创建一个自定义 Hook。但通常直接使用全局 `$t()` 函数更简单：

```tsx
// hooks/useI18n.ts
import { useState, useEffect } from "preact/hooks";

export function useI18n() {
  const [lang, setLang] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__I18N_DATA__) {
      const i18nData = (window as any).__I18N_DATA__;
      setLang(i18nData.lang);
    }
  }, []);

  return { t: $t, lang }; // 直接返回全局 $t 函数
}

// 在组件中使用
import { useI18n } from "../hooks/useI18n";

export default function MyComponent() {
  const { t, lang } = useI18n();

  return (
    <div>
      <p>{t("你好")}</p>
      <p>{t("user.welcome", { name: "李四" })}</p>
      <p>当前语言: {lang}</p>
    </div>
  );
}
```

> **推荐**：直接使用全局 `$t()` 函数，更简单直接。

## 翻译键的格式

### 简单键
```json
{
  "你好": "Hello"
}
```
使用：`t("你好")`

### 嵌套键
```json
{
  "common": {
    "title": "My Website"
  }
}
```
使用：`t("common.title")`

### 带参数的翻译
```json
{
  "user": {
    "welcome": "Welcome, {name}!"
  }
}
```
使用：`t("user.welcome", { name: "John" })`

## 语言切换

### 通过 URL 路径
访问 `/en/page` 会自动切换到英文。

### 通过查询参数
访问 `/?lang=en` 或 `/?language=en` 会切换到英文。

### 通过 Cookie
设置 `lang` Cookie 为 `en` 会切换到英文。

### 通过 Accept-Language 头
浏览器会自动发送语言偏好，插件会自动检测。

### 在代码中切换语言

```tsx
export default function LanguageSwitcher() {
  const switchLanguage = (lang: string) => {
    // 设置 Cookie
    document.cookie = `lang=${lang}; path=/; max-age=31536000`;
    // 刷新页面
    window.location.reload();
  };

  return (
    <div>
      <button onClick={() => switchLanguage("zh-CN")}>中文</button>
      <button onClick={() => switchLanguage("en")}>English</button>
      <button onClick={() => switchLanguage("ja")}>日本語</button>
    </div>
  );
}
```

## 类型支持

为了获得更好的 TypeScript 类型支持，可以定义翻译键的类型：

```typescript
// types/i18n.ts
export type TranslationKey = 
  | "你好"
  | "欢迎"
  | "common.title"
  | "common.description"
  | "user.name"
  | "user.email"
  | "user.welcome";

// 在组件中使用
import type { TranslationKey } from "../types/i18n";

export default function MyComponent({ t }: PageProps) {
  const title = t("common.title" as TranslationKey);
  return <h1>{title}</h1>;
}
```

## 注意事项

1. **翻译文件路径**：默认在 `locales` 目录，可以通过 `translationsDir` 配置修改。

2. **语言检测优先级**：
   - URL 路径
   - 查询参数
   - Cookie
   - Accept-Language 头
   - 默认语言

3. **客户端翻译**：在 CSR 或 Hybrid 模式下，翻译数据会自动注入到页面中，可以通过 `window.$t()` 或 `window.t()` 访问。

4. **RTL 支持**：如果语言配置了 `rtl: true`，会自动在 `<html>` 标签上添加 `dir="rtl"` 属性。

5. **性能**：翻译文件会在应用启动时预加载，并缓存在内存中，不会影响性能。

## 完整示例

### 使用全局 `$t()` 函数（推荐）

```tsx
// routes/index.tsx
export default function HomePage() {
  return (
    <div>
      <h1>{$t("common.title")}</h1>
      <p>{$t("你好")}</p>
      <p>{$t("user.welcome", { name: "访客" })}</p>
    </div>
  );
}
```

### 使用 props 中的 `t` 函数

```tsx
// routes/index.tsx
import type { PageProps } from "@dreamer/dweb";

export default function HomePage({ t, lang }: PageProps) {
  return (
    <div>
      <h1>{t("common.title")}</h1>
      <p>{t("你好")}</p>
      <p>{t("user.welcome", { name: "访客" })}</p>
      <p>当前语言: {lang}</p>
    </div>
  );
}
```

```json
// locales/zh-CN.json
{
  "你好": "你好",
  "common": {
    "title": "欢迎来到我的网站"
  },
  "user": {
    "welcome": "欢迎，{name}！"
  }
}
```

