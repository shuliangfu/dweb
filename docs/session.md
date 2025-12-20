# Session 模块

DWeb 框架提供了完整的 Session 管理功能，支持多种存储方式。

## 目录结构

```
src/features/session.ts  # Session 管理实现
```

## 支持的存储方式

- **memory** - 内存存储（默认）
- **file** - 文件存储
- **kv** - Deno KV 存储
- **mongodb** - MongoDB 存储
- **redis** - Redis 存储

## 快速开始

### 基本使用

```typescript
import { SessionManager } from '@dreamer/dweb/features/session';

// 创建 Session 管理器
const sessionManager = new SessionManager({
  store: 'memory',
  secret: 'your-secret-key',
  maxAge: 3600, // 1 小时
});

// 在请求处理中使用
server.setHandler(async (req, res) => {
  const session = await sessionManager.get(req);
  
  // 设置 Session 值
  session.set('userId', 123);
  session.set('username', 'john');
  
  // 获取 Session 值
  const userId = session.get('userId');
  
  // 保存 Session
  await session.save();
  
  res.text('OK');
});
```

### 使用文件存储

```typescript
const sessionManager = new SessionManager({
  store: 'file',
  secret: 'your-secret-key',
  maxAge: 3600,
  file: {
    dir: './sessions', // Session 文件存储目录
  },
});
```

### 使用 Deno KV 存储

```typescript
const sessionManager = new SessionManager({
  store: 'kv',
  secret: 'your-secret-key',
  maxAge: 3600,
  kv: {}, // KV 配置（可选）
});
```

### 使用 MongoDB 存储

```typescript
import { initDatabase } from '@dreamer/dweb/features/database';

// 先初始化数据库
await initDatabase({
  type: 'mongodb',
  connection: {
    host: 'localhost',
    port: 27017,
    database: 'mydb',
  },
});

const sessionManager = new SessionManager({
  store: 'mongodb',
  secret: 'your-secret-key',
  maxAge: 3600,
  mongodb: {
    collection: 'sessions', // 集合名称（可选，默认为 'sessions'）
  },
});
```

### 使用 Redis 存储

```typescript
const sessionManager = new SessionManager({
  store: 'redis',
  secret: 'your-secret-key',
  maxAge: 3600,
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'password', // 可选
    db: 0, // 可选，数据库编号
  },
});
```

## API 参考

### SessionManager

#### 构造函数

```typescript
new SessionManager(config: SessionConfig)
```

#### 方法

- `get(req: Request): Promise<Session>` - 获取或创建 Session
- `destroy(sessionId: string): Promise<void>` - 销毁 Session
- `clear(): Promise<void>` - 清空所有 Session

### Session

#### 方法

- `get(key: string): any` - 获取 Session 值
- `set(key: string, value: any): void` - 设置 Session 值
- `has(key: string): boolean` - 检查键是否存在
- `delete(key: string): void` - 删除 Session 值
- `clear(): void` - 清空所有值
- `save(): Promise<void>` - 保存 Session
- `destroy(): Promise<void>` - 销毁 Session

### 配置选项

```typescript
interface SessionConfig {
  store?: 'memory' | 'file' | 'kv' | 'mongodb' | 'redis';
  secret: string;
  maxAge?: number;
  name?: string;
  file?: {
    dir?: string;
  };
  kv?: Record<PropertyKey, never>;
  mongodb?: {
    collection?: string;
  };
  redis?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };
}
```

