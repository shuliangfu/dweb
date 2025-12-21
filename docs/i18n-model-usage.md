# 在 Model 中使用 i18n

本文档说明如何在 Model（数据库模型）中使用 i18n 翻译功能。

## 概述

在 Model 中使用 i18n 有几种方式：

1. **使用 `getI18n()` 函数**（推荐）- 在请求上下文中自动使用当前语言
2. **使用 `globalThis.$t()`** - 在服务端渲染时可用
3. **通过参数传递** - 在 load 函数中获取 `t` 函数，然后传递给 Model 方法

## 方式 1：使用 `getI18n()` 函数（推荐）

`getI18n()` 函数类似于 `getDatabase()`，可以在任何地方使用，包括 Model 的生命周期钩子、验证函数等。

### 基本用法

```typescript
// models/User.ts
import { SQLModel, getDatabase } from '@dreamer/dweb/features/database';
import { getI18n } from '@dreamer/dweb/plugins';

class User extends SQLModel {
  static tableName = 'users';
  static primaryKey = 'id';

  static schema = {
    username: {
      type: 'string',
      validate: {
        required: true,
        min: 2,
        max: 50,
        custom: (value: string) => {
          // 使用 getI18n() 获取翻译函数
          const t = getI18n();
          
          if (value.toLowerCase() === 'admin') {
            // 使用翻译函数
            throw new Error(t('validation.username.notAdmin'));
          }
        }
      }
    },
    
    email: {
      type: 'string',
      validate: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        custom: async (value: string) => {
          const t = getI18n();
          const existing = await User.findOne({ email: value });
          if (existing) {
            throw new Error(t('validation.email.exists'));
          }
        }
      }
    },
  };

  // 生命周期钩子中使用
  static async beforeCreate(instance: User) {
    const t = getI18n();
    
    // 使用翻译函数
    if (instance.age && instance.age < 13) {
      throw new Error(t('validation.age.min', { min: '13' }));
    }
  }

  // 实例方法中使用
  async updateLastLogin() {
    const t = getI18n();
    console.log(t('user.lastLoginUpdated'));
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
const t = getI18n('zh-CN'); // 使用中文
const message = t('validation.required');
```

## 方式 2：使用 `globalThis.$t()`（服务端渲染时）

在服务端渲染时，`globalThis.$t` 会在渲染前设置。但需要注意：

- 只在请求处理流程中可用
- 在 Model 的生命周期钩子中可能还未设置
- 渲染完成后会被清理

```typescript
// models/User.ts
class User extends SQLModel {
  static async beforeCreate(instance: User) {
    // 检查 globalThis.$t 是否存在
    const t = (globalThis as any).$t;
    if (t) {
      const message = t('validation.custom');
      // 使用翻译
    } else {
      // 回退到默认消息
      const message = '验证失败';
    }
  }
}
```

## 方式 3：通过参数传递（最灵活）

在 `load` 函数中获取 `t` 函数，然后传递给 Model 方法：

```typescript
// routes/users/[id].tsx
import type { LoadContext, PageProps } from '@dreamer/dweb';
import User from '../../models/User.ts';

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
  static async findById(id: string, options?: { t?: (key: string) => string }) {
    const user = await this.find(id);
    
    if (!user && options?.t) {
      throw new Error(options.t('user.notFound'));
    }
    
    return user;
  }
}
```

## 翻译文件示例

```json
// locales/zh-CN.json
{
  "validation": {
    "username": {
      "notAdmin": "用户名不能为 admin",
      "required": "用户名是必填字段",
      "min": "用户名长度必须大于等于 {min}",
      "max": "用户名长度必须小于等于 {max}"
    },
    "email": {
      "exists": "邮箱已被使用",
      "required": "邮箱是必填字段",
      "pattern": "邮箱格式不正确"
    },
    "age": {
      "min": "年龄不能小于 {min} 岁"
    },
    "required": "{field} 是必填字段"
  },
  "user": {
    "notFound": "用户不存在",
    "lastLoginUpdated": "最后登录时间已更新"
  }
}
```

```json
// locales/en.json
{
  "validation": {
    "username": {
      "notAdmin": "Username cannot be admin",
      "required": "Username is required",
      "min": "Username must be at least {min} characters",
      "max": "Username must be at most {max} characters"
    },
    "email": {
      "exists": "Email already exists",
      "required": "Email is required",
      "pattern": "Invalid email format"
    },
    "age": {
      "min": "Age must be at least {min} years old"
    },
    "required": "{field} is required"
  },
  "user": {
    "notFound": "User not found",
    "lastLoginUpdated": "Last login time updated"
  }
}
```

## 最佳实践

1. **优先使用 `getI18n()`**：这是最可靠的方式，在请求上下文中自动使用当前语言
2. **提供默认值**：如果翻译不存在，`getI18n()` 会返回 key，建议在验证消息中提供默认值
3. **使用嵌套键**：使用 `validation.email.exists` 这样的嵌套键，便于组织翻译
4. **参数化消息**：使用 `{field}` 这样的占位符，支持动态内容

## 注意事项

- `getI18n()` 在请求上下文中会自动使用当前请求的语言
- 在非请求上下文（如后台任务）中，会使用默认语言
- 如果 i18n 插件未初始化，`getI18n()` 会返回一个返回 key 的函数（不会报错）

