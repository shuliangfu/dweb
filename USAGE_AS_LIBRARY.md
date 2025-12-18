# 作为框架库使用

DWeb 框架可以作为库从 GitHub 导入使用。

## 安装和使用

### 方式一：使用 CLI 创建项目（推荐）

```bash
# 从 GitHub 直接运行 CLI 创建项目
deno run --allow-all https://raw.githubusercontent.com/your-username/dweb/main/src/cli.ts create

cd my-app
deno task dev
```

### 方式二：手动创建项目

1. **创建项目目录和配置文件**

```typescript
// dweb.config.ts
import type { SingleAppConfig } from 'https://raw.githubusercontent.com/your-username/dweb/main/src/types/index.ts';
import { tailwind } from 'https://raw.githubusercontent.com/your-username/dweb/main/src/plugins/index.ts';

const config: SingleAppConfig = {
  server: {
    port: 3000,
    host: 'localhost'
  },
  routes: {
    dir: 'routes',
    ignore: ['**/*.test.ts', '**/*.test.tsx']
  },
  plugins: [
    tailwind({
      version: 'v4',
      cssPath: 'public/style.css',
    }),
  ],
  dev: {
    hmrPort: 24678,
    reloadDelay: 300
  },
  build: {
    outDir: 'dist'
  }
};

export default config;
```

2. **创建 deno.json**

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  },
  "imports": {
    "dweb": "https://raw.githubusercontent.com/your-username/dweb/main/src/mod.ts",
    "preact": "https://esm.sh/preact@latest",
    "preact/jsx-runtime": "https://esm.sh/preact@latest/jsx-runtime"
  },
  "tasks": {
    "dev": "deno run --allow-all https://raw.githubusercontent.com/your-username/dweb/main/src/cli.ts dev",
    "build": "deno run --allow-all https://raw.githubusercontent.com/your-username/dweb/main/src/cli.ts build",
    "start": "deno run --allow-all https://raw.githubusercontent.com/your-username/dweb/main/src/cli.ts start"
  }
}
```

3. **创建路由文件**

```typescript
// routes/index.tsx
import { h } from 'preact';

export default function Home() {
  return <div>Hello DWeb!</div>;
}
```

### 方式三：作为库导入使用

```typescript
// main.ts
import { createApp, startDevServer } from 'https://raw.githubusercontent.com/your-username/dweb/main/src/mod.ts';
import type { AppConfig } from 'https://raw.githubusercontent.com/your-username/dweb/main/src/types/index.ts';

const app = createApp();

// 注册中间件
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// 启动开发服务器
const config: AppConfig = {
  server: { port: 3000, host: 'localhost' },
  routes: { dir: 'routes' },
  build: { outDir: 'dist' }
};

await startDevServer(config);
```

## 使用特定版本

建议使用 GitHub 的 tag 或 commit hash 来锁定版本：

```typescript
// 使用 tag
import { createApp } from 'https://raw.githubusercontent.com/your-username/dweb/v1.0.0/src/mod.ts';

// 使用 commit hash
import { createApp } from 'https://raw.githubusercontent.com/your-username/dweb/abc123def456/src/mod.ts';
```

## 注意事项

1. **首次导入会下载依赖**：Deno 会在首次运行时下载和缓存所有依赖
2. **权限要求**：运行 CLI 需要 `--allow-all` 权限
3. **网络访问**：需要能够访问 GitHub 和 esm.sh 等 CDN

## 发布到 Deno Land

如果你想发布到 Deno Land，可以：

1. 在 GitHub 创建 release tag
2. 在 [deno.land/x](https://deno.land/x) 提交你的项目
3. 然后可以使用更简洁的导入：

```typescript
import { createApp } from 'https://deno.land/x/dweb@v1.0.0/mod.ts';
```