# MongoDB 数据库连接测试说明

## 概述

本目录包含两个 MongoDB 测试文件：

1. **`database-connection.test.ts`** - 专门用于诊断和测试 MongoDB 连接，特别是副本集连接
2. **`database-mongodb.test.ts`** - 完整的 MongoDB ORM 功能测试

## 快速开始

### 1. 配置环境变量

在项目根目录创建或编辑 `.env` 文件：

#### 单机连接配置

```bash
# 方式 1: 使用独立配置
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=test_db
MONGODB_USERNAME=your_username  # 可选
MONGODB_PASSWORD=your_password  # 可选
MONGODB_AUTH_SOURCE=admin       # 可选，认证数据库
```

#### 副本集连接配置（方式 1：使用 hosts）

```bash
# 副本集配置
MONGODB_HOSTS=localhost:27017,localhost:27018,localhost:27019
MONGODB_DATABASE=test_db
MONGODB_REPLICA_SET=rs0  # 副本集名称（必须）
MONGODB_USERNAME=your_username  # 可选
MONGODB_PASSWORD=your_password  # 可选
MONGODB_AUTH_SOURCE=admin       # 可选
```

#### 副本集连接配置（方式 2：使用 URI）

```bash
# 使用连接 URI（推荐，最灵活）
MONGODB_URI=mongodb://username:password@localhost:27017,localhost:27018,localhost:27019/test_db?replicaSet=rs0&authSource=admin
```

### 2. 运行连接测试

```bash
# 运行连接诊断测试（不会卡住，有超时保护）
deno test -A tests/unit/features/database-connection.test.ts

# 运行完整功能测试（需要数据库连接成功）
deno test -A tests/unit/features/database-mongodb.test.ts
```

## 测试说明

### database-connection.test.ts

这个测试文件专门用于诊断连接问题，包含以下测试：

1. **MongoDB 连接测试**
   - 测试基本连接功能
   - 提供详细的错误信息和诊断建议
   - 包含超时保护（不会卡住）

2. **MongoDB 副本集连接测试**
   - 专门测试副本集连接
   - 检查副本集配置是否正确
   - 获取副本集状态信息

3. **MongoDB 连接超时测试**
   - 测试超时处理机制
   - 验证超时时间是否合理

### database-mongodb.test.ts

这个测试文件包含完整的 MongoDB ORM 功能测试，包括：

- 软删除功能
- CRUD 操作
- 批量操作
- 查询方法
- 链式查询构建器
- 等等

## 常见问题

### 1. 测试卡住不执行

**原因**：连接超时时间设置过长，或者 MongoDB 服务未运行。

**解决方案**：
- 检查 MongoDB 服务是否运行：`mongosh --eval "db.adminCommand('ping')"`
- 设置较短的超时时间：`MONGODB_TIMEOUT_MS=5000`
- 使用 `timeout` 命令运行测试：`timeout 30 deno test -A tests/unit/features/database-connection.test.ts`

### 2. 副本集连接失败

**可能的原因**：
1. 副本集名称不正确
2. 未设置 `MONGODB_REPLICA_SET` 环境变量
3. 副本集节点不可访问
4. 副本集未正确初始化

**解决方案**：
1. 检查副本集名称：`mongosh --eval "rs.status().set"`
2. 确保所有节点都在 `MONGODB_HOSTS` 中
3. 检查网络连接：`ping` 每个节点
4. 验证副本集状态：`mongosh --eval "rs.status()"`

### 3. 单机副本集连接问题

如果使用单机副本集（单节点副本集），需要：

1. 设置 `MONGODB_REPLICA_SET` 环境变量
2. 确保 MongoDB 启动时使用了 `--replSet` 参数
3. 初始化副本集：`mongosh --eval "rs.initiate()"`

**示例配置**：
```bash
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=test_db
MONGODB_REPLICA_SET=rs0  # 单机副本集也需要设置
```

### 4. 认证失败

**可能的原因**：
1. 用户名或密码错误
2. `authSource` 配置不正确
3. 用户权限不足

**解决方案**：
1. 验证用户名和密码：`mongosh -u username -p password --authenticationDatabase admin`
2. 检查 `authSource` 配置是否正确
3. 确保用户有足够的权限

## 环境变量说明

| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| `MONGODB_URI` | MongoDB 连接 URI | 否 | - |
| `MONGODB_HOST` | MongoDB 主机地址 | 否* | localhost |
| `MONGODB_PORT` | MongoDB 端口 | 否 | 27017 |
| `MONGODB_DATABASE` | 数据库名称 | 是 | test_db |
| `MONGODB_USERNAME` | 用户名 | 否 | - |
| `MONGODB_PASSWORD` | 密码 | 否 | - |
| `MONGODB_AUTH_SOURCE` | 认证数据库 | 否 | - |
| `MONGODB_HOSTS` | 副本集节点列表（逗号分隔） | 否 | - |
| `MONGODB_REPLICA_SET` | 副本集名称 | 否** | - |
| `MONGODB_TIMEOUT_MS` | 连接超时时间（毫秒） | 否 | 15000 |

\* 如果使用 `MONGODB_URI` 或 `MONGODB_HOSTS`，则不需要 `MONGODB_HOST`
\** 如果使用 `MONGODB_HOSTS` 配置多个节点，建议设置 `MONGODB_REPLICA_SET`

## 调试技巧

### 1. 查看详细的连接信息

运行连接测试时，会输出详细的连接信息，包括：
- 连接方式（URI/副本集/单机）
- 连接参数
- 错误信息和诊断建议

### 2. 使用 mongosh 验证连接

在运行测试前，先用 `mongosh` 验证连接：

```bash
# 单机连接
mongosh "mongodb://localhost:27017/test_db"

# 副本集连接
mongosh "mongodb://localhost:27017,localhost:27018,localhost:27019/test_db?replicaSet=rs0"
```

### 3. 检查 MongoDB 日志

查看 MongoDB 日志文件，了解连接请求和错误信息：

```bash
# 查看 MongoDB 日志（位置取决于安装方式）
tail -f /var/log/mongodb/mongod.log
# 或
tail -f /usr/local/var/log/mongodb/mongo.log
```

## 示例配置

### 单机开发环境

```bash
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=myapp_dev
```

### 单机副本集（开发环境）

```bash
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=myapp_dev
MONGODB_REPLICA_SET=rs0
```

### 生产环境副本集

```bash
MONGODB_HOSTS=mongo1.example.com:27017,mongo2.example.com:27017,mongo3.example.com:27017
MONGODB_DATABASE=myapp_prod
MONGODB_REPLICA_SET=rs0
MONGODB_USERNAME=app_user
MONGODB_PASSWORD=secure_password
MONGODB_AUTH_SOURCE=admin
```

### 使用 URI（最灵活）

```bash
MONGODB_URI=mongodb://app_user:secure_password@mongo1.example.com:27017,mongo2.example.com:27017,mongo3.example.com:27017/myapp_prod?replicaSet=rs0&authSource=admin
```
