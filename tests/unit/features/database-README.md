# 数据库软删除功能测试

## 测试说明

本测试文件测试 MongoDB 和 SQL 数据库模型的软删除功能，**使用真实数据库进行测试**。

测试包括：
1. **静态方法删除** - `Model.delete()`
2. **实例方法删除** - `user.delete()`
3. **deleteById** - `Model.deleteById()`
4. **避免重复删除** - 已删除的记录不会被重复删除
5. **恢复软删除** - `Model.restore()`
6. **强制删除** - `Model.forceDelete()`
7. **withTrashed** - 查询包含已删除的记录
8. **onlyTrashed** - 只查询已删除的记录

## ⚠️ 重要提示

**测试使用真实数据库，需要配置数据库连接信息。**

如果数据库未连接，测试会自动跳过并提示配置信息。

## 配置方式

### 1. 创建 `.env` 文件（在项目根目录）

```bash
# MongoDB 配置（二选一）
# 方式 1: 使用 URI
MONGODB_URI=mongodb://username:password@localhost:27017/test_db

# 方式 2: 使用独立配置
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=test_db
MONGODB_USERNAME=your_username
MONGODB_PASSWORD=your_password

# PostgreSQL 配置
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=test_db
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=your_password

# 指定数据库类型（mongodb 或 postgresql）
DB_TYPE=mongodb

# 是否使用真实数据库（默认 true，设置为 false 可跳过测试）
USE_REAL_DB=true
```

### 2. 运行测试

```bash
# 使用 MongoDB 测试
DB_TYPE=mongodb deno test --allow-all tests/unit/features/database.test.ts

# 使用 PostgreSQL 测试
DB_TYPE=postgresql deno test --allow-all tests/unit/features/database.test.ts

# 跳过测试（如果数据库未连接）
USE_REAL_DB=false deno test --allow-all tests/unit/features/database.test.ts
```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `USE_REAL_DB` | 是否使用真实数据库 | `true`（必须配置数据库） |
| `DB_TYPE` | 数据库类型 | `mongodb` |
| `MONGODB_URI` | MongoDB 连接 URI | - |
| `MONGODB_HOST` | MongoDB 主机 | `localhost` |
| `MONGODB_PORT` | MongoDB 端口 | `27017` |
| `MONGODB_DATABASE` | MongoDB 数据库名 | `test_db` |
| `MONGODB_USERNAME` | MongoDB 用户名 | - |
| `MONGODB_PASSWORD` | MongoDB 密码 | - |
| `POSTGRES_HOST` | PostgreSQL 主机 | `localhost` |
| `POSTGRES_PORT` | PostgreSQL 端口 | `5432` |
| `POSTGRES_DATABASE` | PostgreSQL 数据库名 | `test_db` |
| `POSTGRES_USERNAME` | PostgreSQL 用户名 | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL 密码 | - |

## 测试覆盖

### MongoDB 测试
- ✅ 静态方法删除
- ✅ 实例方法删除
- ✅ deleteById
- ✅ 避免重复删除
- ✅ restore
- ✅ forceDelete
- ✅ withTrashed
- ✅ onlyTrashed

### SQL 测试
- ✅ 静态方法删除
- ✅ 实例方法删除
- ✅ deleteById
- ✅ 避免重复删除
- ✅ restore
- ✅ forceDelete

## 注意事项

1. **数据库连接检查**：
   - 测试开始前会自动检查数据库连接
   - 如果数据库未连接，所有测试会跳过并提示配置信息
   - 确保数据库服务已启动

2. **测试数据清理**：
   - 测试会自动清理测试数据（`test_users` 集合或 `users` 表中 `name LIKE 'Test%'` 的记录）
   - 建议使用测试专用的数据库，避免影响生产数据

3. **测试数据**：
   - 所有测试数据都会在测试后自动清理
   - 测试使用独立的集合/表（`test_users` 或 `users`）

4. **跳过测试**：
   - 如果不想运行测试，可以设置 `USE_REAL_DB=false`
   - 测试会立即退出，不会尝试连接数据库

## 示例

### 运行所有测试（Mock 模式）

```bash
deno test --allow-all tests/unit/features/database.test.ts
```

### 运行 MongoDB 测试（真实数据库）

```bash
USE_REAL_DB=true DB_TYPE=mongodb deno test --allow-all tests/unit/features/database.test.ts
```

### 运行 SQL 测试（真实数据库）

```bash
USE_REAL_DB=true DB_TYPE=postgresql deno test --allow-all tests/unit/features/database.test.ts
```
