# 快速开始测试

## ✅ 正确的测试命令

### 从项目根目录运行（推荐）

```bash
cd /Users/shuliangfu/worker/deno/dweb
deno run --allow-all src/cli.ts dev
```

**说明**：
- 框架会自动查找配置文件（`dweb.config.ts` 或 `example/dweb.config.ts`）
- 如果配置文件在 `example/` 目录，会自动切换到该目录
- 这样路由和静态资源路径就能正确解析

### 从 example 目录运行

```bash
cd /Users/shuliangfu/worker/deno/dweb/example
deno run --allow-all ../src/cli.ts dev
```

### 使用运行脚本

```bash
cd /Users/shuliangfu/worker/deno/dweb/example
./run.sh
```

## 启动成功标志

看到以下输出表示启动成功：

```
🚀 启动开发服务器...
📁 扫描到 3 个路由
✅ 示例插件已初始化
📦 从 main.ts 加载了 1 个中间件
🔌 从 main.ts 加载了 1 个插件
🚀 服务器运行在 http://localhost:3000
🔥 HMR 服务器运行在 ws://localhost:24678
```

## 测试访问

启动后，在浏览器访问：

- **首页**: http://localhost:3000/
- **关于页**: http://localhost:3000/about
- **测试 API**: http://localhost:3000/api/test?action=test
- **404 页面**: http://localhost:3000/not-found

## 停止服务器

按 `Ctrl + C` 停止服务器

## 常见问题

### 1. 找不到配置文件

**错误**：`未找到 dweb.config.ts 文件`

**解决**：确保在项目根目录或 example 目录下运行命令

### 2. 找不到路由目录

**错误**：`No such file or directory: readdir 'routes'`

**解决**：框架会自动切换到配置文件所在目录，如果仍有问题，检查配置文件中的 `routes.dir` 配置

### 3. 端口被占用

**错误**：`Address already in use`

**解决**：修改 `example/dweb.config.ts` 中的端口号

```typescript
server: {
  port: 3001,  // 改为其他端口
  host: 'localhost'
}
```
