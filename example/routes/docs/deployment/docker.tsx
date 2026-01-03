/**
 * Docker 部署文档页面
 * 展示如何使用 Docker 部署 DWeb 应用
 */

import DocRenderer from "@components/DocRenderer.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "Docker 部署 - DWeb 框架文档",
  description:
    "DWeb 框架的 Docker 部署指南，包括 Dockerfile、docker-compose 等",
};

export default function DockerPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  // Dockerfile 构建阶段
  const dockerfileBuildCode = `FROM denoland/deno:2.6.0 AS builder

WORKDIR /app
COPY . .

# 切换到 example 目录
WORKDIR /app/example

# 修改 deno.json，启用自动 npm 依赖安装
RUN sed -i 's/"nodeModulesDir": "manual"/"nodeModulesDir": "auto"/' deno.json

# 缓存依赖
RUN deno cache --lock=deno.lock deno.json

# 构建项目
RUN deno task build`;

  // Dockerfile 生产阶段
  const dockerfileProdCode = `FROM denoland/deno:2.6.0

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
CMD ["deno", "task", "start"]`;

  // docker-compose.yml
  const dockerComposeCode = `services:
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
      start_period: 10s`;

  // 健康检查脚本
  const healthcheckCode = `// healthcheck.ts
const response = await fetch("http://localhost:3000/health");
if (response.ok) {
  Deno.exit(0);
} else {
  Deno.exit(1);
}`;

  // 自定义端口
  const customPortCode = `ports:
  - "8080:3000" # 主机端口:容器端口`;

  // 环境变量
  const envVarsCode = `environment:
  - DENO_ENV=production
  - PORT=3000
  - DB_HOST=postgres
  - DB_NAME=mydb`;

  // .env 文件
  const envFileCode = `PORT=3000
DB_HOST=postgres
DB_NAME=mydb
DB_USER=user
DB_PASSWORD=password`;

  // 使用 .env 文件
  const useEnvFileCode = `environment:
  - PORT=\${PORT}
  - DB_HOST=\${DB_HOST}
  - DB_NAME=\${DB_NAME}`;

  // 数据卷
  const volumesCode = `volumes:
  - ./data:/app/data
  - ./uploads:/app/uploads`;

  // 连接数据库
  const databaseComposeCode = `services:
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
  postgres-data:`;

  // .dockerignore
  const dockerignoreCode = `node_modules
.git
.gitignore
README.md
docs
tests
coverage
*.log
.DS_Store`;

  // 优化层缓存
  const optimizedDockerfileCode = `# 先复制依赖文件
COPY deno.json deno.lock ./
RUN deno cache --lock=deno.lock deno.json

# 再复制源代码
COPY . .
RUN deno task build`;

  // Docker Hub 部署
  const dockerHubCode = `# 登录
docker login

# 构建并标记
docker build -t username/dweb-app:latest .

# 推送
docker push username/dweb-app:latest`;

  // 使用云平台镜像
  const cloudImageCode = `# docker-compose.yml
services:
  dweb-example:
    image: username/dweb-app:latest
    # ... 其他配置`;

  // 时区设置
  const timezoneCode = `ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone`;

  // 日志管理
  const loggingCode = `logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"`;

  // 页面文档数据（用于数据提取和翻译）
  const content = {
    title: "Docker 部署",
    description: "DWeb 框架提供了完整的 Docker 支持，可以轻松部署到生产环境。",
    sections: [
      {
        title: "快速开始",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "使用 Dockerfile",
            blocks: [
              {
                type: "text",
                content: "项目根目录已包含 `Dockerfile`，可以直接使用：",
              },
              {
                type: "code",
                code: `# 构建镜像
docker build -t dweb-app .

# 运行容器
docker run -p 3000:3000 dweb-app`,
                language: "bash",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用 docker-compose",
            blocks: [
              {
                type: "text",
                content:
                  "项目根目录已包含 `docker-compose.yml`，可以直接使用：",
              },
              {
                type: "code",
                code: `# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down`,
                language: "bash",
              },
            ],
          },
        ],
      },
      {
        title: "Dockerfile 说明",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "构建阶段",
            blocks: [
              {
                type: "code",
                code: dockerfileBuildCode,
                language: "dockerfile",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "生产阶段",
            blocks: [
              {
                type: "code",
                code: dockerfileProdCode,
                language: "dockerfile",
              },
            ],
          },
        ],
      },
      {
        title: "docker-compose.yml 说明",
        blocks: [
          {
            type: "code",
            code: dockerComposeCode,
            language: "yaml",
          },
        ],
      },
      {
        title: "自定义配置",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "修改端口",
            blocks: [
              {
                type: "text",
                content: "在 `docker-compose.yml` 中修改端口映射：",
              },
              {
                type: "code",
                code: customPortCode,
                language: "yaml",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "添加环境变量",
            blocks: [
              {
                type: "code",
                code: envVarsCode,
                language: "yaml",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用 .env 文件",
            blocks: [
              {
                type: "text",
                content: "创建 `.env` 文件：",
              },
              {
                type: "code",
                code: envFileCode,
                language: "text",
              },
              {
                type: "text",
                content: "在 `docker-compose.yml` 中使用：",
              },
              {
                type: "code",
                code: useEnvFileCode,
                language: "yaml",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "挂载数据卷",
            blocks: [
              {
                type: "code",
                code: volumesCode,
                language: "yaml",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "连接数据库",
            blocks: [
              {
                type: "code",
                code: databaseComposeCode,
                language: "yaml",
              },
            ],
          },
        ],
      },
      {
        title: "健康检查",
        blocks: [
          {
            type: "text",
            content: "框架提供了健康检查脚本 `healthcheck.ts`：",
          },
          {
            type: "code",
            code: healthcheckCode,
            language: "typescript",
          },
          {
            type: "text",
            content: "Docker 会自动使用此脚本进行健康检查。",
          },
        ],
      },
      {
        title: "生产环境优化",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "多阶段构建",
            blocks: [
              {
                type: "text",
                content: "Dockerfile 已经使用多阶段构建，减少最终镜像大小。",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用 .dockerignore",
            blocks: [
              {
                type: "text",
                content: "创建 `.dockerignore` 文件，排除不需要的文件：",
              },
              {
                type: "code",
                code: dockerignoreCode,
                language: "text",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "优化层缓存",
            blocks: [
              {
                type: "text",
                content: "将不经常变化的操作放在前面，经常变化的操作放在后面：",
              },
              {
                type: "code",
                code: optimizedDockerfileCode,
                language: "dockerfile",
              },
            ],
          },
        ],
      },
      {
        title: "部署到云平台",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "Docker Hub",
            blocks: [
              {
                type: "code",
                code: dockerHubCode,
                language: "bash",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "使用云平台镜像",
            blocks: [
              {
                type: "code",
                code: cloudImageCode,
                language: "yaml",
              },
            ],
          },
        ],
      },
      {
        title: "常见问题",
        blocks: [
          {
            type: "subsection",
            level: 3,
            title: "端口被占用",
            blocks: [
              {
                type: "code",
                code: `# 查看端口占用
lsof -i :3000

# 修改端口
docker run -p 8080:3000 dweb-app`,
                language: "bash",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "权限问题",
            blocks: [
              {
                type: "code",
                code: `# 使用非 root 用户
docker run --user 1000:1000 dweb-app`,
                language: "bash",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "时区设置",
            blocks: [
              {
                type: "code",
                code: timezoneCode,
                language: "dockerfile",
              },
            ],
          },
          {
            type: "subsection",
            level: 3,
            title: "日志管理",
            blocks: [
              {
                type: "code",
                code: loggingCode,
                language: "yaml",
              },
            ],
          },
        ],
      },
      {
        title: "最佳实践",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "**使用固定版本的基础镜像**：避免因基础镜像更新导致的问题",
              "**多阶段构建**：减少最终镜像大小",
              "**健康检查**：确保容器正常运行",
              "**环境变量**：使用环境变量管理配置",
              "**数据持久化**：使用数据卷保存重要数据",
              "**日志管理**：配置日志轮转，避免日志文件过大",
              "**资源限制**：设置 CPU 和内存限制",
            ],
          },
        ],
      },
      {
        title: "相关文档",
        blocks: [
          {
            type: "list",
            ordered: false,
            items: [
              "[配置文档](/docs/configuration) - 了解如何配置应用",
              "[开发指南](/docs/development) - 了解开发流程",
              "[生产服务器](/docs/features/prod) - 了解生产服务器配置",
            ],
          },
        ],
      },
    ],
  };

  return (
    <DocRenderer
      content={content as Parameters<typeof DocRenderer>[0]["content"]}
    />
  );
}
