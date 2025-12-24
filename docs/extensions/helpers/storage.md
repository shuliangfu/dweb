# 存储工具

封装 localStorage 和 sessionStorage，提供自动 JSON 序列化、过期时间等功能。

**环境兼容性：** 客户端（浏览器环境）

## 快速开始

```typescript
import { setStorage, getStorage, removeStorage } from "@dreamer/dweb/extensions";

// 存储数据（自动序列化）
setStorage('user', { id: 1, name: 'Alice' });

// 获取数据（自动反序列化）
const user = getStorage('user');
// { id: 1, name: 'Alice' }

// 删除数据
removeStorage('user');
```

## 基础操作

### 设置存储

自动将值序列化为 JSON 字符串存储。

```typescript
import { setStorage } from "@dreamer/dweb/extensions";

// 存储对象
setStorage('user', { id: 1, name: 'Alice' });

// 存储数组
setStorage('items', [1, 2, 3]);

// 存储到 sessionStorage
setStorage('token', 'abc123', 'sessionStorage');
```

### 获取存储

自动将 JSON 字符串反序列化为原始值。

```typescript
import { getStorage } from "@dreamer/dweb/extensions";

const user = getStorage<User>('user');
// { id: 1, name: 'Alice' }

const token = getStorage('token', 'sessionStorage');
```

### 删除和清空

```typescript
import { removeStorage, clearStorage } from "@dreamer/dweb/extensions";

// 删除指定键
removeStorage('user');
removeStorage('token', 'sessionStorage');

// 清空所有存储
clearStorage(); // 清空 localStorage
clearStorage('sessionStorage'); // 清空 sessionStorage
```

## 带过期时间的存储

### 设置带过期时间的存储

存储的值会在指定时间后自动过期。

```typescript
import { setStorageWithExpiry, getStorageWithExpiry } from "@dreamer/dweb/extensions";

// 存储 token，1 小时后过期
setStorageWithExpiry('token', 'abc123', 3600);

// 存储临时数据，5 分钟后过期
setStorageWithExpiry('temp', { data: 'xxx' }, 300);
```

### 获取带过期时间的存储

自动检查是否过期，如果过期则删除并返回 undefined。

```typescript
import { getStorageWithExpiry } from "@dreamer/dweb/extensions";

const token = getStorageWithExpiry('token');
if (!token) {
  // token 不存在或已过期，需要重新获取
}
```

## 存储管理

### 检查存储是否存在

```typescript
import { hasStorage } from "@dreamer/dweb/extensions";

if (hasStorage('user')) {
  const user = getStorage('user');
}
```

### 获取所有存储键

```typescript
import { getStorageKeys } from "@dreamer/dweb/extensions";

const keys = getStorageKeys();
// ['user', 'token', 'settings']
```

### 获取存储大小

```typescript
import { getStorageSize, getTotalStorageSize } from "@dreamer/dweb/extensions";

// 获取指定键的存储大小
const size = getStorageSize('user');
console.log(`用户数据占用 ${size} 字节`);

// 获取所有存储的总大小
const totalSize = getTotalStorageSize();
console.log(`localStorage 总占用 ${totalSize} 字节`);
```

## 完整示例

```typescript
import {
  setStorage,
  getStorage,
  setStorageWithExpiry,
  getStorageWithExpiry,
  hasStorage,
} from "@dreamer/dweb/extensions";

// 存储用户信息
setStorage('user', {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
});

// 存储带过期时间的 token
setStorageWithExpiry('token', 'abc123', 3600); // 1小时后过期

// 检查并获取数据
if (hasStorage('user')) {
  const user = getStorage('user');
  console.log(user);
}

// 获取 token（自动检查过期）
const token = getStorageWithExpiry('token');
if (token) {
  // 使用 token
} else {
  // token 已过期，重新获取
}
```

## API 参考

### 基础操作
- `setStorage(key, value, type?)` - 设置存储
- `getStorage<T>(key, type?)` - 获取存储
- `removeStorage(key, type?)` - 删除存储
- `clearStorage(type?)` - 清空所有存储
- `hasStorage(key, type?)` - 检查存储是否存在
- `getStorageKeys(type?)` - 获取所有存储键

### 带过期时间的存储
- `setStorageWithExpiry(key, value, ttl, type?)` - 设置带过期时间的存储
- `getStorageWithExpiry<T>(key, type?)` - 获取带过期时间的存储

### 存储大小
- `getStorageSize(key, type?)` - 获取指定键的存储大小（字节）
- `getTotalStorageSize(type?)` - 获取所有存储的总大小（字节）

### 类型
- `StorageType` - 存储类型（'localStorage' | 'sessionStorage'）

