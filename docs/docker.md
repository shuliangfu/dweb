# Docker 部署

DWeb 框架提供了完整的 Docker 支持，可以轻松部署到生产环境。

## 快速开始

### 使用 Dockerfile

项目根目录已包含 `Dockerfile`，可以直接使用：

```bash
# 构建镜像
docker build -t dweb-app .

# 运行容器
docker run -p 3000:3000 dweb-app
```

### 使用 docker-compose

项目根目录已包含 `docker-compose.yml`，可以直接使用：

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## Dockerfile 说明

### 构建阶段

```dockerfile
FROM denoland/deno:2.6.0 AS builder

WORKDIR /app
COPY . .

# 切换到 example 目录
WORKDIR /app/example

# 修改 deno.json，启用自动 npm 依赖安装
RUN sed -i 's/"nodeModulesDir": "manual"/"nodeModulesDir": "auto"/' deno.json

# 缓存依赖
RUN deno cache --lock=deno.lock deno.json

# 构建项目
RUN deno task build
```

### 生产阶段

```dockerfile
FROM denoland/deno:2.6.0

WORKDIR /app

# 复制框架源码和构建产物
COPY --from=builder /app/src ./src
COPY --from=builder /app/example/dist ./example/dist
COPY --from=builder /app/example/deno.json ./example/
COPY --from=builder /app/example/dweb.config.ts ./example/
COPY --from=builder /app/example/healthcheck.ts ./example/
COPY --from=builder /app/example/node_modules ./example/node_modules

# 切换到 example 目录
WORKDIR /app/example

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV DENO_ENV=production

# 启动服务器
CMD ["deno", "task", "start"]
```

## docker-compose.yml 说明

```yaml
services:
  dweb-example:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: dweb-example
    ports:
      - "3000:3000"
    environment:
      - DENO_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "deno", "run", "-A", "healthcheck.ts"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

## 自定义配置

### 修改端口

在 `docker-compose.yml` 中修改端口映射：

```yaml
ports:
  - "8080:3000"  # 主机端口:容器端口
```

### 添加环境变量

```yaml
environment:
  - DENO_ENV=production
  - PORT=3000
  - DB_HOST=postgres
  - DB_NAME=mydb
```

### 使用 .env 文件

创建 `.env` 文件：

```env
PORT=3000
DB_HOST=postgres
DB_NAME=mydb
DB_USER=user
DB_PASSWORD=password
```

在 `docker-compose.yml` 中使用：

```yaml
environment:
  - PORT=${PORT}
  - DB_HOST=${DB_HOST}
  - DB_NAME=${DB_NAME}
```

### 挂载数据卷

```yaml
volumes:
  - ./data:/app/data
  - ./uploads:/app/uploads
```

### 连接数据库

```yaml
services:
  dweb-example:
    # ... 其他配置
    depends_on:
      - postgres
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=mydb
      - DB_USER=user
      - DB_PASSWORD=password

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

## 健康检查

框架提供了健康检查脚本 `healthcheck.ts`：

```typescript
// healthcheck.ts
const response = await fetch('http://localhost:3000/health');
if (response.ok) {
  Deno.exit(0);
} else {
  Deno.exit(1);
}
```

Docker 会自动使用此脚本进行健康检查。

## 生产环境优化

### 多阶段构建

Dockerfile 已经使用多阶段构建，减少最终镜像大小。

### 使用 .dockerignore

创建 `.dockerignore` 文件，排除不需要的文件：

```
node_modules
.git
.gitignore
README.md
docs
tests
coverage
*.log
.DS_Store
```

### 优化层缓存

将不经常变化的操作放在前面，经常变化的操作放在后面：

```dockerfile
# 先复制依赖文件
COPY deno.json deno.lock ./
RUN deno cache --lock=deno.lock deno.json

# 再复制源代码
COPY . .
RUN deno task build
```

## 部署到云平台

### Docker Hub

```bash
# 登录
docker login

# 构建并标记
docker build -t username/dweb-app:latest .

# 推送
docker push username/dweb-app:latest
```

### 使用云平台镜像

```yaml
# docker-compose.yml
services:
  dweb-example:
    image: username/dweb-app:latest
    # ... 其他配置
```

## 常见问题

### 端口被占用

```bash
# 查看端口占用
lsof -i :3000

# 修改端口
docker run -p 8080:3000 dweb-app
```

### 权限问题

```bash
# 使用非 root 用户
docker run --user 1000:1000 dweb-app
```

### 时区设置

```dockerfile
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
```

### 日志管理

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 最佳实践

1. **使用固定版本的基础镜像**：避免因基础镜像更新导致的问题
2. **多阶段构建**：减少最终镜像大小
3. **健康检查**：确保容器正常运行
4. **环境变量**：使用环境变量管理配置
5. **数据持久化**：使用数据卷保存重要数据
6. **日志管理**：配置日志轮转，避免日志文件过大
7. **资源限制**：设置 CPU 和内存限制

---

## 📚 相关文档

- [文档总览](./README.md)
- [配置文档](./configuration.md)
- [开发指南](./development.md)
- [核心模块](./core.md)

