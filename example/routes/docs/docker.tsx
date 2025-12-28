/**
 * Docker 部署文档页面
 * 展示如何使用 Docker 部署 DWeb 应用
 */

import CodeBlock from "../../../components/CodeBlock.tsx";
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

  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>Docker 部署</h1>

      <p>
        DWeb 框架提供了完整的 Docker 支持，可以轻松部署到生产环境。
      </p>

      <h2>快速开始</h2>

      <h3>使用 Dockerfile</h3>

      <p>
        项目根目录已包含 <code>Dockerfile</code>，可以直接使用：
      </p>

      <CodeBlock
        language="bash"
        code={`# 构建镜像
docker build -t dweb-app .

# 运行容器
docker run -p 3000:3000 dweb-app`}
      />

      <h3>使用 docker-compose</h3>

      <p>
        项目根目录已包含 <code>docker-compose.yml</code>，可以直接使用：
      </p>

      <CodeBlock
        language="bash"
        code={`# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down`}
      />

      <h2>Dockerfile 说明</h2>

      <h3>构建阶段</h3>

      <CodeBlock language="dockerfile" code={dockerfileBuildCode} />

      <h3>生产阶段</h3>

      <CodeBlock language="dockerfile" code={dockerfileProdCode} />

      <h2>docker-compose.yml 说明</h2>

      <CodeBlock language="yaml" code={dockerComposeCode} />

      <h2>自定义配置</h2>

      <h3>修改端口</h3>

      <p>
        在 <code>docker-compose.yml</code> 中修改端口映射：
      </p>

      <CodeBlock language="yaml" code={customPortCode} />

      <h3>添加环境变量</h3>

      <CodeBlock language="yaml" code={envVarsCode} />

      <h3>使用 .env 文件</h3>

      <p>
        创建 <code>.env</code> 文件：
      </p>

      <CodeBlock language="text" code={envFileCode} />

      <p>
        在 <code>docker-compose.yml</code> 中使用：
      </p>

      <CodeBlock language="yaml" code={useEnvFileCode} />

      <h3>挂载数据卷</h3>

      <CodeBlock language="yaml" code={volumesCode} />

      <h3>连接数据库</h3>

      <CodeBlock language="yaml" code={databaseComposeCode} />

      <h2>健康检查</h2>

      <p>
        框架提供了健康检查脚本 <code>healthcheck.ts</code>：
      </p>

      <CodeBlock language="typescript" code={healthcheckCode} />

      <p>Docker 会自动使用此脚本进行健康检查。</p>

      <h2>生产环境优化</h2>

      <h3>多阶段构建</h3>

      <p>Dockerfile 已经使用多阶段构建，减少最终镜像大小。</p>

      <h3>使用 .dockerignore</h3>

      <p>
        创建 <code>.dockerignore</code> 文件，排除不需要的文件：
      </p>

      <CodeBlock language="text" code={dockerignoreCode} />

      <h3>优化层缓存</h3>

      <p>将不经常变化的操作放在前面，经常变化的操作放在后面：</p>

      <CodeBlock language="dockerfile" code={optimizedDockerfileCode} />

      <h2>部署到云平台</h2>

      <h3>Docker Hub</h3>

      <CodeBlock language="bash" code={dockerHubCode} />

      <h3>使用云平台镜像</h3>

      <CodeBlock language="yaml" code={cloudImageCode} />

      <h2>常见问题</h2>

      <h3>端口被占用</h3>

      <CodeBlock
        language="bash"
        code={`# 查看端口占用
lsof -i :3000

# 修改端口
docker run -p 8080:3000 dweb-app`}
      />

      <h3>权限问题</h3>

      <CodeBlock
        language="bash"
        code={`# 使用非 root 用户
docker run --user 1000:1000 dweb-app`}
      />

      <h3>时区设置</h3>

      <CodeBlock language="dockerfile" code={timezoneCode} />

      <h3>日志管理</h3>

      <CodeBlock language="yaml" code={loggingCode} />

      <h2>最佳实践</h2>

      <ol>
        <li>
          <strong>使用固定版本的基础镜像</strong>：避免因基础镜像更新导致的问题
        </li>
        <li>
          <strong>多阶段构建</strong>：减少最终镜像大小
        </li>
        <li>
          <strong>健康检查</strong>：确保容器正常运行
        </li>
        <li>
          <strong>环境变量</strong>：使用环境变量管理配置
        </li>
        <li>
          <strong>数据持久化</strong>：使用数据卷保存重要数据
        </li>
        <li>
          <strong>日志管理</strong>：配置日志轮转，避免日志文件过大
        </li>
        <li>
          <strong>资源限制</strong>：设置 CPU 和内存限制
        </li>
      </ol>

      <h2>相关文档</h2>

      <ul>
        <li>
          <a href="/docs/configuration">配置文档</a> - 了解如何配置应用
        </li>
        <li>
          <a href="/docs/development">开发指南</a> - 了解开发流程
        </li>
        <li>
          <a href="/docs/features/prod">生产服务器</a> - 了解生产服务器配置
        </li>
      </ul>
    </article>
  );
}
