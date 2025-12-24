# 在 Model 中使用 i18n

本文档说明如何在 Model（数据库模型）中使用 i18n 翻译功能。

## 概述

在 Model 中使用 i18n 有几种方式：

1. **直接使用 `$t()`**（最推荐）- 无需导入，全局可用
2. **使用 `getI18n()` 函数** - 在请求上下文中自动使用当前语言
3. **通过参数传递** - 在 load 函数中获取 `t` 函数，然后传递给 Model 方法

### 在页面组件中使用

```typescript
// routes/index.tsx
export default function HomePage({}: PageProps) {
  // 直接使用全局 $t() 方法
  return (
    <div>
      <h1>{$t("common.welcome")}</h1>
      <p>{$t("common.greeting", { name: "John" })}</p>
    </div>
  );
}
```

### 在 load 函数中使用

```typescript
// routes/index.tsx
export async function load({}: LoadContext) {
  // 直接使用全局 $t() 方法
  const message = $t("common.welcome");
  return { message };
}

export default function HomePage({ data }: PageProps) {
  return <div>{data.message}</div>;
}
```

### 在 Model 中使用

## 方式 1：直接使用 `$t()`（最推荐）

**无需导入，全局可用！** 这是最简单的方式。

### 基本用法

```typescript
// models/User.ts
import { getDatabase, SQLModel } from "@dreamer/dweb/features/database";

class User extends SQLModel {
  static tableName = "users";
  static primaryKey = "id";

  static schema = {
    username: {
      type: "string",
      validate: {
        required: true,
        min: 2,
        max: 50,
        custom: (value: string) => {
          // 直接使用 $t()，无需导入！
          if (value.toLowerCase() === "admin") {
            throw new Error($t("validation.username.notAdmin"));
          }
        },
      },
    },

    email: {
      type: "string",
      validate: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        custom: async (value: string) => {
          // 直接使用 $t()，无需导入！
          const existing = await User.findOne({ email: value });
          if (existing) {
            throw new Error($t("validation.email.exists"));
          }
        },
      },
    },
  };

  // 生命周期钩子中使用
  static async beforeCreate(instance: User) {
    // 直接使用 $t()，无需导入！
    if (instance.age && instance.age < 13) {
      throw new Error($t("validation.age.min", { min: "13" }));
    }
  }

  // 实例方法中使用
  async updateLastLogin() {
    // 直接使用 $t()，无需导入！
    console.log($t("user.lastLoginUpdated"));
    await this.update({ lastLoginAt: new Date() });
  }
}

// 初始化
const db = await getDatabase();
User.setAdapter(db);

export default User;
```

### 工作原理

- **服务端**：`$t()` 在 `globalThis` 上可用
- **客户端**：`$t()` 在 `window` 上可用
- **自动语言切换**：在请求处理时，会自动使用当前请求的语言
- **默认语言**：在非请求上下文中，使用默认语言

### TypeScript 类型支持

为了在 TypeScript 中使用 `$t()` 而不报错，需要引用全局类型声明文件：

**方法 1：在项目根目录创建 `i18n-global.d.ts`**

将 `example/i18n-global.d.ts` 复制到项目根目录，TypeScript 会自动识别。

**方法 2：在 `deno.json` 中引用**

```json
{
  "compilerOptions": {
    "types": ["./i18n-global.d.ts"]
  }
}
```

**方法 3：在文件中使用三斜杠指令**

```typescript
/// <reference path="./i18n-global.d.ts" />

export default function HomePage() {
  return <div>{$t('common.welcome')}</div>;
}
```

### 注意事项

- `$t()` 始终可用：如果 i18n 插件未初始化，会返回 key 本身（不会报错）
- 在 TypeScript 中，需要引用全局类型声明文件才能获得类型支持
- 运行时功能不需要类型声明文件，类型声明仅用于 TypeScript 类型检查
- 在请求上下文中，会自动使用当前请求的语言
- 在非请求上下文中（如后台任务），使用默认语言

## 方式 2：使用 `getI18n()` 函数（备选方案）

`getI18n()` 函数类似于 `getDatabase()`，可以在任何地方使用，包括 Model
的生命周期钩子、验证函数等。

### 基本用法

```typescript
// models/User.ts
import { getDatabase, SQLModel } from "@dreamer/dweb/features/database";
import { getI18n } from "@dreamer/dweb/plugins";

class User extends SQLModel {
  static tableName = "users";
  static primaryKey = "id";

  static schema = {
    username: {
      type: "string",
      validate: {
        required: true,
        min: 2,
        max: 50,
        custom: (value: string) => {
          // 使用 getI18n() 获取翻译函数
          const t = getI18n();

          if (value.toLowerCase() === "admin") {
            // 使用翻译函数
            throw new Error(t("validation.username.notAdmin"));
          }
        },
      },
    },

    email: {
      type: "string",
      validate: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        custom: async (value: string) => {
          const t = getI18n();
          const existing = await User.findOne({ email: value });
          if (existing) {
            throw new Error(t("validation.email.exists"));
          }
        },
      },
    },
  };

  // 生命周期钩子中使用
  static async beforeCreate(instance: User) {
    const t = getI18n();

    // 使用翻译函数
    if (instance.age && instance.age < 13) {
      throw new Error(t("validation.age.min", { min: "13" }));
    }
  }

  // 实例方法中使用
  async updateLastLogin() {
    const t = getI18n();
    console.log(t("user.lastLoginUpdated"));
    await this.update({ lastLoginAt: new Date() });
  }
}

// 初始化
const db = await getDatabase();
User.setAdapter(db);

export default User;
```

### 指定语言

如果需要使用特定语言（而不是当前请求的语言），可以传递语言代码：

```typescript
const t = getI18n("zh-CN"); // 使用中文
const message = t("validation.required");
```

## 方式 3：通过参数传递（最灵活）

在 `load` 函数中获取 `t` 函数，然后传递给 Model 方法：

```typescript
// routes/users/[id].tsx
import type { LoadContext, PageProps } from "@dreamer/dweb";
import User from "../../models/User.ts";

export async function load({ params, t }: LoadContext) {
  // 将 t 函数传递给 Model 方法
  const user = await User.findById(params.id, { t });

  return {
    user,
  };
}

export default function UserPage({ data }: PageProps) {
  const { user } = data as { user: User };
  return <div>{user.name}</div>;
}
```

然后在 Model 中接收并使用：

```typescript
// models/User.ts
class User extends SQLModel {
  static async findById(id: string) {
    const user = await this.find(id);

    if (!user) {
      // 使用全局 $t() 方法
      throw new Error($t("user.notFound"));
    }

    return user;
  }
}
```

## 语言检测

i18n 插件支持多种语言检测方式，按以下优先级顺序：

1. **URL 路径**（如 `/en/page`）- 需要启用 `fromPath: true`
2. **查询参数**（如 `?lang=en`）- 需要启用 `fromQuery: true`
3. **Cookie** - 需要启用 `fromCookie: true`
4. **Accept-Language 头** - 需要启用
   `fromHeader: true`（默认不启用，避免浏览器语言覆盖默认语言）
5. **默认语言** - 配置中的 `defaultLanguage`

### 语言切换示例

```typescript
// 通过查询参数切换语言
// 访问 /?lang=zh-CN 会切换到中文

// 通过 Cookie 切换语言（需要客户端设置 Cookie）
// document.cookie = 'lang=zh-CN; path=/';

// 通过 URL 路径切换语言（需要启用 fromPath）
// 访问 /zh-CN/page 会切换到中文
```

## 最佳实践

1. **优先使用 `$t()`**：这是最简单的方式，无需导入，全局可用
2. **备选方案使用
   `getI18n()`**：如果需要在非请求上下文中使用，或需要指定特定语言
3. **提供默认值**：如果翻译不存在，翻译函数会返回
   key，建议在验证消息中提供默认值
4. **使用嵌套键**：使用 `validation.email.exists` 这样的嵌套键，便于组织翻译
5. **参数化消息**：使用 `{field}` 这样的占位符，支持动态内容

## 注意事项

- **`$t()` 始终可用**：
  - 在请求上下文中，会自动使用当前请求的语言
  - 在非请求上下文（如后台任务）中，使用默认语言
  - 如果 i18n 插件未初始化，会返回 key 本身（不会报错）
  - 在 TypeScript 中，需要引用全局类型声明文件才能获得类型支持

- **`getI18n()` 备选方案**：
  - 在请求上下文中，会自动使用当前请求的语言
  - 在非请求上下文（如后台任务）中，会使用默认语言
  - 如果 i18n 插件未初始化，会返回一个返回 key 的函数（不会报错）
  - 可以指定特定语言：`getI18n('zh-CN')`

- **语言检测**：
  - 默认不启用 `fromHeader`，避免浏览器语言覆盖默认语言
  - 需要明确设置 `fromHeader: true` 才会启用 Accept-Language 头检测
  - Cookie 检测需要客户端设置 Cookie，插件会自动保存当前语言到 Cookie

- **翻译文件路径**：
  - 相对路径会从当前工作目录解析
  - 建议使用相对路径（如 `'locales'`），框架会自动解析为绝对路径
