# 云平台部署指南

本文档介绍如何将 DWeb 应用部署到各种云平台。

## 📚 目录

- [Deno Deploy](#deno-deploy) ⭐ 推荐
- [Vercel](#vercel)
- [Netlify](#netlify)
- [Railway](#railway)
- [Fly.io](#flyio)
- [Cloudflare Workers](#cloudflare-workers)
- [AWS](#aws)
- [Google Cloud Platform](#google-cloud-platform)
- [Azure](#azure)
- [通用部署建议](#通用部署建议)

---

## Deno Deploy

Deno Deploy 是 Deno 官方提供的云平台，最适合部署 Deno 应用。

### 前置要求

- Deno Deploy 账号（https://deno.com/deploy）
- GitHub 账号（用于连接仓库）

### 部署步骤

#### 1. 准备项目

确保项目根目录有 `deno.json` 文件：

```json
{
  "tasks": {
    "start": "deno run -A src/cli.ts start"
  },
  "imports": {
    "@dreamer/dweb": "jsr:@dreamer/dweb@^1.0.0"
  }
}
```

#### 2. 创建入口文件

创建 `main.ts` 作为 Deno Deploy 的入口：

```typescript
// main.ts
import { startProdServer } from "@dreamer/dweb";
import { loadConfig } from "@dreamer/dweb";

const { config } = await loadConfig();
await startProdServer(config);
```

#### 3. 连接 GitHub 仓库

1. 登录 Deno Deploy
2. 点击 "New Project"
3. 选择 GitHub 仓库
4. 配置部署设置：
   - **Entrypoint**: `main.ts`
   - **Environment Variables**: 添加必要的环境变量

#### 4. 环境变量配置

在 Deno Deploy 项目设置中添加环境变量：

```
PORT=3000
NODE_ENV=production
COOKIE_SECRET=your-secret-key
SESSION_SECRET=your-session-secret
```

#### 5. 自动部署

推送代码到 GitHub 后，Deno Deploy 会自动部署。

### 配置文件示例

```typescript
// dweb.config.ts
import { tailwind } from "@dreamer/dweb";
import type { AppConfig } from "@dreamer/dweb";

const config: AppConfig = {
  server: {
    port: parseInt(Deno.env.get("PORT") || "3000"),
    host: "0.0.0.0",
  },
  routes: {
    dir: "routes",
  },
  build: {
    outDir: "dist",
    cache: true,
    split: true,
  },
  plugins: [
    tailwind({ version: "v4", optimize: true }),
  ],
};

export default config;
```

### 优势

- ✅ 原生 Deno 支持，无需额外配置
- ✅ 自动 HTTPS
- ✅ 全球 CDN
- ✅ 零配置部署
- ✅ 免费额度充足

---

## Vercel

Vercel 支持 Deno 运行时，可以部署 DWeb 应用。

### 前置要求

- Vercel 账号
- GitHub/GitLab/Bitbucket 账号

### 部署步骤

#### 1. 创建 `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "main.ts",
      "use": "@vercel/deno"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "main.ts"
    }
  ],
  "env": {
    "DENO_VERSION": "1.40.0"
  }
}
```

#### 2. 创建入口文件

```typescript
// main.ts
import { startProdServer } from "@dreamer/dweb";
import { loadConfig } from "@dreamer/dweb";

const { config } = await loadConfig();
await startProdServer(config);
```

#### 3. 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel

# 生产环境部署
vercel --prod
```

或通过 Vercel 网站连接 GitHub 仓库自动部署。

### 环境变量

在 Vercel 项目设置中添加环境变量。

### 注意事项

- Vercel 的 Deno 支持可能有限，建议使用 Deno Deploy
- 某些 Deno 特性可能不可用

---

## Netlify

Netlify 支持 Deno 函数，可以部署 DWeb 应用。

### 前置要求

- Netlify 账号
- GitHub/GitLab/Bitbucket 账号

### 部署步骤

#### 1. 创建 `netlify.toml`

```toml
[build]
  command = "deno task build"
  publish = "dist"

[[plugins]]
  package = "netlify-plugin-deno"

[build.environment]
  DENO_VERSION = "1.40.0"
```

#### 2. 创建 Netlify 函数

```typescript
// netlify/functions/server.ts
import { startProdServer } from "@dreamer/dweb";
import { loadConfig } from "@dreamer/dweb";

export default async (req: Request) => {
  const { config } = await loadConfig();
  // 处理请求
  return new Response("Hello from Netlify");
};
```

#### 3. 部署

```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 部署
netlify deploy --prod
```

或通过 Netlify 网站连接 GitHub 仓库自动部署。

---

## Railway

Railway 是一个现代化的云平台，支持 Deno 应用。

### 前置要求

- Railway 账号
- GitHub 账号

### 部署步骤

#### 1. 创建 `railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "deno task build"
  },
  "deploy": {
    "startCommand": "deno run -A main.ts",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 2. 创建入口文件

```typescript
// main.ts
import { startProdServer } from "@dreamer/dweb";
import { loadConfig } from "@dreamer/dweb";

const { config } = await loadConfig();
await startProdServer(config);
```

#### 3. 部署

1. 登录 Railway
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择仓库并部署

### 环境变量

在 Railway 项目设置中添加环境变量。

---

## Fly.io

Fly.io 支持 Deno 应用，可以部署到全球边缘节点。

### 前置要求

- Fly.io 账号
- Fly CLI

### 部署步骤

#### 1. 安装 Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
```

#### 2. 登录

```bash
fly auth login
```

#### 3. 创建应用

```bash
fly launch
```

#### 4. 创建 `fly.toml`

```toml
app = "your-app-name"
primary_region = "iad"

[build]
  builder = "denoland/deno:1.40.0"

[env]
  PORT = "3000"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

#### 5. 部署

```bash
fly deploy
```

---

## Cloudflare Workers

Cloudflare Workers 支持 Deno 运行时，可以部署 DWeb 应用。

### 前置要求

- Cloudflare 账号
- Wrangler CLI

### 部署步骤

#### 1. 安装 Wrangler

```bash
deno install -A -r https://deno.land/x/wrangler@latest/wrangler.ts
```

#### 2. 创建 `wrangler.toml`

```toml
name = "dweb-app"
main = "main.ts"
compatibility_date = "2024-01-01"

[env.production]
  vars = { NODE_ENV = "production" }
```

#### 3. 创建入口文件

```typescript
// main.ts
import { startProdServer } from "@dreamer/dweb";
import { loadConfig } from "@dreamer/dweb";

export default {
  async fetch(request: Request): Promise<Response> {
    const { config } = await loadConfig();
    // 处理请求
    return new Response("Hello from Cloudflare Workers");
  },
};
```

#### 4. 部署

```bash
wrangler deploy
```

### 注意事项

- Cloudflare Workers 有运行时限制
- 某些 Deno API 可能不可用

---

## AWS

### 使用 AWS Lambda

#### 1. 创建 Lambda 函数

使用 Deno Lambda 运行时：

```typescript
// lambda.ts
import { startProdServer } from "@dreamer/dweb";
import { loadConfig } from "@dreamer/dweb";

export const handler = async (event: any) => {
  const { config } = await loadConfig();
  // 处理请求
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from AWS Lambda" }),
  };
};
```

#### 2. 使用 Serverless Framework

```yaml
# serverless.yml
service: dweb-app

provider:
  name: aws
  runtime: provided.al2
  region: us-east-1

functions:
  api:
    handler: lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
```

### 使用 AWS ECS/Fargate

参考 Docker 部署指南，使用 ECS 或 Fargate 运行 Docker 容器。

---

## Google Cloud Platform

### 使用 Cloud Run

#### 1. 构建 Docker 镜像

参考 Docker 部署指南构建镜像。

#### 2. 推送到 Google Container Registry

```bash
# 标记镜像
docker tag dweb-app:latest gcr.io/PROJECT_ID/dweb-app:latest

# 推送
docker push gcr.io/PROJECT_ID/dweb-app:latest
```

#### 3. 部署到 Cloud Run

```bash
gcloud run deploy dweb-app \
  --image gcr.io/PROJECT_ID/dweb-app:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Azure

### 使用 Azure Container Instances

#### 1. 构建 Docker 镜像

参考 Docker 部署指南构建镜像。

#### 2. 推送到 Azure Container Registry

```bash
# 登录
az acr login --name <registry-name>

# 标记镜像
docker tag dweb-app:latest <registry-name>.azurecr.io/dweb-app:latest

# 推送
docker push <registry-name>.azurecr.io/dweb-app:latest
```

#### 3. 部署到 Container Instances

```bash
az container create \
  --resource-group myResourceGroup \
  --name dweb-app \
  --image <registry-name>.azurecr.io/dweb-app:latest \
  --dns-name-label dweb-app \
  --ports 3000
```

---

## 通用部署建议

### 1. 环境变量管理

使用环境变量管理敏感信息：

```typescript
// dweb.config.ts
const config: AppConfig = {
  server: {
    port: parseInt(Deno.env.get("PORT") || "3000"),
    host: Deno.env.get("HOST") || "0.0.0.0",
  },
  cookie: {
    secret: Deno.env.get("COOKIE_SECRET")!,
  },
  session: {
    secret: Deno.env.get("SESSION_SECRET")!,
  },
};
```

### 2. 构建优化

生产环境构建配置：

```typescript
build: {
  outDir: "dist",
  cache: true,
  split: true,
  compress: true,
  imageQuality: 85,
  prefetch: true,
  prefetchRoutes: true,
}
```

### 3. 健康检查

确保应用有健康检查端点：

```typescript
// 在配置中添加健康检查中间件
import { health } from "@dreamer/dweb";

middleware: [
  health({
    path: "/health",
    readyPath: "/health/ready",
    livePath: "/health/live",
  }),
]
```

### 4. 日志管理

配置日志输出：

```typescript
import { logger } from "@dreamer/dweb";

middleware: [
  logger({
    level: Deno.env.get("LOG_LEVEL") || "info",
    format: "json",
  }),
]
```

### 5. 安全配置

生产环境安全配置：

```typescript
import { security } from "@dreamer/dweb";

middleware: [
  security({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
    xssProtection: true,
    noSniff: true,
    frameOptions: "SAMEORIGIN",
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
  }),
]
```

### 6. 性能优化

- 启用压缩
- 配置缓存策略
- 使用 CDN
- 启用代码分割

### 7. 监控和告警

- 配置应用监控
- 设置告警规则
- 监控错误率
- 监控响应时间

---

## 📝 部署检查清单

部署前检查：

- [ ] 环境变量已配置
- [ ] 构建配置已优化
- [ ] 健康检查端点已配置
- [ ] 日志配置正确
- [ ] 安全配置已启用
- [ ] 静态资源路径正确
- [ ] 数据库连接配置（如使用）
- [ ] Redis 连接配置（如使用）
- [ ] HTTPS 已启用
- [ ] 域名已配置
- [ ] DNS 记录已设置

---

## 🔗 相关文档

- [Docker 部署指南](./DOCKER.md) - Docker 部署详细说明
- [配置示例](./CONFIG_EXAMPLES.md) - 各种场景的配置示例
- [使用指南](./GUIDES.md) - 框架使用指南

---

## 💡 推荐平台

根据需求选择平台：

- **Deno Deploy** - 最适合 Deno 应用，零配置，免费额度充足 ⭐
- **Railway** - 现代化平台，易于使用，支持自动部署
- **Fly.io** - 全球边缘节点，低延迟
- **Vercel** - 适合前端应用，CDN 加速
- **AWS/GCP/Azure** - 企业级需求，更多控制权

---

**最后更新**: 2024-12-19

