# 工具函数库

提供常用的工具函数，包括防抖、节流、深拷贝、对象操作等。

**环境兼容性：** 通用（服务端和客户端都可用）

## 快速开始

```typescript
import { debounce, deepClone, isEmpty, pick } from "@dreamer/dweb/utils/utils";

// 防抖函数
const debouncedSearch = debounce((query: string) => {
  console.log('搜索:', query);
}, 300);

// 深拷贝
const cloned = deepClone(complexObject);

// 空值判断
if (isEmpty(value)) {
  // 处理空值
}

// 对象选择
const selected = pick(user, ['name', 'email']);
```

## 防抖和节流

### 防抖函数

限制函数调用频率，在指定时间内只执行最后一次调用。

```typescript
import { debounce } from "@dreamer/dweb/utils/utils";

const debouncedSearch = debounce((query: string) => {
  console.log('搜索:', query);
}, 300);

// 快速调用多次，只会在停止调用 300ms 后执行一次
debouncedSearch('a');
debouncedSearch('ab');
debouncedSearch('abc'); // 只会执行这一次
```

### 节流函数

限制函数执行频率，在指定时间内最多执行一次。

```typescript
import { throttle } from "@dreamer/dweb/utils/utils";

const throttledScroll = throttle(() => {
  console.log('滚动事件');
}, 100);

// 频繁触发，但每 100ms 最多执行一次
window.addEventListener('scroll', throttledScroll);
```

## 对象操作

### 深拷贝

深度克隆对象，包括嵌套对象和数组，返回完全独立的新对象。

```typescript
import { deepClone } from "@dreamer/dweb/utils/utils";

const obj = { a: 1, b: { c: 2 }, d: [3, 4] };
const cloned = deepClone(obj);
cloned.b.c = 5;
// obj.b.c 仍然是 2，因为进行了深度克隆

const date = new Date();
const clonedDate = deepClone(date);
// clonedDate 是新的 Date 对象
```

### 深度合并

深度合并两个对象，嵌套对象会递归合并。

```typescript
import { deepMerge } from "@dreamer/dweb/utils/utils";

const obj1 = { a: 1, b: { c: 2, d: 3 } };
const obj2 = { b: { c: 4, e: 5 }, f: 6 };
const merged = deepMerge(obj1, obj2);
// { a: 1, b: { c: 4, d: 3, e: 5 }, f: 6 }
```

### 对象选择

从对象中选择或排除指定键。

```typescript
import { pick, omit } from "@dreamer/dweb/utils/utils";

const user = { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 };

// 选择指定键
const selected = pick(user, ['name', 'email']);
// { name: 'Alice', email: 'alice@example.com' }

// 排除指定键
const omitted = omit(user, ['id', 'age']);
// { name: 'Alice', email: 'alice@example.com' }
```

### 安全访问嵌套属性

使用路径字符串安全地获取或设置嵌套对象的属性值。

```typescript
import { getValue, set } from "@dreamer/dweb/utils/utils";

const user = { profile: { name: 'Alice' } };

// 获取嵌套属性
getValue(user, 'profile.name'); // 'Alice'
getValue(user, 'profile.age', 0); // 0（路径不存在，返回默认值）
getValue(user, ['profile', 'name']); // 'Alice'（使用数组路径）

// 设置嵌套属性
const user2 = {};
set(user2, 'profile.name', 'Alice');
// { profile: { name: 'Alice' } }

set(user2, ['profile', 'age'], 30);
// { profile: { name: 'Alice', age: 30 } }
```

## 值判断

### 空值判断

检查值是否为空（null、undefined、空字符串、空数组或空对象）。

```typescript
import { isEmpty } from "@dreamer/dweb/utils/utils";

isEmpty(null); // true
isEmpty(undefined); // true
isEmpty(''); // true
isEmpty('   '); // true
isEmpty([]); // true
isEmpty({}); // true
isEmpty(0); // false
isEmpty(false); // false
```

### 深度比较

递归比较两个值是否相等，包括嵌套对象和数组。

```typescript
import { isEqual } from "@dreamer/dweb/utils/utils";

isEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }); // true
isEqual([1, 2, 3], [1, 2, 3]); // true
isEqual({ a: 1 }, { a: 2 }); // false
```

## 异步工具

### 延迟函数

返回一个 Promise，在指定时间后 resolve。

```typescript
import { sleep } from "@dreamer/dweb/utils/utils";

await sleep(1000); // 等待 1 秒
console.log('1 秒后执行');
```

### 重试函数包装器

自动重试失败的异步函数。

```typescript
import { retry } from "@dreamer/dweb/utils/utils";

const result = await retry(
  () => fetch('/api/data'),
  {
    times: 3,           // 重试次数
    delay: 1000,        // 重试延迟（毫秒）
    onRetry: (error, attempt) => {
      console.log(`重试第 ${attempt} 次`);
    },
  }
);
```

## API 参考

### 防抖和节流
- `debounce<T>(func, wait)` - 防抖函数
- `throttle<T>(func, limit)` - 节流函数

### 对象操作
- `deepClone<T>(value)` - 深拷贝
- `deepMerge<T>(target, source)` - 深度合并
- `pick<T, K>(obj, keys)` - 选择指定键
- `omit<T, K>(obj, keys)` - 排除指定键
- `getValue<T>(obj, path, defaultValue?)` - 安全获取嵌套属性
- `set<T>(obj, path, value)` - 安全设置嵌套属性

### 值判断
- `isEmpty(value)` - 判断是否为空
- `isEqual(a, b)` - 深度比较是否相等

### 异步工具
- `sleep(ms)` - 延迟函数
- `retry<T>(fn, options?)` - 重试函数包装器
