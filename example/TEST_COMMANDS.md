# 测试命令指南

## 方法一：从项目根目录运行（推荐）✨

```bash
# 1. 进入项目根目录
cd /Users/shuliangfu/worker/deno/dweb

# 2. 启动开发服务器（会自动查找 example/dweb.config.ts）
deno run --allow-all src/cli.ts dev
```

**注意**：框架会自动查找配置文件，按以下顺序：
1. 当前目录的 `dweb.config.ts`
2. `example/dweb.config.ts`

## 方法二：从 example 目录运行

```bash
# 1. 进入 example 目录
cd /Users/shuliangfu/worker/deno/dweb/example

# 2. 启动开发服务器
deno run --allow-all ../src/cli.ts dev
```

## 方法三：使用运行脚本

```bash
# 1. 进入 example 目录
cd /Users/shuliangfu/worker/deno/dweb/example

# 2. 运行脚本
./run.sh
```

## 测试步骤

### 1. 启动服务器

执行上述任一命令后，你应该看到：

```
🚀 启动开发服务器...
📁 扫描到 3 个路由
✅ 示例插件已初始化
📦 从 main.ts 加载了 1 个中间件
🔌 从 main.ts 加载了 1 个插件
🚀 服务器运行在 http://localhost:3000
🔥 HMR 服务器运行在 ws://localhost:24678
```

### 2. 测试页面

在浏览器中访问：
- 首页: http://localhost:3000/
- 关于页: http://localhost:3000/about
- 404 页面: http://localhost:3000/not-found

### 3. 测试 API（使用 curl）

```bash
# 测试 API
curl "http://localhost:3000/api/test?action=test"

# 获取用户
curl "http://localhost:3000/api/test?action=getUser&id=123"

# 登录（POST 请求）
curl -X POST "http://localhost:3000/api/test?action=login" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'
```

### 4. 测试热更新

1. 保持服务器运行
2. 修改 `example/routes/index.tsx` 文件
3. 保存文件
4. 浏览器应该自动刷新

## 停止服务器

按 `Ctrl + C` 停止服务器

## 常见问题

### 端口被占用

如果 3000 端口被占用，修改 `example/dweb.config.ts`：

```typescript
server: {
  port: 3001,  // 改为其他端口
  host: 'localhost'
}
```

### 权限错误

确保使用 `--allow-all` 标志，或者根据需要授予特定权限：
- `--allow-read` - 读取文件
- `--allow-write` - 写入文件
- `--allow-net` - 网络访问
- `--allow-env` - 环境变量

