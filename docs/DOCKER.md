# Docker 部署指南

本文档介绍如何使用 Docker 部署 DWeb 示例项目。

## 前置要求

- Docker >= 20.10
- Docker Compose >= 2.0（可选，用于使用 docker-compose）

## 快速开始

### 方式一：使用 Docker Compose（推荐）

```bash
# 在项目根目录执行
# 构建并启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止容器
docker-compose down
```

### 方式二：使用 Docker 命令

#### 1. 构建镜像

```bash
# 在项目根目录执行
docker build -t dweb-example:latest .
```

#### 2. 运行容器

```bash
docker run -d \
  --name dweb-example \
  -p 3000:3000 \
  --restart unless-stopped \
  dweb-example:latest
```

#### 3. 查看日志

```bash
docker logs -f dweb-example
```

#### 4. 停止容器

```bash
docker stop dweb-example
docker rm dweb-example
```

## 访问应用

容器启动后，访问：

- 应用地址: http://localhost:3000
- 健康检查: 容器会自动进行健康检查

## 环境变量

可以通过环境变量配置应用：

```bash
docker run -d \
  --name dweb-example \
  -p 3000:3000 \
  -e DENO_ENV=production \
  dweb-example:latest
```

## 自定义端口

如果需要使用其他端口（例如 8080），可以修改端口映射：

```bash
docker run -d \
  --name dweb-example \
  -p 8080:3000 \
  dweb-example:latest
```

或者修改 `docker-compose.yml`：

```yaml
ports:
  - "8080:3000"
```

## 生产环境建议

### 1. 使用多阶段构建

Dockerfile 已经使用了多阶段构建，确保最终镜像只包含运行时需要的文件。

### 2. 健康检查

docker-compose.yml 中已配置健康检查，确保容器正常运行。

### 3. 资源限制

建议在生产环境中设置资源限制：

```yaml
services:
  dweb-example:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 4. 日志管理

配置日志轮转：

```yaml
services:
  dweb-example:
    # ... 其他配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 故障排查

### 查看容器状态

```bash
docker ps -a
```

### 查看容器日志

```bash
docker logs dweb-example
```

### 进入容器调试

```bash
docker exec -it dweb-example sh
```

### 检查端口占用

```bash
# Linux/Mac
lsof -i :3000

# 或使用 netstat
netstat -tulpn | grep 3000
```

## 更新应用

### 方式一：重新构建

```bash
# 停止并删除旧容器
docker-compose down

# 重新构建并启动
docker-compose up -d --build
```

### 方式二：使用新镜像

```bash
# 构建新镜像（在项目根目录）
docker build -t dweb-example:latest .

# 停止并删除旧容器
docker stop dweb-example
docker rm dweb-example

# 启动新容器
docker run -d \
  --name dweb-example \
  -p 3000:3000 \
  --restart unless-stopped \
  dweb-example:latest
```

## 注意事项

1. **构建上下文**: Dockerfile 的构建上下文是项目根目录，会自动复制 `src`（框架源码）和 `example` 目录。

2. **框架源码依赖**: 由于 example 项目使用本地导入 `@dreamer/dweb`，Dockerfile 需要复制框架源码。如果使用 JSR 导入，可以简化 Dockerfile。

3. **构建缓存**: Docker 会缓存依赖下载层，如果 `deno.json` 或 `deno.lock` 没有变化，不会重新下载依赖。

4. **端口配置**: 确保 `example/dweb.config.ts` 中的端口配置与 Docker 端口映射一致。

5. **静态资源**: 构建后的静态资源位于 `dist/public` 目录，确保 Dockerfile 正确复制。

6. **工作目录**: 构建阶段在 `/app/example` 目录执行，生产阶段在 `/app` 目录运行。

## 使用 JSR 导入的优化版本

如果项目使用 JSR 导入（`jsr:@dreamer/dweb`），可以简化 Dockerfile：

```dockerfile
FROM denoland/deno:2.1.0 AS builder

WORKDIR /app/example

COPY example/deno.json example/deno.lock ./
COPY example/dweb.config.ts ./
COPY example/routes ./routes
COPY example/components ./components
COPY example/public ./public

RUN deno cache --lock=deno.lock deno.json
RUN deno task build

FROM denoland/deno:2.1.0

WORKDIR /app

COPY --from=builder /app/example/dist ./dist
COPY --from=builder /app/example/deno.json ./
COPY --from=builder /app/example/dweb.config.ts ./

EXPOSE 3000
ENV DENO_ENV=production

CMD ["deno", "task", "start"]
```

这样可以减少镜像大小，因为不需要复制框架源码。

