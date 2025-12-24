# 缓存函数

提供简单的内存缓存功能，支持过期时间（TTL）和自动清理。

**环境兼容性：** 通用（服务端和客户端都可用）

```typescript
import {
  setCache,
  getCache,
  hasCache,
  deleteCache,
  clearCache,
  cached,
} from "@dreamer/dweb/extensions";

// 设置缓存（TTL 为秒）
setCache("user:1", { id: 1, name: "Alice" }, 3600); // 缓存1小时

// 获取缓存
const user = getCache<{ id: number; name: string }>("user:1");

// 检查缓存是否存在
hasCache("user:1"); // true

// 删除缓存
deleteCache("user:1");

// 清空所有缓存
clearCache();

// 使用缓存装饰器
class UserService {
  @cached(3600) // 缓存1小时
  async getUser(id: number) {
    // 从数据库获取用户
    return { id, name: "Alice" };
  }

  @cached(1800, (id: number) => `user:${id}`) // 自定义缓存键
  async getUserById(id: number) {
    return { id, name: "Alice" };
  }
}
```
