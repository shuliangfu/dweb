# 使用官方 Deno 镜像作为基础镜像
# 使用固定版本号避免 Docker Hub 速率限制
FROM denoland/deno:latest AS builder

# 设置工作目录
WORKDIR /app

# 复制所有文件（.dockerignore 会排除不需要的文件）
COPY . .

# 切换到 example 目录
WORKDIR /app/example

# 临时修改 deno.json，将 nodeModulesDir 改为 auto，以便自动安装 npm 依赖
RUN sed -i 's/"nodeModulesDir": "manual"/"nodeModulesDir": "auto"/' deno.json

# 缓存依赖（这会触发 npm 依赖的自动安装）
RUN deno cache --lock=deno.lock deno.json

# 预先缓存健康检查脚本（避免运行时下载依赖）
RUN deno cache healthcheck.ts

# 构建项目
RUN deno task build

# 生产阶段：使用更小的镜像
FROM denoland/deno:latest

# 设置工作目录（保持目录结构，使 ../src 路径正确）
WORKDIR /app

# 从构建阶段复制框架源码和 example 项目的运行时文件
COPY --from=builder /app/src ./src
COPY --from=builder /app/example/dist ./example/dist
COPY --from=builder /app/example/deno.json ./example/
COPY --from=builder /app/example/dweb.config.ts ./example/
COPY --from=builder /app/example/healthcheck.ts ./example/
# 复制 node_modules（避免运行时重新下载依赖）
COPY --from=builder /app/example/node_modules ./example/
COPY --from=builder /app/example/init.ts ./example/
COPY --from=builder /app/example/i18n-global.d.ts ./example/

# 切换到 example 目录（deno.json 和 dweb.config.ts 所在目录）
WORKDIR /app/example

# 暴露端口（根据 dweb.config.ts 中的配置）
EXPOSE 3000

# 设置环境变量
ENV DENO_ENV=production

# 启动生产服务器
CMD ["deno", "task", "start"]

