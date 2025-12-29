## 部署

### 生产服务器

#### 生产环境优化

*   **集群模式 (Cluster Mode)**：
    支持 `PUP_CLUSTER_INSTANCE` 环境变量，自动适配端口偏移，无需手动配置即可实现多实例负载均衡部署，充分利用多核 CPU 性能。

*   **零拷贝服务 (Zero-Copy Serving)**：
    静态文件服务采用零拷贝技术，直接将文件流传输到网络 socket，极大降低了 CPU 和内存占用，提升了大文件传输性能。

*   **优雅关闭 (Graceful Shutdown)**：
    内置信号处理机制（`SIGINT`, `SIGTERM`），确保在服务停止前完成正在处理的请求并正确释放数据库连接等资源，实现零停机部署。

#### 单应用模式

```bash
# 启动生产服务器
deno task start

# 或使用 CLI 命令
deno run -A src/cli.ts start

# 使用环境变量指定环境
DENO_ENV=production deno task start
```

#### 多应用模式

```bash
# 启动所有应用
deno task start

# 启动指定应用
deno run -A src/cli.ts start:app-name
```

**生产服务器特性：**

- 优化的性能：代码已编译和压缩
- 静态资源缓存：配置的缓存策略生效
- 错误处理：生产环境友好的错误信息
- 日志记录：可配置的日志级别和输出

**环境变量：**

- `DENO_ENV` - 环境名称（development、production 等）
- `PORT` - 服务器端口（会覆盖配置文件中的设置）
- 其他自定义环境变量可在配置文件中通过 `Deno.env.get()` 获取

### Docker 部署

```bash
# 构建镜像
docker build -t dweb-app .

# 运行容器
docker run -p 3000:3000 dweb-app
```

详细说明请参考 [Docker 文档](./docker.md)。
